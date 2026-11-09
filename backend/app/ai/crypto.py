"""설정 비밀값 암호화. 평문 키는 로그/API 응답에 노출하지 않음."""

from __future__ import annotations

import logging
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken

from backend.app.settings import get_settings

logger = logging.getLogger(__name__)

_LOCAL_KEY_PATH = Path(".data/settings.fernet.key")


def _load_or_create_key() -> bytes:
    settings = get_settings()
    env_key = (settings.settings_fernet_key or "").strip()
    if env_key:
        return env_key.encode("utf-8")

    _LOCAL_KEY_PATH.parent.mkdir(parents=True, exist_ok=True)
    if _LOCAL_KEY_PATH.exists():
        return _LOCAL_KEY_PATH.read_bytes().strip()

    key = Fernet.generate_key()
    _LOCAL_KEY_PATH.write_bytes(key)
    try:
        _LOCAL_KEY_PATH.chmod(0o600)
    except OSError:
        pass
    logger.info("Generated local settings Fernet key at %s", _LOCAL_KEY_PATH)
    return key


def _fernet() -> Fernet:
    return Fernet(_load_or_create_key())


def encrypt_secret(plain: str) -> str:
    return _fernet().encrypt(plain.encode("utf-8")).decode("utf-8")


def decrypt_secret(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("저장된 API 키를 복호화할 수 없습니다. 키를 다시 입력하세요.") from exc


def mask_secret(plain: str | None) -> str | None:
    if not plain:
        return None
    text = plain.strip()
    if len(text) <= 4:
        return "••••"
    return f"••••{text[-4:]}"
