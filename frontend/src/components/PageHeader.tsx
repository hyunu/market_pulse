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

export function PageHeader({
  title,
  subtitle,
  period,
  onPeriodChange,
  sourceMode,
  extra,
}: Props) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-muted)]">{subtitle}</p>
        {sourceMode && (
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            데이터 소스:{' '}
            <span className="font-semibold text-[var(--color-ink)]">
              {sourceMode === 'api'
                ? 'Phase 1 API'
                : sourceMode === 'mixed'
                  ? 'API + 샘플 폴백'
                  : '샘플(목) 폴백'}
            </span>
            {' · '}출처·기준일은 카드/차트 하단에 표시
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {extra}
        {period && onPeriodChange ? (
          <PeriodSelector value={period} onChange={onPeriodChange} />
        ) : null}
      </div>
    </header>
  )
}
