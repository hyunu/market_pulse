from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Query

from backend.app import __version__
from backend.app.db import fetch_all, fetch_one, ping_db
from backend.app.indicators_loader import sync_indicators_from_yaml
from backend.app.analytics import (
    compute_correlation,
    compute_derived_batch,
    compute_market_scores,
    compute_regime,
)
from backend.app.analytics.config import DOMAIN_WEIGHTS
from backend.app.portfolio import (
    create_transaction,
    ensure_demo_seeded,
    get_account_summary,
    list_accounts,
    list_dividends,
    list_transactions,
    portfolio_overview,
)
from backend.app.portfolio.service import persist_snapshot
from backend.app.ai import clear_ai_api_key, generate_daily_brief, get_ai_settings_public, upsert_ai_settings
from backend.app.jobs_guard import check_collect_cooldown, mark_collect_started
from backend.app.schemas import (
    AiSettingsUpdate,
    BriefRequest,
    CorrelationResponse,
    FeedStatusResponse,
    HealthResponse,
    IndicatorOut,
    JobOut,
    ObservationOut,
    RegimeResponse,
    RunJobRequest,
    RunJobResponse,
    ScoresResponse,
    TransactionCreate,
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
        try:
            seeded = ensure_demo_seeded()
            logger.info("Portfolio demo seed: %s", seeded)
        except Exception:  # noqa: BLE001
            logger.exception("Portfolio demo seed skipped/failed")
        # 기동 시 지수 관측이 비면 Yahoo 프로토타입 수집 시도 (키 불필요)
        try:
            row = fetch_one(
                "SELECT COUNT(*)::int AS n FROM indicator_observations WHERE value IS NOT NULL"
            )
            if row and int(row["n"] or 0) < 50:
                from collectors.market import collect_market

                logger.info("Boot: observations sparse — running Yahoo live collect")
                collect_market(job_type="boot", live=True)
        except Exception:  # noqa: BLE001
            logger.exception("Boot Yahoo collect skipped/failed")
        if not settings.fred_key_configured:
            logger.warning(
                "FRED_API_KEY unset — FRED collect will fail until env is provided. "
                "Frontend must never receive the key; use POST /api/v1/jobs/run."
            )
    yield


app = FastAPI(
    title="MarketPulse API",
    version=__version__,
    description="Phase 1–4: indicators, analytics, personal portfolio",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    settings = get_settings()
    db_ok = ping_db()
    body = HealthResponse(
        status="ok" if db_ok else "degraded",
        db="up" if db_ok else "down",
        version=settings.app_version,
        fred_key_configured=settings.fred_key_configured,
        allow_synthetic_fallback=settings.allow_synthetic_fallback,
    )
    if not db_ok:
        raise HTTPException(status_code=503, detail=body.model_dump())
    return body


@app.get("/api/v1/feed/status", response_model=FeedStatusResponse)
def feed_status() -> FeedStatusResponse:
    """수집/키/실관측 건수 — UI가 가짜 대신 상태를 표시할 때 사용."""
    settings = get_settings()
    notes: list[str] = []
    if not settings.fred_key_configured:
        notes.append(
            "FRED_API_KEY 미설정 — 거시·금리·유동성 FRED 시리즈 수집 불가. "
            "https://fred.stlouisfed.org/docs/api/api_key.html"
        )
    if settings.allow_synthetic_fallback:
        notes.append("ALLOW_SYNTHETIC_FALLBACK=1 — 테스트용 합성 시계열 허용 중")

    counts: dict[str, int] = {}
    jobs: list[dict[str, Any]] = []
    if ping_db():
        rows = fetch_all(
            """
            SELECT indicator_id, COUNT(*)::int AS n
            FROM indicator_observations
            WHERE value IS NOT NULL
            GROUP BY indicator_id
            ORDER BY indicator_id
            """
        )
        counts = {r["indicator_id"]: int(r["n"]) for r in rows}
        jobs = fetch_all(
            """
            SELECT job_id, provider, job_type, status, started_at, finished_at,
                   records_upserted, error_message
            FROM collection_jobs
            ORDER BY started_at DESC NULLS LAST
            LIMIT 8
            """
        )
    else:
        notes.append("DB 연결 불가")

    return FeedStatusResponse(
        fred_key_configured=settings.fred_key_configured,
        allow_synthetic_fallback=settings.allow_synthetic_fallback,
        observation_counts=counts,
        recent_jobs=jobs,
        notes=notes,
    )


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
    """수집 트리거. API 키는 서버 env에서만 읽음 (요청 바디/프론트에 키 금지)."""
    settings = get_settings()
    blocked = check_collect_cooldown(body.provider, settings.collect_cooldown_sec)
    if blocked:
        raise HTTPException(status_code=429, detail=blocked)

    mark_collect_started(body.provider)
    if body.provider == "fred":
        if not settings.fred_key_configured:
            logger.error("FRED collect refused: FRED_API_KEY not configured in server env")
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


@app.get("/api/v1/settings/ai")
def get_ai_settings() -> dict[str, Any]:
    return get_ai_settings_public()


@app.put("/api/v1/settings/ai")
def put_ai_settings(body: AiSettingsUpdate) -> dict[str, Any]:
    try:
        return upsert_ai_settings(body.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.delete("/api/v1/settings/ai/key")
def delete_ai_key() -> dict[str, Any]:
    return clear_ai_api_key()


@app.get("/api/v1/brief")
def get_brief(use_ai: bool = Query(default=True)) -> dict[str, Any]:
    return generate_daily_brief(use_ai=use_ai)


@app.post("/api/v1/brief")
def post_brief(body: BriefRequest) -> dict[str, Any]:
    return generate_daily_brief(use_ai=body.use_ai)


@app.get("/api/v1/scores", response_model=ScoresResponse)
def get_scores() -> ScoresResponse:
    """영역별 Score + 가중 종합 Market Score (규칙 기반)."""
    return ScoresResponse(**compute_market_scores())


@app.get("/api/v1/scores/{domain}")
def get_domain_score(domain: str) -> dict[str, Any]:
    key = domain.lower().replace("-", "_")
    aliases = {"rates_bond": "rates", "ratesbond": "rates"}
    key = aliases.get(key, key)
    if key not in DOMAIN_WEIGHTS:
        raise HTTPException(
            status_code=404,
            detail=f"unknown domain; choose from {list(DOMAIN_WEIGHTS)}",
        )
    payload = compute_market_scores()
    body = payload["domains"][key]
    body["analyzed_at"] = payload["analyzed_at"]
    body["market_score"] = payload["market_score"]
    return body


@app.get("/api/v1/regime", response_model=RegimeResponse)
def get_regime() -> RegimeResponse:
    """성장×물가 사분면 Market Regime + 유사 국면."""
    return RegimeResponse(**compute_regime())


@app.get("/api/v1/correlation", response_model=CorrelationResponse)
def get_correlation(
    ids: str | None = Query(
        default=None,
        description="comma-separated indicator_ids (optional)",
    ),
) -> CorrelationResponse:
    id_list = [x.strip() for x in ids.split(",") if x.strip()] if ids else None
    return CorrelationResponse(**compute_correlation(id_list))


@app.post("/api/v1/analytics/derived/run", response_model=RunJobResponse)
def run_derived() -> RunJobResponse:
    """MoM/YoY 등 최소 파생 관측을 derived_observations에 적재."""
    return RunJobResponse(result=compute_derived_batch())


# ---- Phase 4 portfolio ----


@app.get("/api/v1/portfolio/accounts")
def portfolio_accounts() -> dict[str, Any]:
    return list_accounts()


@app.post("/api/v1/portfolio/demo/seed")
def portfolio_demo_seed() -> dict[str, Any]:
    return ensure_demo_seeded()


@app.get("/api/v1/portfolio/{account_id}/overview")
def portfolio_account_overview(account_id: str) -> dict[str, Any]:
    return portfolio_overview(account_id)


@app.get("/api/v1/portfolio/{account_id}/summary")
def portfolio_account_summary(account_id: str) -> dict[str, Any]:
    return get_account_summary(account_id)


@app.get("/api/v1/portfolio/{account_id}/transactions")
def portfolio_account_transactions(account_id: str) -> dict[str, Any]:
    return list_transactions(account_id)


@app.post("/api/v1/portfolio/{account_id}/transactions")
def portfolio_create_tx(account_id: str, body: TransactionCreate) -> dict[str, Any]:
    return create_transaction(account_id, body.model_dump())


@app.get("/api/v1/portfolio/{account_id}/dividends")
def portfolio_account_dividends(account_id: str) -> dict[str, Any]:
    return list_dividends(account_id)


@app.post("/api/v1/portfolio/{account_id}/snapshots")
def portfolio_create_snapshot(account_id: str) -> dict[str, Any]:
    return persist_snapshot(account_id)
