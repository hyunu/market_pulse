-- 시장·환율 보조 자산 시드 (Yahoo 등은 프로토타입)

INSERT INTO assets (asset_id, symbol, asset_type, name, currency, provider, source_symbol)
VALUES
  ('SPX', 'SPX', 'index', 'S&P 500', 'USD', 'fred', 'SP500'),
  ('GSPC', '^GSPC', 'index', 'S&P 500', 'USD', 'yahoo', '^GSPC'),
  ('VIX', '^VIX', 'index', 'VIX', 'USD', 'yahoo', '^VIX'),
  ('IXIC', '^IXIC', 'index', 'NASDAQ Composite', 'USD', 'yahoo', '^IXIC'),
  ('KS11', '^KS11', 'index', 'KOSPI', 'KRW', 'yahoo', '^KS11'),
  ('SSEC', '000001.SS', 'index', 'Shanghai Composite', 'CNY', 'yahoo', '000001.SS'),
  ('BTCUSD', 'BTC-USD', 'crypto', 'Bitcoin USD', 'USD', 'yahoo', 'BTC-USD'),
  ('USDKRW', 'USDKRW', 'fx', 'USD/KRW', 'KRW', 'fred', 'DEXKOUS')
ON CONFLICT (asset_id) DO NOTHING;
