"""Listing compliance checking against Amazon policies."""

import json

from app.models.listing import Listing
from app.schemas.listing import ComplianceIssue, ListingComplianceResult
from app.services.ai import claude_client
from app.services.ai.prompts import LISTING_COMPLIANCE_SYSTEM, LISTING_COMPLIANCE_USER


async def check_listing_compliance(
    listing: Listing,
    marketplace: str = "US",
) -> ListingComplianceResult:
    """Run AI-powered Amazon policy compliance check on a listing."""
    bullet_text = "\n".join(f"- {b}" for b in (listing.bullet_points or []))

    client = claude_client.get_claude_client()
    message = await client.messages.create(
        model=claude_client.MODEL,
        max_tokens=2048,
        system=LISTING_COMPLIANCE_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": LISTING_COMPLIANCE_USER.format(
                    title=listing.title or "",
                    bullet_points=bullet_text,
                    description=listing.description or "",
                    search_terms=listing.search_terms or "",
                    marketplace=marketplace,
                ),
            }
        ],
    )

    raw = json.loads(message.content[0].text)

    return ListingComplianceResult(
        listing_id=listing.id,
        verdict=raw["verdict"],
        blockers=[ComplianceIssue(**b) for b in raw.get("blockers", [])],
        major_issues=[ComplianceIssue(**m) for m in raw.get("major_issues", [])],
        minor_suggestions=[ComplianceIssue(**s) for s in raw.get("minor_suggestions", [])],
        keyword_coverage_pct=raw.get("keyword_coverage_pct", 0.0),
        overall_score=raw.get("overall_score", 0.0),
    )
