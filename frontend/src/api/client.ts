import { MOCK_INDICATORS, mockObservations } from '../data/mock'
import type {
  CorrelationPayload,
  Health,
  Indicator,
  Observation,
  PeriodKey,
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

export async function getHealth(): Promise<Health | null> {
  try {
    return await fetchJson<Health>('/health')
  } catch {
    return null
  }
}

export async function listIndicators(params?: {
  category?: string
  provider?: string
}): Promise<{ items: Indicator[]; sourceMode: 'api' | 'mock' }> {
  const qs = new URLSearchParams()
  if (params?.category) qs.set('category', params.category)
  if (params?.provider) qs.set('provider', params.provider)
  qs.set('limit', '200')
  try {
    const items = await fetchJson<Indicator[]>(`/api/v1/indicators?${qs}`)
    if (!items.length) throw new Error('empty')
    return { items, sourceMode: 'api' }
  } catch {
    let items = MOCK_INDICATORS
    if (params?.category) items = items.filter((i) => i.category === params.category)
    if (params?.provider) items = items.filter((i) => i.provider === params.provider)
    return { items, sourceMode: 'mock' }
  }
}

export async function getObservations(
  indicatorId: string,
  opts?: { start?: string; end?: string; limit?: number },
): Promise<{ items: Observation[]; sourceMode: 'api' | 'mock' }> {
  const qs = new URLSearchParams()
  if (opts?.start) qs.set('start', opts.start)
  if (opts?.end) qs.set('end', opts.end)
  qs.set('limit', String(opts?.limit ?? 5000))
  try {
    const items = await fetchJson<Observation[]>(
      `/api/v1/indicators/${encodeURIComponent(indicatorId)}/observations?${qs}`,
    )
    if (!items.length) throw new Error('empty observations')
    return { items, sourceMode: 'api' }
  } catch {
    return { items: mockObservations(indicatorId), sourceMode: 'mock' }
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

const MOCK_SCORES: ScoresPayload = {
  as_of: new Date().toISOString().slice(0, 10),
  analyzed_at: new Date().toISOString(),
  market_score: 12.5,
  confidence: 0.62,
  weights: {
    growth: 20,
    liquidity: 20,
    inflation: 15,
    rates: 15,
    earnings: 15,
    valuation: 10,
    risk: 5,
  },
  domains: {
    growth: { domain: 'growth', score: 18, weight: 20, drivers: [], contrarians: [], coverage: 1, source_mode: 'mock' },
    liquidity: { domain: 'liquidity', score: 8, weight: 20, drivers: [], contrarians: [], coverage: 1, source_mode: 'mock' },
    inflation: { domain: 'inflation', score: -6, weight: 15, drivers: [], contrarians: [], coverage: 1, source_mode: 'mock' },
    rates: { domain: 'rates', score: -10, weight: 15, drivers: [], contrarians: [], coverage: 1, source_mode: 'mock' },
    earnings: { domain: 'earnings', score: 22, weight: 15, drivers: [], contrarians: [], coverage: 1, source_mode: 'mock' },
    valuation: { domain: 'valuation', score: -14, weight: 10, drivers: [], contrarians: [], coverage: 1, source_mode: 'mock' },
    risk: { domain: 'risk', score: 5, weight: 5, drivers: [], contrarians: [], coverage: 1, source_mode: 'mock' },
  },
  source_mode: 'mock',
  methodology: { note: 'frontend mock fallback' },
}

const MOCK_REGIME: RegimePayload = {
  label: 'Goldilocks',
  quadrant: { growth: 'up', inflation: 'down' },
  growth: { direction: 'up', level: 0.4 },
  inflation: { direction: 'down', level: -0.2 },
  drivers: [{ axis: 'growth', indicator_id: 'us_nfp' }],
  contrarians: [],
  similar_regimes: [],
  confidence: 0.55,
  source_mode: 'mock',
  as_of: new Date().toISOString().slice(0, 10),
}

export async function getScores(): Promise<{ data: ScoresPayload; sourceMode: 'api' | 'mock' }> {
  try {
    const data = await fetchJson<ScoresPayload>('/api/v1/scores')
    return { data, sourceMode: 'api' }
  } catch {
    return { data: MOCK_SCORES, sourceMode: 'mock' }
  }
}

export async function getRegime(): Promise<{ data: RegimePayload; sourceMode: 'api' | 'mock' }> {
  try {
    const data = await fetchJson<RegimePayload>('/api/v1/regime')
    return { data, sourceMode: 'api' }
  } catch {
    return { data: MOCK_REGIME, sourceMode: 'mock' }
  }
}

export async function getCorrelation(
  ids?: string[],
): Promise<{ data: CorrelationPayload; sourceMode: 'api' | 'mock' }> {
  const qs = ids?.length ? `?ids=${ids.join(',')}` : ''
  try {
    const data = await fetchJson<CorrelationPayload>(`/api/v1/correlation${qs}`)
    return { data, sourceMode: 'api' }
  } catch {
    const indicators = ids?.length
      ? ids
      : ['us_sp500', 'us_treasury_10y', 'us_vix', 'us_hy_spread']
    const matrix: Record<string, Record<string, number | null>> = {}
    for (const a of indicators) {
      matrix[a] = {}
      for (const b of indicators) {
        matrix[a][b] = a === b ? 1 : Number((Math.sin(a.length + b.length) * 0.4).toFixed(2))
      }
    }
    return {
      data: {
        indicators,
        matrix,
        observations_span: { points: 0 },
        pairs_computed: 0,
        source_mode: 'mock',
        method: 'mock',
      },
      sourceMode: 'mock',
    }
  }
}
