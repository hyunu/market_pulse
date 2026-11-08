"""관측 시계열 로더. DB 실관측 우선. 합성 폴백은 ALLOW_SYNTHETIC_FALLBACK=1 일 때만."""

from __future__ import annotations

import hashlib
import logging
import math
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any

from backend.app.db import fetch_all, ping_db
from backend.app.settings import get_settings

logger = logging.getLogger(__name__)


@dataclass
class Point:
    observation_date: date
    value: float


@dataclass
class SeriesBundle:
    points: list[Point]
    source_mode: str  # api | unavailable | synthetic
    as_of: date | None
    note: str | None = None


def _hash_seed(indicator_id: str) -> int:
    return int(hashlib.sha256(indicator_id.encode()).hexdigest()[:8], 16)


def synthetic_series(indicator_id: str, months: int = 120) -> list[Point]:
    """결정적 샘플 시계열 (테스트 전용). 실제 시장값 아님."""
    seed = _hash_seed(indicator_id)
    bases = {
        "us_sp500": 4800,
        "us_nasdaq": 15000,
        "us_gdp": 22000,
        "us_indpro": 100,
        "us_retail_sales": 650000,
        "us_nfp": 155000,
        "us_unemployment": 4.2,
        "us_cpi": 300,
        "us_core_cpi": 305,
        "us_pce": 120,
        "us_core_pce": 118,
        "us_m2": 20500,
        "us_fed_assets": 7500000,
        "us_tga": 600000,
        "us_on_rrp": 500,
        "us_fed_funds": 5.0,
        "us_treasury_2y": 4.5,
        "us_treasury_10y": 4.2,
        "us_treasury_30y": 4.4,
        "us_hy_spread": 3.5,
        "us_vix": 18,
        "us_move": 100,
        "us_stress": -0.2,
        "us_nfci": -0.25,
        "kr_kospi": 2500,
        "cn_shanghai": 3000,
        "fx_usdkurw": 1350,
    }
    base = float(bases.get(indicator_id, 100.0))
    out: list[Point] = []
    today = date.today()
    value = base
    for i in range(months, -1, -1):
        d = today - timedelta(days=30 * i)
        seed = (1103515245 * seed + 12345) & 0x7FFFFFFF
        noise = ((seed % 1000) / 1000.0 - 0.5) * (0.02 * abs(base) + 0.05)
        cycle = math.sin(i / 8.0) * (0.01 * abs(base) + 0.1)
        drift = 0.001 * abs(base) if "unemployment" not in indicator_id else -0.002
        if indicator_id == "us_unemployment":
            value = max(3.0, value + noise * 0.3 + cycle * 0.05)
        else:
            value = value + drift + noise + cycle * 0.1
        out.append(Point(observation_date=d, value=float(value)))
    return out


def empty_bundle(note: str = "데이터 부족") -> SeriesBundle:
    return SeriesBundle(points=[], source_mode="unavailable", as_of=None, note=note)


def load_series(indicator_id: str, limit: int = 5000) -> SeriesBundle:
    settings = get_settings()
    if ping_db():
        try:
            rows = fetch_all(
                """
                SELECT observation_date, value
                FROM indicator_observations
                WHERE indicator_id = %s AND value IS NOT NULL
                ORDER BY observation_date ASC
                LIMIT %s
                """,
                (indicator_id, limit),
            )
            if len(rows) >= 8:
                points = [
                    Point(observation_date=r["observation_date"], value=float(r["value"]))
                    for r in rows
                ]
                return SeriesBundle(
                    points=points,
                    source_mode="api",
                    as_of=points[-1].observation_date,
                    note=None,
                )
            if rows:
                # 관측은 있으나 점수 산출에 부족
                points = [
                    Point(observation_date=r["observation_date"], value=float(r["value"]))
                    for r in rows
                ]
                return SeriesBundle(
                    points=points,
                    source_mode="api",
                    as_of=points[-1].observation_date,
                    note="관측 부족(점수 산출 최소 미만)",
                )
        except Exception:  # noqa: BLE001
            logger.exception("load_series DB read failed: %s", indicator_id)

    if settings.allow_synthetic_fallback:
        points = synthetic_series(indicator_id)
        return SeriesBundle(
            points=points,
            source_mode="synthetic",
            as_of=points[-1].observation_date,
            note="ALLOW_SYNTHETIC_FALLBACK",
        )

    return empty_bundle("실관측 없음")


def values_of(bundle: SeriesBundle) -> list[float]:
    return [p.value for p in bundle.points]


def align_on_dates(
    series_map: dict[str, SeriesBundle],
) -> tuple[list[date], dict[str, list[float | None]]]:
    dates = sorted({p.observation_date for b in series_map.values() for p in b.points})
    aligned: dict[str, list[float | None]] = {}
    for key, bundle in series_map.items():
        m = {p.observation_date: p.value for p in bundle.points}
        aligned[key] = [m.get(d) for d in dates]
    return dates, aligned


def coverage_ratio(needed: list[str], available_modes: dict[str, str]) -> float:
    if not needed:
        return 0.0
    ok = sum(1 for i in needed if i in available_modes)
    return ok / len(needed)


def freshness_days(as_of: date | None) -> int | None:
    if as_of is None:
        return None
    return (date.today() - as_of).days


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
