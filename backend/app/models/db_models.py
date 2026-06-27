from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer,
    Numeric, String, Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.db.connection import Base


class Station(Base):
    __tablename__ = "stations"

    id          = Column(Integer, primary_key=True, index=True)
    station_id  = Column(String(20), unique=True, nullable=False, index=True)
    name        = Column(String(200), nullable=False)
    city        = Column(String(100), nullable=False, default="Delhi")
    location    = Column(Geometry("POINT", srid=4326), nullable=False)
    is_active   = Column(Boolean, nullable=False, default=True)
    created_at  = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    readings            = relationship("AQIReading", back_populates="station",
                                       cascade="all, delete-orphan")
    attribution_results = relationship("AttributionResult", back_populates="station",
                                       cascade="all, delete-orphan")


class AQIReading(Base):
    __tablename__ = "aqi_readings"

    id              = Column(Integer, primary_key=True, index=True)
    station_id      = Column(String(20), ForeignKey("stations.station_id"), nullable=False)
    recorded_at     = Column(DateTime(timezone=True), nullable=False)
    aqi             = Column(Integer)
    pm25            = Column(Numeric(6, 2))
    pm10            = Column(Numeric(6, 2))
    no2             = Column(Numeric(6, 2))
    so2             = Column(Numeric(6, 2))
    co              = Column(Numeric(6, 2))
    wind_speed      = Column(Numeric(5, 2))
    wind_direction  = Column(Integer)   # degrees 0-360
    temperature     = Column(Numeric(5, 2))

    station = relationship("Station", back_populates="readings")


class EmissionSource(Base):
    __tablename__ = "emission_sources"

    id                  = Column(Integer, primary_key=True, index=True)
    source_id           = Column(String(20), unique=True, nullable=False, index=True)
    name                = Column(String(200), nullable=False)
    source_type         = Column(String(50), nullable=False)
    location            = Column(Geometry("POINT", srid=4326), nullable=False)
    emission_intensity  = Column(Numeric(5, 2), nullable=False, default=1.0)
    last_inspected_at   = Column(DateTime(timezone=True))
    is_active           = Column(Boolean, nullable=False, default=True)

    enforcement_notices = relationship("EnforcementNotice", back_populates="source")


class AttributionResult(Base):
    __tablename__ = "attribution_results"

    id                  = Column(Integer, primary_key=True, index=True)
    station_id          = Column(String(20), ForeignKey("stations.station_id"), nullable=False)
    triggered_at        = Column(DateTime(timezone=True), nullable=False)
    aqi_at_trigger      = Column(Integer, nullable=False)
    wind_speed          = Column(Numeric(5, 2))
    wind_direction      = Column(Integer)
    attributed_sources  = Column(JSONB, nullable=False)  # [{source_id, confidence, distance_km, reasoning}]
    agent_reasoning     = Column(Text)
    created_at          = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    station             = relationship("Station", back_populates="attribution_results")
    enforcement_notices = relationship("EnforcementNotice", back_populates="attribution",
                                       cascade="all, delete-orphan")


class EnforcementNotice(Base):
    __tablename__ = "enforcement_notices"

    id              = Column(Integer, primary_key=True, index=True)
    attribution_id  = Column(Integer, ForeignKey("attribution_results.id"), nullable=False)
    source_id       = Column(String(20), ForeignKey("emission_sources.source_id"), nullable=False)
    rank            = Column(Integer, nullable=False)
    notice_json     = Column(JSONB, nullable=False)
    status          = Column(String(20), nullable=False, default="pending")  # pending | dispatched | completed
    created_at      = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    attribution = relationship("AttributionResult", back_populates="enforcement_notices")
    source      = relationship("EmissionSource", back_populates="enforcement_notices")
