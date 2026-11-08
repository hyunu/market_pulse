import { useState } from 'react'
import { IndicatorCard } from '../components/IndicatorCard'
import { PageHeader } from '../components/PageHeader'
import { SourceFooter } from '../components/SourceFooter'
import { TimeSeriesChart } from '../components/TimeSeriesChart'
import { useIndicatorSeries } from '../hooks/useIndicatorSeries'
import type { PeriodKey } from '../api/types'

const GROWTH = ['us_gdp', 'us_indpro', 'us_retail_sales', 'us_unemployment', 'us_nfp']
const INFLATION = ['us_cpi', 'us_core_cpi', 'us_pce', 'us_core_pce']

export function MacroPage() {
  const [period, setPeriod] = useState<PeriodKey>('5Y')
  const growth = useIndicatorSeries(GROWTH, period)
  const inflation = useIndicatorSeries(INFLATION, period)
  const all = [...growth.series, ...inflation.series]

  return (
    <div>
      <PageHeader
        title="Macro"
        subtitle="성장·고용·물가 핵심 지표. MoM/YoY 파생 표는 Phase 3 계산 배치와 함께 고도화합니다."
        period={period}
        onPeriodChange={setPeriod}
        sourceMode={growth.sourceMode}
      />
      {growth.loading || inflation.loading ? (
        <p className="text-sm text-[var(--color-muted)]">불러오는 중…</p>
      ) : (
        <>
          <h2 className="mb-3 font-display text-lg font-semibold">성장 · 고용</h2>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {growth.series.map((s) => (
              <IndicatorCard key={s.indicator.indicator_id} data={s} />
            ))}
          </section>
          <section className="mt-6">
            <TimeSeriesChart
              series={growth.series.filter((s) => s.indicator.indicator_id === 'us_unemployment')}
              title="실업률"
              height={300}
            />
          </section>

          <h2 className="mb-3 mt-8 font-display text-lg font-semibold">물가</h2>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {inflation.series.map((s) => (
              <IndicatorCard key={s.indicator.indicator_id} data={s} />
            ))}
          </section>
          <section className="mt-6">
            <TimeSeriesChart
              series={inflation.series.filter((s) =>
                ['us_cpi', 'us_core_cpi'].includes(s.indicator.indicator_id),
              )}
              title="CPI / Core CPI"
              height={320}
            />
          </section>
          <SourceFooter series={all} />
        </>
      )}
    </div>
  )
}
