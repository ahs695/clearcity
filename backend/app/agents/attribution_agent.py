import logging
import math
from datetime import datetime, timezone

from sqlalchemy import desc, text
from sqlalchemy.orm import Session

from app.config import settings
from app.models.db_models import AttributionResult

logger = logging.getLogger("clearcity")

_RADIUS_M = 5000  # spatial search radius

_FALLBACK = {
    "id": None,
    "station_id": "UNKNOWN",
    "triggered_at": datetime.now(timezone.utc).isoformat(),
    "aqi_at_trigger": 0,
    "wind_speed": None,
    "wind_direction": None,
    "attributed_sources": [],
    "agent_reasoning": "No attribution data available.",
}


def _result_to_dict(r: AttributionResult) -> dict:
    return {
        "id": r.id,
        "station_id": r.station_id,
        "triggered_at": r.triggered_at.isoformat(),
        "aqi_at_trigger": r.aqi_at_trigger,
        "wind_speed": float(r.wind_speed) if r.wind_speed is not None else None,
        "wind_direction": r.wind_direction,
        "attributed_sources": r.attributed_sources,
        "agent_reasoning": r.agent_reasoning,
    }


def run_attribution(
    station_id: str,
    aqi: int,
    wind_speed: float,
    wind_direction: int,
    db: Session,
) -> dict:
    # ── Step 1: Demo mode — read from pre-seeded DB ──────────────────────────
    if settings.demo_mode:
        r = (
            db.query(AttributionResult)
            .filter(AttributionResult.station_id == station_id)
            .order_by(desc(AttributionResult.triggered_at))
            .first()
        )
        if r is None:
            r = db.query(AttributionResult).first()
        if r is None:
            logger.warning("No attribution results seeded; returning fallback for %s", station_id)
            return {**_FALLBACK, "station_id": station_id, "aqi_at_trigger": aqi}
        return _result_to_dict(r)

    # ── Step 2: Spatial scoring via PostGIS ──────────────────────────────────
    upwind_bearing = (wind_direction + 180) % 360

    rows = db.execute(
        text("""
            SELECT
                es.source_id,
                es.name,
                es.source_type,
                CAST(es.emission_intensity AS FLOAT)            AS emission_intensity,
                es.last_inspected_at,
                ST_Distance(es.location::geography,
                            s.location::geography) / 1000.0    AS distance_km,
                DEGREES(ST_Azimuth(s.location, es.location))   AS bearing_to_source
            FROM emission_sources es
            JOIN stations s ON s.station_id = :sid
            WHERE es.is_active = true
              AND ST_DWithin(es.location::geography,
                             s.location::geography, :radius)
        """),
        {"sid": station_id, "radius": _RADIUS_M},
    ).fetchall()

    if not rows:
        logger.warning("No emission sources found within %dm of station %s", _RADIUS_M, station_id)

    scored = []
    for row in rows:
        angle_diff = abs((row.bearing_to_source or 0.0) - upwind_bearing)
        if angle_diff > 180:
            angle_diff = 360 - angle_diff
        wind_alignment = max(0.0, math.cos(math.radians(angle_diff)))

        if row.last_inspected_at:
            inspected_aware = row.last_inspected_at
            if inspected_aware.tzinfo is None:
                inspected_aware = inspected_aware.replace(tzinfo=timezone.utc)
            days_since = (datetime.now(timezone.utc) - inspected_aware).days
        else:
            days_since = 999

        composite = (
            wind_alignment * 0.5
            + (row.emission_intensity / 10.0) * 0.3
            + (min(days_since, 365) / 365.0) * 0.2
        )
        scored.append({
            "row": row,
            "wind_alignment": wind_alignment,
            "days_since": days_since,
            "composite": composite,
        })

    scored.sort(key=lambda x: x["composite"], reverse=True)
    top_5 = scored[:5]

    # ── Step 3: Build attribution list ───────────────────────────────────────
    attributed_sources = []
    for item in top_5:
        row = item["row"]
        confidence = round(item["composite"] * 0.95, 2)
        alignment_pct = f"{item['wind_alignment']:.0%}"
        reasoning = (
            f"{row.name} ({row.source_type}) is {row.distance_km:.1f}km "
            f"upwind at {alignment_pct} wind alignment. "
            f"Emission intensity {row.emission_intensity}/10. "
            f"Last inspected {item['days_since']} days ago."
        )
        attributed_sources.append({
            "source_id": row.source_id,
            "confidence": confidence,
            "distance_km": round(row.distance_km, 2),
            "reasoning": reasoning,
        })

    if top_5:
        top = top_5[0]
        agent_reasoning = (
            f"Station {station_id} recorded AQI {aqi} with wind from {wind_direction}° "
            f"at {wind_speed} m/s (upwind corridor: {upwind_bearing}°). "
            f"Top source {top['row'].name} shows "
            f"{top['wind_alignment']:.0%} wind alignment "
            f"at {top['row'].distance_km:.1f}km distance."
        )
    else:
        agent_reasoning = (
            f"Station {station_id} recorded AQI {aqi} with wind from {wind_direction}° "
            f"at {wind_speed} m/s. No emission sources found within {_RADIUS_M // 1000}km."
        )

    # ── Step 4: Persist and return ───────────────────────────────────────────
    result = AttributionResult(
        station_id=station_id,
        triggered_at=datetime.now(timezone.utc),
        aqi_at_trigger=aqi,
        wind_speed=wind_speed,
        wind_direction=wind_direction,
        attributed_sources=attributed_sources,
        agent_reasoning=agent_reasoning,
    )
    db.add(result)
    db.commit()
    db.refresh(result)

    logger.info(
        "Attribution complete for %s: AQI=%d, %d sources scored, top=%s",
        station_id, aqi, len(scored),
        attributed_sources[0]["source_id"] if attributed_sources else "none",
    )

    return _result_to_dict(result)
