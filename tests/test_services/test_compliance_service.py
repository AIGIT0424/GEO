"""Unit tests for compliance-related pure helpers."""

from app.services.ai.prompts import LISTING_COMPLIANCE_USER


def test_compliance_prompt_contains_required_fields():
    """Verify the prompt template has all required format placeholders."""
    rendered = LISTING_COMPLIANCE_USER.format(
        title="Test Title",
        bullet_points="- bullet 1\n- bullet 2",
        description="A description",
        search_terms="keyword1 keyword2",
        marketplace="US",
    )
    assert "Test Title" in rendered
    assert "bullet 1" in rendered
    assert "keyword1 keyword2" in rendered
    assert "US" in rendered


def test_compliance_prompt_checks_prohibited_words():
    prompt = LISTING_COMPLIANCE_USER.format(
        title="", bullet_points="", description="", search_terms="", marketplace="US"
    )
    assert "best seller" in prompt.lower()
    assert "free shipping" in prompt.lower()
    assert "money back" in prompt.lower()


def test_compliance_prompt_checks_length_limits():
    prompt = LISTING_COMPLIANCE_USER.format(
        title="", bullet_points="", description="", search_terms="", marketplace="US"
    )
    assert "200" in prompt  # title char limit
    assert "250" in prompt  # search terms byte limit
    assert "2000" in prompt  # description char limit
