"""최소 파생 관측 배치 — derived_observations 적재."""

from __future__ import annotations

import json
import logging
from typing import Any

from collectors.derived import mom_pct, yoy_pct

from backend.app.analytics.series import load_series
from backend.app.db import get_conn, ping_db

logger = logging.getLogger(__name__)

# (source_indicator_id, derived_indicator_id, formula)
# derived ids are virtual labels stored in derived_observations.indicator_id
# We also ensure a matching indicators row exists as is_derived.
DERIVED_SPECS = [
    ("us_cpi", "us_cpi_yoy", "yoy", 12),
    ("us_core_cpi", "us_core_cpi_yoy", "yoy", 12),
    ("us_unemployment", "us_unemployment_mom", "mom", 1),
    ("us_sp500", "us_sp500_mom", "mom", 1),
    ("us_m2", "us_m2_yoy", "yoy", 12),
]


def _ensure_derived_meta(cur: Any, derived_id: str, parent_id: str, formula: str) -> None:
    cur.execute(
        """
        INSERT INTO indicators (
          indicator_id, name, name_ko, category, unit, frequency,
          provider, source_id, is_derived, parent_ids, description, is_active
        )
        SELECT
          %s,
          %s,
          %s,
          i.category,
          'percent',
          i.frequency,
          i.provider,
          %s,
          TRUE,
          ARRAY[%s]::text[],
          %s,
          TRUE
        FROM indicators i
        WHERE i.indicator_id = %s
        ON CONFLICT (indicator_id) DO UPDATE SET
          is_derived = TRUE,
          parent_ids = EXCLUDED.parent_ids,
          description = EXCLUDED.description
        """,
        (
            derived_id,
            f"{derived_id} ({formula})",
            derived_id,
            f"derived:{formula}:{parent_id}",
            parent_id,
            f"Phase 3 derived via {formula} from {parent_id}",
            parent_id,
        ),
    )


def compute_derived_batch() -> dict[str, Any]:
    if not ping_db():
        return {"status": "skipped", "reason": "db_down", "upserted": 0}

    upserted = 0
    errors: list[str] = []
    with get_conn() as conn:
        with conn.cursor() as cur:
            for parent_id, derived_id, formula, lag in DERIVED_SPECS:
                try:
                    # parent must exist in indicators for FK on derived_observations
                    cur.execute("SELECT 1 FROM indicators WHERE indicator_id = %s", (parent_id,))
                    if not cur.fetchone():
                        errors.append(f"{parent_id}: missing indicator meta")
                        continue
                    _ensure_derived_meta(cur, derived_id, parent_id, formula)
                    bundle = load_series(parent_id, limit=600)
                    pts = bundle.points
                    if len(pts) <= lag:
                        continue
                    for i in range(lag, len(pts)):
                        cur_v = pts[i].value
                        prev = pts[i - lag].value
                        try:
                            if formula == "yoy":
                                val = yoy_pct(cur_v, prev)
                            else:
                                val = mom_pct(cur_v, prev)
                        except ZeroDivisionError:
                            continue
                        inputs = {
                            "parent": parent_id,
                            "parent_date": pts[i].observation_date.isoformat(),
                            "base_date": pts[i - lag].observation_date.isoformat(),
                            "parent_value": cur_v,
                            "base_value": prev,
                            "source_mode": bundle.source_mode,
                        }
                        cur.execute(
                            """
                            INSERT INTO derived_observations (
                              indicator_id, observation_date, value, formula_id, inputs
                            ) VALUES (%s, %s, %s, %s, %s::jsonb)
                            ON CONFLICT (indicator_id, observation_date, formula_id)
                            DO UPDATE SET value = EXCLUDED.value, inputs = EXCLUDED.inputs, computed_at = NOW()
                            """,
                            (
                                derived_id,
                                pts[i].observation_date,
                                val,
                                formula,
                                json.dumps(inputs),
                            ),
                        )
                        upserted += cur.rowcount
                except Exception as exc:  # noqa: BLE001
                    logger.exception("derived failed %s", derived_id)
                    errors.append(f"{derived_id}: {exc}")

    return {
        "status": "success" if not errors else "partial",
        "upserted": upserted,
        "errors": errors,
        "specs": [s[1] for s in DERIVED_SPECS],
    }
