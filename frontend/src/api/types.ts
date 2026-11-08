export type Indicator = {
  indicator_id: string
  name: string
  name_ko?: string | null
  category: string
  unit?: string | null
  frequency: string
  provider: string
  source_id: string
  is_derived?: boolean
  geography?: string | null
}

export type Observation = {
  observation_date: string
  release_date?: string | null
  value: number | null
  collected_at: string
  vintage_id?: string | null
  source_revision: number
  quality_flag?: string | null
}

export type Health = {
  status: string
  db: 'up' | 'down'
  version: string
}

export type PeriodKey = '1M' | '3M' | '1Y' | '5Y' | '10Y' | 'MAX'

export type SeriesPoint = {
  date: string
  value: number
}

export type IndicatorSeries = {
  indicator: Indicator
  points: SeriesPoint[]
  asOf: string | null
  changePct: number | null
  sourceMode: 'api' | 'mock'
}

export type DomainScore = {
  domain: string
  score: number | null
  weight: number
  drivers: Array<Record<string, unknown>>
  contrarians: Array<Record<string, unknown>>
  coverage: number
  source_mode: string
  as_of?: string | null
}

export type ScoresPayload = {
  as_of: string | null
  analyzed_at: string | null
  market_score: number | null
  confidence: number
  weights: Record<string, number>
  domains: Record<string, DomainScore>
  source_mode: 'api' | 'synthetic' | 'mixed' | string
  methodology: Record<string, unknown>
}

export type RegimePayload = {
  label: string
  quadrant: { growth: string; inflation: string }
  growth: Record<string, unknown>
  inflation: Record<string, unknown>
  drivers: Array<Record<string, unknown>>
  contrarians: Array<Record<string, unknown>>
  similar_regimes: Array<{
    as_of: string
    growth: number
    inflation: number
    label: string
    distance: number
  }>
  confidence: number
  source_mode: string
  as_of: string | null
  analyzed_at?: string | null
}

export type CorrelationPayload = {
  indicators: string[]
  matrix: Record<string, Record<string, number | null>>
  observations_span: Record<string, unknown>
  pairs_computed: number
  source_mode: string
  method: string
  analyzed_at?: string | null
}
