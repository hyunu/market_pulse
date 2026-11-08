import { useEffect, useState } from 'react'
import { getCorrelation, getRegime, getScores } from '../api/client'
import type { CorrelationPayload, RegimePayload, ScoresPayload } from '../api/types'
import { formatNumber, formatPct } from '../lib/format'

const DOMAIN_LABEL: Record<string, string> = {
  growth: '성장',
  liquidity: '유동성',
  inflation: '물가',
  rates: '금리·채권',
  earnings: '실적',
  valuation: '밸류',
  risk: '위험',
}

function ScoreBar({ score }: { score: number | null }) {
  const v = score ?? 0
  const pct = ((v + 100) / 200) * 100
  const positive = v >= 0
  return (
    <div className="relative h-[4px] w-full bg-[var(--color-line)]">
      <div
        className="absolute left-1/2 top-0 h-full w-px bg-[var(--color-line-strong)]"
        aria-hidden
      />
      <div
        className="h-full transition-all duration-500"
        style={{
          width: `${Math.max(2, Math.abs(pct - 50))}%`,
          marginLeft: positive ? '50%' : `calc(50% - ${Math.max(2, Math.abs(pct - 50))}%)`,
          background: positive ? 'var(--color-steel)' : 'var(--color-accent)',
        }}
      />
    </div>
  )
}

function shortMode(mode: string): string {
  if (mode === 'api') return 'api'
  if (mode === 'synthetic') return 'syn'
  if (mode === 'mixed') return 'mix'
  return 'smp'
}

type Props = {
  /** Hide correlation block for denser dashboard first fold */
  compact?: boolean
}

export function AnalyticsPanel({ compact }: Props) {
  const [scores, setScores] = useState<ScoresPayload | null>(null)
  const [regime, setRegime] = useState<RegimePayload | null>(null)
  const [corr, setCorr] = useState<CorrelationPayload | null>(null)
  const [scoreMode, setScoreMode] = useState('smp')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [s, r] = await Promise.all([getScores(), getRegime()])
      if (cancelled) return
      setScores(s.data)
      setScoreMode(shortMode(s.sourceMode === 'api' ? s.data.source_mode : 'sample'))
      setRegime(r.data)
      setLoading(false)
      // correlation deferred so score/regime paint first
      void getCorrelation().then((c) => {
        if (!cancelled) setCorr(c.data)
      })
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <section className="animate-pulse border-t border-[var(--color-line)] pt-4">
        <div className="h-3 w-28 bg-[var(--color-line)]" />
        <div className="mt-4 flex gap-10">
          <div className="h-12 w-28 bg-[var(--color-line)]" />
          <div className="h-10 w-36 bg-[var(--color-line)]" />
        </div>
        <div className="mt-6 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-3 bg-[var(--color-line)]" />
          ))}
        </div>
      </section>
    )
  }
  if (!scores || !regime) return null

  const domains = Object.values(scores.domains)

  return (
    <section className="mp-rise space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--color-line)] pb-3">
        <div>
          <h2 className="mp-section-title">Analytics</h2>
          <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">
            영역 점수 · 성장×물가 국면 · 근거
          </p>
        </div>
        <span className="mp-source">{scoreMode}</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.9fr]">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-line)] pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Market Score
              </p>
              <p className="mt-0.5 font-display text-[2.75rem] font-semibold leading-none tabular-nums tracking-[-0.04em] md:text-[3.25rem]">
                {formatNumber(scores.market_score, 1)}
              </p>
              <p className="mt-1.5 text-[11px] text-[var(--color-muted)]">
                conf {formatPct((scores.confidence || 0) * 100, 0)} · −100~+100
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Regime
              </p>
              <p className="mt-1 font-display text-xl font-semibold leading-tight text-[var(--color-accent-ink)] md:text-2xl">
                {regime.label}
              </p>
              <p className="mt-1 text-[11px] tabular-nums text-[var(--color-muted)]">
                g {regime.quadrant.growth} · i {regime.quadrant.inflation}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {domains.map((d) => (
              <div key={d.domain}>
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="text-[var(--color-ink-soft)]">
                    {DOMAIN_LABEL[d.domain] || d.domain}
                    <span className="ml-1 text-[var(--color-muted)]">·{d.weight}</span>
                  </span>
                  <span className="tabular-nums font-medium text-[var(--color-ink)]">
                    {formatNumber(d.score, 1)}
                  </span>
                </div>
                <ScoreBar score={d.score} />
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--color-line)] pt-3 text-[12px] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
            Drivers · contrary · analogs
          </p>
          <ul className="mt-2 space-y-1 text-[var(--color-muted)]">
            {(regime.drivers.length ? regime.drivers : scores.domains.growth?.drivers || [])
              .slice(0, 3)
              .map((d, i) => (
                <li key={i} className="leading-snug">
                  <span className="mr-1 font-semibold text-[var(--color-steel)]">+</span>
                  {[d.axis, d.indicator_id].filter(Boolean).join(' · ')}
                </li>
              ))}
          </ul>
          <ul className="mt-3 space-y-1 text-[var(--color-muted)]">
            {(regime.contrarians.length
              ? regime.contrarians
              : scores.domains.growth?.contrarians || []
            )
              .slice(0, 2)
              .map((d, i) => (
                <li key={i} className="leading-snug">
                  <span className="mr-1 font-semibold text-[var(--color-accent)]">-</span>
                  {[d.axis, d.indicator_id].filter(Boolean).join(' · ')}
                </li>
              ))}
          </ul>
          <ul className="mt-3 space-y-1 border-t border-[var(--color-line)] pt-3 text-[var(--color-muted)]">
            {regime.similar_regimes.slice(0, 3).map((s) => (
              <li key={s.as_of} className="tabular-nums leading-snug">
                {s.as_of} · {s.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {!compact && corr ? (
        <div className="overflow-x-auto border-t border-[var(--color-line)] pt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-semibold">Correlation</p>
            <span className="mp-source">{shortMode(corr.source_mode)}</span>
          </div>
          <table className="min-w-full text-left text-[10px]">
            <thead>
              <tr>
                <th className="p-1 font-medium text-[var(--color-muted)]"> </th>
                {corr.indicators.map((id) => (
                  <th key={id} className="p-1 font-medium text-[var(--color-muted)]">
                    {id.replace(/^us_/, '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {corr.indicators.map((row) => (
                <tr key={row} className="border-t border-[var(--color-line)]">
                  <td className="p-1 text-[var(--color-muted)]">{row.replace(/^us_/, '')}</td>
                  {corr.indicators.map((col) => {
                    const v = corr.matrix[row]?.[col]
                    return (
                      <td key={col} className="p-1 tabular-nums text-[var(--color-ink)]">
                        {v == null ? '—' : v.toFixed(2)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
