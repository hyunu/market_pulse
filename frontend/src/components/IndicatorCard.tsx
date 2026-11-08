import { formatDate, formatNumber, formatPct, labelOf } from '../lib/format'
import type { IndicatorSeries } from '../api/types'

type Props = {
  data: IndicatorSeries
  compact?: boolean
  index?: number
  flush?: boolean
}

function shortMode(mode: string): string {
  if (mode === 'api') return 'live'
  if (mode === 'empty') return 'n/a'
  if (mode === 'synthetic') return 'syn'
  if (mode === 'mock') return 'smp'
  return mode.slice(0, 3)
}

export function IndicatorCard({ data, compact, index = 0, flush }: Props) {
  const last = data.points.at(-1)?.value ?? null
  const up = (data.changePct ?? 0) >= 0
  const delay = `mp-delay-${Math.min(index + 1, 4)}`
  const digits = last != null && Math.abs(last) < 20 ? 2 : last != null && Math.abs(last) >= 1000 ? 0 : 1
  const empty = last == null

  return (
    <article
      className={`mp-rise ${delay} ${flush ? '' : 'border-t border-[var(--color-line)] pt-[var(--space-3)]'} ${
        compact ? '' : ''
      }`}
    >
      <div className="flex items-baseline justify-between gap-[var(--space-2)]">
        <h3 className="truncate text-[12px] font-medium leading-tight text-[var(--color-ink-soft)]">
          {labelOf(data.indicator.name_ko, data.indicator.name)}
        </h3>
        <span className="mp-source shrink-0">{shortMode(data.sourceMode)}</span>
      </div>
      <p
        className={`mt-[var(--space-2)] font-display font-semibold tabular-nums tracking-[-0.03em] leading-none ${
          empty ? 'text-[var(--color-muted)]' : 'text-[var(--color-ink)]'
        } ${compact ? 'text-[1.35rem]' : 'text-[1.55rem] md:text-[1.7rem]'}`}
      >
        {empty ? '—' : formatNumber(last, digits)}
      </p>
      <div className="mt-[var(--space-1)] flex items-baseline justify-between gap-[var(--space-2)] text-[11px]">
        <span
          className={`font-semibold tabular-nums ${
            empty
              ? 'text-[var(--color-muted)]'
              : up
                ? 'text-[var(--color-up)]'
                : 'text-[var(--color-down)]'
          }`}
        >
          {empty ? '데이터 없음' : formatPct(data.changePct)}
        </span>
        <span className="tabular-nums text-[var(--color-muted)] opacity-80">
          {formatDate(data.asOf)}
        </span>
      </div>
    </article>
  )
}
