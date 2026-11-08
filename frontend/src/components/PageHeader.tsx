import type { ReactNode } from 'react'
import type { PeriodKey } from '../api/types'
import { PeriodSelector } from './PeriodSelector'

type Props = {
  title: string
  subtitle: string
  period?: PeriodKey
  onPeriodChange?: (p: PeriodKey) => void
  sourceMode?: string
  extra?: ReactNode
}

function shortMode(mode?: string): string {
  if (!mode) return ''
  if (mode === 'api') return 'live'
  if (mode === 'mixed') return 'mix'
  if (mode === 'empty') return 'n/a'
  return mode
}

export function PageHeader({
  title,
  subtitle,
  period,
  onPeriodChange,
  sourceMode,
  extra,
}: Props) {
  return (
    <header className="mp-rise mb-[var(--space-5)] flex flex-col gap-[var(--space-4)] border-b border-[var(--color-line)] pb-[var(--space-4)] sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl min-w-0">
        <p className="mp-kicker mb-[var(--space-2)]">MarketPulse</p>
        <h1 className="font-display text-[1.55rem] font-semibold leading-tight tracking-tight text-[var(--color-ink)] md:text-[1.85rem]">
          {title}
        </h1>
        <p className="mt-[var(--space-2)] text-[13px] leading-relaxed text-[var(--color-muted)]">
          {subtitle}
        </p>
        {sourceMode ? <p className="mp-source mt-[var(--space-2)]">{shortMode(sourceMode)}</p> : null}
      </div>
      <div className="flex flex-wrap items-end gap-[var(--space-3)] overflow-x-auto">
        {extra}
        {period && onPeriodChange ? (
          <PeriodSelector value={period} onChange={onPeriodChange} />
        ) : null}
      </div>
    </header>
  )
}
