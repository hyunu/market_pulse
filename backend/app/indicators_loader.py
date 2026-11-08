from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from backend.app.db import get_conn
from backend.app.settings import get_settings


def load_yaml(path: Path | None = None) -> dict[str, Any]:
    p = path or get_settings().indicators_path
    with p.open(encoding="utf-8") as f:
        data = yaml.safe_load(f)
    if not isinstance(data, dict) or "indicators" not in data:
        raise ValueError(f"Invalid indicators yaml: {p}")
    return data


def sync_indicators_from_yaml(path: Path | None = None) -> int:
    """YAML 메타를 indicators 테이블에 upsert. 반환: 처리 건수."""
    data = load_yaml(path)
    rows = data["indicators"]
    count = 0
    with get_conn() as conn:
        with conn.cursor() as cur:
            for item in rows:
                cur.execute(
                    """
                    INSERT INTO indicators (
                      indicator_id, name, name_ko, category, unit, frequency,
                      provider, source_id, geography, description, is_derived, is_active
                    ) VALUES (
                      %(indicator_id)s, %(name)s, %(name_ko)s, %(category)s, %(unit)s, %(frequency)s,
                      %(provider)s, %(source_id)s, %(geography)s, %(description)s, FALSE, TRUE
                    )
                    ON CONFLICT (indicator_id) DO UPDATE SET
                      name = EXCLUDED.name,
                      name_ko = EXCLUDED.name_ko,
                      category = EXCLUDED.category,
                      unit = EXCLUDED.unit,
                      frequency = EXCLUDED.frequency,
                      provider = EXCLUDED.provider,
                      source_id = EXCLUDED.source_id,
                      geography = EXCLUDED.geography,
                      description = EXCLUDED.description,
                      is_active = TRUE
                    """,
                    {
                        "indicator_id": item["indicator_id"],
                        "name": item["name"],
                        "name_ko": item.get("name_ko"),
                        "category": item["category"],
                        "unit": item.get("unit"),
                        "frequency": item["frequency"],
                        "provider": item["provider"],
                        "source_id": item["source_id"],
                        "geography": item.get("geography"),
                        "description": item.get("license_note") or item.get("description"),
                    },
                )
                count += 1
    return count
