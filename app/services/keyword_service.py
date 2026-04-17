"""Keyword research and ranking business logic."""
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.keyword import Keyword
from app.schemas.keyword import KeywordResearchRequest, KeywordResearchResult
from app.services.ai import claude_client


async def research_keywords(
    request: KeywordResearchRequest,
) -> list[KeywordResearchResult]:
    """Use AI to expand seed keywords into a ranked keyword list."""
    ai_results = await claude_client.research_keywords(
        seed_keywords=request.seed_keywords,
        asin=request.asin,
        marketplace=request.marketplace_id,
    )

    results = []
    for item in ai_results[: request.max_results]:
        results.append(
            KeywordResearchResult(
                keyword=item["keyword"],
                search_volume=item.get("estimated_search_volume"),
                competition_score=Decimal(str(item.get("competition_level", 0))),
                relevance_score=Decimal(str(item.get("relevance_score", 0))),
                suggested_bid=Decimal(str(item.get("suggested_bid_usd", 0))),
                related_keywords=item.get("related_keywords", []),
            )
        )
    return results


async def save_keywords_for_product(
    db: AsyncSession, product_id, keyword_results: list[KeywordResearchResult]
) -> list[Keyword]:
    """Persist keyword research results for a given product."""
    keywords = []
    for result in keyword_results:
        kw = Keyword(
            product_id=product_id,
            keyword=result.keyword,
            search_volume=result.search_volume,
            competition_score=result.competition_score,
            relevance_score=result.relevance_score,
            suggested_bid=result.suggested_bid,
        )
        db.add(kw)
        keywords.append(kw)
    await db.flush()
    return keywords
