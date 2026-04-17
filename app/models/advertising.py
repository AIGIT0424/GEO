import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Campaign(BaseModel):
    __tablename__ = "campaigns"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amazon_campaign_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    campaign_type: Mapped[str] = mapped_column(String(50), nullable=False)  # SP, SB, SD
    targeting_type: Mapped[str] = mapped_column(String(20), nullable=False)  # AUTO, MANUAL
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ENABLED")
    daily_budget: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    total_spend: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_sales: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    impressions: Mapped[int] = mapped_column(nullable=False, default=0)
    clicks: Mapped[int] = mapped_column(nullable=False, default=0)

    product: Mapped["Product"] = relationship(back_populates="campaigns")  # type: ignore[name-defined]
    campaign_keywords: Mapped[list["CampaignKeyword"]] = relationship(back_populates="campaign")

    @property
    def acos(self) -> Decimal | None:
        if self.total_sales > 0:
            return (self.total_spend / self.total_sales * 100).quantize(Decimal("0.01"))
        return None

    @property
    def roas(self) -> Decimal | None:
        if self.total_spend > 0:
            return (self.total_sales / self.total_spend).quantize(Decimal("0.01"))
        return None


class CampaignKeyword(BaseModel):
    __tablename__ = "campaign_keywords"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    keyword_text: Mapped[str] = mapped_column(String(500), nullable=False)
    match_type: Mapped[str] = mapped_column(String(20), nullable=False)  # BROAD, PHRASE, EXACT
    bid: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ENABLED")
    spend: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    sales: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    clicks: Mapped[int] = mapped_column(nullable=False, default=0)
    impressions: Mapped[int] = mapped_column(nullable=False, default=0)

    campaign: Mapped[Campaign] = relationship(back_populates="campaign_keywords")
