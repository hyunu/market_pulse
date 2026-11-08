"""BEA API skeleton (NIPA 등).

문서: https://apps.bea.gov/api/docs/index.htm
환경변수: BEA_API_KEY
Phase 1: 요청 골격 + 잡 기록. GDP 등은 FRED GDPC1 우선.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from backend.app.settings import get_settings
from collectors.base import finish_job, start_job

logger = logging.getLogger(__name__)

BEA_URL = "https://apps.bea.gov/api/data"


def fetch_bea(
    *,
    dataset_name: str = "NIPA",
    table_name: str = "T10101",
    frequency: str = "Q",
    year: str = "ALL",
    api_key: str | None = None,
    client: httpx.Client | None = None,
) -> dict[str, Any]:
    key = api_key if api_key is not None else get_settings().bea_api_key
    if not key:
        raise ValueError("BEA_API_KEY is required for live BEA calls")

    params = {
        "UserID": key,
        "method": "GetData",
        "DataSetName": dataset_name,
        "TableName": table_name,
        "Frequency": frequency,
        "Year": year,
        "ResultFormat": "JSON",
    }
    owns = client is None
    client = client or httpx.Client(timeout=60.0)
    try:
        resp = client.get(BEA_URL, params=params)
        resp.raise_for_status()
        return resp.json()
    finally:
        if owns:
            client.close()


def collect_bea(*, job_type: str = "daily") -> dict[str, Any]:
    job_id = start_job("bea", job_type)
    meta = {
        "implemented": False,
        "note": "Skeleton only. Use FRED GDPC1 for Phase 1 GDP backfill.",
        "example": {"DataSetName": "NIPA", "TableName": "T10101"},
    }
    finish_job(job_id, status="success", records_upserted=0, meta=meta)
    logger.info("BEA collector skeleton completed job_id=%s", job_id)
    return {"job_id": job_id, "upserted": 0, "status": "success", "meta": meta}
