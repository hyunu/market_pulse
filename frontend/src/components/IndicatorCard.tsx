import { formatDate, formatNumber, formatPct, labelOf } from '../lib/format'
import type { IndicatorSeries } from '../api/types'

type Props = {
  data: IndicatorSeries
  compact?: boolean
  index?: number
}

/** Metric cell — hairline frame only when needed for scanability; no shadow/glow */
export function IndicatorCard({ data, compact, index = 0 }: Props) {
  const last = data.points.at(-1)?.value ?? null
  const up = (data.changePct ?? 0) >= 0
  const delay = `mp-delay-${Math.min(index + 1, 4)}`

  return (
    <article
      className={`mp-rise ${delay} border-t border-[var(--color-line)] pt-3 ${
        compact ? 'pb-2' : 'pb-4'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">
          {labelOf(data.indicator.name_ko, data.indicator.name)}
        </h3>
        <span className="mp-source">{data.sourceMode}</span>
      </div>
      <p
        className={`mt-2 font-display font-semibold tabular-nums tracking-tight text-[var(--color-ink)] ${
          compact ? 'text-xl' : 'text-[1.65rem]'
        }`}
      >
        {formatNumber(last, last != null && Math.abs(last) < 20 ? 2 : 1)}
      </p>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className={up ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'}>
          {formatPct(data.changePct)}
        </span>
        <span className="text-[var(--color-muted)]">{formatDate(data.asOf)}</span>
      </div>
    </article>
  )
}
