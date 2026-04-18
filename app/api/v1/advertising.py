import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.advertising import Campaign, CampaignKeyword
from app.models.user import User
from app.schemas.advertising import (
    BidExecutionRequest,
    BidExecutionResult,
    CampaignAnalysisRequest,
    CampaignAnalysisResult,
    CampaignKeywordRead,
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


@router.get("/campaigns/{campaign_id}/keywords", response_model=list[CampaignKeywordRead])
async def list_campaign_keywords(
    campaign_id: uuid.UUID,
    skip: int = 0,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CampaignKeywordRead]:
    """List all keywords for a campaign with their spend / sales performance."""
    campaign = await db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Ownership check via product
    from app.models.product import Product

    product = await db.get(Product, campaign.product_id)
    if not product or product.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Campaign not found")

    stmt = (
        select(CampaignKeyword)
        .where(CampaignKeyword.campaign_id == campaign_id)
        .offset(skip)
        .limit(limit)
        .order_by(CampaignKeyword.spend.desc())
    )
    result = await db.execute(stmt)
    return [CampaignKeywordRead.model_validate(kw) for kw in result.scalars().all()]


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


@router.post("/campaigns/{campaign_id}/bids/execute", response_model=BidExecutionResult)
async def execute_bid_adjustments(
    campaign_id: uuid.UUID,
    payload: BidExecutionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BidExecutionResult:
    """Apply bid adjustments to Amazon Advertising API via background task."""
    campaign = await db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    from app.models.product import Product

    product = await db.get(Product, campaign.product_id)
    if not product or product.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Campaign not found")

    from app.tasks.advertising_tasks import apply_bid_adjustments_task

    serialized = [
        {
            "campaign_keyword_id": str(a.campaign_keyword_id),
            "ad_group_id": a.ad_group_id,
            "keyword_id": a.keyword_id,
            "new_bid": str(a.new_bid),
        }
        for a in payload.adjustments
    ]
    task = apply_bid_adjustments_task.delay(
        adjustments=serialized,
        user_id=str(current_user.id),
    )
    return BidExecutionResult(task_id=task.id, adjustments_queued=len(payload.adjustments))
