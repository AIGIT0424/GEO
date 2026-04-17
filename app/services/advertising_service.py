"""Advertising campaign analysis and optimization."""
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.advertising import Campaign
from app.schemas.advertising import (
    CampaignAnalysisRequest,
    CampaignAnalysisResult,
)
from app.services.ai import claude_client


async def analyze_campaign(
    db: AsyncSession, request: CampaignAnalysisRequest, target_acos: float = 25.0
) -> CampaignAnalysisResult:
    """Run AI-driven analysis on a campaign's performance."""
    campaign = await db.get(Campaign, request.campaign_id)
    if campaign is None:
        raise ValueError(f"Campaign not found: {request.campaign_id}")

    campaign_data = {
        "name": campaign.name,
        "type": campaign.campaign_type,
        "targeting": campaign.targeting_type,
        "spend": float(campaign.total_spend),
        "sales": float(campaign.total_sales),
        "impressions": campaign.impressions,
        "clicks": campaign.clicks,
        "acos": float(campaign.acos) if campaign.acos else None,
        "roas": float(campaign.roas) if campaign.roas else None,
    }

    ai_result = await claude_client.analyze_campaign(
        campaign_data=campaign_data,
        target_acos=target_acos,
        period_days=request.date_range_days,
    )

    ctr = (campaign.clicks / campaign.impressions * 100) if campaign.impressions else None

    return CampaignAnalysisResult(
        campaign_id=campaign.id,
        period_days=request.date_range_days,
        spend=campaign.total_spend,
        sales=campaign.total_sales,
        acos=campaign.acos,
        roas=campaign.roas,
        ctr=ctr,
        cvr=None,
        top_performing_keywords=ai_result.get("top_performing_keywords", []),
        underperforming_keywords=ai_result.get("underperforming_keywords", []),
        recommendations=ai_result.get("recommendations", []),
    )


def suggest_bid_adjustment(
    current_acos: Decimal, target_acos: Decimal, current_bid: Decimal
) -> Decimal:
    """Simple linear bid adjustment heuristic.

    If current ACoS > target, decrease bid proportionally; if lower, increase.
    Capped at ±30% per step.
    """
    if current_acos <= 0:
        return current_bid
    ratio = float(target_acos) / float(current_acos)
    adjustment = max(0.7, min(1.3, ratio))
    return (current_bid * Decimal(str(adjustment))).quantize(Decimal("0.01"))
