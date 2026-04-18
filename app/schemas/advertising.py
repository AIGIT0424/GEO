import uuid
from decimal import Decimal

from pydantic import BaseModel


class CampaignRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    amazon_campaign_id: str | None
    name: str
    campaign_type: str
    targeting_type: str
    status: str
    daily_budget: Decimal | None
    total_spend: Decimal
    total_sales: Decimal
    impressions: int
    clicks: int
    acos: Decimal | None
    roas: Decimal | None


class CampaignAnalysisRequest(BaseModel):
    campaign_id: uuid.UUID
    date_range_days: int = 30


class CampaignAnalysisResult(BaseModel):
    campaign_id: uuid.UUID
    period_days: int
    spend: Decimal
    sales: Decimal
    acos: Decimal | None
    roas: Decimal | None
    ctr: float | None
    cvr: float | None
    top_performing_keywords: list[str]
    underperforming_keywords: list[str]
    recommendations: list[str]


class AdOptimizationRequest(BaseModel):
    product_id: uuid.UUID
    target_acos: Decimal
    budget: Decimal
    marketplace_id: str = "ATVPDKIKX0DER"


class AdOptimizationResult(BaseModel):
    suggested_bid_adjustments: dict[str, Decimal]
    keywords_to_pause: list[str]
    keywords_to_add: list[str]
    budget_reallocation: dict[str, Decimal]
    projected_acos: Decimal


class BidAdjustmentItem(BaseModel):
    """A single keyword bid adjustment to apply."""

    campaign_keyword_id: uuid.UUID
    ad_group_id: str
    keyword_id: str
    current_bid: Decimal
    new_bid: Decimal


class BidExecutionRequest(BaseModel):
    adjustments: list[BidAdjustmentItem]


class BidExecutionResult(BaseModel):
    task_id: str
    adjustments_queued: int


class CampaignKeywordRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    campaign_id: uuid.UUID
    keyword_text: str
    match_type: str
    bid: Decimal | None
    status: str
    spend: Decimal
    sales: Decimal
    clicks: int
    impressions: int
