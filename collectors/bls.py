"""BLS Public Data API skeleton.

문서: https://www.bls.gov/developers/api_signature_v2.htm
Phase 1: 엔드포인트·잡 기록 골격. 동일 시리즈는 FRED 경유 적재를 우선한다.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from backend.app.settings import get_settings
from collectors.base import finish_job, start_job

logger = logging.getLogger(__name__)

BLS_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/"


def fetch_bls_series(
    series_ids: list[str],
    *,
    start_year: int,
    end_year: int,
    api_key: str | None = None,
    client: httpx.Client | None = None,
) -> dict[str, Any]:
    """BLS v2 timeseries 조회 스켈레톤. 등록 키 권장(미등록도 제한적 호출 가능)."""
    payload: dict[str, Any] = {
        "seriesid": series_ids,
        "startyear": str(start_year),
        "endyear": str(end_year),
    }
    key = api_key if api_key is not None else get_settings().bls_api_key
    if key:
        payload["registrationkey"] = key

    owns = client is None
    client = client or httpx.Client(timeout=60.0)
    try:
        resp = client.post(BLS_URL, json=payload)
        resp.raise_for_status()
        return resp.json()
    finally:
        if owns:
            client.close()


def collect_bls(*, job_type: str = "daily") -> dict[str, Any]:
    """Phase 1: 잡만 기록하고 본수집은 스킵(스켈레톤)."""
    job_id = start_job("bls", job_type)
    meta = {
        "implemented": False,
        "note": "Skeleton only. Prefer FRED series for overlapping labor/inflation data in Phase 1.",
        "example_series": ["CUUR0000SA0", "LNS14000000"],
    }
    finish_job(job_id, status="success", records_upserted=0, meta=meta)
    logger.info("BLS collector skeleton completed job_id=%s", job_id)
    return {"job_id": job_id, "upserted": 0, "status": "success", "meta": meta}
