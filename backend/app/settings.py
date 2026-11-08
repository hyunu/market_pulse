from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://marketpulse:marketpulse@localhost:5432/marketpulse"
    fred_api_key: str = ""
    bls_api_key: str = ""
    bea_api_key: str = ""
    indicators_yaml: str = "config/indicators.yaml"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    app_version: str = "0.1.0"

    @property
    def indicators_path(self) -> Path:
        return Path(self.indicators_yaml)


@lru_cache
def get_settings() -> Settings:
    return Settings()
