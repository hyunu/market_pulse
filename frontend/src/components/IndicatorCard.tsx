import { formatDate, formatNumber, formatPct, labelOf } from '../lib/format'
import type { IndicatorSeries } from '../api/types'

type Props = {
  data: IndicatorSeries
  compact?: boolean
  index?: number
  /** When true, omit own top border (parent grid provides rhythm) */
  flush?: boolean
}

function shortMode(mode: string): string {
  if (mode === 'api') return 'api'
  if (mode === 'synthetic') return 'syn'
  if (mode === 'mock') return 'smp'
  if (mode === 'demo') return 'demo'
  if (mode === 'mixed') return 'mix'
  return mode.slice(0, 3)
}

export function IndicatorCard({ data, compact, index = 0, flush }: Props) {
  const last = data.points.at(-1)?.value ?? null
  const up = (data.changePct ?? 0) >= 0
  const delay = `mp-delay-${Math.min(index + 1, 4)}`
  const digits = last != null && Math.abs(last) < 20 ? 2 : last != null && Math.abs(last) >= 1000 ? 0 : 1

  return (
    <article
      className={`mp-rise ${delay} ${flush ? '' : 'border-t border-[var(--color-line)] pt-3'} ${
        compact ? 'pb-1' : 'pb-2'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[12px] font-medium leading-tight text-[var(--color-ink-soft)]">
          {labelOf(data.indicator.name_ko, data.indicator.name)}
        </h3>
        <span className="mp-source">{shortMode(data.sourceMode)}</span>
      </div>
      <p
        className={`mt-1.5 font-display font-semibold tabular-nums tracking-[-0.03em] text-[var(--color-ink)] ${
          compact ? 'text-[1.35rem]' : 'text-[1.55rem] md:text-[1.7rem]'
        }`}
      >
        {formatNumber(last, digits)}
      </p>
      <div className="mt-0.5 flex items-baseline justify-between gap-2 text-[11px]">
        <span
          className={`font-semibold tabular-nums ${
            up ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'
          }`}
        >
          {formatPct(data.changePct)}
        </span>
        <span className="tabular-nums text-[var(--color-muted)] opacity-80">
          {formatDate(data.asOf)}
        </span>
      </div>
    </article>
  )
}
