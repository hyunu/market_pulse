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
        subtitle="성장·고용·물가의 수준과 방향. 파생 MoM/YoY는 Analytics와 함께 고도화됩니다."
        period={period}
        onPeriodChange={setPeriod}
        sourceMode={growth.sourceMode}
      />
      {growth.loading || inflation.loading ? (
        <p className="text-sm text-[var(--color-muted)]">불러오는 중…</p>
      ) : (
        <>
          <section>
            <h2 className="mp-section-title">Growth & labor</h2>
            <div className="mp-metric-grid mt-3 grid-cols-2 xl:grid-cols-3">
              {growth.series.map((s, i) => (
                <IndicatorCard key={s.indicator.indicator_id} data={s} index={i} flush />
              ))}
            </div>
            <div className="mt-8">
              <TimeSeriesChart
                series={growth.series.filter((s) => s.indicator.indicator_id === 'us_unemployment')}
                title="실업률"
                height={280}
              />
            </div>
          </section>

          <section className="mt-12">
            <h2 className="mp-section-title">Inflation</h2>
            <div className="mp-metric-grid mt-3 grid-cols-2 xl:grid-cols-4">
              {inflation.series.map((s, i) => (
                <IndicatorCard key={s.indicator.indicator_id} data={s} index={i} flush />
              ))}
            </div>
            <div className="mt-8">
              <TimeSeriesChart
                series={inflation.series.filter((s) =>
                  ['us_cpi', 'us_core_cpi'].includes(s.indicator.indicator_id),
                )}
                title="CPI / Core CPI"
                height={300}
              />
            </div>
          </section>
          <SourceFooter series={all} />
        </>
      )}
    </div>
  )
}
