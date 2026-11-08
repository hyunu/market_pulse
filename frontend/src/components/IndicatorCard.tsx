import { formatDate, formatNumber, formatPct, labelOf } from '../lib/format'
import type { IndicatorSeries } from '../api/types'

type Props = {
  data: IndicatorSeries
  compact?: boolean
}

export function IndicatorCard({ data, compact }: Props) {
  const last = data.points.at(-1)?.value ?? null
  const up = (data.changePct ?? 0) >= 0
  return (
    <article className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)]/80 p-4 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">
            {labelOf(data.indicator.name_ko, data.indicator.name)}
          </h3>
          <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
            {data.indicator.provider.toUpperCase()} · {data.indicator.source_id}
          </p>
        </div>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
            data.sourceMode === 'api'
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-amber-500/15 text-amber-200'
          }`}
        >
          {data.sourceMode}
        </span>
      </div>
      <p className={`mt-3 font-display text-2xl font-semibold tabular-nums ${compact ? 'text-xl' : ''}`}>
        {formatNumber(last, last != null && Math.abs(last) < 20 ? 2 : 1)}
      </p>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className={up ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'}>
          {formatPct(data.changePct)}
        </span>
        <span className="text-[var(--color-muted)]">기준일 {formatDate(data.asOf)}</span>
      </div>
    </article>
  )
}
