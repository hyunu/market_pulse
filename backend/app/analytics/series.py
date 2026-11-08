"""관측 시계열 로더. DB 우선, 부족 시 결정 가능 synthetic (mode=synthetic)."""

from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any

from backend.app.db import fetch_all, ping_db


@dataclass
class Point:
    observation_date: date
    value: float


@dataclass
class SeriesBundle:
    points: list[Point]
    source_mode: str  # api | synthetic
    as_of: date | None


def _hash_seed(indicator_id: str) -> int:
    return int(hashlib.sha256(indicator_id.encode()).hexdigest()[:8], 16)


def synthetic_series(indicator_id: str, months: int = 120) -> list[Point]:
    """결정적 샘플 시계열 (데모/폴백). 실제 시장값 아님."""
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
        # monthly steps
        d = today - timedelta(days=30 * i)
        # simple LCG
        seed = (1103515245 * seed + 12345) & 0x7FFFFFFF
        noise = ((seed % 1000) / 1000.0 - 0.5) * (0.02 * abs(base) + 0.05)
        # mild cycles
        cycle = math.sin(i / 8.0) * (0.01 * abs(base) + 0.1)
        drift = 0.001 * abs(base) if "unemployment" not in indicator_id else -0.002
        if indicator_id == "us_unemployment":
            value = max(3.0, value + noise * 0.3 + cycle * 0.05)
        else:
            value = value + drift + noise + cycle * 0.1
        out.append(Point(observation_date=d, value=float(value)))
    return out


def load_series(indicator_id: str, limit: int = 500) -> SeriesBundle:
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
                )
        except Exception:
            pass
    points = synthetic_series(indicator_id)
    return SeriesBundle(points=points, source_mode="synthetic", as_of=points[-1].observation_date)


def values_of(bundle: SeriesBundle) -> list[float]:
    return [p.value for p in bundle.points]


def align_on_dates(
    series_map: dict[str, SeriesBundle],
) -> tuple[list[date], dict[str, list[float | None]]]:
    dates = sorted(
        {p.observation_date for b in series_map.values() for p in b.points}
    )
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
