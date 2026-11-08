import { useMemo, useState } from 'react'
import { AnalyticsPanel } from '../components/AnalyticsPanel'
import { BrandMark, PulseGlyph } from '../components/BrandMark'
import { IndicatorCard } from '../components/IndicatorCard'
import { PeriodSelector } from '../components/PeriodSelector'
import { SourceFooter } from '../components/SourceFooter'
import { TimeSeriesChart } from '../components/TimeSeriesChart'
import { useIndicatorSeries } from '../hooks/useIndicatorSeries'
import type { PeriodKey } from '../api/types'

const HERO_IDS = ['us_sp500', 'kr_kospi', 'cn_shanghai', 'us_vix']
const RISK_IDS = ['us_vix', 'us_move', 'us_hy_spread']

export function DashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>('1Y')
  const hero = useIndicatorSeries(HERO_IDS, period)
  const risk = useIndicatorSeries(RISK_IDS, period)
  const chartSeries = useMemo(() => hero.series.slice(0, 3), [hero.series])

  return (
    <div>
      <section className="relative border-b border-[var(--color-line)] pb-5 pt-1 md:pb-6">
        <PulseGlyph className="pointer-events-none absolute -right-2 top-0 w-[min(58%,220px)] opacity-80 sm:w-[min(48%,280px)] md:right-0 md:top-1 md:w-[min(42%,300px)]" />
        <BrandMark size="hero" animate />
        <h1 className="mp-rise mp-delay-1 mt-3 max-w-[20rem] font-display text-[1.25rem] font-semibold leading-snug tracking-tight text-[var(--color-ink)] sm:max-w-md sm:text-[1.45rem] md:text-[1.55rem]">
          하루의 글로벌 시장 맥박을 읽습니다
        </h1>
        <p className="mp-rise mp-delay-2 mt-2 max-w-md text-[13px] leading-relaxed text-[var(--color-muted)]">
          거시·유동성·위험 신호를 한 흐름으로 모아 판단의 근거를 남깁니다.
        </p>
        <div className="mp-rise mp-delay-3 mt-4 flex flex-wrap items-end gap-4 overflow-x-auto pb-0.5">
          <PeriodSelector value={period} onChange={setPeriod} />
          <span className="mp-source mb-2 shrink-0">
            {hero.sourceMode === 'api' ? 'api' : hero.sourceMode === 'mock' ? 'smp' : hero.sourceMode}
          </span>
        </div>
      </section>

      {hero.loading ? (
        <p className="mt-6 text-sm text-[var(--color-muted)]">불러오는 중…</p>
      ) : (
        <>
          <section className="mt-5">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="mp-section-title">Key indices</h2>
              <p className="text-[11px] text-[var(--color-muted)]">기간 대비 수준·방향</p>
            </div>
            <div className="mp-metric-grid grid-cols-2 xl:grid-cols-4">
              {hero.series.map((s, i) => (
                <IndicatorCard key={s.indicator.indicator_id} data={s} index={i} flush />
              ))}
            </div>
          </section>

          <section className="mt-7 md:mt-8">
            <AnalyticsPanel />
          </section>

          <section className="mt-10 grid gap-8 lg:grid-cols-[1.55fr_1fr]">
            <div>
              <h2 className="mp-section-title">Index path</h2>
              <p className="mt-1 mb-3 text-[12px] text-[var(--color-muted)]">US / KR / CN</p>
              <TimeSeriesChart series={chartSeries} height={300} />
            </div>
            <div>
              <h2 className="mp-section-title">Risk pulse</h2>
              <p className="mt-1 mb-2 text-[12px] text-[var(--color-muted)]">동시 악화 점검</p>
              <div className="mp-metric-grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1">
                {risk.series.map((s, i) => (
                  <IndicatorCard
                    key={s.indicator.indicator_id}
                    data={s}
                    compact
                    index={i}
                    flush
                  />
                ))}
              </div>
            </div>
          </section>

          <SourceFooter series={[...hero.series, ...risk.series]} />
        </>
      )}
    </div>
  )
}
