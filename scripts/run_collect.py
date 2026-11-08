#!/usr/bin/env python3
"""수동 수집 실행: python scripts/run_collect.py fred"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a MarketPulse collector")
    parser.add_argument("provider", choices=["fred", "bls", "bea", "yahoo"])
    parser.add_argument("--live", action="store_true", help="yahoo live network fetch")
    parser.add_argument("--years", type=int, default=10, help="FRED backfill years")
    args = parser.parse_args()

    if args.provider == "fred":
        from collectors.fred import collect_fred

        result = collect_fred(job_type="manual", years=args.years)
    elif args.provider == "bls":
        from collectors.bls import collect_bls

        result = collect_bls(job_type="manual")
    elif args.provider == "bea":
        from collectors.bea import collect_bea

        result = collect_bea(job_type="manual")
    else:
        from collectors.market import collect_market

        result = collect_market(job_type="manual", live=args.live)

    print(json.dumps(result, default=str, indent=2))


if __name__ == "__main__":
    main()
