"""범용 AI provider 호출. OpenAI-compatible + Anthropic + Google."""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

PROVIDERS = {
    "openai": {
        "label": "OpenAI",
        "default_base_url": "https://api.openai.com/v1",
        "default_model": "gpt-4o-mini",
        "style": "openai",
    },
    "anthropic": {
        "label": "Anthropic",
        "default_base_url": "https://api.anthropic.com",
        "default_model": "claude-3-5-haiku-latest",
        "style": "anthropic",
    },
    "google": {
        "label": "Google Gemini",
        "default_base_url": "https://generativelanguage.googleapis.com/v1beta",
        "default_model": "gemini-2.0-flash",
        "style": "google",
    },
    "azure_openai": {
        "label": "Azure OpenAI",
        "default_base_url": "",
        "default_model": "gpt-4o-mini",
        "style": "openai",
    },
    "custom_openai": {
        "label": "Custom OpenAI-compatible",
        "default_base_url": "",
        "default_model": "gpt-4o-mini",
        "style": "openai",
    },
}


def list_provider_presets() -> list[dict[str, Any]]:
    return [
        {
            "id": key,
            "label": meta["label"],
            "default_base_url": meta["default_base_url"],
            "default_model": meta["default_model"],
            "style": meta["style"],
        }
        for key, meta in PROVIDERS.items()
    ]


def chat_completion(
    *,
    provider: str,
    base_url: str,
    api_key: str,
    model: str,
    system: str,
    user: str,
    organization: str | None = None,
    extra_header_name: str | None = None,
    extra_header_value: str | None = None,
    timeout: float = 60.0,
) -> str:
    meta = PROVIDERS.get(provider) or PROVIDERS["custom_openai"]
    style = meta["style"]
    headers: dict[str, str] = {"Accept": "application/json"}
    if extra_header_name and extra_header_value:
        headers[extra_header_name] = extra_header_value

    if style == "anthropic":
        return _anthropic(
            base_url=base_url or meta["default_base_url"],
            api_key=api_key,
            model=model,
            system=system,
            user=user,
            headers=headers,
            timeout=timeout,
        )
    if style == "google":
        return _google(
            base_url=base_url or meta["default_base_url"],
            api_key=api_key,
            model=model,
            system=system,
            user=user,
            timeout=timeout,
        )
    return _openai_compatible(
        base_url=base_url or meta["default_base_url"],
        api_key=api_key,
        model=model,
        system=system,
        user=user,
        organization=organization,
        headers=headers,
        timeout=timeout,
    )


def _openai_compatible(
    *,
    base_url: str,
    api_key: str,
    model: str,
    system: str,
    user: str,
    organization: str | None,
    headers: dict[str, str],
    timeout: float,
) -> str:
    if not base_url:
        raise ValueError("API base URL이 필요합니다")
    root = base_url.rstrip("/")
    url = f"{root}/chat/completions" if not root.endswith("/chat/completions") else root
    headers = {
        **headers,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if organization:
        headers["OpenAI-Organization"] = organization
    payload = {
        "model": model,
        "temperature": 0.3,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    with httpx.Client(timeout=timeout) as client:
        resp = client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
    try:
        return str(data["choices"][0]["message"]["content"]).strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError("OpenAI-compatible 응답 형식이 올바르지 않습니다") from exc


def _anthropic(
    *,
    base_url: str,
    api_key: str,
    model: str,
    system: str,
    user: str,
    headers: dict[str, str],
    timeout: float,
) -> str:
    root = base_url.rstrip("/")
    url = f"{root}/v1/messages" if not root.endswith("/messages") else root
    headers = {
        **headers,
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "max_tokens": 800,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    with httpx.Client(timeout=timeout) as client:
        resp = client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
    blocks = data.get("content") or []
    texts = [b.get("text", "") for b in blocks if isinstance(b, dict)]
    text = "\n".join(t for t in texts if t).strip()
    if not text:
        raise ValueError("Anthropic 응답이 비어 있습니다")
    return text


def _google(
    *,
    base_url: str,
    api_key: str,
    model: str,
    system: str,
    user: str,
    timeout: float,
) -> str:
    root = base_url.rstrip("/")
    url = f"{root}/models/{model}:generateContent"
    params = {"key": api_key}
    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"temperature": 0.3},
    }
    with httpx.Client(timeout=timeout) as client:
        resp = client.post(url, params=params, json=payload)
        resp.raise_for_status()
        data = resp.json()
    try:
        parts = data["candidates"][0]["content"]["parts"]
        return "".join(p.get("text", "") for p in parts).strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError("Google 응답 형식이 올바르지 않습니다") from exc
