import type { PeriodKey } from '../api/types'

const PERIODS: PeriodKey[] = ['1M', '3M', '1Y', '5Y', '10Y', 'MAX']

type Props = {
  value: PeriodKey
  onChange: (p: PeriodKey) => void
}

export function PeriodSelector({ value, onChange }: Props) {
  return (
    <div className="inline-flex flex-wrap gap-x-3 gap-y-1 border-b border-[var(--color-line)]">
      {PERIODS.map((p) => {
        const active = p === value
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`relative -mb-px pb-2 text-xs font-semibold tracking-wide transition-colors ${
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
