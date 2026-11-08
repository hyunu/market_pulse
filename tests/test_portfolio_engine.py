from datetime import date

import pytest

from backend.app.portfolio.demo_data import demo_bundle
from backend.app.portfolio.engine import (
    allocation_vs_targets,
    compute_performance,
    mark_holdings,
    reconstruct_holdings,
)
from backend.app.portfolio.metrics import max_drawdown, xirr
from backend.app.portfolio.service import get_account_summary, list_accounts, portfolio_overview


def test_xirr_simple_roundtrip():
    flows = [
        (date(2020, 1, 1), -1000.0),
        (date(2021, 1, 1), 1100.0),
    ]
    rate = xirr(flows)
    assert rate is not None
    assert abs(rate - 0.1) < 0.01


def test_mdd():
    assert max_drawdown([100, 120, 90, 95]) == pytest.approx(90 / 120 - 1)


def test_reconstruct_and_performance():
    bundle = demo_bundle()
    lots = reconstruct_holdings(bundle["transactions"])
    assert lots["SPY"]["quantity"] == 30  # 20+10
    assert lots["QQQ"]["quantity"] == 7  # 10-3
    holdings = mark_holdings(lots)
    assert any(h["symbol"] == "SPY" for h in holdings)
    alloc = allocation_vs_targets(holdings, bundle["targets"])
    assert alloc
    perf = compute_performance(bundle["transactions"], bundle["dividends"], holdings)
    assert perf["total_value"] > 0
    assert perf["xirr"] is not None or perf["simple_return"] is not None


def test_portfolio_service_demo():
    accounts = list_accounts()
    assert accounts["items"]
    overview = portfolio_overview("demo-main")
    assert overview["performance"]["total_value"] > 0
    assert overview["macro_exposure"]
    assert overview.get("disclaimer")
    summary = get_account_summary("demo-main")
    assert summary["holdings"]
