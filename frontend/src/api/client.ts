import { MOCK_INDICATORS, mockObservations } from '../data/mock'
import type { Health, Indicator, Observation, PeriodKey } from './types'

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
