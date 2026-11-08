import { useState } from 'react'
import { IndicatorCard } from '../components/IndicatorCard'
import { PageHeader } from '../components/PageHeader'
import { SourceFooter } from '../components/SourceFooter'
import { TimeSeriesChart } from '../components/TimeSeriesChart'
import { useIndicatorSeries } from '../hooks/useIndicatorSeries'
import type { PeriodKey } from '../api/types'

const IDS = ['us_sp500', 'us_nasdaq']

export function EquityPage() {
  const [period, setPeriod] = useState<PeriodKey>('5Y')
  const { series, loading, sourceMode } = useIndicatorSeries(IDS, period)

  return (
    <div>
      <PageHeader
        title="Equity & Valuation"
        subtitle="지수 수준을 우선 표시합니다. CAPE·Forward PER·ERP는 펀더멘털 시리즈 연동 후 확장합니다."
        period={period}
        onPeriodChange={setPeriod}
        sourceMode={sourceMode}
      />
      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">불러오는 중…</p>
      ) : (
        <>
          <section>
            <h2 className="mp-section-title">Equity proxies</h2>
            <div className="mt-4 grid gap-x-10 sm:grid-cols-2">
              {series.map((s, i) => (
                <IndicatorCard key={s.indicator.indicator_id} data={s} index={i} />
              ))}
            </div>
            <div className="mt-8">
              <TimeSeriesChart series={series} height={340} />
            </div>
          </section>
          <p className="mt-8 border-t border-[var(--color-line)] pt-4 text-sm text-[var(--color-muted)]">
            Next: Forward PER · CAPE · earnings growth · ERP drill-down
          </p>
          <SourceFooter series={series} />
        </>
      )}
    </div>
  )
}
