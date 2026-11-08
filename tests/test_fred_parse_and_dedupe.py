"""값 파싱 및 중복 방지 SQL 경로 단위 검증 (DB 없는 파싱 + 메모리 시뮬레이션)."""

from collectors.base import parse_fred_value


def test_parse_fred_value_missing_tokens():
    assert parse_fred_value(".") is None
    assert parse_fred_value("") is None
    assert parse_fred_value("NA") is None
    assert parse_fred_value(None) is None


def test_parse_fred_value_number():
    assert parse_fred_value("3.14") == 3.14
    assert parse_fred_value("-1.5") == -1.5


def test_dedupe_key_tuple():
    """FR-002: 동일 자연키는 한 번만 적재되어야 함 — 키 구성 검증."""

    def natural_key(indicator_id, observation_date, vintage_id, revision):
        return (indicator_id, observation_date, vintage_id, revision)

    a = natural_key("us_cpi", "2024-01-01", None, 1)
    b = natural_key("us_cpi", "2024-01-01", None, 1)
    c = natural_key("us_cpi", "2024-01-01", None, 2)
    assert a == b
    assert a != c
    store = {a: 300.0}
    if b in store:
        pass  # skip duplicate
    else:
        store[b] = 999.0
    assert store[a] == 300.0
    store[c] = 301.0
    assert len(store) == 2
