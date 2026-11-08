"""FRED / ALFRED collector.

공식 문서: https://fred.stlouisfed.org/docs/api/fred/
API 키는 환경변수 FRED_API_KEY 만 사용 (코드에 하드코딩 금지).
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any

import httpx

from backend.app.settings import get_settings
from collectors.base import (
    ObservationRow,
    finish_job,
    indicators_for_provider,
    insert_observations,
    parse_fred_value,
    start_job,
)

logger = logging.getLogger(__name__)

FRED_BASE = "https://api.stlouisfed.org/fred"


def _observation_start(years: int = 10) -> str:
    return (date.today() - timedelta(days=365 * years)).isoformat()


def fetch_series_observations(
    series_id: str,
    *,
    api_key: str,
    observation_start: str | None = None,
    client: httpx.Client | None = None,
) -> list[dict[str, Any]]:
    if not api_key:
        raise ValueError("FRED_API_KEY is required")

    params = {
        "series_id": series_id,
        "api_key": api_key,
        "file_type": "json",
        "observation_start": observation_start or _observation_start(10),
        "sort_order": "asc",
    }
    owns = client is None
    client = client or httpx.Client(timeout=60.0)
    try:
        resp = client.get(f"{FRED_BASE}/series/observations", params=params)
        resp.raise_for_status()
        payload = resp.json()
        return list(payload.get("observations") or [])
    finally:
        if owns:
            client.close()


def collect_fred(
    *,
    job_type: str = "daily",
    years: int = 10,
    client: httpx.Client | None = None,
) -> dict[str, Any]:
    settings = get_settings()
    job_id = start_job("fred", job_type)
    total = 0
    errors: list[str] = []

    try:
        api_key = (settings.fred_api_key or "").strip()
        if not api_key:
            msg = (
                "FRED_API_KEY 미설정 — FRED 공식 API 수집을 시작할 수 없습니다. "
                "환경변수 FRED_API_KEY를 설정한 뒤 재실행하세요. "
                "문서: https://fred.stlouisfed.org/docs/api/api_key.html"
            )
            logger.error(msg)
            finish_job(
                job_id,
                status="failed",
                records_upserted=0,
                error_message=msg,
                meta={"fred_key_configured": False},
            )
            return {
                "job_id": job_id,
                "upserted": 0,
                "errors": [msg],
                "status": "failed",
                "fred_key_configured": False,
            }

        indicators = indicators_for_provider("fred")
        if not indicators:
            finish_job(job_id, status="partial", records_upserted=0, meta={"warning": "no fred indicators"})
            return {"job_id": job_id, "upserted": 0, "errors": ["no indicators"]}

        owns = client is None
        client = client or httpx.Client(timeout=60.0)
        try:
            for ind in indicators:
                try:
                    obs = fetch_series_observations(
                        ind["source_id"],
                        api_key=api_key,
                        observation_start=_observation_start(years),
                        client=client,
                    )
                    rows: list[ObservationRow] = []
                    for item in obs:
                        od = datetime.strptime(item["date"], "%Y-%m-%d").date()
                        val = parse_fred_value(item.get("value"))
                        rows.append(
                            ObservationRow(
                                indicator_id=ind["indicator_id"],
                                observation_date=od,
                                value=val,
                                release_date=None,  # ALFRED realtime 확장 시 채움
                                vintage_id=None,
                                quality_flag="missing" if val is None else "ok",
                                raw_payload={"series_id": ind["source_id"], "fred": item},
                            )
                        )
                    total += insert_observations(rows)
                except Exception as exc:  # noqa: BLE001 — provider 단위 격리
                    logger.exception("FRED series failed: %s", ind["source_id"])
                    errors.append(f"{ind['source_id']}: {exc}")
        finally:
            if owns:
                client.close()

        status = "success" if not errors else ("partial" if total else "failed")
        finish_job(
            job_id,
            status=status,
            records_upserted=total,
            error_message="; ".join(errors) if errors else None,
            meta={"indicator_count": len(indicators), "errors": errors},
        )
        return {"job_id": job_id, "upserted": total, "errors": errors, "status": status}
    except Exception as exc:  # noqa: BLE001
        finish_job(job_id, status="failed", error_message=str(exc))
        raise
