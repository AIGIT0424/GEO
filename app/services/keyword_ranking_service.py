"""Keyword ranking tracking — fetch daily organic positions via SP-API catalog search."""

import uuid
from datetime import date, timedelta

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.keyword import Keyword, KeywordRanking
from app.schemas.keyword import KeywordRankingRead
from app.services.amazon.sp_api import SPAPIClient


async def fetch_and_store_rankings(
    db: AsyncSession,
    product_id: uuid.UUID,
    marketplace_id: str,
    refresh_token: str,
) -> int:
    """Search each tracked keyword on Amazon and record the ASIN's organic position.

    Returns the number of ranking snapshots saved.
    """
    stmt = select(Keyword).where(Keyword.product_id == product_id)
    result = await db.execute(stmt)
    keywords = result.scalars().all()
    if not keywords:
        return 0

    from app.models.product import Product

    product = await db.get(Product, product_id)
    if not product:
        return 0

    sp = SPAPIClient(refresh_token=refresh_token, marketplace_id=marketplace_id)
    today = date.today()
    saved = 0

    for kw in keywords:
        # Skip if we already have a snapshot for today
        existing = await db.execute(
            select(KeywordRanking).where(
                and_(KeywordRanking.keyword_id == kw.id, KeywordRanking.rank_date == today)
            )
        )
        if existing.scalar_one_or_none():
            continue

        try:
            data = await sp.search_catalog_items(kw.keyword, page_size=20)
        except Exception:
            continue

        items = data.get("items", [])
        organic_rank = _find_asin_rank(product.asin, items)

        ranking = KeywordRanking(
            keyword_id=kw.id,
            rank_date=today,
            organic_rank=organic_rank,
            sponsored_rank=None,
            page=((organic_rank - 1) // 16 + 1) if organic_rank else None,
        )
        db.add(ranking)
        saved += 1

    await db.flush()
    return saved


def _find_asin_rank(asin: str, items: list[dict]) -> int | None:
    for i, item in enumerate(items, start=1):
        if item.get("asin") == asin:
            return i
    return None


async def get_ranking_history(
    db: AsyncSession,
    keyword_id: uuid.UUID,
    days: int = 30,
) -> list[KeywordRankingRead]:
    since = date.today() - timedelta(days=days)
    stmt = (
        select(KeywordRanking)
        .where(and_(KeywordRanking.keyword_id == keyword_id, KeywordRanking.rank_date >= since))
        .order_by(KeywordRanking.rank_date.asc())
    )
    result = await db.execute(stmt)
    return [
        KeywordRankingRead(
            id=r.id,
            keyword_id=r.keyword_id,
            rank_date=str(r.rank_date),
            organic_rank=r.organic_rank,
            sponsored_rank=r.sponsored_rank,
            page=r.page,
        )
        for r in result.scalars().all()
    ]
