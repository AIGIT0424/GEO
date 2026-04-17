import uuid
from decimal import Decimal

from pydantic import BaseModel


class ProductCreate(BaseModel):
    asin: str
    marketplace_id: str = "ATVPDKIKX0DER"


class ProductRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    asin: str
    marketplace_id: str
    title: str | None
    brand: str | None
    category: str | None
    price: Decimal | None
    bsr_rank: int | None
    review_count: int | None
    review_rating: Decimal | None
    image_url: str | None


class ProductResearchRequest(BaseModel):
    category: str
    marketplace_id: str = "ATVPDKIKX0DER"
    min_price: Decimal | None = None
    max_price: Decimal | None = None
    min_review_count: int | None = None
    max_review_count: int | None = None
    min_bsr_rank: int | None = None
    max_bsr_rank: int | None = None


class ProductResearchResult(BaseModel):
    asin: str
    title: str
    price: Decimal | None
    bsr_rank: int | None
    review_count: int | None
    review_rating: Decimal | None
    estimated_monthly_sales: int | None
    opportunity_score: Decimal | None
