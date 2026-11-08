from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

from backend.app.analytics.config import DOMAIN_INDICATORS, DOMAIN_WEIGHTS
from backend.app.analytics.series import SeriesBundle, load_series, values_of
from backend.app.analytics.stats import rolling_z, tanh_score


@dataclass
class ComponentScore:
    indicator_id: str
    z: float
    score: float
    polarity: float
    weight: float
    note: str
    as_of: date | None
    source_mode: str


def score_indicator(spec: dict[str, Any], bundle: SeriesBundle) -> ComponentScore | None:
    vals = values_of(bundle)
    z = rolling_z(vals, lookback=36)
    if z is None:
        return None
    directed = z * float(spec["polarity"])
    return ComponentScore(
        indicator_id=spec["indicator_id"],
        z=z,
        score=tanh_score(directed),
        polarity=float(spec["polarity"]),
        weight=float(spec["weight"]),
        note=spec["note"],
        as_of=bundle.as_of,
        source_mode=bundle.source_mode,
    )


def domain_score(domain: str) -> dict[str, Any]:
    specs = DOMAIN_INDICATORS[domain]
    comps: list[ComponentScore] = []
    modes: list[str] = []
    for spec in specs:
        bundle = load_series(spec["indicator_id"])
        modes.append(bundle.source_mode)
        c = score_indicator(spec, bundle)
        if c:
            comps.append(c)

    if not comps:
        mode = "unavailable"
        if modes and all(m == "synthetic" for m in modes):
            mode = "synthetic"
        elif any(m == "api" for m in modes):
            mode = "mixed"
        return {
            "domain": domain,
            "score": None,
            "weight": DOMAIN_WEIGHTS[domain],
            "components": [],
            "drivers": [],
            "contrarians": [],
            "coverage": 0.0,
            "source_mode": mode,
            "as_of": None,
            "status": "데이터 부족",
        }

    wsum = sum(c.weight for c in comps)
    score = sum(c.score * c.weight for c in comps) / wsum
    ranked = sorted(comps, key=lambda c: c.score, reverse=True)
    drivers = [
        {
            "indicator_id": c.indicator_id,
            "score": round(c.score, 2),
            "z": round(c.z, 3),
            "note": c.note,
            "role": "support",
        }
        for c in ranked[:3]
    ]
    contrarians = [
        {
            "indicator_id": c.indicator_id,
            "score": round(c.score, 2),
            "z": round(c.z, 3),
            "note": c.note,
            "role": "contrary",
        }
        for c in ranked[-2:]
        if c.score < 0
    ]
    # if no negative, take lowest as contrary-ish
    if not contrarians and len(ranked) >= 2:
        c = ranked[-1]
        contrarians = [
            {
                "indicator_id": c.indicator_id,
                "score": round(c.score, 2),
                "z": round(c.z, 3),
                "note": c.note,
                "role": "weaker_support",
            }
        ]

    as_ofs = [c.as_of for c in comps if c.as_of]
    if modes and all(m == "api" for m in modes):
        source_mode = "api"
    elif any(m == "api" for m in modes):
        source_mode = "mixed"
    elif any(m == "synthetic" for m in modes):
        source_mode = "synthetic"
    else:
        source_mode = "unavailable"
    return {
        "domain": domain,
        "score": round(score, 2),
        "weight": DOMAIN_WEIGHTS[domain],
        "components": [
            {
                "indicator_id": c.indicator_id,
                "score": round(c.score, 2),
                "z": round(c.z, 3),
                "polarity": c.polarity,
                "weight": c.weight,
                "note": c.note,
                "as_of": c.as_of.isoformat() if c.as_of else None,
                "source_mode": c.source_mode,
            }
            for c in comps
        ],
        "drivers": drivers,
        "contrarians": contrarians,
        "coverage": round(len(comps) / len(specs), 3),
        "source_mode": source_mode,
        "as_of": max(as_ofs).isoformat() if as_ofs else None,
    }


def market_scores() -> dict[str, Any]:
    domains = {d: domain_score(d) for d in DOMAIN_WEIGHTS}
    usable = [d for d in domains.values() if d["score"] is not None]
    if not usable:
        market = None
        confidence = 0.0
    else:
        wsum = sum(d["weight"] for d in usable)
        market = sum(d["score"] * d["weight"] for d in usable) / wsum
        confidence = sum(d["coverage"] * d["weight"] for d in usable) / wsum

    modes = {d["source_mode"] for d in domains.values()}
    if modes == {"api"}:
        source_mode = "api"
    elif "api" in modes:
        source_mode = "mixed"
    elif modes == {"synthetic"} or "synthetic" in modes:
        source_mode = "synthetic"
    else:
        source_mode = "unavailable"

    as_ofs = [d["as_of"] for d in domains.values() if d["as_of"]]
    status = None
    if market is None or confidence <= 0:
        status = "데이터 부족"
        confidence = 0.0
        market = None
    return {
        "as_of": max(as_ofs) if as_ofs else None,
        "analyzed_at": None,  # filled by service
        "market_score": round(market, 2) if market is not None else None,
        "confidence": round(confidence, 3),
        "weights": DOMAIN_WEIGHTS,
        "domains": domains,
        "source_mode": source_mode,
        "status": status,
        "methodology": {
            "normalize": "rolling 36-obs z-score → tanh*100",
            "aggregate": "weighted mean of domain scores",
            "note": "Earnings/Valuation use equity proxies until fundamental series land",
            "liquidity_note": "TGA/ON RRP/Fed assets scored individually — never summed as official liquidity",
            "fallback": "synthetic only when ALLOW_SYNTHETIC_FALLBACK=1",
        },
    }
