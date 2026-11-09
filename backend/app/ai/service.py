from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from backend.app.ai.crypto import decrypt_secret, encrypt_secret, mask_secret
from backend.app.ai.providers import PROVIDERS, list_provider_presets
from backend.app.db import fetch_one, get_conn, ping_db

logger = logging.getLogger(__name__)

AI_KEY = "ai"


def _default_ai() -> dict[str, Any]:
    return {
        "enabled": False,
        "provider": "openai",
        "base_url": PROVIDERS["openai"]["default_base_url"],
        "model": PROVIDERS["openai"]["default_model"],
        "organization": None,
        "extra_header_name": None,
        "extra_header_value": None,
        "api_key_ciphertext": None,
        "api_key_hint": None,
    }


def _load_raw() -> dict[str, Any]:
    if not ping_db():
        return _default_ai()
    row = fetch_one(
        "SELECT value_json FROM app_settings WHERE setting_key = %s",
        (AI_KEY,),
    )
    if not row:
        return _default_ai()
    data = dict(row["value_json"] or {})
    base = _default_ai()
    base.update(data)
    return base


def _save_raw(data: dict[str, Any]) -> None:
    import json

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO app_settings (setting_key, value_json, updated_at)
                VALUES (%s, %s::jsonb, NOW())
                ON CONFLICT (setting_key) DO UPDATE
                  SET value_json = EXCLUDED.value_json,
                      updated_at = NOW()
                """,
                (AI_KEY, json.dumps(data)),
            )


def get_ai_settings_public() -> dict[str, Any]:
    raw = _load_raw()
    has_key = bool(raw.get("api_key_ciphertext"))
    return {
        "enabled": bool(raw.get("enabled")),
        "provider": raw.get("provider") or "openai",
        "base_url": raw.get("base_url") or "",
        "model": raw.get("model") or "",
        "organization": raw.get("organization"),
        "extra_header_name": raw.get("extra_header_name"),
        # never return secret header value or api key
        "extra_header_set": bool(raw.get("extra_header_value")),
        "api_key_set": has_key,
        "api_key_hint": raw.get("api_key_hint") if has_key else None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "presets": list_provider_presets(),
        "note": "API 키는 서버에 암호화 저장되며 응답에는 마스킹만 표시됩니다.",
    }


def upsert_ai_settings(payload: dict[str, Any]) -> dict[str, Any]:
    raw = _load_raw()
    provider = str(payload.get("provider") or raw["provider"]).strip()
    if provider not in PROVIDERS:
        raise ValueError(f"unsupported provider: {provider}")

    if "enabled" in payload:
        raw["enabled"] = bool(payload["enabled"])
    raw["provider"] = provider
    if "base_url" in payload and payload["base_url"] is not None:
        raw["base_url"] = str(payload["base_url"]).strip()
    if "model" in payload and payload["model"] is not None:
        raw["model"] = str(payload["model"]).strip()
    if "organization" in payload:
        org = payload["organization"]
        raw["organization"] = str(org).strip() if org else None
    if "extra_header_name" in payload:
        name = payload["extra_header_name"]
        raw["extra_header_name"] = str(name).strip() if name else None
    if payload.get("extra_header_value"):
        # store as plain in jsonb but never log/return; for self-host local use
        raw["extra_header_value"] = str(payload["extra_header_value"])

    api_key = payload.get("api_key")
    if isinstance(api_key, str) and api_key.strip():
        plain = api_key.strip()
        raw["api_key_ciphertext"] = encrypt_secret(plain)
        raw["api_key_hint"] = mask_secret(plain)
        # never log the key
        logger.info("AI API key updated for provider=%s hint=%s", provider, raw["api_key_hint"])

    if not raw.get("base_url"):
        raw["base_url"] = PROVIDERS[provider]["default_base_url"]
    if not raw.get("model"):
        raw["model"] = PROVIDERS[provider]["default_model"]

    _save_raw(raw)
    return get_ai_settings_public()


def clear_ai_api_key() -> dict[str, Any]:
    raw = _load_raw()
    raw["api_key_ciphertext"] = None
    raw["api_key_hint"] = None
    raw["enabled"] = False
    _save_raw(raw)
    logger.info("AI API key cleared")
    return get_ai_settings_public()


def resolve_ai_credentials() -> dict[str, Any] | None:
    raw = _load_raw()
    if not raw.get("enabled"):
        return None
    cipher = raw.get("api_key_ciphertext")
    if not cipher:
        return None
    try:
        api_key = decrypt_secret(str(cipher))
    except ValueError:
        logger.exception("AI key decrypt failed")
        return None
    return {
        "provider": raw["provider"],
        "base_url": raw.get("base_url") or "",
        "model": raw.get("model") or "",
        "api_key": api_key,
        "organization": raw.get("organization"),
        "extra_header_name": raw.get("extra_header_name"),
        "extra_header_value": raw.get("extra_header_value"),
    }
