import pytest

from backend.app.analytics.config import DOMAIN_WEIGHTS
from backend.app.analytics.regime import compute_regime_payload
from backend.app.analytics.scoring import domain_score, market_scores
from backend.app.analytics.stats import pearson, rolling_z, tanh_score
from backend.app.analytics.correlation import compute_correlation_matrix


def test_domain_weights_sum_and_keys():
    assert set(DOMAIN_WEIGHTS) == {
        "growth",
        "liquidity",
        "inflation",
        "rates",
        "earnings",
        "valuation",
        "risk",
    }
    assert sum(DOMAIN_WEIGHTS.values()) == 100


def test_tanh_score_bounds():
    assert -100 <= tanh_score(10) <= 100
    assert -100 <= tanh_score(-10) <= 100
    assert abs(tanh_score(0)) < 1e-9


def test_rolling_z_and_pearson():
    vals = [float(i) for i in range(1, 50)]
    z = rolling_z(vals, lookback=36)
    assert z is not None
    assert pearson([1, 2, 3, 4], [1, 2, 3, 4]) == pytest.approx(1.0)
    assert pearson([1, 2, 3], [1, 2]) is None


def test_market_scores_structure():
    payload = market_scores()
    assert "market_score" in payload
    assert payload["market_score"] is not None
    assert -100 <= payload["market_score"] <= 100
    assert set(payload["domains"]) == set(DOMAIN_WEIGHTS)
    growth = domain_score("growth")
    assert growth["score"] is not None
    assert growth["drivers"]


def test_regime_quadrant_and_similar():
    regime = compute_regime_payload()
    assert regime["label"] in {
        "Goldilocks",
        "Overheating",
        "Disinflationary slowdown",
        "Stagflation risk",
    }
    assert regime["quadrant"]["growth"] in {"up", "down"}
    assert regime["quadrant"]["inflation"] in {"up", "down"}
    assert "confidence" in regime
    assert isinstance(regime["similar_regimes"], list)


def test_correlation_matrix_diagonal():
    corr = compute_correlation_matrix(["us_sp500", "us_vix", "us_treasury_10y"])
    assert corr["matrix"]["us_sp500"]["us_sp500"] == 1.0
    assert corr["pairs_computed"] >= 0
