from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_scores_endpoint():
    res = client.get("/api/v1/scores")
    assert res.status_code == 200
    body = res.json()
    assert "market_score" in body
    assert "domains" in body
    assert body["analyzed_at"]


def test_regime_endpoint():
    res = client.get("/api/v1/regime")
    assert res.status_code == 200
    body = res.json()
    assert body["label"]
    assert "similar_regimes" in body


def test_correlation_endpoint():
    res = client.get("/api/v1/correlation?ids=us_sp500,us_vix")
    assert res.status_code == 200
    body = res.json()
    assert body["indicators"] == ["us_sp500", "us_vix"]


def test_domain_score_endpoint():
    res = client.get("/api/v1/scores/growth")
    assert res.status_code == 200
    assert res.json()["domain"] == "growth"
