"""XIRR / MDD / 단순 성과 지표."""

from __future__ import annotations

import math
from datetime import date
from typing import Sequence


def _year_frac(d0: date, d1: date) -> float:
    return (d1 - d0).days / 365.25


def xirr(
    cashflows: Sequence[tuple[date, float]],
    *,
    guess: float = 0.1,
    max_iter: int = 100,
    tol: float = 1e-7,
) -> float | None:
    """Newton-Raphson XIRR. cashflows: (date, amount) with amount sign convention
    (outflow negative / inflow positive). Needs mixed signs.
    """
    flows = [(d, float(a)) for d, a in cashflows if a != 0]
    if len(flows) < 2:
        return None
    if not (any(a < 0 for _, a in flows) and any(a > 0 for _, a in flows)):
        return None
    flows.sort(key=lambda x: x[0])
    d0 = flows[0][0]

    def npv(rate: float) -> float:
        return sum(a / ((1 + rate) ** _year_frac(d0, d)) for d, a in flows)

    def d_npv(rate: float) -> float:
        return sum(
            -_year_frac(d0, d) * a / ((1 + rate) ** (_year_frac(d0, d) + 1))
            for d, a in flows
        )

    rate = guess
    for _ in range(max_iter):
        f = npv(rate)
        df = d_npv(rate)
        if abs(df) < 1e-12:
            break
        new_rate = rate - f / df
        if new_rate <= -0.9999:
            new_rate = -0.9999
        if abs(new_rate - rate) < tol:
            return new_rate
        rate = new_rate
    # fallback scan
    best_r, best_abs = rate, abs(npv(rate))
    r = -0.9
    while r <= 5.0:
        v = abs(npv(r))
        if v < best_abs:
            best_abs, best_r = v, r
        r += 0.05
    return best_r if best_abs < 1.0 else None


def max_drawdown(nav_series: Sequence[float]) -> float | None:
    """MDD as negative fraction (e.g. -0.23)."""
    if len(nav_series) < 2:
        return None
    peak = nav_series[0]
    mdd = 0.0
    for v in nav_series:
        peak = max(peak, v)
        if peak <= 0:
            continue
        dd = v / peak - 1.0
        mdd = min(mdd, dd)
    return mdd


def simple_return(start_value: float, end_value: float) -> float | None:
    if start_value == 0:
        return None
    return end_value / start_value - 1.0


def annualized_return(total_return: float, years: float) -> float | None:
    if years <= 0:
        return None
    if total_return <= -1:
        return -1.0
    return (1 + total_return) ** (1 / years) - 1
