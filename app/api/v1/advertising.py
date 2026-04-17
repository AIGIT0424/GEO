import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.advertising import Campaign
from app.models.user import User
from app.schemas.advertising import (
    CampaignAnalysisRequest,
    CampaignAnalysisResult,
    CampaignRead,
)
from app.services import advertising_service

router = APIRouter(prefix="/advertising", tags=["advertising"])


@router.get("/campaigns", response_model=list[CampaignRead])
async def list_campaigns(
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CampaignRead]:
    stmt = (
        select(Campaign)
        .join(Campaign.product)
        .where(Campaign.product.has(user_id=current_user.id))
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    campaigns = result.scalars().all()
    return [
        CampaignRead(
            id=c.id,
            amazon_campaign_id=c.amazon_campaign_id,
            name=c.name,
            campaign_type=c.campaign_type,
            targeting_type=c.targeting_type,
            status=c.status,
            daily_budget=c.daily_budget,
            total_spend=c.total_spend,
            total_sales=c.total_sales,
            impressions=c.impressions,
            clicks=c.clicks,
            acos=c.acos,
            roas=c.roas,
        )
        for c in campaigns
    ]


@router.post("/campaigns/{campaign_id}/analyze", response_model=CampaignAnalysisResult)
async def analyze_campaign(
    campaign_id: uuid.UUID,
    target_acos: float = 25.0,
    date_range_days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CampaignAnalysisResult:
    try:
        return await advertising_service.analyze_campaign(
            db,
            CampaignAnalysisRequest(campaign_id=campaign_id, date_range_days=date_range_days),
            target_acos=target_acos,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
