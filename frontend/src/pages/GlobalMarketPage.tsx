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
        subtitle="미국·한국·중국 중심 지수와 원달러. 등락은 선택 기간 대비 변화율입니다."
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
          <section className="mt-6">
            <TimeSeriesChart
              series={series.filter((s) =>
                ['us_sp500', 'kr_kospi', 'cn_shanghai'].includes(s.indicator.indicator_id),
              )}
              title="US / KR / CN 지수"
              height={400}
            />
          </section>
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            섹터·시장폭은 데이터 소스 확보 후 확장 예정입니다.
          </p>
          <SourceFooter series={series} />
        </>
      )}
    </div>
  )
}
