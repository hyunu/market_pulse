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
  return (
    <div className="h-[3px] w-full bg-[var(--color-line)]">
      <div
        className="h-full bg-[var(--color-steel)] transition-all duration-500"
        style={{ width: `${Math.max(3, Math.min(100, pct))}%` }}
      />
    </div>
  )
}

export function AnalyticsPanel() {
  const [scores, setScores] = useState<ScoresPayload | null>(null)
  const [regime, setRegime] = useState<RegimePayload | null>(null)
  const [corr, setCorr] = useState<CorrelationPayload | null>(null)
  const [scoreMode, setScoreMode] = useState('sample')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [s, r, c] = await Promise.all([getScores(), getRegime(), getCorrelation()])
      if (cancelled) return
      setScores(s.data)
      setScoreMode(s.sourceMode === 'api' ? s.data.source_mode : 'sample')
      setRegime(r.data)
      setCorr(c.data)
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <p className="text-sm text-[var(--color-muted)]">분석 불러오는 중…</p>
  }
  if (!scores || !regime) return null

  const domains = Object.values(scores.domains)

  return (
    <section className="mp-rise space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-line)] pb-4">
        <div>
          <h2 className="mp-section-title">Analytics</h2>
          <p className="mt-1 max-w-xl text-sm text-[var(--color-muted)]">
            규칙 기반 영역 점수와 성장×물가 국면. 원인·반증·유사 국면을 함께 둡니다.
          </p>
        </div>
        <span className="mp-source">{scoreMode}</span>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Market Score
              </p>
              <p className="mt-1 font-display text-5xl font-semibold tabular-nums tracking-tight">
                {formatNumber(scores.market_score, 1)}
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                신뢰도 {formatPct((scores.confidence || 0) * 100, 0)} · −100~+100
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Regime
              </p>
              <p className="mt-1 font-display text-2xl font-semibold text-[var(--color-accent-ink)]">
                {regime.label}
              </p>
              <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                성장 {regime.quadrant.growth} · 물가 {regime.quadrant.inflation}
              </p>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {domains.map((d) => (
              <div key={d.domain}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>
                    {DOMAIN_LABEL[d.domain] || d.domain}
                    <span className="ml-1 text-[var(--color-muted)]">w{d.weight}</span>
                  </span>
                  <span className="tabular-nums">{formatNumber(d.score, 1)}</span>
                </div>
                <ScoreBar score={d.score} />
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--color-line)] pt-4 text-sm lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
            Drivers · contrarians · analogs
          </p>
          <p className="mt-3 text-xs font-semibold text-[var(--color-ink)]">Drivers</p>
          <ul className="mt-1 space-y-1 text-xs text-[var(--color-muted)]">
            {(regime.drivers.length ? regime.drivers : scores.domains.growth?.drivers || []).map(
              (d, i) => (
                <li key={i}>· {[d.axis, d.indicator_id, d.note].filter(Boolean).join(' · ')}</li>
              ),
            )}
          </ul>
          <p className="mt-4 text-xs font-semibold text-[var(--color-ink)]">Contrarians</p>
          <ul className="mt-1 space-y-1 text-xs text-[var(--color-muted)]">
            {(regime.contrarians.length
              ? regime.contrarians
              : scores.domains.growth?.contrarians || []
            ).map((d, i) => (
              <li key={i}>· {[d.axis, d.indicator_id, d.note].filter(Boolean).join(' · ')}</li>
            ))}
            {!regime.contrarians.length && !scores.domains.growth?.contrarians?.length ? (
              <li>· 뚜렷한 반증 없음</li>
            ) : null}
          </ul>
          <p className="mt-4 text-xs font-semibold text-[var(--color-ink)]">Similar regimes</p>
          <ul className="mt-1 space-y-1 text-xs text-[var(--color-muted)]">
            {regime.similar_regimes.slice(0, 4).map((s) => (
              <li key={s.as_of}>
                · {s.as_of}: {s.label} ({s.distance})
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[11px] leading-relaxed text-[var(--color-muted)]">
            유동성 점수는 Fed 자산·M2·TGA·ON RRP를 개별 반영합니다. Earnings/Valuation은
            펀더멘털 확보 전 프록시입니다.
          </p>
        </div>
      </div>

      {corr ? (
        <div className="overflow-x-auto border-t border-[var(--color-line)] pt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Correlation</p>
            <span className="mp-source">{corr.source_mode}</span>
          </div>
          <table className="min-w-full text-left text-[11px]">
            <thead>
              <tr>
                <th className="p-1 text-[var(--color-muted)]"> </th>
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
