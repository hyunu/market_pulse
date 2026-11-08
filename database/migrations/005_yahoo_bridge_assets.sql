-- Yahoo bridge assets for S&P / VIX (prototype license — review ToS)
INSERT INTO assets (asset_id, symbol, asset_type, name, currency, provider, source_symbol, is_active)
VALUES
  ('GSPC', '^GSPC', 'index', 'S&P 500', 'USD', 'yahoo', '^GSPC', TRUE),
  ('VIX', '^VIX', 'index', 'VIX', 'USD', 'yahoo', '^VIX', TRUE)
ON CONFLICT (asset_id) DO NOTHING;
