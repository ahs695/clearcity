from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.connection import get_db
from app.models.db_models import Station
from app.services.forecast_service import generate_forecast

router = APIRouter()

_cache: dict[str, dict] = {}  # {station_id: {"expires_at": datetime, "data": dict}}


def _get_cached(station_id: str) -> dict | None:
    entry = _cache.get(station_id)
    if entry and entry["expires_at"] > datetime.now(timezone.utc):
        return entry["data"]
    return None


def _set_cache(station_id: str, data: dict) -> None:
    _cache[station_id] = {
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=30),
        "data": data,
    }


@router.get("/{station_id}")
def station_forecast(station_id: str, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.station_id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    cached = _get_cached(station_id)
    if cached:
        return cached

    result = generate_forecast(station_id=station_id, db=db)
    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])

    _set_cache(station_id, result)
    return result
