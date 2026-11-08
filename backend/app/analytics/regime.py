from __future__ import annotations

from datetime import date
from typing import Any

from backend.app.analytics.config import (
    REGIME_GROWTH_IDS,
    REGIME_INFLATION_IDS,
    REGIME_LABELS,
)
from backend.app.analytics.series import load_series, values_of
from backend.app.analytics.stats import rolling_z, tanh_score


def _signal(indicator_ids: list[str], *, invert: dict[str, float] | None = None) -> dict[str, Any]:
    invert = invert or {}
    zs: list[float] = []
    parts: list[dict[str, Any]] = []
    modes: list[str] = []
    as_ofs: list[date] = []
    for iid in indicator_ids:
        bundle = load_series(iid)
        modes.append(bundle.source_mode)
        if bundle.as_of:
            as_ofs.append(bundle.as_of)
        z = rolling_z(values_of(bundle), lookback=36)
        if z is None:
            continue
        pol = invert.get(iid, 1.0)
        directed = z * pol
        zs.append(directed)
        parts.append(
            {
                "indicator_id": iid,
                "z": round(z, 3),
                "directed_z": round(directed, 3),
                "source_mode": bundle.source_mode,
                "as_of": bundle.as_of.isoformat() if bundle.as_of else None,
            }
        )
    if not zs:
        mode = "unavailable"
        if modes and all(m == "synthetic" for m in modes):
            mode = "synthetic"
        elif any(m == "api" for m in modes):
            mode = "mixed"
        return {
            "level": None,
            "score": None,
            "direction": None,
            "components": parts,
            "coverage": 0.0,
            "source_mode": mode,
            "as_of": max(as_ofs).isoformat() if as_ofs else None,
            "status": "데이터 부족",
        }
    level = sum(zs) / len(zs)
    direction = "up" if level >= 0 else "down"
    source_mode = "api" if modes and all(m == "api" for m in modes) else (
        "mixed" if any(m == "api" for m in modes) else (
            "synthetic" if any(m == "synthetic" for m in modes) else "unavailable"
        )
    )
    return {
        "level": round(level, 3),
        "score": round(tanh_score(level), 2),
        "direction": direction,
        "components": parts,
        "coverage": round(len(parts) / max(len(indicator_ids), 1), 3),
        "source_mode": source_mode,
        "as_of": max(as_ofs).isoformat() if as_ofs else None,
    }


def _history_path(months: int = 60) -> list[dict[str, Any]]:
    """월별 성장·물가 신호 궤적 (유사 국면 탐색용)."""
    series = {i: load_series(i) for i in set(REGIME_GROWTH_IDS + REGIME_INFLATION_IDS)}
    lengths = [len(b.points) for b in series.values() if b.points]
    if not lengths or min(lengths) < 13:
        return []
    min_len = min(lengths)
    path: list[dict[str, Any]] = []
    step = max(1, min_len // months) if min_len > months else 1
    indices = list(range(12, min_len, step))[-months:]
    for idx in indices:
        g_zs = []
        i_zs = []
        for iid in REGIME_GROWTH_IDS:
            vals = values_of(series[iid])[: idx + 1]
            z = rolling_z(vals, lookback=min(36, len(vals)))
            if z is None:
                continue
            pol = -1.0 if iid == "us_unemployment" else 1.0
            g_zs.append(z * pol)
        for iid in REGIME_INFLATION_IDS:
            vals = values_of(series[iid])[: idx + 1]
            z = rolling_z(vals, lookback=min(36, len(vals)))
            if z is not None:
                i_zs.append(z)
        if not g_zs or not i_zs:
            continue
        g = sum(g_zs) / len(g_zs)
        infl = sum(i_zs) / len(i_zs)
        g_dir = "up" if g >= 0 else "down"
        i_dir = "up" if infl >= 0 else "down"
        as_of = series[REGIME_GROWTH_IDS[0]].points[idx].observation_date
        path.append(
            {
                "as_of": as_of.isoformat(),
                "growth": round(g, 3),
                "inflation": round(infl, 3),
                "label": REGIME_LABELS[(g_dir, i_dir)],
            }
        )
    return path


def similar_regimes(current_g: float, current_i: float, path: list[dict[str, Any]], k: int = 5) -> list[dict[str, Any]]:
    scored: list[dict[str, Any]] = []
    for row in path[:-1]:  # exclude current tip
        dist = ((row["growth"] - current_g) ** 2 + (row["inflation"] - current_i) ** 2) ** 0.5
        scored.append({**row, "distance": round(dist, 4)})
    scored.sort(key=lambda r: r["distance"])
    return scored[:k]


def compute_regime_payload() -> dict[str, Any]:
    growth = _signal(REGIME_GROWTH_IDS, invert={"us_unemployment": -1.0})
    inflation = _signal(REGIME_INFLATION_IDS)  # higher z = higher inflation pressure

    if growth["direction"] is None or inflation["direction"] is None:
        modes = {growth["source_mode"], inflation["source_mode"]}
        source_mode = "api" if modes == {"api"} else (
            "mixed" if "api" in modes else (
                "synthetic" if "synthetic" in modes else "unavailable"
            )
        )
        return {
            "label": "데이터 부족",
            "quadrant": {"growth": "n/a", "inflation": "n/a"},
            "growth": growth,
            "inflation": inflation,
            "drivers": [],
            "contrarians": [],
            "similar_regimes": [],
            "confidence": 0.0,
            "source_mode": source_mode,
            "status": "데이터 부족",
            "as_of": max(filter(None, [growth["as_of"], inflation["as_of"]]), default=None),
            "methodology": {
                "axes": "growth z (unemployment inverted) × inflation z",
                "labels": REGIME_LABELS,
                "note": "실관측 부족 시 국면을 추정하지 않습니다",
            },
        }

    label = REGIME_LABELS[(growth["direction"], inflation["direction"])]
    path = _history_path()
    similar = similar_regimes(growth["level"], inflation["level"], path)

    # drivers / contrarians relative to quadrant narrative
    g_sorted = sorted(growth["components"], key=lambda c: c["directed_z"], reverse=True)
    i_sorted = sorted(inflation["components"], key=lambda c: c["directed_z"], reverse=True)
    drivers = [
        {"axis": "growth", **g_sorted[0]} if g_sorted else None,
        {"axis": "inflation", **i_sorted[0]} if i_sorted else None,
    ]
    drivers = [d for d in drivers if d]
    contrarians = []
    if g_sorted and g_sorted[-1]["directed_z"] * growth["level"] < 0:
        contrarians.append({"axis": "growth", **g_sorted[-1]})
    if i_sorted and i_sorted[-1]["directed_z"] * inflation["level"] < 0:
        contrarians.append({"axis": "inflation", **i_sorted[-1]})

    modes = {growth["source_mode"], inflation["source_mode"]}
    source_mode = "api" if modes == {"api"} else (
        "mixed" if "api" in modes else (
            "synthetic" if "synthetic" in modes else "unavailable"
        )
    )
    coverage = (growth["coverage"] + inflation["coverage"]) / 2
    confidence = coverage
    for as_of in filter(None, [growth["as_of"], inflation["as_of"]]):
        age = (date.today() - date.fromisoformat(as_of)).days
        if age > 45:
            confidence *= 0.85
        if age > 90:
            confidence *= 0.75

    return {
        "label": label,
        "quadrant": {
            "growth": growth["direction"],
            "inflation": inflation["direction"],
        },
        "growth": growth,
        "inflation": inflation,
        "drivers": drivers,
        "contrarians": contrarians,
        "similar_regimes": similar,
        "confidence": round(min(1.0, confidence), 3),
        "source_mode": source_mode,
        "as_of": max(filter(None, [growth["as_of"], inflation["as_of"]]), default=None),
        "methodology": {
            "axes": "growth z (unemployment inverted) × inflation z",
            "labels": REGIME_LABELS,
        },
    }
