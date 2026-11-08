import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import type { IndicatorSeries } from '../api/types'
import { labelOf } from '../lib/format'
import { CHART } from '../theme/chartTheme'

type Props = {
  series: IndicatorSeries[]
  height?: number
  title?: string
}

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
            textStyle: {
              color: CHART.ink,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'Figtree, sans-serif',
            },
          }
        : undefined,
      tooltip: {
        trigger: 'axis',
        backgroundColor: CHART.tooltipBg,
        borderColor: CHART.tooltipBorder,
        textStyle: { color: CHART.ink, fontFamily: 'Figtree, sans-serif' },
      },
      legend: {
        top: title ? 26 : 0,
        textStyle: { color: CHART.muted, fontFamily: 'Figtree, sans-serif' },
      },
      grid: { left: 48, right: 16, top: title ? 58 : 36, bottom: 36 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLine: { lineStyle: { color: CHART.line } },
        axisLabel: { color: CHART.muted, hideOverlap: true },
      },
      yAxis: {
        type: 'value',
        scale: true,
        splitLine: { lineStyle: { color: CHART.line, type: 'dashed' } },
        axisLabel: { color: CHART.muted },
      },
      series: series.map((s, idx) => {
        const map = new Map(s.points.map((p) => [p.date, p.value]))
        const color = CHART.palette[idx % CHART.palette.length]
        return {
          name: labelOf(s.indicator.name_ko, s.indicator.name),
          type: 'line',
          showSymbol: false,
          smooth: 0.12,
          connectNulls: true,
          data: dates.map((d) => map.get(d) ?? null),
          lineStyle: { width: 2, color },
          itemStyle: { color },
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
                      { offset: 0, color: CHART.areaTop },
                      { offset: 1, color: CHART.areaBottom },
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
        className="flex items-center justify-center border border-dashed border-[var(--color-line)] text-sm text-[var(--color-muted)]"
        style={{ height }}
      >
        표시할 시계열이 없습니다
      </div>
    )
  }

  return (
    <div className="mp-rise border-t border-[var(--color-line)] pt-3">
      <ReactECharts option={option} style={{ height }} notMerge lazyUpdate />
    </div>
  )
}
