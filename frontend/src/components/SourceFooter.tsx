import { formatDate } from '../lib/format'
import type { IndicatorSeries } from '../api/types'

type Props = {
  series: IndicatorSeries[]
}

export function SourceFooter({ series }: Props) {
  if (!series.length) return null
  return (
    <footer className="mt-6 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)]/80 px-4 py-3 text-xs text-[var(--color-muted)]">
      <p className="font-semibold text-[var(--color-ink)]">출처 · 기준일</p>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {series.map((s) => (
          <li key={s.indicator.indicator_id}>
            {s.indicator.name_ko || s.indicator.name}: {s.indicator.provider}/
            {s.indicator.source_id} · as-of {formatDate(s.asOf)} · {s.sourceMode}
          </li>
        ))}
      </ul>
    </footer>
  )
}
