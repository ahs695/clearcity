from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.db.connection import get_db
from app.models.db_models import AttributionResult, Station, AQIReading

router = APIRouter()


class AttributionSummary(BaseModel):
    id: int
    station_id: str
    station_name: str
    aqi_at_trigger: int
    wind_speed: Optional[float] = None
    wind_direction: Optional[int] = None
    triggered_at: str
    attributed_sources: Any


class TriggerBody(BaseModel):
    station_id: str
    force: bool = False


def _to_summary(r: AttributionResult, station_name: str) -> AttributionSummary:
    return AttributionSummary(
        id=r.id,
        station_id=r.station_id,
        station_name=station_name,
        aqi_at_trigger=r.aqi_at_trigger,
        wind_speed=float(r.wind_speed) if r.wind_speed is not None else None,
        wind_direction=r.wind_direction,
        triggered_at=r.triggered_at.isoformat(),
        attributed_sources=r.attributed_sources,
    )


@router.get("/results", response_model=List[AttributionSummary])
def list_attribution_results(limit: int = 10, db: Session = Depends(get_db)):
    rows = (
        db.query(AttributionResult, Station)
        .join(Station, AttributionResult.station_id == Station.station_id)
        .order_by(desc(AttributionResult.triggered_at))
        .limit(limit)
        .all()
    )
    return [_to_summary(r, s.name) for r, s in rows]


@router.get("/{result_id}", response_model=AttributionSummary)
def get_attribution_result(result_id: int, db: Session = Depends(get_db)):
    row = (
        db.query(AttributionResult, Station)
        .join(Station, AttributionResult.station_id == Station.station_id)
        .filter(AttributionResult.id == result_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Attribution result not found")
    r, s = row
    return _to_summary(r, s.name)


@router.post("/trigger", response_model=AttributionSummary)
def trigger_attribution(body: TriggerBody, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.station_id == body.station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail=f"Station {body.station_id} not found")

    # Get latest reading for the station to pass to run_attribution
    latest = (
        db.query(AQIReading)
        .filter(AQIReading.station_id == body.station_id)
        .order_by(desc(AQIReading.recorded_at))
        .first()
    )
    aqi = latest.aqi if (latest and latest.aqi is not None) else 100
    wind_speed = float(latest.wind_speed) if (latest and latest.wind_speed is not None) else 2.0
    wind_direction = latest.wind_direction if (latest and latest.wind_direction is not None) else 180

    from app.agents.attribution_agent import run_attribution
    res = run_attribution(
        station_id=body.station_id,
        aqi=aqi,
        wind_speed=wind_speed,
        wind_direction=wind_direction,
        db=db,
        force=body.force,
    )
    
    return AttributionSummary(
        id=res["id"],
        station_id=res["station_id"],
        station_name=station.name,
        aqi_at_trigger=res["aqi_at_trigger"],
        wind_speed=res["wind_speed"],
        wind_direction=res["wind_direction"],
        triggered_at=res["triggered_at"],
        attributed_sources=res["attributed_sources"],
    )
