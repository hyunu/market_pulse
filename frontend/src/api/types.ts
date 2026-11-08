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

export type PortfolioHolding = {
  symbol: string
  asset_class: string
  quantity: number
  avg_cost: number
  mark_price: number
  fx_rate: number
  market_value: number
  cost_basis: number
  unrealized_pnl: number
  weight: number
}

export type PortfolioOverview = {
  account: {
    account_id: string
    name: string
    base_currency: string
    description?: string
    is_demo?: boolean
  }
  performance: {
    as_of: string
    total_value: number
    net_invested: number
    simple_return: number | null
    annualized_return: number | null
    xirr: number | null
    mdd: number | null
    years: number
  }
  holdings: PortfolioHolding[]
  allocation: Array<{
    asset_class: string
    actual_weight: number
    target_weight: number
    drift: number
    market_value: number
  }>
  dividends: {
    gross_base: number
    tax_base: number
    net_base: number
    by_symbol: Record<string, number>
    count: number
  }
  targets: Array<{ asset_class: string; target_weight: number }>
  macro_exposure?: Array<{ symbol: string; themes: string[]; note: string }>
  source_mode: string
  disclaimer?: string
  as_of?: string
}
