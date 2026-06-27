import asyncio
import logging
import subprocess

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from geoalchemy2.shape import to_shape
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.api import attribution, enforcement, forecast, stations
from app.config import settings
from app.db.connection import SessionLocal, get_db
from app.models.db_models import EmissionSource, EnforcementNotice, Station
from app.services.cpcb_ingestion import run_ingestion_cycle

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("clearcity")

app = FastAPI(title="ClearCity API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stations.router, prefix="/api/stations", tags=["stations"])
app.include_router(attribution.router, prefix="/api/attribution", tags=["attribution"])
app.include_router(enforcement.router, prefix="/api/enforcement", tags=["enforcement"])
app.include_router(forecast.router, prefix="/api/forecast", tags=["forecast"])

scheduler = BackgroundScheduler()


def _ingestion_job() -> None:
    db = SessionLocal()
    try:
        if settings.demo_mode:
            from app.services.cpcb_ingestion import run_simulated_ingestion
            run_simulated_ingestion(db)
        else:
            run_ingestion_cycle(db)
    except Exception as exc:
        logger.error("Ingestion cycle error: %s", exc)
    finally:
        db.close()


@app.on_event("startup")
def startup() -> None:
    db = SessionLocal()
    backoff = 1
    max_retries = 10
    
    for i in range(max_retries):
        try:
            # Check readings count instead of station count to ensure history is seeded
            count = db.execute(text("SELECT count(*) FROM aqi_readings")).scalar()
            db.close() # Close session before subprocess to avoid deadlocks
            if count == 0:
                logger.info("Database empty or missing history — running seed script")
                subprocess.run(["python", "scripts/seed_demo_data.py"], check=True)
                logger.info("Seed script completed")
            else:
                logger.info("Database ready — %d historical readings found", count)
            break # Success
        except Exception as exc:
            if i < max_retries - 1:
                logger.warning("Startup seed check failed (attempt %d/%d): %s. Retrying in %ds...", i+1, max_retries, exc, backoff)
                import time
                time.sleep(backoff)
                backoff = min(backoff * 2, 10)
            else:
                logger.error("Startup seed check failed after %d attempts: %s", max_retries, exc)
        finally:
            db.close()
            if i < max_retries - 1:
                db = SessionLocal() # Re-create session for next attempt

    scheduler.add_job(_ingestion_job, "interval", minutes=15, id="ingestion")
    scheduler.start()
    logger.info("Scheduler started — ingestion every 15 minutes (demo_mode=%s)", settings.demo_mode)


@app.on_event("shutdown")
def shutdown() -> None:
    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")


@app.get("/health")
def health():
    return {"status": "ok", "demo_mode": settings.demo_mode}


@app.get("/api/demo/status")
def demo_status(db: Session = Depends(get_db)):
    from app.models.db_models import EmissionSource as ES, EnforcementNotice as EN
    n_stations = db.query(func.count(Station.id)).scalar()
    n_sources = db.query(func.count(ES.id)).scalar()
    n_notices = db.query(func.count(EN.id)).scalar()
    return {
        "demo_mode": settings.demo_mode,
        "seeded_stations": n_stations,
        "seeded_sources": n_sources,
        "seeded_notices": n_notices,
    }


@app.get("/api/sources")
def list_sources(db: Session = Depends(get_db)):
    sources = db.query(EmissionSource).filter(EmissionSource.is_active == True).all()
    result = []
    for s in sources:
        point = to_shape(s.location)
        result.append({
            "source_id": s.source_id,
            "name": s.name,
            "source_type": s.source_type,
            "lat": point.y,
            "lon": point.x,
            "emission_intensity": float(s.emission_intensity),
            "last_inspected_at": s.last_inspected_at.isoformat() if s.last_inspected_at else None,
            "is_active": s.is_active,
        })
    return result


@app.websocket("/ws/alerts")
async def alerts_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        if settings.demo_mode:
            await asyncio.sleep(10)
            await websocket.send_json({
                "type": "alert",
                "station_id": "DPCB001",
                "station_name": "Anand Vihar",
                "aqi": 320,
                "message": "AQI spike detected — attribution analysis ready",
            })
            while True:
                await asyncio.sleep(60)
        else:
            while True:
                await asyncio.sleep(60)
    except Exception:
        pass
