import logging
import httpx
from app.config import settings

logger = logging.getLogger("clearcity")

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

_DEMO_WEATHER = {"wind_speed": 3.2, "wind_direction": 225, "temperature": 32.0}


def get_current_weather(lat: float, lon: float) -> dict:
    """Return current wind and temperature for a location.

    Returns {"wind_speed": float, "wind_direction": int, "temperature": float}.
    """
    if settings.demo_mode:
        return _DEMO_WEATHER.copy()

    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "windspeed_10m,winddirection_10m,temperature_2m",
        "forecast_days": 1,
        "timezone": "Asia/Kolkata",
    }
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(OPEN_METEO_URL, params=params)
            response.raise_for_status()
            data = response.json()
    except Exception as exc:
        logger.warning("OpenMeteo fetch failed: %s — using demo fallback", exc)
        return _DEMO_WEATHER.copy()

    hourly = data.get("hourly", {})
    return {
        "wind_speed": _first_non_null(hourly.get("windspeed_10m", [])),
        "wind_direction": _first_non_null(hourly.get("winddirection_10m", [])),
        "temperature": _first_non_null(hourly.get("temperature_2m", [])),
    }


def _first_non_null(values: list):
    for v in values:
        if v is not None:
            return v
    return None
