import uuid
from decimal import Decimal

from pydantic import BaseModel


class KeywordRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    keyword: str
    search_volume: int | None
    competition_score: Decimal | None
    relevance_score: Decimal | None
    suggested_bid: Decimal | None


class KeywordResearchRequest(BaseModel):
    seed_keywords: list[str]
    asin: str | None = None
    marketplace_id: str = "ATVPDKIKX0DER"
    max_results: int = 100


class KeywordResearchResult(BaseModel):
    keyword: str
    search_volume: int | None
    competition_score: Decimal | None
    relevance_score: Decimal | None
    suggested_bid: Decimal | None
    related_keywords: list[str] = []


class KeywordRankingRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    keyword_id: uuid.UUID
    rank_date: str
    organic_rank: int | None
    sponsored_rank: int | None
    page: int | None
