"""파생 지표 계산 유틸 (Phase 1: 공식 고정 + 단위 테스트 가능)."""

from __future__ import annotations


def mom_pct(current: float, previous: float) -> float:
    if previous == 0:
        raise ZeroDivisionError("previous is zero")
    return (current / previous - 1.0) * 100.0


def yoy_pct(current: float, previous_year: float) -> float:
    if previous_year == 0:
        raise ZeroDivisionError("previous_year is zero")
    return (current / previous_year - 1.0) * 100.0


def diff(current: float, previous: float) -> float:
    return current - previous


def simple_ma(values: list[float]) -> float:
    if not values:
        raise ValueError("values empty")
    return sum(values) / len(values)


def zscore(value: float, mean: float, std: float) -> float:
    if std == 0:
        raise ZeroDivisionError("std is zero")
    return (value - mean) / std


def core_cpi_3m_ann(index_t: float, index_t_minus_3: float) -> float:
    """월간 지수 → 3개월 연율(%). ((t / t-3)^4 - 1) * 100"""
    if index_t_minus_3 == 0:
        raise ZeroDivisionError("index_t_minus_3 is zero")
    return ((index_t / index_t_minus_3) ** 4 - 1.0) * 100.0


def pmi_vs_50(pmi: float) -> float:
    return pmi - 50.0


def clamp_score(raw: float, lo: float = -100.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, raw))
