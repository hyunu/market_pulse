import { useMemo, useState } from 'react'
import { IndicatorCard } from '../components/IndicatorCard'
import { PageHeader } from '../components/PageHeader'
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
      <PageHeader
        title="Dashboard"
        subtitle="글로벌 시장 상태·위험 요약을 한눈에 봅니다. 점수는 Phase 3에서 본계산되며, 현재는 핵심 지수와 위험 지표를 우선 표시합니다."
        period={period}
        onPeriodChange={setPeriod}
        sourceMode={hero.sourceMode}
      />

      {hero.loading ? (
        <p className="text-sm text-[var(--color-muted)]">불러오는 중…</p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {hero.series.map((s) => (
              <IndicatorCard key={s.indicator.indicator_id} data={s} />
            ))}
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <TimeSeriesChart series={chartSeries} title="주요 지수 (기간 선택)" height={380} />
            <div className="space-y-3">
              <h2 className="font-display text-lg font-semibold">위험 요약</h2>
              {risk.series.map((s) => (
                <IndicatorCard key={s.indicator.indicator_id} data={s} compact />
              ))}
              <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)]/70 p-4 text-sm text-[var(--color-muted)]">
                <p className="font-semibold text-[var(--color-ink)]">영역 점수 (Phase 3)</p>
                <p className="mt-1">
                  Growth / Liquidity / Inflation / Rates / Earnings / Valuation / Risk
                  가중 점수는 Analytics 엔진 연동 후 표시됩니다.
                </p>
              </div>
            </div>
          </section>

          <SourceFooter series={[...hero.series, ...risk.series]} />
        </>
      )}
    </div>
  )
}
