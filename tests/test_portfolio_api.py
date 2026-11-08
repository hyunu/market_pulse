from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_portfolio_accounts():
    res = client.get("/api/v1/portfolio/accounts")
    assert res.status_code == 200
    body = res.json()
    assert body["items"]
    assert body["source_mode"] in {"api", "demo"}


def test_portfolio_overview():
    res = client.get("/api/v1/portfolio/demo-main/overview")
    assert res.status_code == 200
    body = res.json()
    assert body["performance"]["total_value"] > 0
    assert body["holdings"]
    assert body["allocation"]
    assert "xirr" in body["performance"]
    assert body["macro_exposure"]


def test_portfolio_transactions_and_dividends():
    tx = client.get("/api/v1/portfolio/demo-main/transactions")
    assert tx.status_code == 200
    assert len(tx.json()["items"]) >= 5
    div = client.get("/api/v1/portfolio/demo-main/dividends")
    assert div.status_code == 200
    assert div.json()["totals"]["count"] >= 1


def test_portfolio_create_tx_demo_mode():
    res = client.post(
        "/api/v1/portfolio/demo-main/transactions",
        json={
            "trade_date": "2025-06-01",
            "symbol": "CASH",
            "asset_class": "cash",
            "side": "deposit",
            "quantity": 1000,
            "price": 1,
            "currency": "KRW",
            "fx_rate": 1,
            "note": "test",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert "item" in body
