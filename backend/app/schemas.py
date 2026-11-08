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
