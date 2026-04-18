"""Unit tests for keyword ranking helper functions."""

from app.services.keyword_ranking_service import _find_asin_rank


def test_find_asin_rank_first_position():
    items = [{"asin": "B001"}, {"asin": "B002"}, {"asin": "B003"}]
    assert _find_asin_rank("B001", items) == 1


def test_find_asin_rank_last_position():
    items = [{"asin": "B001"}, {"asin": "B002"}, {"asin": "B003"}]
    assert _find_asin_rank("B003", items) == 3


def test_find_asin_rank_not_found_returns_none():
    items = [{"asin": "B001"}, {"asin": "B002"}]
    assert _find_asin_rank("B999", items) is None


def test_find_asin_rank_empty_list():
    assert _find_asin_rank("B001", []) is None


def test_find_asin_rank_case_sensitive():
    items = [{"asin": "b001"}]
    assert _find_asin_rank("B001", items) is None
