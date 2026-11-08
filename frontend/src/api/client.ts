import type {
  CorrelationPayload,
  Health,
  Indicator,
  Observation,
  PeriodKey,
  PortfolioOverview,
  RegimePayload,
  ScoresPayload,
} from './types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || ''

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers || {}) },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${path}`)
  }
  return res.json() as Promise<T>
}

export type FeedStatus = {
  fred_key_configured: boolean
  allow_synthetic_fallback: boolean
  observation_counts: Record<string, number>
  recent_jobs: Array<Record<string, unknown>>
  notes: string[]
}

export async function getHealth(): Promise<Health | null> {
  try {
    return await fetchJson<Health>('/health')
  } catch {
    return null
  }
}

export async function getFeedStatus(): Promise<FeedStatus | null> {
  try {
    return await fetchJson<FeedStatus>('/api/v1/feed/status')
  } catch {
    return null
  }
}

export type CollectProvider = 'fred' | 'bls' | 'bea' | 'yahoo'

/** 키는 백엔드 env에서만 읽음. 프론트는 수집 API만 호출. */
export async function runCollectJob(
  provider: CollectProvider,
  opts?: { jobType?: string; live?: boolean },
): Promise<{ ok: boolean; result: Record<string, unknown>; error?: string }> {
  try {
    const body = await fetchJson<{ result: Record<string, unknown> }>('/api/v1/jobs/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        job_type: opts?.jobType || 'manual',
        live: opts?.live ?? true,
      }),
    })
    const result = body.result || {}
    const status = String(result.status || '')
    const errors = (result.errors as string[] | undefined) || []
    const ok = status === 'success' || status === 'partial'
    return {
      ok,
      result,
      error: ok ? undefined : errors[0] || status || 'collect failed',
    }
  } catch (e) {
    return { ok: false, result: {}, error: e instanceof Error ? e.message : 'collect failed' }
  }
}

export async function listIndicators(params?: {
  category?: string
  provider?: string
}): Promise<{ items: Indicator[]; sourceMode: 'api' | 'empty' }> {
  const qs = new URLSearchParams()
  if (params?.category) qs.set('category', params.category)
  if (params?.provider) qs.set('provider', params.provider)
  qs.set('limit', '200')
  try {
    const items = await fetchJson<Indicator[]>(`/api/v1/indicators?${qs}`)
    return { items, sourceMode: items.length ? 'api' : 'empty' }
  } catch {
    return { items: [], sourceMode: 'empty' }
  }
}

export async function getObservations(
  indicatorId: string,
  opts?: { start?: string; end?: string; limit?: number },
): Promise<{ items: Observation[]; sourceMode: 'api' | 'empty' }> {
  const qs = new URLSearchParams()
  if (opts?.start) qs.set('start', opts.start)
  if (opts?.end) qs.set('end', opts.end)
  qs.set('limit', String(opts?.limit ?? 5000))
  try {
    const items = await fetchJson<Observation[]>(
      `/api/v1/indicators/${encodeURIComponent(indicatorId)}/observations?${qs}`,
    )
    return { items, sourceMode: items.length ? 'api' : 'empty' }
  } catch {
    return { items: [], sourceMode: 'empty' }
  }
}

export function periodStart(period: PeriodKey, end = new Date()): string | undefined {
  if (period === 'MAX') return undefined
  const d = new Date(end)
  const map: Record<Exclude<PeriodKey, 'MAX'>, number> = {
    '1M': 31,
    '3M': 93,
    '1Y': 365,
    '5Y': 365 * 5,
    '10Y': 365 * 10,
  }
  d.setDate(d.getDate() - map[period])
  return d.toISOString().slice(0, 10)
}

export function changePct(values: number[]): number | null {
  if (values.length < 2) return null
  const first = values[0]
  const last = values[values.length - 1]
  if (first === 0) return null
  return ((last - first) / Math.abs(first)) * 100
}

const EMPTY_SCORES: ScoresPayload = {
  as_of: null,
  analyzed_at: null,
  market_score: null,
  confidence: 0,
  weights: {
    growth: 20,
    liquidity: 20,
    inflation: 15,
    rates: 15,
    earnings: 15,
    valuation: 10,
    risk: 5,
  },
  domains: {},
  source_mode: 'unavailable',
  status: '데이터 부족',
  methodology: { note: 'API unreachable or insufficient observations' },
}

const EMPTY_REGIME: RegimePayload = {
  label: '데이터 부족',
  quadrant: { growth: 'n/a', inflation: 'n/a' },
  growth: { direction: null, level: null },
  inflation: { direction: null, level: null },
  drivers: [],
  contrarians: [],
  similar_regimes: [],
  confidence: 0,
  source_mode: 'unavailable',
  status: '데이터 부족',
  as_of: null,
}

export async function getScores(): Promise<{ data: ScoresPayload; sourceMode: 'api' | 'empty' }> {
  try {
    const data = await fetchJson<ScoresPayload>('/api/v1/scores')
    return { data, sourceMode: 'api' }
  } catch {
    return { data: EMPTY_SCORES, sourceMode: 'empty' }
  }
}

export async function getRegime(): Promise<{ data: RegimePayload; sourceMode: 'api' | 'empty' }> {
  try {
    const data = await fetchJson<RegimePayload>('/api/v1/regime')
    return { data, sourceMode: 'api' }
  } catch {
    return { data: EMPTY_REGIME, sourceMode: 'empty' }
  }
}

export async function getPortfolioOverview(
  accountId = 'demo-main',
): Promise<{ data: PortfolioOverview; sourceMode: 'api' | 'empty' }> {
  try {
    const data = await fetchJson<PortfolioOverview>(
      `/api/v1/portfolio/${encodeURIComponent(accountId)}/overview`,
    )
    return { data, sourceMode: 'api' }
  } catch {
    return {
      data: {
        account: {
          account_id: 'demo-main',
          name: '데모 종합계좌',
          base_currency: 'KRW',
          is_demo: true,
        },
        performance: {
          as_of: new Date().toISOString().slice(0, 10),
          total_value: 0,
          net_invested: 0,
          simple_return: null,
          annualized_return: null,
          xirr: null,
          mdd: null,
          years: 0,
        },
        holdings: [],
        allocation: [],
        dividends: { gross_base: 0, tax_base: 0, net_base: 0, by_symbol: {}, count: 0 },
        targets: [],
        macro_exposure: [],
        source_mode: 'demo',
        disclaimer: '데모 포트폴리오 — 시세 연동 전 샘플입니다. 매매를 권유하지 않습니다.',
      },
      sourceMode: 'empty',
    }
  }
}

export async function getCorrelation(
  ids?: string[],
): Promise<{ data: CorrelationPayload; sourceMode: 'api' | 'empty' }> {
  const qs = ids?.length ? `?ids=${ids.join(',')}` : ''
  try {
    const data = await fetchJson<CorrelationPayload>(`/api/v1/correlation${qs}`)
    return { data, sourceMode: 'api' }
  } catch {
    return {
      data: {
        indicators: ids?.length ? ids : [],
        matrix: {},
        observations_span: { points: 0 },
        pairs_computed: 0,
        source_mode: 'unavailable',
        method: 'unavailable',
      },
      sourceMode: 'empty',
    }
  }
}
