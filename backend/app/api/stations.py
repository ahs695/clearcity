from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from geoalchemy2.shape import to_shape
from pydantic import BaseModel
from sqlalchemy import desc, asc
from sqlalchemy.orm import Session

from app.db.connection import get_db
from app.models.db_models import AQIReading, Station

router = APIRouter()


class StationReading(BaseModel):
    station_id: str
    name: str
    lat: float
    lon: float
    aqi: Optional[int] = None
    pm25: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_direction: Optional[int] = None
    recorded_at: Optional[str] = None
    aqi_category: Optional[str] = None


class HistoryPoint(BaseModel):
    recorded_at: str
    aqi: Optional[int] = None
    pm25: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_direction: Optional[int] = None


def get_aqi_category(aqi: int) -> str:
    if aqi <= 50:
        return "Good"
    elif aqi <= 100:
        return "Satisfactory"
    elif aqi <= 200:
        return "Moderate"
    elif aqi <= 300:
        return "Poor"
    elif aqi <= 400:
        return "Very Poor"
    else:
        return "Severe"


@router.get("/", response_model=List[StationReading])
def list_stations(db: Session = Depends(get_db)):
    stations = db.query(Station).filter(Station.is_active == True).all()
    result = []
    for station in stations:
        point = to_shape(station.location)
        latest = (
            db.query(AQIReading)
            .filter(AQIReading.station_id == station.station_id)
            .order_by(desc(AQIReading.recorded_at))
            .first()
        )
        result.append(StationReading(
            station_id=station.station_id,
            name=station.name,
            lat=point.y,
            lon=point.x,
            aqi=latest.aqi if latest else None,
            pm25=float(latest.pm25) if latest and latest.pm25 is not None else None,
            wind_speed=float(latest.wind_speed) if latest and latest.wind_speed is not None else None,
            wind_direction=latest.wind_direction if latest else None,
            recorded_at=latest.recorded_at.isoformat() if latest else None,
            aqi_category=get_aqi_category(latest.aqi) if latest and latest.aqi is not None else None,
        ))
    return result


@router.get("/{station_id}", response_model=StationReading)
def get_station(station_id: str, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.station_id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    point = to_shape(station.location)
    latest = (
        db.query(AQIReading)
        .filter(AQIReading.station_id == station_id)
        .order_by(desc(AQIReading.recorded_at))
        .first()
    )
    return StationReading(
        station_id=station.station_id,
        name=station.name,
        lat=point.y,
        lon=point.x,
        aqi=latest.aqi if latest else None,
        pm25=float(latest.pm25) if latest and latest.pm25 is not None else None,
        wind_speed=float(latest.wind_speed) if latest and latest.wind_speed is not None else None,
        wind_direction=latest.wind_direction if latest else None,
        recorded_at=latest.recorded_at.isoformat() if latest else None,
        aqi_category=get_aqi_category(latest.aqi) if latest and latest.aqi is not None else None,
    )


@router.get("/{station_id}/history", response_model=List[HistoryPoint])
def get_history(station_id: str, hours: int = 24, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.station_id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    readings = (
        db.query(AQIReading)
        .filter(
            AQIReading.station_id == station_id,
            AQIReading.recorded_at >= cutoff,
        )
        .order_by(asc(AQIReading.recorded_at))
        .all()
    )
    return [
        HistoryPoint(
            recorded_at=r.recorded_at.isoformat(),
            aqi=r.aqi,
            pm25=float(r.pm25) if r.pm25 is not None else None,
            wind_speed=float(r.wind_speed) if r.wind_speed is not None else None,
            wind_direction=r.wind_direction,
        )
        for r in readings
    ]
