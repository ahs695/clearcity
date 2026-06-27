# ClearCity

Air quality monitoring and enforcement platform for Delhi, built for pollution control boards. Ingests CAAQMS sensor data, attributes AQI spikes to emission sources using PostGIS spatial analysis, forecasts AQI with Meta's Prophet model, and generates actionable field-inspection notices.

## What it does

**Command Centre** — desktop dashboard showing a live Leaflet map of 15 Delhi monitoring stations colour-coded by AQI. Selecting a station triggers the attribution agent, which traces the spike to upwind emission sources within a 5 km radius and ranks them by wind alignment, emission intensity, and days since last inspection.

**Field Inspector** — mobile-friendly view listing pending enforcement notices for field officers. Works offline via localStorage cache.

**Background ingestion** — every 15 minutes the backend polls for new readings (live CPCB API or simulated demo data) and triggers attribution when AQI crosses the alert threshold.

## Architecture

```
frontend/          React 19 + Vite + Tailwind + Leaflet + Recharts
backend/           FastAPI + SQLAlchemy + APScheduler
  app/
    api/           REST routes: stations, attribution, enforcement, forecast
    agents/        attribution_agent.py — PostGIS spatial scoring
                   enforcement_generator.py — notice lookup/generation
    services/      cpcb_ingestion.py, forecast_service.py, openmeteo_service.py
    models/        SQLAlchemy ORM models
db/                PostgreSQL 16 + PostGIS 3.4
  init.sql         Schema: stations, aqi_readings, emission_sources,
                            attribution_results, enforcement_notices
scripts/
  seed_demo_data.py   Seeds 15 stations, 40 emission sources, 7 days of history
```

## Quick start (Docker)

```bash
docker compose up
```

- Backend API: http://localhost:8000
- Frontend dev server: http://localhost:5173 (run separately, see below)

On first boot the backend seeds the database automatically (15 stations, 40 emission sources, 7 days of AQI history).

## Frontend dev server

```bash
cd frontend
npm install
npm run dev
```

## Environment variables

Copy `.env.example` to `.env`:

```
DATABASE_URL=postgresql://clearcity:clearcity123@localhost:5432/clearcity
DEMO_MODE=true
CPCB_API_KEY=          # optional — only needed for live CPCB data ingestion
```

`DEMO_MODE=true` (default) serves pre-seeded data and simulates WebSocket alerts without calling external APIs.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/stations` | All monitoring stations with latest AQI |
| GET | `/api/attribution/{station_id}` | Run/fetch attribution for a station |
| GET | `/api/enforcement` | List enforcement notices (filter by status) |
| GET | `/api/forecast/{station_id}` | 72-hour Prophet AQI forecast |
| GET | `/api/sources` | Active emission sources |
| GET | `/api/demo/status` | Seeded record counts |
| WS  | `/ws/alerts` | Real-time AQI spike alerts |

## Attribution algorithm

1. Find all active emission sources within 5 km of the station (PostGIS `ST_DWithin`).
2. For each source compute a composite score:
   - **Wind alignment** (50%) — cosine similarity between upwind corridor and bearing to source.
   - **Emission intensity** (30%) — relative scale 0–10 from source registry.
   - **Inspection staleness** (20%) — days since last field inspection (capped at 365).
3. Top 5 sources are returned with per-source confidence scores and plain-English reasoning.

## Forecast model

Uses Meta Prophet with daily seasonality and two regressors (wind speed, temperature). Trained on 7 days of hourly readings, outputs 72-hour AQI predictions with 80% confidence intervals. Requires at least 48 data points.

## Database schema

| Table | Purpose |
|-------|---------|
| `stations` | CAAQMS station registry with PostGIS geometry |
| `aqi_readings` | Hourly sensor readings (AQI, PM2.5, PM10, NO₂, SO₂, CO, wind, temperature) |
| `emission_sources` | Registered polluters (brick kilns, construction, industrial, waste burning, traffic) |
| `attribution_results` | Per-spike agent output stored as JSONB |
| `enforcement_notices` | Inspection orders with status workflow (pending → dispatched → completed) |

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS, Leaflet, Recharts, React Router |
| Backend | FastAPI, SQLAlchemy 2, APScheduler, Pydantic v2 |
| ML | Prophet 1.1, pandas, numpy |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Spatial | GeoAlchemy2, Shapely |
| Infra | Docker Compose |

## Demo data

The seed script (`scripts/seed_demo_data.py`) inserts:
- 15 real Delhi CAAQMS station locations (Anand Vihar, ITO, Punjabi Bagh, etc.)
- 40 emission sources across 5 categories spread around Delhi
- 7 days of hourly AQI readings with realistic diurnal patterns
- Pre-computed attribution results and enforcement notices
