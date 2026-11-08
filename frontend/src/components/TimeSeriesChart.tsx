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

export function TimeSeriesChart({ series, height = 320, title }: Props) {
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
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'Figtree, sans-serif',
            },
          }
        : undefined,
      tooltip: {
        trigger: 'axis',
        backgroundColor: CHART.tooltipBg,
        borderColor: CHART.tooltipBorder,
        borderWidth: 1,
        textStyle: { color: CHART.ink, fontSize: 12, fontFamily: 'Figtree, sans-serif' },
      },
      legend: {
        top: title ? 22 : 0,
        itemWidth: 10,
        itemHeight: 2,
        textStyle: { color: CHART.muted, fontSize: 11, fontFamily: 'Figtree, sans-serif' },
      },
      grid: {
        left: 44,
        right: 8,
        top: title ? 52 : 32,
        bottom: 28,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLine: { lineStyle: { color: CHART.lineStrong, width: 1 } },
        axisTick: { show: false },
        axisLabel: { color: CHART.muted, fontSize: 10, hideOverlap: true },
      },
      yAxis: {
        type: 'value',
        scale: true,
        splitNumber: 4,
        splitLine: {
          lineStyle: { color: CHART.line, type: 'solid', width: 1, opacity: 0.9 },
        },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: CHART.muted, fontSize: 10 },
      },
      series: series.map((s, idx) => {
        const map = new Map(s.points.map((p) => [p.date, p.value]))
        const color = CHART.palette[idx % CHART.palette.length]
        return {
          name: labelOf(s.indicator.name_ko, s.indicator.name),
          type: 'line',
          showSymbol: false,
          smooth: 0.1,
          connectNulls: true,
          data: dates.map((d) => map.get(d) ?? null),
          lineStyle: { width: 1.8, color },
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
    <div className="mp-rise border-t border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-panel)_55%,transparent)] pt-2">
      <ReactECharts option={option} style={{ height }} notMerge lazyUpdate />
    </div>
  )
}
