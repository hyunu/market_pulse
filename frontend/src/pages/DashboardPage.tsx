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
      {/* First viewport: one composition — brand hero, not a metric dashboard */}
      <section className="relative min-h-[min(72vh,560px)] border-b border-[var(--color-line)] pb-10 pt-2">
        <PulseGlyph className="pointer-events-none absolute right-0 top-6 hidden w-[min(42%,320px)] opacity-70 md:block" />
        <BrandMark size="hero" animate />
        <h1 className="mp-rise mp-delay-1 mt-6 max-w-xl font-display text-[1.65rem] font-semibold leading-snug tracking-tight text-[var(--color-ink)] md:text-[2rem]">
          하루의 글로벌 시장 맥박을 읽습니다
        </h1>
        <p className="mp-rise mp-delay-2 mt-3 max-w-lg text-sm leading-relaxed text-[var(--color-muted)]">
          거시·유동성·위험 신호를 한 흐름으로 모아, 포트폴리오 판단의 근거를 남깁니다.
        </p>
        <div className="mp-rise mp-delay-3 mt-8 flex flex-wrap items-end gap-6">
          <PeriodSelector value={period} onChange={setPeriod} />
          <span className="mp-source mb-2">
            {hero.sourceMode === 'api' ? 'live api' : hero.sourceMode}
          </span>
        </div>
      </section>

      {hero.loading ? (
        <p className="mt-8 text-sm text-[var(--color-muted)]">불러오는 중…</p>
      ) : (
        <>
          <section className="mt-10">
            <h2 className="mp-section-title">Key indices</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              선택 기간 대비 수준과 방향.
            </p>
            <div className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">
              {hero.series.map((s, i) => (
                <IndicatorCard key={s.indicator.indicator_id} data={s} index={i} />
              ))}
            </div>
          </section>

          <section className="mt-14">
            <AnalyticsPanel />
          </section>

          <section className="mt-14 grid gap-10 lg:grid-cols-[1.55fr_1fr]">
            <div>
              <h2 className="mp-section-title">Index path</h2>
              <p className="mt-1 mb-4 text-sm text-[var(--color-muted)]">
                US / KR / CN 비교 시계열.
              </p>
              <TimeSeriesChart series={chartSeries} height={360} />
            </div>
            <div>
              <h2 className="mp-section-title">Risk pulse</h2>
              <p className="mt-1 mb-2 text-sm text-[var(--color-muted)]">
                동시 악화 여부를 먼저 봅니다.
              </p>
              {risk.series.map((s, i) => (
                <IndicatorCard key={s.indicator.indicator_id} data={s} compact index={i} />
              ))}
            </div>
          </section>

          <SourceFooter series={[...hero.series, ...risk.series]} />
        </>
      )}
    </div>
  )
}
