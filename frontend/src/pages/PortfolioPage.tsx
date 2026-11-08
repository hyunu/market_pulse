import { useEffect, useMemo, useState } from 'react'
import { getPortfolioOverview, getRegime, getScores } from '../api/client'
import type { PortfolioOverview, RegimePayload, ScoresPayload } from '../api/types'
import { PageHeader } from '../components/PageHeader'
import { formatNumber, formatPct } from '../lib/format'

function Metric({
  label,
  value,
  hint,
  index = 0,
}: {
  label: string
  value: string
  hint?: string
  index?: number
}) {
  return (
    <div className={`mp-rise mp-delay-${Math.min(index + 1, 4)} border-t border-[var(--color-line)] pt-3`}>
      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 font-display text-[1.75rem] font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-[var(--color-muted)]">{hint}</p> : null}
    </div>
  )
}

export function PortfolioPage() {
  const [data, setData] = useState<PortfolioOverview | null>(null)
  const [mode, setMode] = useState('sample')
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
      setMode(p.sourceMode === 'api' ? p.data.source_mode : 'sample')
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
        subtitle="거래 원장으로 평가·수익·배분·배당을 재구성합니다. 매매를 권유하지 않으며, 거시 노출은 Phase 3 국면·점수와 함께 설명합니다."
        sourceMode={mode === 'mock' || mode === 'sample' ? 'mock' : mode === 'api' ? 'api' : 'mixed'}
        extra={<span className="mp-source mb-1">{mode}</span>}
      />

      {loading || !data || !perf ? (
        <p className="text-sm text-[var(--color-muted)]">불러오는 중…</p>
      ) : (
        <>
          <p className="mb-6 text-sm text-[var(--color-muted)]">
            {data.account.name} · {currency} · as-of {perf.as_of}
            {data.account.is_demo ? ' · demo' : ''}
          </p>

          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="총평가" value={formatNumber(perf.total_value, 0)} hint={currency} index={0} />
            <Metric
              label="단순 수익률"
              value={formatPct((perf.simple_return ?? 0) * 100)}
              hint={`순투자 ${formatNumber(perf.net_invested, 0)}`}
              index={1}
            />
            <Metric
              label="XIRR"
              value={perf.xirr == null ? '—' : formatPct(perf.xirr * 100)}
              hint={`연환산 ${perf.annualized_return == null ? '—' : formatPct(perf.annualized_return * 100)}`}
              index={2}
            />
            <Metric
              label="MDD"
              value={perf.mdd == null ? '—' : formatPct(perf.mdd * 100)}
              hint={`${perf.years}y`}
              index={3}
            />
          </section>

          <section className="mt-14 grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mp-section-title">Allocation vs target</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                실비중과 목표의 편차. 리밸런싱 권유가 아닌 현황입니다.
              </p>
              <div className="mt-5 space-y-4">
                {data.allocation.map((a) => (
                  <div key={a.asset_class}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="uppercase tracking-wide">{a.asset_class}</span>
                      <span className="tabular-nums text-[var(--color-muted)]">
                        {formatPct(a.actual_weight * 100, 1)} / {formatPct(a.target_weight * 100, 1)}
                      </span>
                    </div>
                    <div className="relative h-[3px] bg-[var(--color-line)]">
                      <div
                        className="absolute left-0 top-0 h-[3px] bg-[var(--color-steel)]"
                        style={{ width: `${(a.actual_weight / allocationMax) * 100}%` }}
                      />
                      <div
                        className="absolute top-[-3px] h-[9px] w-[2px] bg-[var(--color-accent)]"
                        style={{ left: `${(a.target_weight / allocationMax) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mp-section-title">Dividends</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">세전·세금·세후 (기준통화).</p>
              <div className="mt-5 grid grid-cols-3 gap-4 border-t border-[var(--color-line)] pt-4">
                <div>
                  <p className="text-[11px] text-[var(--color-muted)]">세전</p>
                  <p className="font-display text-xl font-semibold tabular-nums">
                    {formatNumber(data.dividends.gross_base, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--color-muted)]">세금</p>
                  <p className="font-display text-xl font-semibold tabular-nums">
                    {formatNumber(data.dividends.tax_base, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--color-muted)]">세후</p>
                  <p className="font-display text-xl font-semibold tabular-nums text-[var(--color-accent-ink)]">
                    {formatNumber(data.dividends.net_base, 0)}
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-1 text-xs text-[var(--color-muted)]">
                {Object.entries(data.dividends.by_symbol).map(([sym, amt]) => (
                  <li key={sym} className="flex justify-between border-t border-[var(--color-line)] py-1.5">
                    <span>{sym}</span>
                    <span className="tabular-nums">{formatNumber(amt, 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-14">
            <h2 className="mp-section-title">Holdings</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
                  <tr className="border-b border-[var(--color-line)]">
                    <th className="py-2 pr-4 font-medium">종목</th>
                    <th className="py-2 pr-4 font-medium">분류</th>
                    <th className="py-2 pr-4 font-medium">수량</th>
                    <th className="py-2 pr-4 font-medium">평가</th>
                    <th className="py-2 pr-4 font-medium">손익</th>
                    <th className="py-2 font-medium">비중</th>
                  </tr>
                </thead>
                <tbody>
                  {data.holdings.map((h) => (
                    <tr key={h.symbol} className="border-b border-[var(--color-line)]">
                      <td className="py-2.5 pr-4 font-medium">{h.symbol}</td>
                      <td className="py-2.5 pr-4 text-[var(--color-muted)]">{h.asset_class}</td>
                      <td className="py-2.5 pr-4 tabular-nums">{formatNumber(h.quantity, 4)}</td>
                      <td className="py-2.5 pr-4 tabular-nums">{formatNumber(h.market_value, 0)}</td>
                      <td
                        className={`py-2.5 pr-4 tabular-nums ${
                          h.unrealized_pnl >= 0 ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'
                        }`}
                      >
                        {formatNumber(h.unrealized_pnl, 0)}
                      </td>
                      <td className="py-2.5 tabular-nums">{formatPct(h.weight * 100, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-14 border-t border-[var(--color-line)] pt-8">
            <h2 className="mp-section-title">Macro exposure</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Phase 3 scores / regime과 보유 자산의 민감도 설명.
            </p>
            <div className="mt-5 grid gap-6 md:grid-cols-3">
              <div className="border-t border-[var(--color-line)] pt-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  Market Score
                </p>
                <p className="font-display text-3xl font-semibold tabular-nums">
                  {formatNumber(scores?.market_score ?? null, 1)}
                </p>
              </div>
              <div className="border-t border-[var(--color-line)] pt-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  Regime
                </p>
                <p className="font-display text-2xl font-semibold text-[var(--color-accent-ink)]">
                  {regime?.label || '—'}
                </p>
              </div>
              <div className="border-t border-[var(--color-line)] pt-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  Confidence
                </p>
                <p className="font-display text-3xl font-semibold">
                  {formatPct((regime?.confidence ?? scores?.confidence ?? 0) * 100, 0)}
                </p>
              </div>
            </div>
            <ul className="mt-6 space-y-3">
              {(data.macro_exposure || []).map((e) => (
                <li key={e.symbol} className="border-t border-[var(--color-line)] pt-3 text-sm">
                  <span className="font-semibold text-[var(--color-ink)]">{e.symbol}</span>
                  <span className="ml-2 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
                    {e.themes.join(' · ')}
                  </span>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{e.note}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs leading-relaxed text-[var(--color-muted)]">
              {data.disclaimer ||
                '정보 제공 목적이며 특정 종목의 매수·매도를 권유하지 않습니다.'}
            </p>
          </section>
        </>
      )}
    </div>
  )
}
