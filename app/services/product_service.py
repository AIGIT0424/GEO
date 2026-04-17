"""Product research and analysis business logic."""
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.schemas.product import ProductResearchRequest, ProductResearchResult
from app.services.amazon.sp_api import SPAPIClient


async def fetch_product_from_amazon(
    asin: str, marketplace_id: str, sp_api: SPAPIClient
) -> dict:
    """Fetch product data from Amazon SP-API and normalize it."""
    raw = await sp_api.get_catalog_item(asin)
    summary = (raw.get("summaries") or [{}])[0]
    return {
        "asin": asin,
        "marketplace_id": marketplace_id,
        "title": summary.get("itemName"),
        "brand": summary.get("brand"),
        "category": summary.get("browseClassification", {}).get("displayName"),
        "image_url": (summary.get("mainImage") or {}).get("link"),
    }


async def sync_product(
    db: AsyncSession, user_id, asin: str, marketplace_id: str
) -> Product:
    sp = SPAPIClient(marketplace_id=marketplace_id)
    data = await fetch_product_from_amazon(asin, marketplace_id, sp)

    stmt = select(Product).where(Product.asin == asin, Product.user_id == user_id)
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()

    if product is None:
        product = Product(user_id=user_id, **data)
        db.add(product)
    else:
        for key, value in data.items():
            if value is not None:
                setattr(product, key, value)
    await db.flush()
    return product


def compute_opportunity_score(
    bsr_rank: int | None,
    review_count: int | None,
    review_rating: Decimal | None,
    price: Decimal | None,
) -> Decimal:
    """Heuristic 0-1 score indicating product opportunity.

    Higher score = easier to compete (low reviews, decent rank, healthy price).
    """
    if not all([bsr_rank, review_count is not None, review_rating, price]):
        return Decimal("0.0")

    rank_score = max(0.0, 1.0 - min(bsr_rank, 100_000) / 100_000)
    review_barrier = 1.0 / (1.0 + (review_count or 0) / 500.0)
    rating_health = float(review_rating or 0) / 5.0
    price_health = 1.0 if Decimal("15") <= (price or 0) <= Decimal("80") else 0.6

    score = 0.35 * rank_score + 0.35 * review_barrier + 0.15 * rating_health + 0.15 * price_health
    return Decimal(str(score)).quantize(Decimal("0.0001"))


async def research_products(
    request: ProductResearchRequest,
) -> list[ProductResearchResult]:
    """Search for product opportunities in a category."""
    sp = SPAPIClient(marketplace_id=request.marketplace_id)
    data = await sp.search_catalog_items(request.category)
    items = data.get("items", [])

    results = []
    for item in items:
        summary = (item.get("summaries") or [{}])[0]
        asin = item.get("asin")
        price = None  # would come from pricing API
        results.append(
            ProductResearchResult(
                asin=asin,
                title=summary.get("itemName", ""),
                price=price,
                bsr_rank=None,
                review_count=None,
                review_rating=None,
                estimated_monthly_sales=None,
                opportunity_score=None,
            )
        )
    return results
