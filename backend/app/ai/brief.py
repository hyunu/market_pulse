"""일일 브리프: AI(설정됨) 또는 규칙 기반 텍스트."""

from __future__ import annotations

import logging
from datetime import date
from typing import Any

from backend.app.ai.providers import chat_completion
from backend.app.ai.service import resolve_ai_credentials
from backend.app.analytics import compute_market_scores, compute_regime
from backend.app.db import fetch_all, ping_db

logger = logging.getLogger(__name__)


def _latest_market_snapshot() -> list[dict[str, Any]]:
    if not ping_db():
        return []
    return fetch_all(
        """
        SELECT DISTINCT ON (indicator_id)
          indicator_id, observation_date, value
        FROM indicator_observations
        WHERE indicator_id IN ('us_sp500','us_nasdaq','kr_kospi','cn_shanghai','us_vix')
          AND value IS NOT NULL
        ORDER BY indicator_id, observation_date DESC
        """
    )


def _rule_based_brief(scores: dict[str, Any], regime: dict[str, Any], markets: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    lines.append(f"MarketPulse 일일 브리프 · {date.today().isoformat()}")
    lines.append("")

    if markets:
        lines.append("핵심 지수(실관측 종가)")
        for m in markets:
            lines.append(
                f"- {m['indicator_id']}: {m['value']:.2f} (as-of {m['observation_date']})"
            )
        lines.append("")
    else:
        lines.append("핵심 지수 실관측이 아직 없습니다. Yahoo 수집을 실행하세요.")
        lines.append("")

    status = scores.get("status")
    if scores.get("market_score") is None or status == "데이터 부족":
        lines.append("Analytics: 데이터 부족 — 거시(FRED) 관측이 채워지기 전이라 종합 점수·국면을 확정하지 않습니다.")
    else:
        lines.append(
            f"Market Score {scores.get('market_score')} (confidence {scores.get('confidence')})"
        )
        lines.append(f"Regime: {regime.get('label')} (g={regime.get('quadrant', {}).get('growth')}, i={regime.get('quadrant', {}).get('inflation')})")

    lines.append("")
    lines.append("이 텍스트는 규칙 기반 요약이며 투자 권유가 아닙니다.")
    return "\n".join(lines)


def generate_daily_brief(*, use_ai: bool = True) -> dict[str, Any]:
    scores = compute_market_scores()
    regime = compute_regime()
    markets = _latest_market_snapshot()
    rule_text = _rule_based_brief(scores, regime, markets)

    creds = resolve_ai_credentials() if use_ai else None
    if not creds:
        return {
            "mode": "rule",
            "title": "일일 브리프 (규칙 기반)",
            "text": rule_text,
            "as_of": date.today().isoformat(),
            "ai_configured": False,
        }

    system = (
        "당신은 MarketPulse 금융 모니터링 어시스턴트입니다. "
        "제공된 수치만 근거로 짧게 한국어 브리프를 작성하세요. "
        "매수/매도 권유 금지. 데이터가 부족하면 부족하다고 말하세요. "
        "3~6문단, 과장·이모지 없이."
    )
    user = (
        "다음 관측/점수를 바탕으로 오늘의 시장·국면 설명을 작성하세요.\n\n"
        f"[규칙 기반 초안]\n{rule_text}\n\n"
        f"[scores JSON 요약] market_score={scores.get('market_score')} "
        f"status={scores.get('status')} source={scores.get('source_mode')} "
        f"regime={regime.get('label')} confidence={regime.get('confidence')}"
    )
    try:
        text = chat_completion(
            provider=str(creds["provider"]),
            base_url=str(creds["base_url"]),
            api_key=str(creds["api_key"]),
            model=str(creds["model"]),
            system=system,
            user=user,
            organization=creds.get("organization"),
            extra_header_name=creds.get("extra_header_name"),
            extra_header_value=creds.get("extra_header_value"),
        )
        return {
            "mode": "ai",
            "title": "일일 브리프 (AI)",
            "text": text,
            "as_of": date.today().isoformat(),
            "ai_configured": True,
            "provider": creds["provider"],
            "model": creds["model"],
        }
    except Exception as exc:  # noqa: BLE001 — 사용자에게 안전한 메시지
        logger.exception("AI brief failed")
        return {
            "mode": "rule_fallback",
            "title": "일일 브리프 (규칙 기반 · AI 실패)",
            "text": rule_text + f"\n\n[AI 호출 실패: {exc.__class__.__name__}]",
            "as_of": date.today().isoformat(),
            "ai_configured": True,
            "error": str(exc)[:240],
        }
