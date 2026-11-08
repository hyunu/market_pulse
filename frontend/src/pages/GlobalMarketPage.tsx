import { useState } from 'react'
import { IndicatorCard } from '../components/IndicatorCard'
import { PageHeader } from '../components/PageHeader'
import { SourceFooter } from '../components/SourceFooter'
import { TimeSeriesChart } from '../components/TimeSeriesChart'
import { useIndicatorSeries } from '../hooks/useIndicatorSeries'
import type { PeriodKey } from '../api/types'

const IDS = ['us_sp500', 'us_nasdaq', 'kr_kospi', 'cn_shanghai', 'us_vix', 'fx_usdkurw']

export function GlobalMarketPage() {
  const [period, setPeriod] = useState<PeriodKey>('3M')
  const { series, loading, sourceMode } = useIndicatorSeries(IDS, period)

  return (
    <div>
      <PageHeader
        title="Global Market"
        subtitle="미국·한국·중국 지수와 원달러. 등락은 선택 기간 대비 변화율입니다."
        period={period}
        onPeriodChange={setPeriod}
        sourceMode={sourceMode}
      />
      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">불러오는 중…</p>
      ) : (
        <>
          <section>
            <h2 className="mp-section-title">Benchmarks</h2>
            <div className="mp-metric-grid mt-3 grid-cols-2 xl:grid-cols-3">
              {series.map((s, i) => (
                <IndicatorCard key={s.indicator.indicator_id} data={s} index={i} flush />
              ))}
            </div>
          </section>
          <section className="mt-[var(--space-6)]">
            <h2 className="mp-section-title">US · KR · CN</h2>
            <p className="mt-1 mb-4 text-sm text-[var(--color-muted)]">교차 시장 경로.</p>
            <TimeSeriesChart
              series={series.filter((s) =>
                ['us_sp500', 'kr_kospi', 'cn_shanghai'].includes(s.indicator.indicator_id),
              )}
              height={400}
            />
          </section>
          <SourceFooter series={series} />
        </>
      )}
    </div>
  )
}
