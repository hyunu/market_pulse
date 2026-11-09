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
  if (score == null) {
    return <div className="h-[4px] w-full bg-[var(--color-line)]" />
  }
  const pct = ((score + 100) / 200) * 100
  const positive = score >= 0
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
  if (mode === 'api') return 'live'
  if (mode === 'synthetic') return 'syn'
  if (mode === 'mixed') return 'mix'
  if (mode === 'unavailable') return 'n/a'
  return mode.slice(0, 3)
}

export function AnalyticsPanel() {
  const [scores, setScores] = useState<ScoresPayload | null>(null)
  const [regime, setRegime] = useState<RegimePayload | null>(null)
  const [corr, setCorr] = useState<CorrelationPayload | null>(null)
  const [scoreMode, setScoreMode] = useState('n/a')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [s, r] = await Promise.all([getScores(), getRegime()])
      if (cancelled) return
      setScores(s.data)
      setScoreMode(shortMode(s.data.source_mode || (s.sourceMode === 'api' ? 'api' : 'unavailable')))
      setRegime(r.data)
      setLoading(false)
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
      <section className="animate-pulse border-t border-[var(--color-line)] pt-[var(--space-4)]">
        <div className="h-3 w-28 bg-[var(--color-line)]" />
        <div className="mt-[var(--space-4)] flex gap-[var(--space-6)]">
          <div className="h-12 w-28 bg-[var(--color-line)]" />
          <div className="h-10 w-36 bg-[var(--color-line)]" />
        </div>
      </section>
    )
  }
  if (!scores || !regime) return null

  const domains = Object.values(scores.domains || {})
  const insufficient =
    scores.market_score == null ||
    scores.status === '데이터 부족' ||
    regime.label === '데이터 부족'

  return (
    <section className="mp-rise space-y-[var(--space-5)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-2)] border-b border-[var(--color-line)] pb-[var(--space-3)]">
        <div>
          <h2 className="mp-section-title">Analytics</h2>
          <p className="mp-section-lead">영역 점수 · 성장×물가 국면 · 근거 (실관측 기반)</p>
        </div>
        <span className="mp-source">{scoreMode}</span>
      </div>

      {insufficient ? (
        <div className="mp-banner border-[var(--color-accent)]">
          <p className="text-[13px] leading-snug">
            <strong className="text-[var(--color-accent-ink)]">데이터 부족</strong>
            <span className="mx-2 text-[var(--color-line-strong)]">·</span>
            가짜 점수를 채우지 않습니다. Yahoo 지수는 표시되지만, 성장×물가 국면은 FRED 거시
            관측이 필요합니다.
          </p>
          <p className="mt-[var(--space-2)] text-[11px] text-[var(--color-muted)]">
            confidence {formatPct((scores.confidence || 0) * 100, 0)} · source {scoreMode} · Settings에서
            AI 브리프만 별도 연결 가능
          </p>
        </div>
      ) : null}

      <div className="grid gap-[var(--space-6)] lg:grid-cols-[1.2fr_0.9fr]">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-[var(--space-4)] border-b border-[var(--color-line)] pb-[var(--space-4)]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Market Score
              </p>
              <p className="mt-[var(--space-1)] font-display text-[2.75rem] font-semibold leading-none tabular-nums tracking-[-0.04em] md:text-[3.25rem]">
                {scores.market_score == null ? '—' : formatNumber(scores.market_score, 1)}
              </p>
              <p className="mt-[var(--space-2)] text-[11px] text-[var(--color-muted)]">
                conf {formatPct((scores.confidence || 0) * 100, 0)} · −100~+100
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Regime
              </p>
              <p className="mt-[var(--space-1)] font-display text-xl font-semibold leading-tight text-[var(--color-accent-ink)] md:text-2xl">
                {regime.label}
              </p>
              <p className="mt-[var(--space-1)] text-[11px] tabular-nums text-[var(--color-muted)]">
                g {regime.quadrant.growth} · i {regime.quadrant.inflation}
              </p>
            </div>
          </div>

          <div className="mt-[var(--space-4)] space-y-[var(--space-3)]">
            {domains.length === 0 ? (
              <p className="text-[12px] text-[var(--color-muted)]">영역 점수 없음</p>
            ) : (
              domains.map((d) => (
                <div key={d.domain}>
                  <div className="mb-[var(--space-1)] flex justify-between text-[11px]">
                    <span className="text-[var(--color-ink-soft)]">
                      {DOMAIN_LABEL[d.domain] || d.domain}
                      <span className="ml-1 text-[var(--color-muted)]">·{d.weight}</span>
                    </span>
                    <span className="tabular-nums font-medium text-[var(--color-ink)]">
                      {d.score == null ? '—' : formatNumber(d.score, 1)}
                    </span>
                  </div>
                  <ScoreBar score={d.score} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-[var(--color-line)] pt-[var(--space-3)] text-[12px] lg:border-l lg:border-t-0 lg:pl-[var(--space-5)] lg:pt-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
            Drivers · contrary · analogs
          </p>
          <ul className="mt-[var(--space-2)] space-y-[var(--space-1)] text-[var(--color-muted)]">
            {(regime.drivers || []).slice(0, 3).map((d, i) => (
              <li key={i} className="leading-snug">
                <span className="mr-1 font-semibold text-[var(--color-steel)]">+</span>
                {[d.axis, d.indicator_id].filter(Boolean).join(' · ')}
              </li>
            ))}
            {!regime.drivers?.length ? (
              <li className="text-[var(--color-muted)]">근거 없음 (데이터 부족)</li>
            ) : null}
          </ul>
          <ul className="mt-[var(--space-3)] space-y-[var(--space-1)] text-[var(--color-muted)]">
            {(regime.contrarians || []).slice(0, 2).map((d, i) => (
              <li key={i} className="leading-snug">
                <span className="mr-1 font-semibold text-[var(--color-accent)]">-</span>
                {[d.axis, d.indicator_id].filter(Boolean).join(' · ')}
              </li>
            ))}
          </ul>
          <ul className="mt-[var(--space-3)] space-y-[var(--space-1)] border-t border-[var(--color-line)] pt-[var(--space-3)] text-[var(--color-muted)]">
            {(regime.similar_regimes || []).slice(0, 3).map((s) => (
              <li key={s.as_of} className="tabular-nums leading-snug">
                {s.as_of} · {s.label}
              </li>
            ))}
            {!regime.similar_regimes?.length ? (
              <li>유사 국면 없음</li>
            ) : null}
          </ul>
        </div>
      </div>

      {corr && corr.pairs_computed > 0 ? (
        <div className="overflow-x-auto border-t border-[var(--color-line)] pt-[var(--space-3)]">
          <div className="mb-[var(--space-2)] flex items-center justify-between">
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
