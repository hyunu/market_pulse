-- MarketPulse Phase 4 — 개인 투자자산
-- 거래내역으로 포지션 재구성 가능. 원본 거래는 삭제보다 취소(cancel) 권장.

CREATE TABLE IF NOT EXISTS portfolio_accounts (
  account_id      TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  base_currency   TEXT NOT NULL DEFAULT 'KRW',
  description     TEXT,
  is_demo         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_transactions (
  tx_id           BIGSERIAL PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES portfolio_accounts(account_id) ON DELETE CASCADE,
  trade_date      DATE NOT NULL,
  symbol          TEXT NOT NULL,
  asset_class     TEXT NOT NULL, -- equity | bond | cash | commodity | crypto | etf
  side            TEXT NOT NULL CHECK (side IN (
                    'buy','sell','deposit','withdraw','dividend_reinvest','fee'
                  )),
  quantity        DOUBLE PRECISION NOT NULL DEFAULT 0,
  price           DOUBLE PRECISION NOT NULL DEFAULT 0,
  fee             DOUBLE PRECISION NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'USD',
  fx_rate         DOUBLE PRECISION NOT NULL DEFAULT 1, -- → base_currency
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ptx_account_date
  ON portfolio_transactions(account_id, trade_date);

CREATE TABLE IF NOT EXISTS portfolio_dividends (
  dividend_id     BIGSERIAL PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES portfolio_accounts(account_id) ON DELETE CASCADE,
  ex_date         DATE,
  pay_date        DATE NOT NULL,
  symbol          TEXT NOT NULL,
  amount          DOUBLE PRECISION NOT NULL, -- 세전 수령액 (지급 통화)
  currency        TEXT NOT NULL DEFAULT 'USD',
  fx_rate         DOUBLE PRECISION NOT NULL DEFAULT 1,
  tax             DOUBLE PRECISION NOT NULL DEFAULT 0,
  reinvested      BOOLEAN NOT NULL DEFAULT FALSE,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdiv_account_pay
  ON portfolio_dividends(account_id, pay_date);

CREATE TABLE IF NOT EXISTS portfolio_targets (
  account_id      TEXT NOT NULL REFERENCES portfolio_accounts(account_id) ON DELETE CASCADE,
  asset_class     TEXT NOT NULL,
  target_weight   DOUBLE PRECISION NOT NULL CHECK (target_weight >= 0 AND target_weight <= 1),
  PRIMARY KEY (account_id, asset_class)
);

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  snapshot_id     BIGSERIAL PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES portfolio_accounts(account_id) ON DELETE CASCADE,
  as_of           DATE NOT NULL,
  total_value     DOUBLE PRECISION NOT NULL,
  cash_value      DOUBLE PRECISION NOT NULL DEFAULT 0,
  holdings        JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, as_of)
);

CREATE INDEX IF NOT EXISTS idx_psnap_account_asof
  ON portfolio_snapshots(account_id, as_of DESC);
