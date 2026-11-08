"""주가·환율 등 시장 데이터 수집 (Yahoo Finance 보조).

라이선스 주의
-------------
Yahoo Finance 비공식 엔드포인트는 **프로토타입 전용**입니다.
상용/재배포 전 반드시 Yahoo Terms of Service 및 라이선스를 검토하세요.
공식 유료 피드(또는 거래소·벤더)로 교체하는 것을 Phase 후반 목표로 둡니다.
"""

from __future__ import annotations

import logging
import os
from datetime import date, datetime, timezone
from typing import Any
from urllib.parse import quote

import httpx

from backend.app.db import get_conn
from collectors.base import (
    ObservationRow,
    finish_job,
    indicators_for_provider,
    insert_observations,
    start_job,
)

logger = logging.getLogger(__name__)

# LICENSE: Prototype only — not for production redistribution.
YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"

# FRED 키가 없을 때도 대시보드 핵심 지수를 채우기 위한 Yahoo 브리지
# (지표 YAML의 primary provider가 fred여도 시세 보조로 적재 가능)
YAHOO_INDICATOR_BRIDGE: dict[str, str] = {
    "us_sp500": "^GSPC",
    "us_nasdaq": "^IXIC",
    "kr_kospi": "^KS11",
    "cn_shanghai": "000001.SS",
    "us_vix": "^VIX",
}


def fetch_yahoo_daily(
    symbol: str,
    *,
    range_: str = "5y",
    interval: str = "1d",
    client: httpx.Client | None = None,
) -> dict[str, Any]:
    """Yahoo chart API 조회 (프로토타입)."""
    url = YAHOO_CHART.format(symbol=quote(symbol, safe=""))
    params = {"range": range_, "interval": interval}
    headers = {"User-Agent": "MarketPulse/0.4 (research prototype; not for redistribution)"}
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
        close = (quote.get("close") or [None])[i]
        if close is None:
            continue
        bars.append(
            {
                "trade_date": date.fromtimestamp(ts),
                "open": (quote.get("open") or [None])[i],
                "high": (quote.get("high") or [None])[i],
                "low": (quote.get("low") or [None])[i],
                "close": close,
                "adj_close": adj_closes[i] if i < len(adj_closes) else None,
                "volume": (quote.get("volume") or [None])[i],
            }
        )
    return bars


def _bars_to_observations(indicator_id: str, bars: list[dict[str, Any]], symbol: str) -> list[ObservationRow]:
    rows: list[ObservationRow] = []
    for bar in bars:
        close = bar.get("close")
        if close is None:
            continue
        rows.append(
            ObservationRow(
                indicator_id=indicator_id,
                observation_date=bar["trade_date"],
                value=float(close),
                quality_flag="ok",
                raw_payload={
                    "provider": "yahoo",
                    "symbol": symbol,
                    "license": "prototype",
                    "bar": {
                        "open": bar.get("open"),
                        "high": bar.get("high"),
                        "low": bar.get("low"),
                        "close": bar.get("close"),
                        "adj_close": bar.get("adj_close"),
                        "volume": bar.get("volume"),
                    },
                },
            )
        )
    return rows


def _yahoo_targets() -> list[tuple[str, str]]:
    """(indicator_id, yahoo_symbol) 목록 — YAML yahoo + 핵심 지수 브리지."""
    seen: dict[str, str] = {}
    for ind in indicators_for_provider("yahoo"):
        seen[ind["indicator_id"]] = ind["source_id"]
    for iid, sym in YAHOO_INDICATOR_BRIDGE.items():
        seen.setdefault(iid, sym)
    return sorted(seen.items())


def collect_market(
    *,
    job_type: str = "daily",
    live: bool | None = None,
    range_: str = "5y",
) -> dict[str, Any]:
    """Yahoo 실종가 → market_prices + indicator_observations.

    live 기본값: 환경변수 MARKET_COLLECTOR_LIVE (기본 1=실호출).
    """
    if live is None:
        live = os.getenv("MARKET_COLLECTOR_LIVE", "1") not in {"0", "false", "False"}

    job_id = start_job("yahoo", job_type)
    total = 0
    obs_total = 0
    errors: list[str] = []

    if not live:
        meta = {
            "implemented": True,
            "live": False,
            "license": "Yahoo Finance prototype only — review ToS before production.",
            "note": "Pass live=True or MARKET_COLLECTOR_LIVE=1 to hit network.",
        }
        finish_job(job_id, status="success", records_upserted=0, meta=meta)
        return {"job_id": job_id, "upserted": 0, "status": "success", "meta": meta}

    try:
        targets = _yahoo_targets()
        assets = {a["source_symbol"]: a["asset_id"] for a in _assets_for_yahoo()}
        with httpx.Client(
            timeout=60.0,
            headers={"User-Agent": "MarketPulse/0.4 (research prototype)"},
        ) as client:
            for indicator_id, symbol in targets:
                try:
                    payload = fetch_yahoo_daily(symbol, range_=range_, client=client)
                    bars = parse_yahoo_chart(payload)
                    if not bars:
                        errors.append(f"{symbol}: empty chart")
                        continue
                    if symbol in assets:
                        total += upsert_market_prices(assets[symbol], bars)
                    obs_total += insert_observations(
                        _bars_to_observations(indicator_id, bars, symbol)
                    )
                    logger.info(
                        "Yahoo %s → %s bars=%s obs_upserted_batch",
                        symbol,
                        indicator_id,
                        len(bars),
                    )
                except Exception as exc:  # noqa: BLE001
                    logger.exception("Yahoo fetch failed: %s", symbol)
                    errors.append(f"{symbol}: {exc}")

        status = "success" if not errors else ("partial" if (total or obs_total) else "failed")
        finish_job(
            job_id,
            status=status,
            records_upserted=total + obs_total,
            error_message="; ".join(errors) if errors else None,
            meta={
                "license": "Yahoo Finance prototype only — review ToS before production.",
                "market_prices_upserted": total,
                "observations_upserted": obs_total,
                "targets": [t[0] for t in targets],
                "errors": errors,
            },
        )
        return {
            "job_id": job_id,
            "upserted": total + obs_total,
            "observations_upserted": obs_total,
            "status": status,
            "errors": errors,
        }
    except Exception as exc:  # noqa: BLE001
        finish_job(job_id, status="failed", error_message=str(exc))
        raise
