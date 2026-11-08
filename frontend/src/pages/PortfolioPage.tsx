import { useEffect, useMemo, useState } from 'react'
import { getPortfolioOverview, getRegime, getScores } from '../api/client'
import type { PortfolioOverview, RegimePayload, ScoresPayload } from '../api/types'
import { PageHeader } from '../components/PageHeader'
import { formatNumber, formatPct } from '../lib/format'

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
    <div className="pr-3 pt-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-1 font-display text-[1.55rem] font-semibold tabular-nums tracking-[-0.03em] md:text-[1.75rem]">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">{hint}</p> : null}
    </div>
  )
}

export function PortfolioPage() {
  const [data, setData] = useState<PortfolioOverview | null>(null)
  const [mode, setMode] = useState('smp')
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
      const m = p.sourceMode === 'api' ? p.data.source_mode : 'sample'
      setMode(m === 'demo' ? 'demo' : m === 'api' ? 'api' : 'smp')
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
        subtitle="거래 원장으로 평가·수익·배분·배당을 재구성합니다. 매매를 권유하지 않으며, 거시 노출은 Phase 3와 함께 설명합니다."
        sourceMode={mode === 'api' ? 'api' : 'mock'}
        extra={<span className="mp-source mb-1">{mode}</span>}
      />

      {loading || !data || !perf ? (
        <p className="text-sm text-[var(--color-muted)]">불러오는 중…</p>
      ) : (
        <>
          <p className="mb-4 text-[12px] text-[var(--color-muted)]">
            {data.account.name}
            <span className="mx-1.5 text-[var(--color-line-strong)]">/</span>
            {currency}
            <span className="mx-1.5 text-[var(--color-line-strong)]">/</span>
            as-of {perf.as_of}
          </p>

          <section className="mp-metric-grid mp-rise grid-cols-2 xl:grid-cols-4">
            <Metric label="총평가" value={formatNumber(perf.total_value, 0)} hint={currency} />
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
              hint={`${perf.years}y`}
            />
          </section>

          <section className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <h2 className="mp-section-title">Allocation vs target</h2>
              <p className="mt-1 text-[12px] text-[var(--color-muted)]">
                실비중(스틸) · 목표 마커(앰버). 리밸런싱 권유 아님.
              </p>
              <div className="mt-4 space-y-3.5">
                {data.allocation.map((a) => (
                  <div key={a.asset_class}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px]">
                      <span className="font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-soft)]">
                        {a.asset_class}
                      </span>
                      <span className="tabular-nums text-[var(--color-muted)]">
                        {formatPct(a.actual_weight * 100, 1)}
                        <span className="mx-1 opacity-40">|</span>
                        {formatPct(a.target_weight * 100, 1)}
                        <span className="ml-1.5 text-[var(--color-ink)]">
                          {formatPct(a.drift * 100, 1)}
                        </span>
                      </span>
                    </div>
                    <div className="relative h-[5px] bg-[var(--color-line)]">
                      <div
                        className="absolute left-0 top-0 h-[5px] bg-[var(--color-steel)]"
                        style={{
                          width: `${(a.actual_weight / allocationMax) * 100}%`,
                        }}
                      />
                      <div
                        className="absolute top-[-2px] h-[9px] w-[2px] bg-[var(--color-accent)]"
                        style={{
                          left: `${(a.target_weight / allocationMax) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mp-section-title">Dividends</h2>
              <p className="mt-1 text-[12px] text-[var(--color-muted)]">세전 · 세금 · 세후</p>
              <div className="mp-metric-grid mt-4 grid-cols-3">
                <div className="pt-3">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    세전
                  </p>
                  <p className="mt-1 font-display text-xl font-semibold tabular-nums">
                    {formatNumber(data.dividends.gross_base, 0)}
                  </p>
                </div>
                <div className="pt-3">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    세금
                  </p>
                  <p className="mt-1 font-display text-xl font-semibold tabular-nums">
                    {formatNumber(data.dividends.tax_base, 0)}
                  </p>
                </div>
                <div className="pt-3">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    세후
                  </p>
                  <p className="mt-1 font-display text-xl font-semibold tabular-nums text-[var(--color-accent-ink)]">
                    {formatNumber(data.dividends.net_base, 0)}
                  </p>
                </div>
              </div>
              <ul className="mt-3">
                {Object.entries(data.dividends.by_symbol).map(([sym, amt]) => (
                  <li
                    key={sym}
                    className="flex justify-between border-t border-[var(--color-line)] py-1.5 text-[12px] text-[var(--color-muted)]"
                  >
                    <span className="font-medium text-[var(--color-ink-soft)]">{sym}</span>
                    <span className="tabular-nums">{formatNumber(amt, 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-10">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="mp-section-title">Holdings</h2>
              <span className="text-[11px] text-[var(--color-muted)]">{data.holdings.length} positions</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-[var(--color-line-strong)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    <th className="py-2 pr-3 font-semibold">Symbol</th>
                    <th className="py-2 pr-3 font-semibold">Class</th>
                    <th className="py-2 pr-3 font-semibold">Qty</th>
                    <th className="py-2 pr-3 font-semibold">Value</th>
                    <th className="py-2 pr-3 font-semibold">P&amp;L</th>
                    <th className="py-2 font-semibold">Wgt</th>
                  </tr>
                </thead>
                <tbody>
                  {data.holdings.map((h) => (
                    <tr key={h.symbol} className="border-b border-[var(--color-line)]">
                      <td className="py-2 pr-3 font-semibold text-[var(--color-ink)]">{h.symbol}</td>
                      <td className="py-2 pr-3 text-[var(--color-muted)]">{h.asset_class}</td>
                      <td className="py-2 pr-3 tabular-nums">{formatNumber(h.quantity, 4)}</td>
                      <td className="py-2 pr-3 tabular-nums font-medium">
                        {formatNumber(h.market_value, 0)}
                      </td>
                      <td
                        className={`py-2 pr-3 tabular-nums font-medium ${
                          h.unrealized_pnl >= 0 ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'
                        }`}
                      >
                        {formatNumber(h.unrealized_pnl, 0)}
                      </td>
                      <td className="py-2 tabular-nums text-[var(--color-muted)]">
                        {formatPct(h.weight * 100, 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-10 border-t border-[var(--color-line)] pt-7">
            <h2 className="mp-section-title">Macro exposure</h2>
            <p className="mt-1 text-[12px] text-[var(--color-muted)]">
              Phase 3 score / regime과 보유 민감도
            </p>
            <div className="mp-metric-grid mt-4 grid-cols-3">
              <div className="pt-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  Market Score
                </p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                  {formatNumber(scores?.market_score ?? null, 1)}
                </p>
              </div>
              <div className="pt-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  Regime
                </p>
                <p className="mt-1 font-display text-lg font-semibold text-[var(--color-accent-ink)]">
                  {regime?.label || '—'}
                </p>
              </div>
              <div className="pt-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  Confidence
                </p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                  {formatPct((regime?.confidence ?? scores?.confidence ?? 0) * 100, 0)}
                </p>
              </div>
            </div>
            <ul className="mt-4">
              {(data.macro_exposure || []).map((e) => (
                <li key={e.symbol} className="border-t border-[var(--color-line)] py-2.5 text-[13px]">
                  <span className="font-semibold text-[var(--color-ink)]">{e.symbol}</span>
                  <span className="ml-2 text-[10px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
                    {e.themes.join(' · ')}
                  </span>
                  <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">{e.note}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-[var(--color-muted)]">
              {data.disclaimer ||
                '정보 제공 목적이며 특정 종목의 매수·매도를 권유하지 않습니다.'}
            </p>
          </section>
        </>
      )}
    </div>
  )
}
