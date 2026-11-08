import { useEffect, useMemo, useState } from 'react'
import { getPortfolioOverview, getRegime, getScores } from '../api/client'
import type { PortfolioOverview, RegimePayload, ScoresPayload } from '../api/types'
import { PageHeader } from '../components/PageHeader'
import { formatNumber, formatPct } from '../lib/format'

function ModeBadge({ mode }: { mode: string }) {
  const live = mode === 'api' || mode === 'demo'
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
        live ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-200'
      }`}
    >
      {mode}
    </span>
  )
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)]/80 p-4">
      <p className="text-xs text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-[var(--color-muted)]">{hint}</p> : null}
    </div>
  )
}

export function PortfolioPage() {
  const [data, setData] = useState<PortfolioOverview | null>(null)
  const [mode, setMode] = useState('mock')
  const [scores, setScores] = useState<ScoresPayload | null>(null)
  const [regime, setRegime] = useState<RegimePayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [p, s, r] = await Promise.all([
        getPortfolioOverview('demo-main'),
        getScores(),
        getRegime(),
      ])
      if (cancelled) return
      setData(p.data)
      setMode(p.sourceMode === 'api' ? p.data.source_mode : 'mock')
      setScores(s.data)
      setRegime(r.data)
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const currency = data?.account.base_currency || 'KRW'
  const perf = data?.performance

  const allocationMax = useMemo(() => {
    if (!data?.allocation.length) return 1
    return Math.max(...data.allocation.map((a) => Math.max(a.actual_weight, a.target_weight)), 0.01)
  }, [data])

  return (
    <div>
      <PageHeader
        title="Portfolio"
        subtitle="개인 투자자산의 평가·수익·배분·배당을 거래 기반으로 재구성합니다. 매매를 권유하지 않으며, Phase 3 국면·점수와 거시 노출을 함께 설명합니다."
        sourceMode={mode === 'mock' ? 'mock' : mode === 'api' ? 'api' : 'mixed'}
        extra={<ModeBadge mode={mode} />}
      />

      {loading || !data || !perf ? (
        <p className="text-sm text-[var(--color-muted)]">불러오는 중…</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-[var(--color-muted)]">
            {data.account.name} · 기준통화 {currency} · as-of {perf.as_of}
            {data.account.is_demo ? ' · 데모 계좌' : ''}
          </p>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="총평가"
              value={formatNumber(perf.total_value, 0)}
              hint={`${currency}`}
            />
            <Metric
              label="단순 수익률"
              value={formatPct((perf.simple_return ?? 0) * 100)}
              hint={`순투자 ${formatNumber(perf.net_invested, 0)}`}
            />
            <Metric
              label="XIRR"
              value={perf.xirr == null ? '—' : formatPct(perf.xirr * 100)}
              hint={`연환산 ${perf.annualized_return == null ? '—' : formatPct(perf.annualized_return * 100)}`}
            />
            <Metric
              label="MDD"
              value={perf.mdd == null ? '—' : formatPct(perf.mdd * 100)}
              hint={`기간 ${perf.years}y`}
            />
          </section>

          <section className="mt-8 grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)]/80 p-5">
              <h2 className="font-display text-lg font-semibold">자산배분 vs 목표</h2>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                실제 비중과 목표 비중의 편차(drift). 리밸런싱 권유가 아닌 현황 표시입니다.
              </p>
              <div className="mt-4 space-y-3">
                {data.allocation.map((a) => (
                  <div key={a.asset_class}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="uppercase tracking-wide">{a.asset_class}</span>
                      <span className="tabular-nums text-[var(--color-muted)]">
                        실 {formatPct(a.actual_weight * 100, 1)} / 목표{' '}
                        {formatPct(a.target_weight * 100, 1)} · drift{' '}
                        {formatPct(a.drift * 100, 1)}
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full bg-[var(--color-line)]">
                      <div
                        className="absolute left-0 top-0 h-2 rounded-full bg-[var(--color-accent)]/80"
                        style={{ width: `${(a.actual_weight / allocationMax) * 100}%` }}
                      />
                      <div
                        className="absolute top-[-2px] h-3 w-0.5 bg-[var(--color-warn)]"
                        style={{ left: `${(a.target_weight / allocationMax) * 100}%` }}
                        title="target"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)]/80 p-5">
              <h2 className="font-display text-lg font-semibold">배당 누적</h2>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                세전/세후(기준통화 환산). 재투자·세금은 별도 필드로 관리합니다.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[11px] text-[var(--color-muted)]">세전</p>
                  <p className="font-semibold tabular-nums">
                    {formatNumber(data.dividends.gross_base, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--color-muted)]">세금</p>
                  <p className="font-semibold tabular-nums">
                    {formatNumber(data.dividends.tax_base, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--color-muted)]">세후</p>
                  <p className="font-semibold tabular-nums text-[var(--color-accent)]">
                    {formatNumber(data.dividends.net_base, 0)}
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-1 text-xs text-[var(--color-muted)]">
                {Object.entries(data.dividends.by_symbol).map(([sym, amt]) => (
                  <li key={sym} className="flex justify-between">
                    <span>{sym}</span>
                    <span className="tabular-nums">{formatNumber(amt, 0)}</span>
                  </li>
                ))}
                <li className="pt-1 text-[10px]">{data.dividends.count}건</li>
              </ul>
            </article>
          </section>

          <section className="mt-8 overflow-x-auto rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)]/70">
            <div className="border-b border-[var(--color-line)] px-4 py-3">
              <h2 className="font-display text-lg font-semibold">자산별 현황</h2>
            </div>
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs text-[var(--color-muted)]">
                <tr>
                  <th className="px-4 py-2">종목</th>
                  <th className="px-4 py-2">분류</th>
                  <th className="px-4 py-2">수량</th>
                  <th className="px-4 py-2">평가</th>
                  <th className="px-4 py-2">손익</th>
                  <th className="px-4 py-2">비중</th>
                </tr>
              </thead>
              <tbody>
                {data.holdings.map((h) => (
                  <tr key={h.symbol} className="border-t border-[var(--color-line)]">
                    <td className="px-4 py-2 font-medium">{h.symbol}</td>
                    <td className="px-4 py-2 text-[var(--color-muted)]">{h.asset_class}</td>
                    <td className="px-4 py-2 tabular-nums">{formatNumber(h.quantity, 4)}</td>
                    <td className="px-4 py-2 tabular-nums">{formatNumber(h.market_value, 0)}</td>
                    <td
                      className={`px-4 py-2 tabular-nums ${
                        h.unrealized_pnl >= 0 ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'
                      }`}
                    >
                      {formatNumber(h.unrealized_pnl, 0)}
                    </td>
                    <td className="px-4 py-2 tabular-nums">{formatPct(h.weight * 100, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mt-8 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)]/80 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">거시 노출 설명</h2>
              <span className="text-xs text-[var(--color-muted)]">Phase 3 scores / regime 연계</span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-[var(--color-line)] p-3 text-sm">
                <p className="text-xs text-[var(--color-muted)]">Market Score</p>
                <p className="font-display text-2xl font-semibold">
                  {formatNumber(scores?.market_score ?? null, 1)}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--color-line)] p-3 text-sm">
                <p className="text-xs text-[var(--color-muted)]">Regime</p>
                <p className="font-display text-xl font-semibold text-[var(--color-accent)]">
                  {regime?.label || '—'}
                </p>
                <p className="text-[11px] text-[var(--color-muted)]">
                  성장 {regime?.quadrant.growth} · 물가 {regime?.quadrant.inflation}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--color-line)] p-3 text-sm">
                <p className="text-xs text-[var(--color-muted)]">신뢰도</p>
                <p className="font-display text-2xl font-semibold">
                  {formatPct((regime?.confidence ?? scores?.confidence ?? 0) * 100, 0)}
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-[var(--color-muted)]">
              {(data.macro_exposure || []).map((e) => (
                <li key={e.symbol} className="rounded-lg border border-[var(--color-line)]/80 px-3 py-2">
                  <span className="font-semibold text-[var(--color-ink)]">{e.symbol}</span>
                  <span className="mx-2 text-[11px] uppercase tracking-wide">
                    {e.themes.join(' · ')}
                  </span>
                  <p className="mt-1 text-xs">{e.note}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-[var(--color-muted)]">
              {data.disclaimer ||
                '본 화면은 판단·자산배분 지원용이며 특정 종목의 매수·매도를 권유하지 않습니다.'}
            </p>
          </section>
        </>
      )}
    </div>
  )
}
