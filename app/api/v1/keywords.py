import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.keyword import Keyword
from app.models.user import User
from app.schemas.keyword import (
    KeywordRead,
    KeywordResearchRequest,
    KeywordResearchResult,
)
from app.services import keyword_service

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
