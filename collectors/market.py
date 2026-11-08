"""주가·환율 등 시장 데이터 수집 스켈레톤 (Yahoo Finance 보조).

라이선스 주의
-------------
Yahoo Finance 비공식 엔드포인트는 **프로토타입 전용**입니다.
상용/재배포 전 반드시 Yahoo Terms of Service 및 라이선스를 검토하세요.
공식 유료 피드(또는 거래소·벤더)로 교체하는 것을 Phase 후반 목표로 둡니다.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any
from urllib.parse import quote

import httpx

from backend.app.db import get_conn
from collectors.base import finish_job, start_job

logger = logging.getLogger(__name__)

# LICENSE: Prototype only — not for production redistribution.
YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"


def fetch_yahoo_daily(
    symbol: str,
    *,
    range_: str = "1mo",
    interval: str = "1d",
    client: httpx.Client | None = None,
) -> dict[str, Any]:
    """Yahoo chart API 조회 (스켈레톤/프로토타입)."""
    url = YAHOO_CHART.format(symbol=quote(symbol, safe=""))
    params = {"range": range_, "interval": interval}
    headers = {"User-Agent": "MarketPulsePhase1/0.1 (research prototype)"}
    owns = client is None
    client = client or httpx.Client(timeout=60.0, headers=headers)
    try:
        resp = client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()
    finally:
        if owns:
            client.close()


def _assets_for_yahoo() -> list[dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT asset_id, source_symbol
                FROM assets
                WHERE provider = 'yahoo' AND is_active = TRUE
                """
            )
            return list(cur.fetchall())


def upsert_market_prices(asset_id: str, bars: list[dict[str, Any]]) -> int:
    inserted = 0
    with get_conn() as conn:
        with conn.cursor() as cur:
            for bar in bars:
                cur.execute(
                    """
                    INSERT INTO market_prices (
                      asset_id, trade_date, open, high, low, close, adj_close, volume, collected_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (asset_id, trade_date) DO NOTHING
                    """,
                    (
                        asset_id,
                        bar["trade_date"],
                        bar.get("open"),
                        bar.get("high"),
                        bar.get("low"),
                        bar.get("close"),
                        bar.get("adj_close"),
                        bar.get("volume"),
                        datetime.now(timezone.utc),
                    ),
                )
                inserted += cur.rowcount
    return inserted


def parse_yahoo_chart(payload: dict[str, Any]) -> list[dict[str, Any]]:
    result = (payload.get("chart") or {}).get("result") or []
    if not result:
        return []
    block = result[0]
    timestamps = block.get("timestamp") or []
    quote = ((block.get("indicators") or {}).get("quote") or [{}])[0]
    adj = ((block.get("indicators") or {}).get("adjclose") or [{}])[0]
    adj_closes = adj.get("adjclose") or [None] * len(timestamps)
    bars: list[dict[str, Any]] = []
    for i, ts in enumerate(timestamps):
        bars.append(
            {
                "trade_date": date.fromtimestamp(ts),
                "open": (quote.get("open") or [None])[i],
                "high": (quote.get("high") or [None])[i],
                "low": (quote.get("low") or [None])[i],
                "close": (quote.get("close") or [None])[i],
                "adj_close": adj_closes[i],
                "volume": (quote.get("volume") or [None])[i],
            }
        )
    return bars


def collect_market(*, job_type: str = "daily", live: bool = False) -> dict[str, Any]:
    """기본은 스켈레톤(live=False). live=True 이면 Yahoo 프로토타입 호출."""
    job_id = start_job("yahoo", job_type)
    total = 0
    errors: list[str] = []

    if not live:
        meta = {
            "implemented": True,
            "live": False,
            "license": "Yahoo Finance prototype only — review ToS before production.",
            "note": "Pass live=True or set MARKET_COLLECTOR_LIVE=1 to hit network.",
        }
        finish_job(job_id, status="success", records_upserted=0, meta=meta)
        return {"job_id": job_id, "upserted": 0, "status": "success", "meta": meta}

    try:
        assets = _assets_for_yahoo()
        with httpx.Client(timeout=60.0, headers={"User-Agent": "MarketPulsePhase1/0.1"}) as client:
            for asset in assets:
                symbol = asset["source_symbol"]
                try:
                    payload = fetch_yahoo_daily(symbol, client=client)
                    bars = parse_yahoo_chart(payload)
                    total += upsert_market_prices(asset["asset_id"], bars)
                except Exception as exc:  # noqa: BLE001
                    logger.exception("Yahoo fetch failed: %s", symbol)
                    errors.append(f"{symbol}: {exc}")
        status = "success" if not errors else ("partial" if total else "failed")
        finish_job(
            job_id,
            status=status,
            records_upserted=total,
            error_message="; ".join(errors) if errors else None,
            meta={"license": "prototype", "errors": errors},
        )
        return {"job_id": job_id, "upserted": total, "status": status, "errors": errors}
    except Exception as exc:  # noqa: BLE001
        finish_job(job_id, status="failed", error_message=str(exc))
        raise
