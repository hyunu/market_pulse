-- App-level settings (AI provider 등). API 키는 ciphertext만 저장.
CREATE TABLE IF NOT EXISTS app_settings (
  setting_key     TEXT PRIMARY KEY,
  value_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (setting_key, value_json)
VALUES (
  'ai',
  '{
    "enabled": false,
    "provider": "openai",
    "base_url": "https://api.openai.com/v1",
    "model": "gpt-4o-mini",
    "organization": null,
    "extra_header_name": null,
    "extra_header_value": null,
    "api_key_ciphertext": null,
    "api_key_hint": null
  }'::jsonb
)
ON CONFLICT (setting_key) DO NOTHING;
