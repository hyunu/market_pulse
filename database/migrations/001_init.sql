-- MarketPulse Phase 1 schema
-- 원본 덮어쓰기 금지, 중복 UNIQUE, vintage/revision 버전화

CREATE TABLE IF NOT EXISTS data_sources (
  provider        TEXT PRIMARY KEY,
  display_name    TEXT NOT NULL,
  base_url        TEXT,
  auth_type       TEXT NOT NULL DEFAULT 'api_key',
  rate_limit_rpm  INT,
  license_note    TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS indicators (
  indicator_id    TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  name_ko         TEXT,
  category        TEXT NOT NULL,
  subcategory     TEXT,
  unit            TEXT,
  frequency       CHAR(1) NOT NULL CHECK (frequency IN ('D','W','M','Q','A')),
  provider        TEXT NOT NULL REFERENCES data_sources(provider),
  source_id       TEXT NOT NULL,
  transform       TEXT,
  is_derived      BOOLEAN NOT NULL DEFAULT FALSE,
  parent_ids      TEXT[],
  geography       TEXT,
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, source_id)
);

CREATE INDEX IF NOT EXISTS idx_indicators_category ON indicators(category);

CREATE TABLE IF NOT EXISTS indicator_vintages (
  vintage_id       TEXT PRIMARY KEY,
  indicator_id     TEXT NOT NULL REFERENCES indicators(indicator_id),
  realtime_start   DATE NOT NULL,
  realtime_end     DATE,
  collected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes            TEXT
);

CREATE INDEX IF NOT EXISTS idx_vintages_indicator
  ON indicator_vintages(indicator_id, realtime_start DESC);

CREATE TABLE IF NOT EXISTS indicator_observations (
  id                 BIGSERIAL PRIMARY KEY,
  indicator_id       TEXT NOT NULL REFERENCES indicators(indicator_id),
  observation_date   DATE NOT NULL,
  release_date       DATE,
  value              DOUBLE PRECISION,
  collected_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vintage_id         TEXT,
  source_revision    INT NOT NULL DEFAULT 1,
  quality_flag       TEXT,
  raw_payload        JSONB,
  -- PG15+: NULL vintage 도 동일 키로 취급해 중복 삽입 차단
  UNIQUE NULLS NOT DISTINCT (indicator_id, observation_date, vintage_id, source_revision)
);

CREATE INDEX IF NOT EXISTS idx_obs_indicator_date
  ON indicator_observations(indicator_id, observation_date DESC);

CREATE TABLE IF NOT EXISTS derived_observations (
  id                 BIGSERIAL PRIMARY KEY,
  indicator_id       TEXT NOT NULL REFERENCES indicators(indicator_id),
  observation_date   DATE NOT NULL,
  value              DOUBLE PRECISION,
  formula_id         TEXT NOT NULL,
  inputs             JSONB NOT NULL,
  computed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (indicator_id, observation_date, formula_id)
);

CREATE TABLE IF NOT EXISTS assets (
  asset_id       TEXT PRIMARY KEY,
  symbol         TEXT NOT NULL,
  asset_type     TEXT NOT NULL,
  name           TEXT NOT NULL,
  currency       TEXT,
  provider       TEXT REFERENCES data_sources(provider),
  source_symbol  TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS market_prices (
  id             BIGSERIAL PRIMARY KEY,
  asset_id       TEXT NOT NULL REFERENCES assets(asset_id),
  trade_date     DATE NOT NULL,
  open           DOUBLE PRECISION,
  high           DOUBLE PRECISION,
  low            DOUBLE PRECISION,
  close          DOUBLE PRECISION,
  adj_close      DOUBLE PRECISION,
  volume         DOUBLE PRECISION,
  collected_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (asset_id, trade_date)
);

CREATE TABLE IF NOT EXISTS collection_jobs (
  job_id           BIGSERIAL PRIMARY KEY,
  provider         TEXT NOT NULL,
  job_type         TEXT NOT NULL,
  status           TEXT NOT NULL,
  started_at       TIMESTAMPTZ,
  finished_at      TIMESTAMPTZ,
  records_upserted INT DEFAULT 0,
  error_message    TEXT,
  meta             JSONB
);

CREATE INDEX IF NOT EXISTS idx_jobs_started ON collection_jobs(started_at DESC);

-- Seed known providers
INSERT INTO data_sources (provider, display_name, base_url, auth_type, rate_limit_rpm, license_note)
VALUES
  ('fred', 'FRED / ALFRED (St. Louis Fed)', 'https://api.stlouisfed.org/fred', 'api_key', 120, 'Free with API key; attribution required.'),
  ('bls', 'U.S. Bureau of Labor Statistics', 'https://api.bls.gov/publicAPI/v2', 'api_key', 50, 'BLS public API; registration recommended.'),
  ('bea', 'U.S. Bureau of Economic Analysis', 'https://apps.bea.gov/api/data', 'api_key', 100, 'BEA API; free registration.'),
  ('yahoo', 'Yahoo Finance (prototype)', 'https://query1.finance.yahoo.com', 'none', 30, 'PROTOTYPE ONLY. Review Yahoo Terms of Service before any production use. Not an official redistributable feed.')
ON CONFLICT (provider) DO NOTHING;
