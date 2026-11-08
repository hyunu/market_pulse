import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import type { IndicatorSeries } from '../api/types'
import { labelOf } from '../lib/format'

type Props = {
  series: IndicatorSeries[]
  height?: number
  title?: string
}

const PALETTE = ['#3ddc97', '#5ec8ff', '#f4c95f', '#ff8fab', '#9b8cff', '#7dd3c7']

export function TimeSeriesChart({ series, height = 360, title }: Props) {
  const hasData = series.some((s) => s.points.length > 0)

  const option = useMemo(() => {
    const dates = Array.from(
      new Set(series.flatMap((s) => s.points.map((p) => p.date))),
    ).sort()
    return {
      backgroundColor: 'transparent',
      title: title
        ? {
            text: title,
            left: 0,
            top: 0,
            textStyle: { color: '#e8f1f4', fontSize: 14, fontWeight: 600 },
          }
        : undefined,
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#122833',
        borderColor: '#1e3a47',
        textStyle: { color: '#e8f1f4' },
      },
      legend: {
        top: title ? 28 : 0,
        textStyle: { color: '#8aa0ab' },
      },
      grid: { left: 48, right: 24, top: title ? 64 : 40, bottom: 40 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLine: { lineStyle: { color: '#1e3a47' } },
        axisLabel: { color: '#8aa0ab', hideOverlap: true },
      },
      yAxis: {
        type: 'value',
        scale: true,
        splitLine: { lineStyle: { color: '#1e3a47', type: 'dashed' } },
        axisLabel: { color: '#8aa0ab' },
      },
      series: series.map((s, idx) => {
        const map = new Map(s.points.map((p) => [p.date, p.value]))
        return {
          name: labelOf(s.indicator.name_ko, s.indicator.name),
          type: 'line',
          showSymbol: false,
          smooth: 0.15,
          connectNulls: true,
          data: dates.map((d) => map.get(d) ?? null),
          lineStyle: { width: 2, color: PALETTE[idx % PALETTE.length] },
          itemStyle: { color: PALETTE[idx % PALETTE.length] },
          areaStyle:
            series.length === 1
              ? {
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: 'rgba(61,220,151,0.28)' },
                      { offset: 1, color: 'rgba(61,220,151,0)' },
                    ],
                  },
                }
              : undefined,
        }
      }),
    }
  }, [series, title])

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-[var(--color-line)] text-sm text-[var(--color-muted)]"
        style={{ height }}
      >
        표시할 시계열이 없습니다
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)]/70 p-3">
      <ReactECharts option={option} style={{ height }} notMerge lazyUpdate />
    </div>
  )
}
