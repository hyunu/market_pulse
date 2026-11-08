import { useState } from 'react'
import { IndicatorCard } from '../components/IndicatorCard'
import { PageHeader } from '../components/PageHeader'
import { SourceFooter } from '../components/SourceFooter'
import { TimeSeriesChart } from '../components/TimeSeriesChart'
import { useIndicatorSeries } from '../hooks/useIndicatorSeries'
import type { PeriodKey } from '../api/types'

const LIQ = ['us_fed_assets', 'us_m2', 'us_tga', 'us_on_rrp']
const RATES = ['us_fed_funds', 'us_treasury_2y', 'us_treasury_10y', 'us_treasury_30y', 'us_hy_spread']

export function LiquidityPage() {
  const [period, setPeriod] = useState<PeriodKey>('1Y')
  const liq = useIndicatorSeries(LIQ, period)
  const rates = useIndicatorSeries(RATES, period)

  return (
    <div>
      <PageHeader
        title="Liquidity & Bond"
        subtitle="연준 자산·M2·TGA·ON RRP는 개별 표시합니다. 단순 합산을 공식 유동성으로 쓰지 않습니다."
        period={period}
        onPeriodChange={setPeriod}
        sourceMode={liq.sourceMode}
      />
      {liq.loading || rates.loading ? (
        <p className="text-sm text-[var(--color-muted)]">불러오는 중…</p>
      ) : (
        <>
          <section>
            <h2 className="mp-section-title">Liquidity components</h2>
            <div className="mt-4 grid gap-x-8 sm:grid-cols-2 xl:grid-cols-4">
              {liq.series.map((s, i) => (
                <IndicatorCard key={s.indicator.indicator_id} data={s} index={i} />
              ))}
            </div>
            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <TimeSeriesChart
                series={liq.series.filter((s) => s.indicator.indicator_id === 'us_fed_assets')}
                title="Fed Total Assets"
                height={280}
              />
              <TimeSeriesChart
                series={liq.series.filter((s) => s.indicator.indicator_id === 'us_on_rrp')}
                title="ON RRP"
                height={280}
              />
            </div>
          </section>

          <section className="mt-14">
            <h2 className="mp-section-title">Rates & spreads</h2>
            <div className="mt-4 grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
              {rates.series.map((s, i) => (
                <IndicatorCard key={s.indicator.indicator_id} data={s} index={i} />
              ))}
            </div>
            <div className="mt-8">
              <TimeSeriesChart
                series={rates.series.filter((s) =>
                  ['us_treasury_2y', 'us_treasury_10y', 'us_treasury_30y'].includes(
                    s.indicator.indicator_id,
                  ),
                )}
                title="Treasury 2Y / 10Y / 30Y"
                height={320}
              />
            </div>
          </section>
          <SourceFooter series={[...liq.series, ...rates.series]} />
        </>
      )}
    </div>
  )
}
