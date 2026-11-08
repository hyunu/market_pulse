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
  showBrand?: boolean
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
    <header className="mp-rise mb-8 flex flex-col gap-5 border-b border-[var(--color-line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          MarketPulse
        </p>
        <h1 className="font-display text-[1.85rem] font-semibold leading-tight tracking-tight text-[var(--color-ink)] md:text-[2.15rem]">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{subtitle}</p>
        {sourceMode ? (
          <p className="mp-source mt-3">
            source {sourceMode === 'api' ? 'live api' : sourceMode === 'mixed' ? 'api + sample' : 'sample'}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        {extra}
        {period && onPeriodChange ? (
          <PeriodSelector value={period} onChange={onPeriodChange} />
        ) : null}
      </div>
    </header>
  )
}
