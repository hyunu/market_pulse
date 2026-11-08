import { useState } from 'react'
import { IndicatorCard } from '../components/IndicatorCard'
import { PageHeader } from '../components/PageHeader'
import { SourceFooter } from '../components/SourceFooter'
import { TimeSeriesChart } from '../components/TimeSeriesChart'
import { useIndicatorSeries } from '../hooks/useIndicatorSeries'
import type { PeriodKey } from '../api/types'

const IDS = ['us_vix', 'us_move', 'us_hy_spread', 'us_stress', 'us_nfci']

export function RiskPage() {
  const [period, setPeriod] = useState<PeriodKey>('1Y')
  const { series, loading, sourceMode } = useIndicatorSeries(IDS, period)

  return (
    <div>
      <PageHeader
        title="Risk Monitor"
        subtitle="VIX · MOVE · HY · Stress · NFCI. 단일 임계치보다 동시 악화 여부에 주목합니다."
        period={period}
        onPeriodChange={setPeriod}
        sourceMode={sourceMode}
      />
      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">불러오는 중…</p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {series.map((s) => (
              <IndicatorCard key={s.indicator.indicator_id} data={s} />
            ))}
          </section>
          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <TimeSeriesChart
              series={series.filter((s) =>
                ['us_vix', 'us_move'].includes(s.indicator.indicator_id),
              )}
              title="VIX / MOVE"
              height={320}
            />
            <TimeSeriesChart
              series={series.filter((s) =>
                ['us_stress', 'us_nfci'].includes(s.indicator.indicator_id),
              )}
              title="Stress / NFCI"
              height={320}
            />
          </section>
          <SourceFooter series={series} />
        </>
      )}
    </div>
  )
}
