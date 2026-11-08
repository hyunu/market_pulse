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
