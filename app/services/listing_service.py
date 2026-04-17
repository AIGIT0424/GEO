"""Listing content generation and optimization."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.listing import Listing, ListingVariant
from app.models.product import Product
from app.schemas.listing import ListingOptimizeRequest, ListingOptimizeResult
from app.services.ai import claude_client


async def generate_optimized_listing(
    db: AsyncSession, request: ListingOptimizeRequest
) -> ListingOptimizeResult:
    """Generate an AI-optimized Amazon listing from product + target keywords."""
    product = await db.get(Product, request.product_id)
    if product is None:
        raise ValueError(f"Product not found: {request.product_id}")

    product_info = {
        "asin": product.asin,
        "title": product.title,
        "brand": product.brand,
        "category": product.category,
        "description": product.description,
    }

    ai_output = await claude_client.optimize_listing(
        product_info=product_info,
        keywords=request.target_keywords,
        language=request.language,
        tone=request.tone,
    )

    return ListingOptimizeResult(
        title=ai_output["title"],
        bullet_points=ai_output["bullet_points"],
        description=ai_output["description"],
        search_terms=ai_output["search_terms"],
        keyword_coverage=ai_output.get("keyword_coverage", []),
        optimization_score=ai_output.get("optimization_score", 0.0),
    )


async def save_listing_variant(
    db: AsyncSession,
    listing_id,
    optimized: ListingOptimizeResult,
    ai_model: str,
) -> ListingVariant:
    """Store an AI-generated variant for A/B testing."""
    variant = ListingVariant(
        listing_id=listing_id,
        title=optimized.title,
        bullet_points=optimized.bullet_points,
        description=optimized.description,
        ai_model=ai_model,
        prompt_version="v1",
    )
    db.add(variant)
    await db.flush()
    return variant


async def get_listing_by_product(
    db: AsyncSession, product_id, language: str = "en"
) -> Listing | None:
    stmt = select(Listing).where(
        Listing.product_id == product_id, Listing.language == language
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
