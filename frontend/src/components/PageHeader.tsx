import type { ReactNode } from 'react'
import type { PeriodKey } from '../api/types'
import { PeriodSelector } from './PeriodSelector'

type Props = {
  title: string
  subtitle: string
  period?: PeriodKey
  onPeriodChange?: (p: PeriodKey) => void
  sourceMode?: 'api' | 'mock' | 'mixed'
  extra?: ReactNode
}

function shortMode(mode?: string): string {
  if (!mode) return ''
  if (mode === 'api') return 'api'
  if (mode === 'mixed') return 'mix'
  return 'smp'
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
    <header className="mp-rise mb-6 flex flex-col gap-4 border-b border-[var(--color-line)] pb-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between sm:pb-5">
      <div className="max-w-2xl">
        <p className="mp-kicker mb-1.5">MarketPulse</p>
        <h1 className="font-display text-[1.55rem] font-semibold leading-tight tracking-tight text-[var(--color-ink)] md:text-[1.85rem]">
          {title}
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-muted)]">{subtitle}</p>
        {sourceMode ? <p className="mp-source mt-2">{shortMode(sourceMode)}</p> : null}
      </div>
      <div className="flex flex-wrap items-end gap-3 overflow-x-auto">
        {extra}
        {period && onPeriodChange ? (
          <PeriodSelector value={period} onChange={onPeriodChange} />
        ) : null}
      </div>
    </header>
  )
}
