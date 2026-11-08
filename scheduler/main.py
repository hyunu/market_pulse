"""일일 수집 스케줄러 골격.

타임존: America/New_York (미국 장·발표 기준).
실패 시 provider 단위로만 영향 (각 job 내부에서 격리).
"""

from __future__ import annotations

import logging
import os
import signal
import sys
import time

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [scheduler] %(message)s",
)
logger = logging.getLogger("marketpulse.scheduler")


def job_fred_daily() -> None:
    from collectors.fred import collect_fred

    logger.info("Starting collect_fred_daily")
    try:
        result = collect_fred(job_type="daily")
        logger.info("collect_fred_daily done: %s", result)
    except Exception:  # noqa: BLE001
        logger.exception("collect_fred_daily failed")


def job_market_daily() -> None:
    from collectors.market import collect_market

    live = os.getenv("MARKET_COLLECTOR_LIVE", "").lower() in {"1", "true", "yes"}
    logger.info("Starting collect_market_daily live=%s", live)
    try:
        result = collect_market(job_type="daily", live=live)
        logger.info("collect_market_daily done: %s", result)
    except Exception:  # noqa: BLE001
        logger.exception("collect_market_daily failed")


def job_macro_check() -> None:
    """월간 매크로: Phase 1에서는 FRED daily와 동일 경로로 신규 obs upsert."""
    from collectors.fred import collect_fred

    logger.info("Starting collect_macro_monthly check")
    try:
        result = collect_fred(job_type="macro_check")
        logger.info("collect_macro_monthly done: %s", result)
    except Exception:  # noqa: BLE001
        logger.exception("collect_macro_monthly failed")


def job_retry_failed() -> None:
    """실패 잡 재실행 골격 — 최근 failed provider 를 다시 호출."""
    from backend.app.db import fetch_all
    from collectors.bea import collect_bea
    from collectors.bls import collect_bls
    from collectors.fred import collect_fred
    from collectors.market import collect_market

    rows = fetch_all(
        """
        SELECT DISTINCT ON (provider) provider
        FROM collection_jobs
        WHERE status = 'failed'
        ORDER BY provider, started_at DESC
        LIMIT 5
        """
    )
    for row in rows:
        provider = row["provider"]
        logger.info("Retrying failed provider=%s", provider)
        try:
            if provider == "fred":
                collect_fred(job_type="retry")
            elif provider == "bls":
                collect_bls(job_type="retry")
            elif provider == "bea":
                collect_bea(job_type="retry")
            elif provider == "yahoo":
                collect_market(job_type="retry", live=False)
        except Exception:  # noqa: BLE001
            logger.exception("retry failed for %s", provider)


def job_compute_derived() -> None:
    """Phase 3: MoM/YoY 파생 관측 적재."""
    from backend.app.analytics import compute_derived_batch

    logger.info("Starting compute_derived")
    try:
        result = compute_derived_batch()
        logger.info("compute_derived done: %s", result)
    except Exception:  # noqa: BLE001
        logger.exception("compute_derived failed")


def build_scheduler() -> BackgroundScheduler:
    sched = BackgroundScheduler(timezone="America/New_York")
    sched.add_job(job_fred_daily, CronTrigger(day_of_week="mon-fri", hour=18, minute=30), id="collect_fred_daily")
    sched.add_job(job_market_daily, CronTrigger(day_of_week="mon-fri", hour=17, minute=0), id="collect_market_daily")
    sched.add_job(job_macro_check, CronTrigger(day_of_week="mon-fri", hour=9, minute=0), id="collect_macro_monthly")
    sched.add_job(job_retry_failed, CronTrigger(minute=15), id="retry_failed")
    sched.add_job(job_compute_derived, CronTrigger(day_of_week="mon-fri", hour=19, minute=0), id="compute_derived")
    return sched


def main() -> None:
    if os.getenv("RUN_SCHEDULER", "true").lower() not in {"1", "true", "yes"}:
        logger.info("RUN_SCHEDULER disabled; exiting")
        return

    sched = build_scheduler()
    sched.start()
    logger.info("Scheduler started with jobs: %s", [j.id for j in sched.get_jobs()])

    def _shutdown(signum: int, _frame: object) -> None:
        logger.info("Signal %s received, shutting down", signum)
        sched.shutdown(wait=False)
        sys.exit(0)

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    while True:
        time.sleep(60)


if __name__ == "__main__":
    main()
