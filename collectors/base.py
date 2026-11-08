from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Any, Sequence

from backend.app.db import get_conn

logger = logging.getLogger(__name__)


@dataclass
class ObservationRow:
    indicator_id: str
    observation_date: date
    value: float | None
    release_date: date | None = None
    vintage_id: str | None = None
    source_revision: int = 1
    quality_flag: str = "ok"
    raw_payload: dict[str, Any] | None = None


def parse_fred_value(raw: str | None) -> float | None:
    if raw is None:
        return None
    text = str(raw).strip()
    if text in {"", ".", "NA", "na", "null", "None"}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def start_job(provider: str, job_type: str = "daily") -> int:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO collection_jobs (provider, job_type, status, started_at)
                VALUES (%s, %s, 'running', NOW())
                RETURNING job_id
                """,
                (provider, job_type),
            )
            row = cur.fetchone()
            return int(row["job_id"])


def finish_job(
    job_id: int,
    *,
    status: str,
    records_upserted: int = 0,
    error_message: str | None = None,
    meta: dict[str, Any] | None = None,
) -> None:
    import json

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE collection_jobs
                SET status = %s,
                    finished_at = NOW(),
                    records_upserted = %s,
                    error_message = %s,
                    meta = %s::jsonb
                WHERE job_id = %s
                """,
                (
                    status,
                    records_upserted,
                    error_message,
                    json.dumps(meta or {}),
                    job_id,
                ),
            )


def insert_observations(rows: Sequence[ObservationRow]) -> int:
    """중복 키는 skip (원본 불변). 신규만 insert. 반환: 실제 insert 건수."""
    if not rows:
        return 0
    inserted = 0
    import json

    with get_conn() as conn:
        with conn.cursor() as cur:
            for row in rows:
                cur.execute(
                    """
                    INSERT INTO indicator_observations (
                      indicator_id, observation_date, release_date, value,
                      collected_at, vintage_id, source_revision, quality_flag, raw_payload
                    ) VALUES (
                      %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb
                    )
                    ON CONFLICT (indicator_id, observation_date, vintage_id, source_revision)
                    DO NOTHING
                    """,
                    (
                        row.indicator_id,
                        row.observation_date,
                        row.release_date,
                        row.value,
                        datetime.now(timezone.utc),
                        row.vintage_id,
                        row.source_revision,
                        row.quality_flag,
                        json.dumps(row.raw_payload or {}),
                    ),
                )
                inserted += cur.rowcount
    return inserted


def indicators_for_provider(provider: str) -> list[dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT indicator_id, source_id, frequency, name
                FROM indicators
                WHERE provider = %s AND is_active = TRUE
                ORDER BY indicator_id
                """,
                (provider,),
            )
            return list(cur.fetchall())
