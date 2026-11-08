import { formatDate } from '../lib/format'
import type { IndicatorSeries } from '../api/types'

type Props = {
  series: IndicatorSeries[]
}

export function SourceFooter({ series }: Props) {
  if (!series.length) return null
  return (
    <footer className="mp-fade mt-10 border-t border-[var(--color-line)] pt-4 text-[11px] text-[var(--color-muted)]">
      <p className="font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
        Sources · as-of
      </p>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {series.map((s) => (
          <li key={s.indicator.indicator_id}>
            {s.indicator.name_ko || s.indicator.name}: {s.indicator.provider}/
            {s.indicator.source_id} · {formatDate(s.asOf)} · {s.sourceMode}
          </li>
        ))}
      </ul>
    </footer>
  )
}
