import type { Indicator, Observation } from '../api/types'

/** API 불가 시 사용하는 샘플 시계열 (데모 전용, 실제 시장값이 아님) */
export const MOCK_INDICATORS: Indicator[] = [
  { indicator_id: 'us_sp500', name: 'S&P 500', name_ko: 'S&P 500', category: 'market', unit: 'index', frequency: 'D', provider: 'fred', source_id: 'SP500', geography: 'US' },
  { indicator_id: 'us_nasdaq', name: 'NASDAQ Composite', name_ko: '나스닥 종합', category: 'market', unit: 'index', frequency: 'D', provider: 'yahoo', source_id: '^IXIC', geography: 'US' },
  { indicator_id: 'kr_kospi', name: 'KOSPI', name_ko: '코스피', category: 'market', unit: 'index', frequency: 'D', provider: 'yahoo', source_id: '^KS11', geography: 'KR' },
  { indicator_id: 'cn_shanghai', name: 'Shanghai Composite', name_ko: '상하이 종합', category: 'market', unit: 'index', frequency: 'D', provider: 'yahoo', source_id: '000001.SS', geography: 'CN' },
  { indicator_id: 'us_vix', name: 'VIX', name_ko: 'VIX', category: 'market', unit: 'index', frequency: 'D', provider: 'fred', source_id: 'VIXCLS', geography: 'US' },
  { indicator_id: 'us_gdp', name: 'Real GDP', name_ko: '실질 GDP', category: 'growth', unit: 'bil', frequency: 'Q', provider: 'fred', source_id: 'GDPC1', geography: 'US' },
  { indicator_id: 'us_unemployment', name: 'Unemployment Rate', name_ko: '실업률', category: 'growth', unit: 'percent', frequency: 'M', provider: 'fred', source_id: 'UNRATE', geography: 'US' },
  { indicator_id: 'us_nfp', name: 'Nonfarm Payrolls', name_ko: '비농업 고용', category: 'growth', unit: 'thousands', frequency: 'M', provider: 'fred', source_id: 'PAYEMS', geography: 'US' },
  { indicator_id: 'us_indpro', name: 'Industrial Production', name_ko: '산업생산', category: 'growth', unit: 'index', frequency: 'M', provider: 'fred', source_id: 'INDPRO', geography: 'US' },
  { indicator_id: 'us_retail_sales', name: 'Retail Sales', name_ko: '소매판매', category: 'growth', unit: 'mil_usd', frequency: 'M', provider: 'fred', source_id: 'RSAFS', geography: 'US' },
  { indicator_id: 'us_cpi', name: 'CPI', name_ko: 'CPI', category: 'inflation', unit: 'index', frequency: 'M', provider: 'fred', source_id: 'CPIAUCSL', geography: 'US' },
  { indicator_id: 'us_core_cpi', name: 'Core CPI', name_ko: '근원 CPI', category: 'inflation', unit: 'index', frequency: 'M', provider: 'fred', source_id: 'CPILFESL', geography: 'US' },
  { indicator_id: 'us_pce', name: 'PCE', name_ko: 'PCE', category: 'inflation', unit: 'index', frequency: 'M', provider: 'fred', source_id: 'PCEPI', geography: 'US' },
  { indicator_id: 'us_core_pce', name: 'Core PCE', name_ko: '근원 PCE', category: 'inflation', unit: 'index', frequency: 'M', provider: 'fred', source_id: 'PCEPILFE', geography: 'US' },
  { indicator_id: 'us_m2', name: 'M2', name_ko: 'M2', category: 'liquidity', unit: 'bil_usd', frequency: 'M', provider: 'fred', source_id: 'M2SL', geography: 'US' },
  { indicator_id: 'us_fed_assets', name: 'Fed Total Assets', name_ko: '연준 총자산', category: 'liquidity', unit: 'mil_usd', frequency: 'W', provider: 'fred', source_id: 'WALCL', geography: 'US' },
  { indicator_id: 'us_tga', name: 'TGA', name_ko: 'TGA', category: 'liquidity', unit: 'mil_usd', frequency: 'W', provider: 'fred', source_id: 'WTREGEN', geography: 'US' },
  { indicator_id: 'us_on_rrp', name: 'ON RRP', name_ko: 'ON RRP', category: 'liquidity', unit: 'bil_usd', frequency: 'D', provider: 'fred', source_id: 'RRPONTSYD', geography: 'US' },
  { indicator_id: 'us_fed_funds', name: 'Fed Funds', name_ko: '연방기금금리', category: 'rates', unit: 'percent', frequency: 'D', provider: 'fred', source_id: 'DFF', geography: 'US' },
  { indicator_id: 'us_treasury_2y', name: '2Y Treasury', name_ko: '국채 2년', category: 'rates', unit: 'percent', frequency: 'D', provider: 'fred', source_id: 'DGS2', geography: 'US' },
  { indicator_id: 'us_treasury_10y', name: '10Y Treasury', name_ko: '국채 10년', category: 'rates', unit: 'percent', frequency: 'D', provider: 'fred', source_id: 'DGS10', geography: 'US' },
  { indicator_id: 'us_treasury_30y', name: '30Y Treasury', name_ko: '국채 30년', category: 'rates', unit: 'percent', frequency: 'D', provider: 'fred', source_id: 'DGS30', geography: 'US' },
  { indicator_id: 'us_hy_spread', name: 'HY OAS', name_ko: 'HY 스프레드', category: 'rates', unit: 'percent', frequency: 'D', provider: 'fred', source_id: 'BAMLH0A0HYM2', geography: 'US' },
  { indicator_id: 'us_move', name: 'MOVE', name_ko: 'MOVE', category: 'risk', unit: 'index', frequency: 'D', provider: 'fred', source_id: 'MOVE', geography: 'US' },
  { indicator_id: 'us_stress', name: 'STLFSI4', name_ko: '금융스트레스', category: 'risk', unit: 'index', frequency: 'W', provider: 'fred', source_id: 'STLFSI4', geography: 'US' },
  { indicator_id: 'us_nfci', name: 'NFCI', name_ko: 'NFCI', category: 'risk', unit: 'index', frequency: 'W', provider: 'fred', source_id: 'NFCI', geography: 'US' },
  { indicator_id: 'fx_usdkurw', name: 'USD/KRW', name_ko: '원달러', category: 'global', unit: 'krw', frequency: 'D', provider: 'fred', source_id: 'DEXKOUS', geography: 'GLOBAL' },
  { indicator_id: 'fx_usdcny', name: 'USD/CNY', name_ko: '위안달러', category: 'global', unit: 'cny', frequency: 'D', provider: 'fred', source_id: 'DEXCHUS', geography: 'GLOBAL' },
  { indicator_id: 'commodity_copper', name: 'Copper', name_ko: '구리', category: 'global', unit: 'usd', frequency: 'M', provider: 'fred', source_id: 'PCOPPUSDM', geography: 'GLOBAL' },
  { indicator_id: 'crypto_btc', name: 'Bitcoin', name_ko: '비트코인', category: 'global', unit: 'usd', frequency: 'D', provider: 'yahoo', source_id: 'BTC-USD', geography: 'GLOBAL' },
]

const SEEDS: Record<string, { base: number; vol: number; drift: number }> = {
  us_sp500: { base: 5200, vol: 18, drift: 0.15 },
  us_nasdaq: { base: 16400, vol: 55, drift: 0.2 },
  kr_kospi: { base: 2650, vol: 12, drift: 0.05 },
  cn_shanghai: { base: 3100, vol: 14, drift: 0.02 },
  us_vix: { base: 16, vol: 1.2, drift: 0 },
  us_gdp: { base: 23000, vol: 40, drift: 20 },
  us_unemployment: { base: 4.1, vol: 0.05, drift: 0 },
  us_nfp: { base: 158000, vol: 80, drift: 15 },
  us_indpro: { base: 103, vol: 0.3, drift: 0.02 },
  us_retail_sales: { base: 700000, vol: 2000, drift: 100 },
  us_cpi: { base: 310, vol: 0.4, drift: 0.2 },
  us_core_cpi: { base: 315, vol: 0.3, drift: 0.18 },
  us_pce: { base: 124, vol: 0.15, drift: 0.08 },
  us_core_pce: { base: 122, vol: 0.12, drift: 0.07 },
  us_m2: { base: 21000, vol: 20, drift: 5 },
  us_fed_assets: { base: 7200000, vol: 8000, drift: -2000 },
  us_tga: { base: 700000, vol: 15000, drift: 0 },
  us_on_rrp: { base: 400, vol: 20, drift: -1 },
  us_fed_funds: { base: 4.33, vol: 0.01, drift: 0 },
  us_treasury_2y: { base: 4.2, vol: 0.03, drift: 0 },
  us_treasury_10y: { base: 4.35, vol: 0.03, drift: 0 },
  us_treasury_30y: { base: 4.5, vol: 0.025, drift: 0 },
  us_hy_spread: { base: 3.2, vol: 0.05, drift: 0 },
  us_move: { base: 95, vol: 2, drift: 0 },
  us_stress: { base: -0.4, vol: 0.05, drift: 0 },
  us_nfci: { base: -0.3, vol: 0.03, drift: 0 },
  fx_usdkurw: { base: 1380, vol: 4, drift: 0 },
  fx_usdcny: { base: 7.2, vol: 0.02, drift: 0 },
  commodity_copper: { base: 9200, vol: 40, drift: 1 },
  crypto_btc: { base: 68000, vol: 900, drift: 20 },
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function mockObservations(indicatorId: string, days = 400): Observation[] {
  const cfg = SEEDS[indicatorId] ?? { base: 100, vol: 1, drift: 0 }
  const rand = mulberry32(hash(indicatorId))
  const out: Observation[] = []
  let value = cfg.base
  const today = new Date()
  for (let i = days; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    value += cfg.drift / 100 + (rand() - 0.5) * cfg.vol
    const iso = d.toISOString().slice(0, 10)
    out.push({
      observation_date: iso,
      release_date: iso,
      value: Number(value.toFixed(4)),
      collected_at: `${iso}T12:00:00Z`,
      vintage_id: null,
      source_revision: 1,
      quality_flag: 'ok',
    })
  }
  return out
}
