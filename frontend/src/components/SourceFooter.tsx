import { formatDate } from '../lib/format'
import type { IndicatorSeries } from '../api/types'

type Props = {
  series: IndicatorSeries[]
}

export function SourceFooter({ series }: Props) {
  if (!series.length) return null
  return (
    <footer className="mp-fade mt-8 border-t border-[var(--color-line)] pt-3 text-[10px] leading-relaxed text-[var(--color-muted)] md:mt-10">
      <p className="font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
        Sources
      </p>
      <ul className="mt-1.5 columns-1 gap-x-8 sm:columns-2">
        {series.map((s) => (
          <li key={s.indicator.indicator_id} className="break-inside-avoid py-0.5">
            {s.indicator.name_ko || s.indicator.name}: {s.indicator.provider}/
            {s.indicator.source_id} · {formatDate(s.asOf)}
          </li>
        ))}
      </ul>
    </footer>
  )
}
