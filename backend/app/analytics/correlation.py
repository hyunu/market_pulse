from __future__ import annotations

from typing import Any

from backend.app.analytics.series import align_on_dates, load_series
from backend.app.analytics.stats import pearson

DEFAULT_IDS = [
    "us_sp500",
    "us_treasury_10y",
    "us_vix",
    "us_hy_spread",
    "fx_usdkurw",
    "us_core_cpi",
]


def compute_correlation_matrix(
    indicator_ids: list[str] | None = None,
    *,
    min_points: int = 24,
) -> dict[str, Any]:
    ids = indicator_ids or DEFAULT_IDS
    bundles = {i: load_series(i) for i in ids}
    dates, aligned = align_on_dates(bundles)

    # forward-fill lightly for correlation on overlapping non-null pairs
    matrix: dict[str, dict[str, float | None]] = {a: {} for a in ids}
    pairs_used = 0
    for a in ids:
        for b in ids:
            if a == b:
                matrix[a][b] = 1.0
                continue
            xs: list[float] = []
            ys: list[float] = []
            for va, vb in zip(aligned[a], aligned[b]):
                if va is None or vb is None:
                    continue
                xs.append(va)
                ys.append(vb)
            if len(xs) < min_points:
                matrix[a][b] = None
            else:
                # use returns for closer-to-stationary corr
                rx = [xs[i] / xs[i - 1] - 1 for i in range(1, len(xs)) if xs[i - 1]]
                ry = [ys[i] / ys[i - 1] - 1 for i in range(1, len(ys)) if ys[i - 1]]
                n = min(len(rx), len(ry))
                corr = pearson(rx[:n], ry[:n])
                matrix[a][b] = round(corr, 4) if corr is not None else None
                if corr is not None:
                    pairs_used += 1

    modes = {b.source_mode for b in bundles.values()}
    source_mode = "api" if modes == {"api"} else ("mixed" if "api" in modes else "synthetic")
    return {
        "indicators": ids,
        "matrix": matrix,
        "observations_span": {
            "start": dates[0].isoformat() if dates else None,
            "end": dates[-1].isoformat() if dates else None,
            "points": len(dates),
        },
        "pairs_computed": pairs_used,
        "source_mode": source_mode,
        "method": "Pearson on simple returns of aligned overlapping observations",
    }
