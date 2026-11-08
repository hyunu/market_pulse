from __future__ import annotations

import math
from typing import Sequence

from collectors.derived import clamp_score, zscore


def mean(values: Sequence[float]) -> float:
    if not values:
        raise ValueError("empty")
    return sum(values) / len(values)


def stdev(values: Sequence[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = mean(values)
    var = sum((v - m) ** 2 for v in values) / (len(values) - 1)
    return math.sqrt(var)


def rolling_z(values: Sequence[float], lookback: int = 36) -> float | None:
    """최신값의 lookback 윈도우 z-score. 표본 부족 시 None."""
    if len(values) < max(6, lookback // 3):
        return None
    window = list(values[-lookback:])
    s = stdev(window)
    if s == 0:
        return 0.0
    return zscore(window[-1], mean(window), s)


def tanh_score(z: float, scale: float = 100.0) -> float:
    """z-score → [-100, 100] (tanh)."""
    return clamp_score(math.tanh(z / 2.0) * scale)


def pearson(xs: Sequence[float], ys: Sequence[float]) -> float | None:
    if len(xs) != len(ys) or len(xs) < 3:
        return None
    mx, my = mean(xs), mean(ys)
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    denx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    deny = math.sqrt(sum((y - my) ** 2 for y in ys))
    if denx == 0 or deny == 0:
        return None
    return num / (denx * deny)


def pct_change(values: Sequence[float], lag: int) -> float | None:
    if len(values) <= lag or values[-1 - lag] == 0:
        return None
    return (values[-1] / values[-1 - lag] - 1.0) * 100.0
