from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Query

from backend.app import __version__
from backend.app.db import fetch_all, fetch_one, ping_db
from backend.app.indicators_loader import sync_indicators_from_yaml
from backend.app.schemas import (
    HealthResponse,
    IndicatorOut,
    JobOut,
    ObservationOut,
    RunJobRequest,
    RunJobResponse,
)
from backend.app.settings import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("marketpulse.api")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    if ping_db():
        try:
            n = sync_indicators_from_yaml(settings.indicators_path)
            logger.info("Synced %s indicators from YAML", n)
        except Exception:  # noqa: BLE001
            logger.exception("Indicator YAML sync skipped/failed")
    yield


app = FastAPI(
    title="MarketPulse API",
    version=__version__,
    description="Phase 1: health + indicator observations + collection job triggers",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    db_ok = ping_db()
    body = HealthResponse(
        status="ok" if db_ok else "degraded",
        db="up" if db_ok else "down",
        version=get_settings().app_version,
    )
    if not db_ok:
        raise HTTPException(status_code=503, detail=body.model_dump())
    return body


@app.get("/api/v1/indicators", response_model=list[IndicatorOut])
def list_indicators(
    category: str | None = None,
    source: str | None = Query(default=None, alias="provider"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[IndicatorOut]:
    clauses = ["is_active = TRUE"]
    params: list[Any] = []
    if category:
        clauses.append("category = %s")
        params.append(category)
    if source:
        clauses.append("provider = %s")
        params.append(source)
    where = " AND ".join(clauses)
    params.extend([limit, offset])
    rows = fetch_all(
        f"""
        SELECT indicator_id, name, name_ko, category, unit, frequency,
               provider, source_id, is_derived, geography
        FROM indicators
        WHERE {where}
        ORDER BY indicator_id
        LIMIT %s OFFSET %s
        """,
        params,
    )
    return [IndicatorOut(**r) for r in rows]


@app.get("/api/v1/indicators/{indicator_id}", response_model=IndicatorOut)
def get_indicator(indicator_id: str) -> IndicatorOut:
    row = fetch_one(
        """
        SELECT indicator_id, name, name_ko, category, unit, frequency,
               provider, source_id, is_derived, geography
        FROM indicators
        WHERE indicator_id = %s
        """,
        (indicator_id,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="indicator not found")
    return IndicatorOut(**row)


@app.get(
    "/api/v1/indicators/{indicator_id}/observations",
    response_model=list[ObservationOut],
)
def get_observations(
    indicator_id: str,
    start: str | None = None,
    end: str | None = None,
    vintage: str | None = None,
    limit: int = Query(default=500, ge=1, le=5000),
) -> list[ObservationOut]:
    exists = fetch_one(
        "SELECT 1 AS ok FROM indicators WHERE indicator_id = %s",
        (indicator_id,),
    )
    if not exists:
        raise HTTPException(status_code=404, detail="indicator not found")

    clauses = ["indicator_id = %s"]
    params: list[Any] = [indicator_id]
    if start:
        clauses.append("observation_date >= %s")
        params.append(start)
    if end:
        clauses.append("observation_date <= %s")
        params.append(end)
    if vintage:
        clauses.append("vintage_id = %s")
        params.append(vintage)
    where = " AND ".join(clauses)
    params.append(limit)
    rows = fetch_all(
        f"""
        SELECT observation_date, release_date, value, collected_at,
               vintage_id, source_revision, quality_flag
        FROM indicator_observations
        WHERE {where}
        ORDER BY observation_date DESC
        LIMIT %s
        """,
        params,
    )
    return [ObservationOut(**r) for r in rows]


@app.get("/api/v1/jobs/recent", response_model=list[JobOut])
def recent_jobs(limit: int = Query(default=20, ge=1, le=100)) -> list[JobOut]:
    rows = fetch_all(
        """
        SELECT job_id, provider, job_type, status, started_at, finished_at,
               records_upserted, error_message
        FROM collection_jobs
        ORDER BY started_at DESC NULLS LAST
        LIMIT %s
        """,
        (limit,),
    )
    return [JobOut(**r) for r in rows]


@app.post("/api/v1/jobs/run", response_model=RunJobResponse)
def run_job(body: RunJobRequest) -> RunJobResponse:
    if body.provider == "fred":
        from collectors.fred import collect_fred

        result = collect_fred(job_type=body.job_type)
    elif body.provider == "bls":
        from collectors.bls import collect_bls

        result = collect_bls(job_type=body.job_type)
    elif body.provider == "bea":
        from collectors.bea import collect_bea

        result = collect_bea(job_type=body.job_type)
    elif body.provider == "yahoo":
        from collectors.market import collect_market

        result = collect_market(job_type=body.job_type, live=body.live)
    else:
        raise HTTPException(status_code=400, detail="unsupported provider")
    return RunJobResponse(result=result)
