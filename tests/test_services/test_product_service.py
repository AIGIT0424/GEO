from decimal import Decimal

from app.services.product_service import compute_opportunity_score


def test_opportunity_score_zero_when_missing_fields():
    assert compute_opportunity_score(None, 10, Decimal("4.5"), Decimal("20")) == Decimal("0.0")


def test_opportunity_score_higher_for_low_review_count():
    high = compute_opportunity_score(10_000, 50, Decimal("4.5"), Decimal("30"))
    low = compute_opportunity_score(10_000, 5_000, Decimal("4.5"), Decimal("30"))
    assert high > low


def test_opportunity_score_in_unit_range():
    score = compute_opportunity_score(5_000, 100, Decimal("4.6"), Decimal("25"))
    assert Decimal("0") <= score <= Decimal("1")


def test_opportunity_score_price_out_of_range_penalized():
    sweet_spot = compute_opportunity_score(5_000, 100, Decimal("4.5"), Decimal("30"))
    expensive = compute_opportunity_score(5_000, 100, Decimal("4.5"), Decimal("500"))
    assert sweet_spot > expensive
