from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    db: Literal["up", "down"]
    version: str


class IndicatorOut(BaseModel):
    indicator_id: str
    name: str
    name_ko: str | None = None
    category: str
    unit: str | None = None
    frequency: str
    provider: str
    source_id: str
    is_derived: bool = False
    geography: str | None = None


class ObservationOut(BaseModel):
    observation_date: date
    release_date: date | None = None
    value: float | None = None
    collected_at: datetime
    vintage_id: str | None = None
    source_revision: int
    quality_flag: str | None = None


class JobOut(BaseModel):
    job_id: int
    provider: str
    job_type: str
    status: str
    started_at: datetime | None = None
    finished_at: datetime | None = None
    records_upserted: int | None = None
    error_message: str | None = None


class RunJobRequest(BaseModel):
    provider: Literal["fred", "bls", "bea", "yahoo"] = "fred"
    job_type: str = "daily"
    live: bool = Field(
        default=False,
        description="yahoo 전용: True면 실제 네트워크 호출(프로토타입)",
    )


class RunJobResponse(BaseModel):
    result: dict[str, Any]


class DriverOut(BaseModel):
    indicator_id: str | None = None
    score: float | None = None
    z: float | None = None
    note: str | None = None
    role: str | None = None
    axis: str | None = None
    directed_z: float | None = None
    source_mode: str | None = None
    as_of: str | None = None


class DomainScoreOut(BaseModel):
    domain: str
    score: float | None
    weight: float
    components: list[dict[str, Any]] = []
    drivers: list[dict[str, Any]] = []
    contrarians: list[dict[str, Any]] = []
    coverage: float = 0
    source_mode: str = "synthetic"
    as_of: str | None = None


class ScoresResponse(BaseModel):
    as_of: str | None
    analyzed_at: str | None
    market_score: float | None
    confidence: float
    weights: dict[str, float]
    domains: dict[str, Any]
    source_mode: str
    methodology: dict[str, Any]


class RegimeResponse(BaseModel):
    label: str
    quadrant: dict[str, str]
    growth: dict[str, Any]
    inflation: dict[str, Any]
    drivers: list[dict[str, Any]]
    contrarians: list[dict[str, Any]]
    similar_regimes: list[dict[str, Any]]
    confidence: float
    source_mode: str
    as_of: str | None
    analyzed_at: str | None = None
    methodology: dict[str, Any] | None = None


class CorrelationResponse(BaseModel):
    indicators: list[str]
    matrix: dict[str, dict[str, float | None]]
    observations_span: dict[str, Any]
    pairs_computed: int
    source_mode: str
    method: str
    analyzed_at: str | None = None


class TransactionCreate(BaseModel):
    trade_date: str
    symbol: str
    asset_class: str
    side: Literal["buy", "sell", "deposit", "withdraw", "dividend_reinvest", "fee"]
    quantity: float
    price: float
    fee: float = 0
    currency: str = "USD"
    fx_rate: float = 1
    note: str | None = None
