import uuid

from pydantic import BaseModel


class ListingRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    product_id: uuid.UUID
    language: str
    title: str | None
    bullet_points: list[str] | None
    description: str | None
    search_terms: str | None
    status: str


class ListingOptimizeRequest(BaseModel):
    product_id: uuid.UUID
    target_keywords: list[str]
    language: str = "en"
    tone: str = "professional"  # professional, casual, technical
    focus_benefits: bool = True


class ListingOptimizeResult(BaseModel):
    title: str
    bullet_points: list[str]
    description: str
    search_terms: str
    keyword_coverage: list[str]
    optimization_score: float


class ListingVariantRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    listing_id: uuid.UUID
    title: str | None
    bullet_points: list[str] | None
    description: str | None
    ai_model: str | None
