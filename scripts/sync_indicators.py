#!/usr/bin/env python3
"""indicators.yaml → DB sync 헬퍼."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.app.indicators_loader import sync_indicators_from_yaml  # noqa: E402
from backend.app.settings import get_settings  # noqa: E402


def main() -> None:
    n = sync_indicators_from_yaml(get_settings().indicators_path)
    print(f"synced {n} indicators")


if __name__ == "__main__":
    main()
