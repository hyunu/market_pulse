import { useEffect, useState } from 'react'
import { changePct, getObservations, listIndicators, periodStart } from '../api/client'
import type { IndicatorSeries, PeriodKey } from '../api/types'

export function useIndicatorSeries(
  indicatorIds: string[],
  period: PeriodKey,
): { series: IndicatorSeries[]; loading: boolean; sourceMode: 'api' | 'empty' | 'mixed' } {
  const [series, setSeries] = useState<IndicatorSeries[]>([])
  const [loading, setLoading] = useState(true)
  const [sourceMode, setSourceMode] = useState<'api' | 'empty' | 'mixed'>('api')

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      const { items: indicators } = await listIndicators()
      const start = periodStart(period)
      const results = await Promise.all(
        indicatorIds.map(async (id) => {
          const meta =
            indicators.find((i) => i.indicator_id === id) ||
            ({
              indicator_id: id,
              name: id,
              category: 'unknown',
              frequency: 'D',
              provider: 'unknown',
              source_id: id,
            } as const)
          const { items, sourceMode: mode } = await getObservations(id, {
            start,
            limit: 5000,
          })
          const chronological = [...items]
            .filter((o) => o.value != null)
            .sort((a, b) => a.observation_date.localeCompare(b.observation_date))
          const points = chronological.map((o) => ({
            date: o.observation_date,
            value: o.value as number,
          }))
          const values = points.map((p) => p.value)
          return {
            indicator: meta,
            points,
            asOf: points.at(-1)?.date ?? null,
            changePct: changePct(values),
            sourceMode: mode,
          } satisfies IndicatorSeries
        }),
      )
      if (cancelled) return
      setSeries(results)
      const modes = new Set(results.map((r) => r.sourceMode))
      setSourceMode(modes.size > 1 ? 'mixed' : [...modes][0] || 'empty')
      setLoading(false)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [indicatorIds.join('|'), period])

  return { series, loading, sourceMode }
}
