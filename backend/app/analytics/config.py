"""영역 가중치·지표 매핑 (설계 §7 / TRS §7.2).

polarity: +1 이면 값이 클수록 해당 영역 점수↑, -1 이면 반대.
"""

from __future__ import annotations

from typing import TypedDict


class IndicatorSpec(TypedDict):
    indicator_id: str
    polarity: float
    weight: float
    note: str


DOMAIN_WEIGHTS: dict[str, float] = {
    "growth": 20,
    "liquidity": 20,
    "inflation": 15,
    "rates": 15,
    "earnings": 15,
    "valuation": 10,
    "risk": 5,
}

# inflation 영역 점수: 물가 압력↑ → 점수↓ (투자 여건 관점)
DOMAIN_INDICATORS: dict[str, list[IndicatorSpec]] = {
    "growth": [
        {"indicator_id": "us_gdp", "polarity": 1, "weight": 1.2, "note": "실질 GDP"},
        {"indicator_id": "us_indpro", "polarity": 1, "weight": 1.0, "note": "산업생산"},
        {"indicator_id": "us_retail_sales", "polarity": 1, "weight": 0.9, "note": "소매판매"},
        {"indicator_id": "us_nfp", "polarity": 1, "weight": 1.0, "note": "비농업 고용"},
        {"indicator_id": "us_unemployment", "polarity": -1, "weight": 1.1, "note": "실업률(역방향)"},
    ],
    "liquidity": [
        {"indicator_id": "us_m2", "polarity": 1, "weight": 1.0, "note": "M2 확장"},
        {"indicator_id": "us_fed_assets", "polarity": 1, "weight": 1.1, "note": "연준 총자산"},
        {"indicator_id": "us_tga", "polarity": -1, "weight": 0.8, "note": "TGA↑=시중 유동성↓"},
        {"indicator_id": "us_on_rrp", "polarity": -1, "weight": 0.7, "note": "ON RRP↑=흡수"},
    ],
    "inflation": [
        {"indicator_id": "us_cpi", "polarity": -1, "weight": 1.0, "note": "CPI 압력(역)"},
        {"indicator_id": "us_core_cpi", "polarity": -1, "weight": 1.2, "note": "근원 CPI(역)"},
        {"indicator_id": "us_pce", "polarity": -1, "weight": 0.9, "note": "PCE(역)"},
        {"indicator_id": "us_core_pce", "polarity": -1, "weight": 1.2, "note": "근원 PCE(역)"},
    ],
    "rates": [
        {"indicator_id": "us_fed_funds", "polarity": -1, "weight": 1.0, "note": "기준금리 긴축"},
        {"indicator_id": "us_treasury_2y", "polarity": -1, "weight": 0.9, "note": "2Y"},
        {"indicator_id": "us_treasury_10y", "polarity": -1, "weight": 1.0, "note": "10Y"},
        {"indicator_id": "us_hy_spread", "polarity": -1, "weight": 1.2, "note": "HY 스프레드"},
    ],
    "earnings": [
        # EPS 시계열 전 Phase 3 프록시: 주가 모멘텀
        {"indicator_id": "us_sp500", "polarity": 1, "weight": 1.0, "note": "EPS 프록시(S&P)"},
        {"indicator_id": "us_nasdaq", "polarity": 1, "weight": 0.8, "note": "성장주 프록시"},
    ],
    "valuation": [
        # 고평가↑ → 점수↓ (CAPE 대체 프록시)
        {"indicator_id": "us_sp500", "polarity": -1, "weight": 1.0, "note": "밸류 프록시(고평가↓)"},
        {"indicator_id": "us_treasury_10y", "polarity": 1, "weight": 0.6, "note": "할인율↑=밸류 여유"},
    ],
    "risk": [
        {"indicator_id": "us_vix", "polarity": -1, "weight": 1.2, "note": "VIX"},
        {"indicator_id": "us_move", "polarity": -1, "weight": 1.0, "note": "MOVE"},
        {"indicator_id": "us_hy_spread", "polarity": -1, "weight": 1.0, "note": "HY"},
        {"indicator_id": "us_stress", "polarity": -1, "weight": 0.9, "note": "STLFSI"},
        {"indicator_id": "us_nfci", "polarity": -1, "weight": 0.9, "note": "NFCI"},
    ],
}

# 국면용 원시 신호 (물가 압력은 polarity + : 높을수록 물가↑)
REGIME_GROWTH_IDS = ["us_gdp", "us_indpro", "us_nfp", "us_unemployment"]
REGIME_INFLATION_IDS = ["us_cpi", "us_core_cpi", "us_core_pce"]

REGIME_LABELS = {
    ("up", "down"): "Goldilocks",
    ("up", "up"): "Overheating",
    ("down", "down"): "Disinflationary slowdown",
    ("down", "up"): "Stagflation risk",
}
