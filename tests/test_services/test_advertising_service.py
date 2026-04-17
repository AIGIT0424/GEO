from decimal import Decimal

from app.services.advertising_service import suggest_bid_adjustment


def test_bid_unchanged_when_acos_is_zero():
    assert suggest_bid_adjustment(Decimal("0"), Decimal("25"), Decimal("1.00")) == Decimal("1.00")


def test_bid_decreased_when_acos_too_high():
    new_bid = suggest_bid_adjustment(Decimal("50"), Decimal("25"), Decimal("1.00"))
    assert new_bid < Decimal("1.00")
    # Capped at 30% decrease
    assert new_bid >= Decimal("0.70")


def test_bid_increased_when_acos_below_target():
    new_bid = suggest_bid_adjustment(Decimal("10"), Decimal("25"), Decimal("1.00"))
    assert new_bid > Decimal("1.00")
    # Capped at 30% increase
    assert new_bid <= Decimal("1.30")
