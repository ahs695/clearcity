import logging
import random
from collections import defaultdict
from datetime import datetime, timezone

import httpx
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.config import settings
from app.models.db_models import AQIReading, Station
from app.services.openmeteo_service import get_current_weather

logger = logging.getLogger("clearcity")

CPCB_URL = "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"

# India NAAQs PM2.5 breakpoints: (conc_lo, conc_hi, aqi_lo, aqi_hi)
_PM25_BREAKPOINTS = [
    (0.0,   30.0,   0,   50),
    (30.0,  60.0,  51,  100),
    (60.0,  90.0, 101,  200),
    (90.0, 120.0, 201,  300),
    (120.0, 250.0, 301, 400),
    (250.0, 500.0, 401, 500),
]


def _pm25_to_aqi(pm25: float) -> int:
    for c_lo, c_hi, i_lo, i_hi in _PM25_BREAKPOINTS:
        if pm25 <= c_hi:
            return round(i_lo + (pm25 - c_lo) / (c_hi - c_lo) * (i_hi - i_lo))
    return 500


def _fetch_cpcb_records() -> list[dict]:
    """Fetch live CPCB data for Delhi. Returns [] in DEMO_MODE."""
    if settings.demo_mode:
        return []

    params = {"format": "json", "limit": 100, "filters[city]": "Delhi"}
    headers = {"api-key": settings.cpcb_api_key}
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(CPCB_URL, params=params, headers=headers)
            resp.raise_for_status()
            raw = resp.json()
    except Exception as exc:
        logger.error("CPCB API fetch failed: %s", exc)
        return []

    records = raw.get("records", [])
    grouped: dict[str, dict] = defaultdict(dict)
    for rec in records:
        station_name = rec.get("station", "").strip()
        pollutant = rec.get("pollutant_id", "").strip().upper().replace(".", "")
        try:
            avg = float(rec.get("pollutant_avg") or 0)
        except ValueError:
            avg = 0.0
        grouped[station_name][pollutant] = avg

    result = []
    for station_name, pollutants in grouped.items():
        pm25 = pollutants.get("PM25") or pollutants.get("PM2.5") or pollutants.get("PM25")
        result.append({
            "station_name": station_name,
            "pm25": pm25,
            "pm10": pollutants.get("PM10"),
            "no2": pollutants.get("NO2"),
            "so2": pollutants.get("SO2"),
            "co": pollutants.get("CO"),
        })
    return result


def _match_station(db_station_name: str, live_records: list[dict]) -> dict | None:
    """Case-insensitive substring match between DB station name and CPCB record."""
    name_lower = db_station_name.lower()
    for rec in live_records:
        live_lower = rec["station_name"].lower()
        if any(word in live_lower for word in name_lower.split() if len(word) > 3):
            return rec
    return None


def run_ingestion_cycle(db: Session) -> None:
    live_records = _fetch_cpcb_records()

    stations = db.query(Station).filter(Station.is_active == True).all()
    now = datetime.now(timezone.utc)

    for station in stations:
        matched = _match_station(station.name, live_records)
        if not matched:
            logger.debug("No live CPCB match for station %s — skipping insert", station.station_id)
            continue

        pm25 = matched.get("pm25") or 0.0
        aqi = _pm25_to_aqi(pm25)

        # Extract lat/lon from PostGIS geometry
        row = db.execute(
            text("SELECT ST_X(location) AS lon, ST_Y(location) AS lat FROM stations WHERE id = :id"),
            {"id": station.id},
        ).fetchone()
        lat, lon = (row.lat, row.lon) if row else (28.6, 77.2)

        weather = get_current_weather(lat, lon)

        reading = AQIReading(
            station_id=station.station_id,
            recorded_at=now,
            aqi=aqi,
            pm25=matched.get("pm25"),
            pm10=matched.get("pm10"),
            no2=matched.get("no2"),
            so2=matched.get("so2"),
            co=matched.get("co"),
            wind_speed=weather.get("wind_speed"),
            wind_direction=weather.get("wind_direction"),
            temperature=weather.get("temperature"),
        )
        db.add(reading)

    db.commit()
    logger.info("Ingestion cycle complete: processed %d stations", len(stations))

    _check_alerts(db, stations)


def run_simulated_ingestion(db: Session) -> None:
    """Add fresh readings in demo mode based on historical averages + noise."""
    stations = db.query(Station).filter(Station.is_active == True).all()
    now = datetime.now(timezone.utc)

    for station in stations:
        # Get last reading to base noise on, or use a default
        last_reading = (
            db.query(AQIReading)
            .filter(AQIReading.station_id == station.station_id)
            .order_by(AQIReading.recorded_at.desc())
            .first()
        )
        
        base_aqi = last_reading.aqi if last_reading and last_reading.aqi else 150
        # Add some random walk noise
        new_aqi = int(max(20, min(500, base_aqi + random.uniform(-15, 15))))
        
        # Simulated weather
        temp = 25.0 + random.uniform(-5, 10)
        wind = 2.0 + random.uniform(0, 5)

        reading = AQIReading(
            station_id=station.station_id,
            recorded_at=now,
            aqi=new_aqi,
            pm25=new_aqi * 0.6,  # Rough approximation
            wind_speed=wind,
            temperature=temp,
        )
        db.add(reading)

    db.commit()
    logger.info("Simulated ingestion complete: added readings for %d stations", len(stations))


def _check_alerts(db: Session, stations: list[Station]) -> None:
    for station in stations:
        latest = (
            db.query(AQIReading)
            .filter(AQIReading.station_id == station.station_id)
            .order_by(AQIReading.recorded_at.desc())
            .first()
        )
        if latest and latest.aqi is not None and latest.aqi > settings.aqi_alert_threshold:
            logger.warning(
                "ALERT: Station %s AQI=%d — attribution agent should be triggered.",
                station.station_id,
                latest.aqi,
            )
