import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Keyword(BaseModel):
    __tablename__ = "keywords"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    keyword: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    search_volume: Mapped[int | None] = mapped_column(nullable=True)
    competition_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    relevance_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    suggested_bid: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    product: Mapped["Product"] = relationship(back_populates="keywords")  # type: ignore[name-defined]
    rankings: Mapped[list["KeywordRanking"]] = relationship(back_populates="keyword")


class KeywordRanking(BaseModel):
    __tablename__ = "keyword_rankings"

    keyword_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("keywords.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rank_date: Mapped[date] = mapped_column(Date, nullable=False)
    organic_rank: Mapped[int | None] = mapped_column(nullable=True)
    sponsored_rank: Mapped[int | None] = mapped_column(nullable=True)
    page: Mapped[int | None] = mapped_column(nullable=True)

    keyword: Mapped[Keyword] = relationship(back_populates="rankings")
