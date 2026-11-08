from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
YAML_PATH = ROOT / "config" / "indicators.yaml"


def test_indicators_yaml_has_30_entries():
    data = yaml.safe_load(YAML_PATH.read_text(encoding="utf-8"))
    indicators = data["indicators"]
    assert len(indicators) == 30
    ids = [i["indicator_id"] for i in indicators]
    assert len(ids) == len(set(ids))
    for item in indicators:
        assert item["provider"] in {"fred", "yahoo", "bls", "bea"}
        assert item["source_id"]
        assert item["frequency"] in {"D", "W", "M", "Q", "A"}
