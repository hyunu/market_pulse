import type { PeriodKey } from '../api/types'

const PERIODS: PeriodKey[] = ['1M', '3M', '1Y', '5Y', '10Y', 'MAX']

type Props = {
  value: PeriodKey
  onChange: (p: PeriodKey) => void
}

export function PeriodSelector({ value, onChange }: Props) {
  return (
    <div className="inline-flex min-w-0 flex-nowrap gap-x-3.5 border-b border-[var(--color-line)]">
      {PERIODS.map((p) => {
        const active = p === value
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`relative -mb-px shrink-0 pb-1.5 text-[11px] font-semibold tracking-[0.06em] transition-colors ${
              active
                ? 'text-[var(--color-ink)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink-soft)]'
            }`}
          >
            {p}
            {active ? (
              <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--color-accent)]" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
