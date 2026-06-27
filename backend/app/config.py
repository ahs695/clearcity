from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://clearcity:clearcity123@localhost:5432/clearcity"
    demo_mode: bool = True
    cpcb_api_key: str = ""
    aqi_alert_threshold: int = 150
    attribution_radius_km: float = 5.0

    class Config:
        env_file = ".env"


settings = Settings()
