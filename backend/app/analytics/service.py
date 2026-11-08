from __future__ import annotations

from typing import Any

from backend.app.analytics.correlation import compute_correlation_matrix
from backend.app.analytics.derived_batch import compute_derived_batch as _derived_batch
from backend.app.analytics.regime import compute_regime_payload
from backend.app.analytics.scoring import market_scores
from backend.app.analytics.series import now_iso


def compute_market_scores() -> dict[str, Any]:
    payload = market_scores()
    payload["analyzed_at"] = now_iso()
    return payload


def compute_regime() -> dict[str, Any]:
    payload = compute_regime_payload()
    payload["analyzed_at"] = now_iso()
    return payload


def compute_correlation(indicator_ids: list[str] | None = None) -> dict[str, Any]:
    payload = compute_correlation_matrix(indicator_ids)
    payload["analyzed_at"] = now_iso()
    return payload


def compute_derived_batch() -> dict[str, Any]:
    result = _derived_batch()
    result["analyzed_at"] = now_iso()
    return result
