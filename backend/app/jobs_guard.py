"""수집 잡 연타 완화 — 서버 쿨다운."""

from __future__ import annotations

import threading
import time
from typing import Any

_LOCK = threading.Lock()
_LAST: dict[str, float] = {}
DEFAULT_COOLDOWN_SEC = 45.0


def check_collect_cooldown(provider: str, cooldown_sec: float = DEFAULT_COOLDOWN_SEC) -> dict[str, Any] | None:
    """쿨다운 중이면 거절 정보 dict, 아니면 None."""
    now = time.monotonic()
    with _LOCK:
        last = _LAST.get(provider)
        if last is not None:
            elapsed = now - last
            if elapsed < cooldown_sec:
                remain = int(cooldown_sec - elapsed) + 1
                return {
                    "blocked": True,
                    "provider": provider,
                    "retry_after_sec": remain,
                    "message": f"{provider} 수집은 {remain}초 후 다시 시도할 수 있습니다 (연타 방지).",
                }
    return None


def mark_collect_started(provider: str) -> None:
    with _LOCK:
        _LAST[provider] = time.monotonic()
