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

function ModeBadge({ mode }: { mode: string }) {
  const api = mode === 'api'
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
        api ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-200'
      }`}
    >
      {mode}
    </span>
  )
}

function ScoreBar({ score }: { score: number | null }) {
  const v = score ?? 0
  const pct = ((v + 100) / 200) * 100
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
      <div
        className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
        style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}
      />
    </div>
  )
}

export function AnalyticsPanel() {
  const [scores, setScores] = useState<ScoresPayload | null>(null)
  const [regime, setRegime] = useState<RegimePayload | null>(null)
  const [corr, setCorr] = useState<CorrelationPayload | null>(null)
  const [scoreMode, setScoreMode] = useState('mock')
  const [regimeMode, setRegimeMode] = useState('mock')
  const [corrMode, setCorrMode] = useState('mock')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [s, r, c] = await Promise.all([getScores(), getRegime(), getCorrelation()])
      if (cancelled) return
      setScores(s.data)
      setScoreMode(s.sourceMode === 'api' ? s.data.source_mode : 'mock')
      setRegime(r.data)
      setRegimeMode(r.sourceMode === 'api' ? r.data.source_mode : 'mock')
      setCorr(c.data)
      setCorrMode(c.sourceMode === 'api' ? c.data.source_mode : 'mock')
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <p className="text-sm text-[var(--color-muted)]">분석 엔진 불러오는 중…</p>
  }
  if (!scores || !regime) return null

  const domains = Object.values(scores.domains)

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Analytics Engine</h2>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            규칙 기반 영역 점수 · Market Regime · 상관 (설명 가능). 분석 시각{' '}
            {scores.analyzed_at?.slice(0, 19) || '—'} · 기준일 {scores.as_of || '—'}
          </p>
        </div>
        <ModeBadge mode={scoreMode} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <article className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)]/80 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-[var(--color-muted)]">Market Score</p>
              <p className="font-display text-4xl font-semibold tabular-nums">
                {formatNumber(scores.market_score, 1)}
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                신뢰도 {formatPct((scores.confidence || 0) * 100, 0)} · −100~+100
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--color-muted)]">Regime</p>
              <p className="font-display text-xl font-semibold text-[var(--color-accent)]">
                {regime.label}
              </p>
              <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                성장 {regime.quadrant.growth} · 물가 {regime.quadrant.inflation}
              </p>
              <div className="mt-2 flex justify-end">
                <ModeBadge mode={regimeMode} />
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
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
        </article>

        <article className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)]/80 p-5 text-sm">
          <p className="font-semibold text-[var(--color-ink)]">원인 · 반증 · 유사 국면</p>
          <div className="mt-3 space-y-2 text-xs text-[var(--color-muted)]">
            <p className="text-[var(--color-ink)]">Drivers</p>
            <ul className="list-disc space-y-1 pl-4">
              {(regime.drivers.length ? regime.drivers : scores.domains.growth?.drivers || []).map(
                (d, i) => (
                  <li key={i}>
                    {[d.axis, d.indicator_id, d.note].filter(Boolean).join(' · ')}
                  </li>
                ),
              )}
            </ul>
            <p className="pt-2 text-[var(--color-ink)]">Contrarians</p>
            <ul className="list-disc space-y-1 pl-4">
              {(regime.contrarians.length
                ? regime.contrarians
                : scores.domains.growth?.contrarians || []
              ).map((d, i) => (
                <li key={i}>
                  {[d.axis, d.indicator_id, d.note].filter(Boolean).join(' · ') || '—'}
                </li>
              ))}
              {!regime.contrarians.length && !scores.domains.growth?.contrarians?.length ? (
                <li>뚜렷한 반증 신호 없음</li>
              ) : null}
            </ul>
            <p className="pt-2 text-[var(--color-ink)]">
              유사 국면 <ModeBadge mode={regimeMode} />
            </p>
            <ul className="list-disc space-y-1 pl-4">
              {regime.similar_regimes.slice(0, 4).map((s) => (
                <li key={s.as_of}>
                  {s.as_of}: {s.label} (dist {s.distance})
                </li>
              ))}
              {!regime.similar_regimes.length ? <li>표본 부족</li> : null}
            </ul>
            <p className="pt-2 text-[10px] leading-relaxed">
              유동성 점수는 Fed 자산·M2·TGA·ON RRP를 개별 반영하며 단순합을 공식 유동성으로
              쓰지 않습니다. Earnings/Valuation은 펀더멘털 시리즈 확보 전 주가·금리 프록시입니다.
            </p>
          </div>
        </article>
      </div>

      {corr ? (
        <article className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)]/70 p-4 overflow-x-auto">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Correlation (returns)</p>
            <ModeBadge mode={corrMode} />
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
                      <td key={col} className="p-1 tabular-nums">
                        {v == null ? '—' : v.toFixed(2)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      ) : null}
    </section>
  )
}
