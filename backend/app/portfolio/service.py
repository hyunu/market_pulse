from __future__ import annotations

import logging
from datetime import date
from typing import Any

from backend.app.db import fetch_all, fetch_one, get_conn, ping_db
from backend.app.portfolio.demo_data import DEMO_ACCOUNT_ID, demo_bundle
from backend.app.portfolio.engine import (
    allocation_vs_targets,
    compute_performance,
    dividend_totals,
    mark_holdings,
    reconstruct_holdings,
)

logger = logging.getLogger(__name__)


def ensure_demo_seeded() -> dict[str, Any]:
    """DB가 있으면 데모 계좌가 있는지 확인하고, 없으면 demo_data 기준으로 삽입."""
    if not ping_db():
        return {"status": "memory", "account_id": DEMO_ACCOUNT_ID}
    existing = fetch_one(
        "SELECT account_id FROM portfolio_accounts WHERE account_id = %s",
        (DEMO_ACCOUNT_ID,),
    )
    if existing:
        return {"status": "exists", "account_id": DEMO_ACCOUNT_ID}

    bundle = demo_bundle()
    with get_conn() as conn:
        with conn.cursor() as cur:
            acc = bundle["account"]
            cur.execute(
                """
                INSERT INTO portfolio_accounts (account_id, name, base_currency, description, is_demo)
                VALUES (%s, %s, %s, %s, TRUE)
                ON CONFLICT (account_id) DO NOTHING
                """,
                (acc["account_id"], acc["name"], acc["base_currency"], acc["description"]),
            )
            for t in bundle["targets"]:
                cur.execute(
                    """
                    INSERT INTO portfolio_targets (account_id, asset_class, target_weight)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (account_id, asset_class) DO UPDATE
                      SET target_weight = EXCLUDED.target_weight
                    """,
                    (DEMO_ACCOUNT_ID, t["asset_class"], t["target_weight"]),
                )
            for tx in bundle["transactions"]:
                cur.execute(
                    """
                    INSERT INTO portfolio_transactions (
                      account_id, trade_date, symbol, asset_class, side,
                      quantity, price, fee, currency, fx_rate, note
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (
                        DEMO_ACCOUNT_ID,
                        tx["trade_date"],
                        tx["symbol"],
                        tx["asset_class"],
                        tx["side"],
                        tx["quantity"],
                        tx["price"],
                        tx["fee"],
                        tx["currency"],
                        tx["fx_rate"],
                        tx["note"],
                    ),
                )
            for d in bundle["dividends"]:
                cur.execute(
                    """
                    INSERT INTO portfolio_dividends (
                      account_id, ex_date, pay_date, symbol, amount, currency,
                      fx_rate, tax, reinvested, note
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (
                        DEMO_ACCOUNT_ID,
                        d["ex_date"],
                        d["pay_date"],
                        d["symbol"],
                        d["amount"],
                        d["currency"],
                        d["fx_rate"],
                        d["tax"],
                        d["reinvested"],
                        d["note"],
                    ),
                )
    return {"status": "seeded", "account_id": DEMO_ACCOUNT_ID}


def _load_from_db(account_id: str) -> dict[str, Any] | None:
    if not ping_db():
        return None
    acc = fetch_one("SELECT * FROM portfolio_accounts WHERE account_id = %s", (account_id,))
    if not acc:
        return None
    txs = fetch_all(
        """
        SELECT tx_id, trade_date, symbol, asset_class, side, quantity, price, fee,
               currency, fx_rate, note
        FROM portfolio_transactions WHERE account_id = %s ORDER BY trade_date, tx_id
        """,
        (account_id,),
    )
    dividends = fetch_all(
        """
        SELECT dividend_id, ex_date, pay_date, symbol, amount, currency, fx_rate, tax, reinvested, note
        FROM portfolio_dividends WHERE account_id = %s ORDER BY pay_date
        """,
        (account_id,),
    )
    targets = fetch_all(
        "SELECT asset_class, target_weight FROM portfolio_targets WHERE account_id = %s",
        (account_id,),
    )
    # serialize dates
    for t in txs:
        t["trade_date"] = t["trade_date"].isoformat()
    for d in dividends:
        if d.get("ex_date"):
            d["ex_date"] = d["ex_date"].isoformat()
        d["pay_date"] = d["pay_date"].isoformat()
    return {
        "account": dict(acc),
        "transactions": [dict(t) for t in txs],
        "dividends": [dict(d) for d in dividends],
        "targets": [dict(t) for t in targets],
        "source_mode": "api",
    }


def _load_bundle(account_id: str) -> dict[str, Any]:
    db = _load_from_db(account_id)
    if db:
        return db
    if account_id != DEMO_ACCOUNT_ID:
        # unknown account without DB → empty shell pointing to demo
        bundle = demo_bundle()
        bundle["source_mode"] = "demo"
        return bundle
    bundle = demo_bundle()
    bundle["source_mode"] = "demo"
    return bundle


def list_accounts() -> dict[str, Any]:
    if ping_db():
        try:
            ensure_demo_seeded()
            rows = fetch_all(
                """
                SELECT account_id, name, base_currency, description, is_demo, created_at
                FROM portfolio_accounts ORDER BY account_id
                """
            )
            for r in rows:
                if r.get("created_at"):
                    r["created_at"] = r["created_at"].isoformat()
            return {"items": rows, "source_mode": "api"}
        except Exception:  # noqa: BLE001
            logger.exception("list_accounts db failed")
    bundle = demo_bundle()
    return {"items": [bundle["account"]], "source_mode": "demo"}


def list_transactions(account_id: str) -> dict[str, Any]:
    bundle = _load_bundle(account_id)
    return {
        "account_id": account_id,
        "items": bundle["transactions"],
        "source_mode": bundle.get("source_mode", "demo"),
    }


def list_dividends(account_id: str) -> dict[str, Any]:
    bundle = _load_bundle(account_id)
    totals = dividend_totals(bundle["dividends"])
    return {
        "account_id": account_id,
        "items": bundle["dividends"],
        "totals": totals,
        "source_mode": bundle.get("source_mode", "demo"),
    }


def create_transaction(account_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    if not ping_db():
        # memory append for demo session only
        bundle = demo_bundle()
        tx = {
            "tx_id": max(t["tx_id"] for t in bundle["transactions"]) + 1,
            **payload,
        }
        return {"item": tx, "source_mode": "demo", "persisted": False}

    ensure_demo_seeded()
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO portfolio_transactions (
                  account_id, trade_date, symbol, asset_class, side,
                  quantity, price, fee, currency, fx_rate, note
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING tx_id, trade_date, symbol, asset_class, side, quantity, price,
                          fee, currency, fx_rate, note
                """,
                (
                    account_id,
                    payload["trade_date"],
                    payload["symbol"],
                    payload["asset_class"],
                    payload["side"],
                    payload["quantity"],
                    payload["price"],
                    payload.get("fee") or 0,
                    payload.get("currency") or "USD",
                    payload.get("fx_rate") or 1,
                    payload.get("note"),
                ),
            )
            row = dict(cur.fetchone())
            row["trade_date"] = row["trade_date"].isoformat()
    return {"item": row, "source_mode": "api", "persisted": True}


def get_account_summary(account_id: str) -> dict[str, Any]:
    bundle = _load_bundle(account_id)
    lots = reconstruct_holdings(bundle["transactions"])
    holdings = mark_holdings(lots)
    alloc = allocation_vs_targets(holdings, bundle["targets"])
    perf = compute_performance(bundle["transactions"], bundle["dividends"], holdings)
    div = dividend_totals(bundle["dividends"])
    return {
        "account": bundle["account"],
        "performance": perf,
        "holdings": holdings,
        "allocation": alloc,
        "dividends": div,
        "targets": bundle["targets"],
        "source_mode": bundle.get("source_mode", "demo"),
        "disclaimer": "데모/계산 결과는 정보 제공 목적이며 매매를 권유하지 않습니다.",
    }


def portfolio_overview(account_id: str = DEMO_ACCOUNT_ID) -> dict[str, Any]:
    summary = get_account_summary(account_id)
    # macro exposure hints (static mapping for demo holdings)
    exposure = []
    for h in summary["holdings"]:
        if h["symbol"] in {"SPY", "QQQ"}:
            exposure.append(
                {
                    "symbol": h["symbol"],
                    "themes": ["US growth", "liquidity/rates sensitive"],
                    "note": "미국 지수 ETF — Phase 3 Growth/Rates/Risk 점수와 연동해 해석",
                }
            )
        elif h["symbol"] == "TLT":
            exposure.append(
                {
                    "symbol": h["symbol"],
                    "themes": ["duration", "rates"],
                    "note": "장기 국채 — 금리·유동성 국면에 민감",
                }
            )
        elif h["symbol"] == "005930.KS":
            exposure.append(
                {
                    "symbol": h["symbol"],
                    "themes": ["KR equity", "global cycle"],
                    "note": "한국 대형 수출주 — 원달러·글로벌 성장 노출",
                }
            )
        elif h["symbol"] == "BTC-USD":
            exposure.append(
                {
                    "symbol": h["symbol"],
                    "themes": ["risk appetite", "liquidity"],
                    "note": "고위험 자산 — Risk/Liquidity 점수 동시 악화 시 변동성 확대 가능",
                }
            )
    summary["macro_exposure"] = exposure
    summary["as_of"] = date.today().isoformat()
    return summary


def persist_snapshot(account_id: str) -> dict[str, Any]:
    summary = get_account_summary(account_id)
    if not ping_db() or summary["source_mode"] == "demo":
        return {"status": "skipped", "reason": "db_unavailable_or_demo", "summary": summary["performance"]}
    import json

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO portfolio_snapshots (account_id, as_of, total_value, cash_value, holdings, metrics)
                VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb)
                ON CONFLICT (account_id, as_of) DO UPDATE SET
                  total_value = EXCLUDED.total_value,
                  cash_value = EXCLUDED.cash_value,
                  holdings = EXCLUDED.holdings,
                  metrics = EXCLUDED.metrics
                RETURNING snapshot_id, as_of, total_value
                """,
                (
                    account_id,
                    date.today(),
                    summary["performance"]["total_value"],
                    next((h["market_value"] for h in summary["holdings"] if h["symbol"] == "CASH"), 0),
                    json.dumps(summary["holdings"]),
                    json.dumps(summary["performance"]),
                ),
            )
            row = dict(cur.fetchone())
            row["as_of"] = row["as_of"].isoformat()
    return {"status": "saved", "snapshot": row}
