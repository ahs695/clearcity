-- ============================================================
-- ClearCity — PostGIS schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ------------------------------------------------------------
-- 1. stations — CAAQMS monitoring stations
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stations (
    id           SERIAL PRIMARY KEY,
    station_id   VARCHAR(20)  UNIQUE NOT NULL,
    name         VARCHAR(200) NOT NULL,
    city         VARCHAR(100) NOT NULL DEFAULT 'Delhi',
    location     GEOMETRY(POINT, 4326) NOT NULL,
    is_active    BOOLEAN      NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stations_location
    ON stations USING GIST(location);

-- ------------------------------------------------------------
-- 2. aqi_readings — raw sensor readings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aqi_readings (
    id              SERIAL PRIMARY KEY,
    station_id      VARCHAR(20)   NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    recorded_at     TIMESTAMPTZ   NOT NULL,
    aqi             INTEGER,
    pm25            NUMERIC(6,2),
    pm10            NUMERIC(6,2),
    no2             NUMERIC(6,2),
    so2             NUMERIC(6,2),
    co              NUMERIC(6,2),
    wind_speed      NUMERIC(5,2),
    wind_direction  INTEGER,           -- degrees 0-360
    temperature     NUMERIC(5,2)
);

CREATE INDEX IF NOT EXISTS idx_readings_station_time
    ON aqi_readings (station_id, recorded_at DESC);

-- ------------------------------------------------------------
-- 3. emission_sources — registered polluters
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emission_sources (
    id                  SERIAL PRIMARY KEY,
    source_id           VARCHAR(20)   UNIQUE NOT NULL,
    name                VARCHAR(200)  NOT NULL,
    source_type         VARCHAR(50)   NOT NULL,   -- brick_kiln | construction | industrial | waste_burning | traffic
    location            GEOMETRY(POINT, 4326) NOT NULL,
    emission_intensity  NUMERIC(5,2)  NOT NULL DEFAULT 1.0,  -- relative scale 0-10
    last_inspected_at   TIMESTAMPTZ,
    is_active           BOOLEAN       NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_sources_location
    ON emission_sources USING GIST(location);

-- ------------------------------------------------------------
-- 4. attribution_results — agent output per spike event
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attribution_results (
    id               SERIAL PRIMARY KEY,
    station_id       VARCHAR(20)   NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    triggered_at     TIMESTAMPTZ   NOT NULL,
    aqi_at_trigger   INTEGER       NOT NULL,
    wind_speed       NUMERIC(5,2),
    wind_direction   INTEGER,
    -- array of {source_id, confidence, distance_km, reasoning}
    attributed_sources  JSONB       NOT NULL,
    agent_reasoning     TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 5. enforcement_notices — generated inspection orders
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enforcement_notices (
    id               SERIAL PRIMARY KEY,
    attribution_id   INTEGER       NOT NULL REFERENCES attribution_results(id) ON DELETE CASCADE,
    source_id        VARCHAR(20)   NOT NULL REFERENCES emission_sources(source_id),
    rank             INTEGER       NOT NULL,
    notice_json      JSONB         NOT NULL,
    status           VARCHAR(20)   NOT NULL DEFAULT 'pending',  -- pending | dispatched | completed
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Seed data moved to scripts/seed_demo_data.py
