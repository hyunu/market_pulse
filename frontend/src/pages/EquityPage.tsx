import { PageHeader } from '../components/PageHeader'
import { useIndicatorSeries } from '../hooks/useIndicatorSeries'
import { IndicatorCard } from '../components/IndicatorCard'
import { TimeSeriesChart } from '../components/TimeSeriesChart'
import { SourceFooter } from '../components/SourceFooter'
import { useState } from 'react'
import type { PeriodKey } from '../api/types'

/** Phase 2: 시장 프록시. EPS/PER/CAPE 본데이터는 Phase 3 */
const IDS = ['us_sp500', 'us_nasdaq']

export function EquityPage() {
  const [period, setPeriod] = useState<PeriodKey>('5Y')
  const { series, loading, sourceMode } = useIndicatorSeries(IDS, period)

  return (
    <div>
      <PageHeader
        title="Equity & Valuation"
        subtitle="지수 수준을 우선 표시합니다. Forward EPS, CAPE, PBR, ERP 등 밸류에이션 지표는 Analytics(Phase 3)에서 연동합니다."
        period={period}
        onPeriodChange={setPeriod}
        sourceMode={sourceMode}
      />
      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">불러오는 중…</p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            {series.map((s) => (
              <IndicatorCard key={s.indicator.indicator_id} data={s} />
            ))}
          </section>
          <section className="mt-6">
            <TimeSeriesChart series={series} title="Equity proxies" height={360} />
          </section>
          <div className="mt-4 rounded-xl border border-dashed border-[var(--color-line)] p-4 text-sm text-[var(--color-muted)]">
            Coming in Phase 3: Forward PER · CAPE · Earnings growth · ERP drill-down
          </div>
          <SourceFooter series={series} />
        </>
      )}
    </div>
  )
}
