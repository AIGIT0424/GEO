import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.keyword import Keyword
from app.models.user import User
from app.schemas.keyword import (
    KeywordRankingRead,
    KeywordRead,
    KeywordResearchRequest,
    KeywordResearchResult,
)
from app.services import keyword_service
from app.services.keyword_ranking_service import get_ranking_history

router = APIRouter(prefix="/keywords", tags=["keywords"])


@router.post("/research", response_model=list[KeywordResearchResult])
async def research(
    payload: KeywordResearchRequest,
    current_user: User = Depends(get_current_user),
) -> list[KeywordResearchResult]:
    return await keyword_service.research_keywords(payload)


@router.get("/by-product/{product_id}", response_model=list[KeywordRead])
async def list_by_product(
    product_id: uuid.UUID,
    skip: int = 0,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[KeywordRead]:
    stmt = (
        select(Keyword)
        .where(Keyword.product_id == product_id)
        .offset(skip)
        .limit(limit)
        .order_by(Keyword.search_volume.desc().nulls_last())
    )
    result = await db.execute(stmt)
    return [KeywordRead.model_validate(k) for k in result.scalars().all()]


@router.get("/{keyword_id}/rankings", response_model=list[KeywordRankingRead])
async def get_keyword_rankings(
    keyword_id: uuid.UUID,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[KeywordRankingRead]:
    """Return daily ranking history for a keyword (organic + sponsored positions)."""
    kw = await db.get(Keyword, keyword_id)
    if not kw:
        raise HTTPException(status_code=404, detail="Keyword not found")

    # Ownership check via product
    from app.models.product import Product

    product = await db.get(Product, kw.product_id)
    if not product or product.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Keyword not found")

    return await get_ranking_history(db, keyword_id, days=days)


@router.post("/by-product/{product_id}/track", status_code=202)
async def trigger_ranking_snapshot(
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Trigger an on-demand keyword ranking snapshot for a product."""
    from app.tasks.ranking_tasks import track_product_keyword_rankings

    task = track_product_keyword_rankings.delay(
        product_id=str(product_id),
        user_id=str(current_user.id),
    )
    return {"task_id": task.id, "product_id": str(product_id)}
