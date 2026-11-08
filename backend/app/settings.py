from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://marketpulse:marketpulse@localhost:5432/marketpulse"
    # 시크릿은 환경변수에서만 — 코드/리포에 키 값 금지
    fred_api_key: str = ""
    bls_api_key: str = ""
    bea_api_key: str = ""
    indicators_yaml: str = "config/indicators.yaml"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    app_version: str = "0.4.1"
    # 테스트/오프라인 전용. 기본 False — 실서비스에서 가짜 시계열 금지
    allow_synthetic_fallback: bool = False

    @property
    def indicators_path(self) -> Path:
        return Path(self.indicators_yaml)

    @property
    def fred_key_configured(self) -> bool:
        return bool((self.fred_api_key or "").strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()
