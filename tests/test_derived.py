import pytest

from collectors.derived import (
    clamp_score,
    core_cpi_3m_ann,
    diff,
    mom_pct,
    pmi_vs_50,
    simple_ma,
    yoy_pct,
    zscore,
)


def test_mom_pct():
    assert mom_pct(110.0, 100.0) == pytest.approx(10.0)


def test_yoy_pct():
    assert yoy_pct(105.0, 100.0) == pytest.approx(5.0)


def test_diff():
    assert diff(3.5, 3.2) == pytest.approx(0.3)


def test_simple_ma():
    assert simple_ma([1.0, 2.0, 3.0]) == pytest.approx(2.0)


def test_zscore():
    assert zscore(12.0, 10.0, 2.0) == pytest.approx(1.0)


def test_core_cpi_3m_ann():
    # ((103/100)^4 - 1) * 100
    expected = ((103 / 100) ** 4 - 1) * 100
    assert core_cpi_3m_ann(103.0, 100.0) == pytest.approx(expected)


def test_pmi_vs_50():
    assert pmi_vs_50(52.3) == pytest.approx(2.3)


def test_clamp_score():
    assert clamp_score(150) == 100
    assert clamp_score(-150) == -100
