import logging
import warnings
from datetime import datetime, timedelta, timezone

import pandas as pd
from prophet import Prophet
from sqlalchemy import asc
from sqlalchemy.orm import Session

from app.models.db_models import AQIReading, Station

logging.getLogger("prophet").setLevel(logging.ERROR)
logging.getLogger("cmdstanpy").setLevel(logging.ERROR)

_MIN_POINTS = 48
_HORIZON_H = 72
_HISTORY_DAYS = 7


def generate_forecast(station_id: str, db: Session) -> dict:
    station = db.query(Station).filter(Station.station_id == station_id).first()

    cutoff = datetime.now(timezone.utc) - timedelta(days=_HISTORY_DAYS)
    rows = (
        db.query(AQIReading)
        .filter(
            AQIReading.station_id == station_id,
            AQIReading.recorded_at >= cutoff,
            AQIReading.aqi.isnot(None),
        )
        .order_by(asc(AQIReading.recorded_at))
        .all()
    )

    if len(rows) < _MIN_POINTS:
        return {"error": "insufficient data", "station_id": station_id}

    # Compute fill values for missing regressors before building the DataFrame
    wind_vals = [float(r.wind_speed) for r in rows if r.wind_speed is not None]
    temp_vals = [float(r.temperature) for r in rows if r.temperature is not None]
    
    # Fallback to defaults if no data at all
    mean_wind = sum(wind_vals) / len(wind_vals) if wind_vals else 3.0
    mean_temp = sum(temp_vals) / len(temp_vals) if temp_vals else 28.0

    df = pd.DataFrame(
        {
            "ds": [r.recorded_at.replace(tzinfo=None) for r in rows],
            "y": [int(r.aqi) for r in rows],
            "wind_speed": [
                float(r.wind_speed) if r.wind_speed is not None else mean_wind
                for r in rows
            ],
            "temperature": [
                float(r.temperature) if r.temperature is not None else mean_temp
                for r in rows
            ],
        }
    )

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = Prophet(
            daily_seasonality=True,
            weekly_seasonality=False,
            changepoint_prior_scale=0.05,
            interval_width=0.80,
        )
        model.add_regressor("wind_speed")
        model.add_regressor("temperature")
        model.fit(df)

    future = model.make_future_dataframe(periods=_HORIZON_H, freq="h", include_history=False)
    last_24 = df.tail(24)
    future["wind_speed"] = last_24["wind_speed"].mean()
    future["temperature"] = last_24["temperature"].mean()

    forecast_df = model.predict(future)

    entries = [
        {
            "timestamp": row.ds.strftime("%Y-%m-%dT%H:%M:%S"),
            "aqi_predicted": max(0, round(row.yhat)),
            "aqi_lower": max(0, round(row.yhat_lower)),
            "aqi_upper": max(0, round(row.yhat_upper)),
        }
        for _, row in forecast_df.iterrows()
    ]

    peak = max(entries, key=lambda x: x["aqi_predicted"])

    return {
        "station_id": station_id,
        "station_name": station.name if station else station_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "forecast": entries,
        "peak_forecast": {"timestamp": peak["timestamp"], "aqi": peak["aqi_predicted"]},
        "model_info": {"training_points": len(rows), "horizon_hours": _HORIZON_H},
    }
