"""DB 없이도 UI가 동작하도록 하는 데모 포트폴리오 (실제 투자 권유 아님)."""

from __future__ import annotations

from copy import deepcopy
from datetime import date
from typing import Any

DEMO_ACCOUNT_ID = "demo-main"

_DEMO: dict[str, Any] = {
    "account": {
        "account_id": DEMO_ACCOUNT_ID,
        "name": "데모 종합계좌",
        "base_currency": "KRW",
        "description": "Phase 4 UI/API 데모용 샘플 포트폴리오",
        "is_demo": True,
    },
    "targets": [
        {"asset_class": "equity", "target_weight": 0.55},
        {"asset_class": "bond", "target_weight": 0.20},
        {"asset_class": "cash", "target_weight": 0.10},
        {"asset_class": "commodity", "target_weight": 0.05},
        {"asset_class": "crypto", "target_weight": 0.05},
        {"asset_class": "etf", "target_weight": 0.05},
    ],
    "transactions": [
        {"tx_id": 1, "trade_date": "2022-01-10", "symbol": "CASH", "asset_class": "cash", "side": "deposit", "quantity": 20000000, "price": 1, "fee": 0, "currency": "KRW", "fx_rate": 1, "note": "초기 입금"},
        {"tx_id": 2, "trade_date": "2022-01-15", "symbol": "SPY", "asset_class": "etf", "side": "buy", "quantity": 20, "price": 450, "fee": 5, "currency": "USD", "fx_rate": 1200, "note": "S&P500 ETF"},
        {"tx_id": 3, "trade_date": "2022-03-01", "symbol": "QQQ", "asset_class": "etf", "side": "buy", "quantity": 10, "price": 350, "fee": 5, "currency": "USD", "fx_rate": 1220, "note": "Nasdaq ETF"},
        {"tx_id": 4, "trade_date": "2022-06-15", "symbol": "005930.KS", "asset_class": "equity", "side": "buy", "quantity": 50, "price": 65000, "fee": 0, "currency": "KRW", "fx_rate": 1, "note": "삼성전자"},
        {"tx_id": 5, "trade_date": "2022-09-01", "symbol": "TLT", "asset_class": "bond", "side": "buy", "quantity": 30, "price": 110, "fee": 3, "currency": "USD", "fx_rate": 1350, "note": "미국채 ETF"},
        {"tx_id": 6, "trade_date": "2023-01-20", "symbol": "GLD", "asset_class": "commodity", "side": "buy", "quantity": 8, "price": 175, "fee": 3, "currency": "USD", "fx_rate": 1230, "note": "금 ETF"},
        {"tx_id": 7, "trade_date": "2023-05-10", "symbol": "BTC-USD", "asset_class": "crypto", "side": "buy", "quantity": 0.15, "price": 28000, "fee": 0, "currency": "USD", "fx_rate": 1320, "note": "비트코인"},
        {"tx_id": 8, "trade_date": "2023-11-02", "symbol": "SPY", "asset_class": "etf", "side": "buy", "quantity": 10, "price": 420, "fee": 5, "currency": "USD", "fx_rate": 1340, "note": "추가 매수"},
        {"tx_id": 9, "trade_date": "2024-03-15", "symbol": "QQQ", "asset_class": "etf", "side": "sell", "quantity": 3, "price": 440, "fee": 5, "currency": "USD", "fx_rate": 1330, "note": "일부 실현"},
        {"tx_id": 10, "trade_date": "2024-08-01", "symbol": "CASH", "asset_class": "cash", "side": "deposit", "quantity": 3000000, "price": 1, "fee": 0, "currency": "KRW", "fx_rate": 1, "note": "추가 입금"},
        {"tx_id": 11, "trade_date": "2025-01-10", "symbol": "005930.KS", "asset_class": "equity", "side": "buy", "quantity": 20, "price": 72000, "fee": 0, "currency": "KRW", "fx_rate": 1, "note": "삼성전자 추가"},
    ],
    "dividends": [
        {"dividend_id": 1, "ex_date": "2023-03-17", "pay_date": "2023-04-28", "symbol": "SPY", "amount": 45.0, "currency": "USD", "fx_rate": 1320, "tax": 6.75, "reinvested": False, "note": "분기 배당"},
        {"dividend_id": 2, "ex_date": "2023-06-16", "pay_date": "2023-07-31", "symbol": "SPY", "amount": 48.0, "currency": "USD", "fx_rate": 1300, "tax": 7.2, "reinvested": False, "note": "분기 배당"},
        {"dividend_id": 3, "ex_date": "2023-09-15", "pay_date": "2023-10-31", "symbol": "SPY", "amount": 50.0, "currency": "USD", "fx_rate": 1340, "tax": 7.5, "reinvested": False, "note": "분기 배당"},
        {"dividend_id": 4, "ex_date": "2024-03-15", "pay_date": "2024-04-30", "symbol": "SPY", "amount": 55.0, "currency": "USD", "fx_rate": 1350, "tax": 8.25, "reinvested": False, "note": "분기 배당"},
        {"dividend_id": 5, "ex_date": "2024-04-01", "pay_date": "2024-04-20", "symbol": "005930.KS", "amount": 180000, "currency": "KRW", "fx_rate": 1, "tax": 27720, "reinvested": False, "note": "결산 배당"},
    ],
}

# 평가용 최신 마크 가격 (데모). base currency 환산은 fx 포함 mark
DEMO_MARKS: dict[str, dict[str, float]] = {
    "SPY": {"price": 560, "fx_rate": 1380, "currency": "USD"},
    "QQQ": {"price": 480, "fx_rate": 1380, "currency": "USD"},
    "005930.KS": {"price": 78000, "fx_rate": 1, "currency": "KRW"},
    "TLT": {"price": 95, "fx_rate": 1380, "currency": "USD"},
    "GLD": {"price": 220, "fx_rate": 1380, "currency": "USD"},
    "BTC-USD": {"price": 68000, "fx_rate": 1380, "currency": "USD"},
    "CASH": {"price": 1, "fx_rate": 1, "currency": "KRW"},
}


def demo_bundle() -> dict[str, Any]:
    return deepcopy(_DEMO)


def parse_date(value: str | date) -> date:
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])
