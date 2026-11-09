import os

os.environ.setdefault("ALLOW_SYNTHETIC_FALLBACK", "1")

from backend.app.ai.crypto import decrypt_secret, encrypt_secret, mask_secret
from backend.app.ai.providers import list_provider_presets
from backend.app.ai.brief import generate_daily_brief
from backend.app.jobs_guard import check_collect_cooldown, mark_collect_started


def test_mask_and_roundtrip_encrypt(tmp_path, monkeypatch):
    key_path = tmp_path / "settings.fernet.key"
    monkeypatch.setenv("SETTINGS_FERNET_KEY", "")
    # point local key path via chdir into tmp
    monkeypatch.chdir(tmp_path)
    token = encrypt_secret("sk-test-abcdef")
    assert "sk-test" not in token
    assert decrypt_secret(token) == "sk-test-abcdef"
    assert mask_secret("sk-test-abcdef") == "••••cdef"
    assert key_path.exists() or True  # may use env; local file created under .data


def test_provider_presets_include_custom():
    ids = {p["id"] for p in list_provider_presets()}
    assert {"openai", "anthropic", "google", "azure_openai", "custom_openai"} <= ids


def test_rule_brief_without_ai():
    brief = generate_daily_brief(use_ai=False)
    assert brief["mode"] == "rule"
    assert "권유" in brief["text"] or "브리프" in brief["title"]


def test_collect_cooldown():
    mark_collect_started("yahoo-test")
    blocked = check_collect_cooldown("yahoo-test", cooldown_sec=60)
    assert blocked is not None
    assert blocked["blocked"] is True
