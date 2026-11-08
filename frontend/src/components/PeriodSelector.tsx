import type { PeriodKey } from '../api/types'

const PERIODS: PeriodKey[] = ['1M', '3M', '1Y', '5Y', '10Y', 'MAX']

type Props = {
  value: PeriodKey
  onChange: (p: PeriodKey) => void
}

export function PeriodSelector({ value, onChange }: Props) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] p-1">
      {PERIODS.map((p) => {
        const active = p === value
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold tracking-wide transition ${
              active
                ? 'bg-[var(--color-accent)] text-[#062016]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            {p}
          </button>
        )
      })}
    </div>
  )
}
