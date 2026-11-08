from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import Any

from backend.app.portfolio.demo_data import DEMO_MARKS, parse_date
from backend.app.portfolio.metrics import annualized_return, max_drawdown, simple_return, xirr


def _base_amount(quantity: float, price: float, fx_rate: float, fee: float = 0.0) -> float:
    return quantity * price * fx_rate + fee * fx_rate


def reconstruct_holdings(transactions: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """거래로부터 심볼별 수량·원가(base currency) 재구성."""
    lots: dict[str, dict[str, Any]] = {}
    cash = 0.0

    for tx in sorted(transactions, key=lambda t: (str(t["trade_date"]), t.get("tx_id") or 0)):
        side = tx["side"]
        symbol = tx["symbol"]
        qty = float(tx["quantity"])
        price = float(tx["price"])
        fx = float(tx.get("fx_rate") or 1)
        fee = float(tx.get("fee") or 0)
        asset_class = tx.get("asset_class") or "equity"

        if side == "deposit":
            cash += qty * price * fx
            continue
        if side == "withdraw":
            cash -= qty * price * fx
            continue
        if side == "fee":
            cash -= abs(_base_amount(qty if qty else 1, price if price else 1, fx, fee))
            continue

        if symbol not in lots:
            lots[symbol] = {
                "symbol": symbol,
                "asset_class": asset_class,
                "quantity": 0.0,
                "cost_basis": 0.0,
                "currency": tx.get("currency") or "USD",
            }

        if side in {"buy", "dividend_reinvest"}:
            spend = _base_amount(qty, price, fx, fee)
            lots[symbol]["quantity"] += qty
            lots[symbol]["cost_basis"] += spend
            cash -= spend
            lots[symbol]["asset_class"] = asset_class
        elif side == "sell":
            q = lots[symbol]["quantity"]
            avg = (lots[symbol]["cost_basis"] / q) if q else 0
            lots[symbol]["quantity"] -= qty
            lots[symbol]["cost_basis"] -= avg * qty
            proceeds = qty * price * fx - fee * fx
            cash += proceeds
            if abs(lots[symbol]["quantity"]) < 1e-9:
                lots[symbol]["quantity"] = 0.0
                lots[symbol]["cost_basis"] = 0.0

    lots["__CASH__"] = {
        "symbol": "CASH",
        "asset_class": "cash",
        "quantity": cash,
        "cost_basis": cash,
        "currency": "KRW",
    }
    return lots


def mark_holdings(
    lots: dict[str, dict[str, Any]],
    marks: dict[str, dict[str, float]] | None = None,
) -> list[dict[str, Any]]:
    marks = marks or DEMO_MARKS
    rows: list[dict[str, Any]] = []
    for key, lot in lots.items():
        if key == "__CASH__":
            mv = float(lot["quantity"])
            rows.append(
                {
                    "symbol": "CASH",
                    "asset_class": "cash",
                    "quantity": mv,
                    "avg_cost": 1.0,
                    "mark_price": 1.0,
                    "fx_rate": 1.0,
                    "market_value": mv,
                    "cost_basis": mv,
                    "unrealized_pnl": 0.0,
                    "weight": 0.0,
                }
            )
            continue
        if lot["quantity"] <= 0:
            continue
        mark = marks.get(lot["symbol"], {"price": 0.0, "fx_rate": 1.0})
        px = float(mark.get("price") or 0)
        fx = float(mark.get("fx_rate") or 1)
        mv = lot["quantity"] * px * fx
        cost = float(lot["cost_basis"])
        avg = cost / lot["quantity"] if lot["quantity"] else 0
        rows.append(
            {
                "symbol": lot["symbol"],
                "asset_class": lot["asset_class"],
                "quantity": round(lot["quantity"], 6),
                "avg_cost": round(avg, 2),
                "mark_price": px,
                "fx_rate": fx,
                "market_value": round(mv, 2),
                "cost_basis": round(cost, 2),
                "unrealized_pnl": round(mv - cost, 2),
                "weight": 0.0,
            }
        )
    total = sum(r["market_value"] for r in rows) or 1.0
    for r in rows:
        r["weight"] = round(r["market_value"] / total, 4)
    rows.sort(key=lambda r: r["market_value"], reverse=True)
    return rows


def allocation_vs_targets(
    holdings: list[dict[str, Any]],
    targets: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    by_class: dict[str, float] = defaultdict(float)
    total = sum(h["market_value"] for h in holdings) or 1.0
    for h in holdings:
        by_class[h["asset_class"]] += h["market_value"]
    target_map = {t["asset_class"]: float(t["target_weight"]) for t in targets}
    classes = sorted(set(by_class) | set(target_map))
    out = []
    for c in classes:
        actual = by_class.get(c, 0.0) / total
        target = target_map.get(c, 0.0)
        out.append(
            {
                "asset_class": c,
                "actual_weight": round(actual, 4),
                "target_weight": round(target, 4),
                "drift": round(actual - target, 4),
                "market_value": round(by_class.get(c, 0.0), 2),
            }
        )
    return out


def dividend_totals(dividends: list[dict[str, Any]]) -> dict[str, Any]:
    gross = 0.0
    tax = 0.0
    by_symbol: dict[str, float] = defaultdict(float)
    for d in dividends:
        amt = float(d["amount"]) * float(d.get("fx_rate") or 1)
        t = float(d.get("tax") or 0) * float(d.get("fx_rate") or 1)
        # tax already in same currency as amount typically — apply fx once
        if d.get("currency") == "KRW":
            t = float(d.get("tax") or 0)
            amt = float(d["amount"])
        gross += amt
        tax += t
        by_symbol[d["symbol"]] += amt - t
    return {
        "gross_base": round(gross, 2),
        "tax_base": round(tax, 2),
        "net_base": round(gross - tax, 2),
        "by_symbol": {k: round(v, 2) for k, v in by_symbol.items()},
        "count": len(dividends),
    }


def build_cashflows(
    transactions: list[dict[str, Any]],
    dividends: list[dict[str, Any]],
    terminal_value: float,
    as_of: date,
) -> list[tuple[date, float]]:
    """외부 현금흐름: 입금(-), 출금(+ 회수), 배당 순액(+), 기말 평가(+)."""
    flows: list[tuple[date, float]] = []
    for tx in transactions:
        d = parse_date(tx["trade_date"])
        side = tx["side"]
        amt = float(tx["quantity"]) * float(tx["price"]) * float(tx.get("fx_rate") or 1)
        if side == "deposit":
            flows.append((d, -amt))
        elif side == "withdraw":
            flows.append((d, amt))
    for div in dividends:
        d = parse_date(div["pay_date"])
        net = float(div["amount"]) - float(div.get("tax") or 0)
        if div.get("currency") != "KRW":
            net *= float(div.get("fx_rate") or 1)
        if not div.get("reinvested"):
            flows.append((d, net))
    flows.append((as_of, terminal_value))
    return flows


def approximate_nav_path(
    transactions: list[dict[str, Any]],
    marks: dict[str, dict[str, float]],
) -> list[float]:
    """거래일마다 홀딩을 재평가한 단순 NAV 경로 (MDD용)."""
    if not transactions:
        return []
    dates = sorted({parse_date(t["trade_date"]) for t in transactions})
    path: list[float] = []
    for d in dates:
        subset = [t for t in transactions if parse_date(t["trade_date"]) <= d]
        lots = reconstruct_holdings(subset)
        holdings = mark_holdings(lots, marks)
        path.append(sum(h["market_value"] for h in holdings))
    # append "today" mark
    lots = reconstruct_holdings(transactions)
    holdings = mark_holdings(lots, marks)
    today_nav = sum(h["market_value"] for h in holdings)
    if not path or path[-1] != today_nav:
        path.append(today_nav)
    return path


def compute_performance(
    transactions: list[dict[str, Any]],
    dividends: list[dict[str, Any]],
    holdings: list[dict[str, Any]],
    as_of: date | None = None,
) -> dict[str, Any]:
    as_of = as_of or date.today()
    total = sum(h["market_value"] for h in holdings)
    flows = build_cashflows(transactions, dividends, total, as_of)
    rate = xirr(flows)
    nav_path = approximate_nav_path(transactions, DEMO_MARKS)
    mdd = max_drawdown(nav_path) if nav_path else None

    invested = sum(-a for _, a in flows if a < 0)
    simple = simple_return(invested, total) if invested else None
    first = min((parse_date(t["trade_date"]) for t in transactions), default=as_of)
    years = max((as_of - first).days / 365.25, 1e-6)
    ann = annualized_return(simple, years) if simple is not None else None

    return {
        "as_of": as_of.isoformat(),
        "total_value": round(total, 2),
        "net_invested": round(invested, 2),
        "simple_return": round(simple, 4) if simple is not None else None,
        "annualized_return": round(ann, 4) if ann is not None else None,
        "xirr": round(rate, 4) if rate is not None else None,
        "mdd": round(mdd, 4) if mdd is not None else None,
        "years": round(years, 2),
    }
