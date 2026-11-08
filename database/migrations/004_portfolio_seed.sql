-- 데모 계좌 시드 (UI/통합 검증용). 실제 투자 권유가 아닙니다.

INSERT INTO portfolio_accounts (account_id, name, base_currency, description, is_demo)
VALUES (
  'demo-main',
  '데모 종합계좌',
  'KRW',
  'Phase 4 UI/API 데모용 샘플 포트폴리오',
  TRUE
)
ON CONFLICT (account_id) DO NOTHING;

INSERT INTO portfolio_targets (account_id, asset_class, target_weight) VALUES
  ('demo-main', 'equity', 0.55),
  ('demo-main', 'bond', 0.20),
  ('demo-main', 'cash', 0.10),
  ('demo-main', 'commodity', 0.05),
  ('demo-main', 'crypto', 0.05),
  ('demo-main', 'etf', 0.05)
ON CONFLICT (account_id, asset_class) DO UPDATE SET target_weight = EXCLUDED.target_weight;

-- 거래 (수량·가격은 데모). fx_rate: USD→KRW 근사
INSERT INTO portfolio_transactions (
  account_id, trade_date, symbol, asset_class, side, quantity, price, fee, currency, fx_rate, note
)
SELECT * FROM (VALUES
  ('demo-main', DATE '2022-01-10', 'CASH', 'cash', 'deposit', 20000000, 1, 0, 'KRW', 1, '초기 입금'),
  ('demo-main', DATE '2022-01-15', 'SPY', 'etf', 'buy', 20, 450, 5, 'USD', 1200, 'S&P500 ETF'),
  ('demo-main', DATE '2022-03-01', 'QQQ', 'etf', 'buy', 10, 350, 5, 'USD', 1220, 'Nasdaq ETF'),
  ('demo-main', DATE '2022-06-15', '005930.KS', 'equity', 'buy', 50, 65000, 0, 'KRW', 1, '삼성전자'),
  ('demo-main', DATE '2022-09-01', 'TLT', 'bond', 'buy', 30, 110, 3, 'USD', 1350, '미국채 ETF'),
  ('demo-main', DATE '2023-01-20', 'GLD', 'commodity', 'buy', 8, 175, 3, 'USD', 1230, '금 ETF'),
  ('demo-main', DATE '2023-05-10', 'BTC-USD', 'crypto', 'buy', 0.15, 28000, 0, 'USD', 1320, '비트코인'),
  ('demo-main', DATE '2023-11-02', 'SPY', 'etf', 'buy', 10, 420, 5, 'USD', 1340, '추가 매수'),
  ('demo-main', DATE '2024-03-15', 'QQQ', 'etf', 'sell', 3, 440, 5, 'USD', 1330, '일부 실현'),
  ('demo-main', DATE '2024-08-01', 'CASH', 'cash', 'deposit', 3000000, 1, 0, 'KRW', 1, '추가 입금'),
  ('demo-main', DATE '2025-01-10', '005930.KS', 'equity', 'buy', 20, 72000, 0, 'KRW', 1, '삼성전자 추가')
) AS v(account_id, trade_date, symbol, asset_class, side, quantity, price, fee, currency, fx_rate, note)
WHERE NOT EXISTS (
  SELECT 1 FROM portfolio_transactions t WHERE t.account_id = 'demo-main' LIMIT 1
);

INSERT INTO portfolio_dividends (
  account_id, ex_date, pay_date, symbol, amount, currency, fx_rate, tax, reinvested, note
)
SELECT * FROM (VALUES
  ('demo-main', DATE '2023-03-17', DATE '2023-04-28', 'SPY', 45.0, 'USD', 1320, 6.75, FALSE, '분기 배당'),
  ('demo-main', DATE '2023-06-16', DATE '2023-07-31', 'SPY', 48.0, 'USD', 1300, 7.2, FALSE, '분기 배당'),
  ('demo-main', DATE '2023-09-15', DATE '2023-10-31', 'SPY', 50.0, 'USD', 1340, 7.5, FALSE, '분기 배당'),
  ('demo-main', DATE '2024-03-15', DATE '2024-04-30', 'SPY', 55.0, 'USD', 1350, 8.25, FALSE, '분기 배당'),
  ('demo-main', DATE '2024-04-01', DATE '2024-04-20', '005930.KS', 180000, 'KRW', 1, 27720, FALSE, '결산 배당')
) AS v(account_id, ex_date, pay_date, symbol, amount, currency, fx_rate, tax, reinvested, note)
WHERE NOT EXISTS (
  SELECT 1 FROM portfolio_dividends d WHERE d.account_id = 'demo-main' LIMIT 1
);
