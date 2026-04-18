"""Unit tests for marketplace service (pure logic, no DB)."""


from app.models.marketplace import MARKETPLACE_REGISTRY
from app.services.marketplace_service import list_supported_marketplaces


def test_list_supported_returns_all_marketplaces():
    result = list_supported_marketplaces()
    assert len(result) == len(MARKETPLACE_REGISTRY)


def test_supported_marketplaces_have_required_fields():
    for m in list_supported_marketplaces():
        assert m.marketplace_id
        assert m.name
        assert m.region in {"NA", "EU", "FE"}
        assert len(m.currency) == 3  # ISO 4217


def test_us_marketplace_is_present():
    ids = {m.marketplace_id for m in list_supported_marketplaces()}
    assert "ATVPDKIKX0DER" in ids


def test_all_major_regions_represented():
    regions = {m.region for m in list_supported_marketplaces()}
    assert regions == {"NA", "EU", "FE"}
