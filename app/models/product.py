import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Product(BaseModel):
    __tablename__ = "products"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    asin: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    marketplace_id: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    brand: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    bsr_rank: Mapped[int | None] = mapped_column(nullable=True)
    review_count: Mapped[int | None] = mapped_column(nullable=True)
    review_rating: Mapped[Decimal | None] = mapped_column(Numeric(3, 2), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(back_populates="products")  # type: ignore[name-defined]
    keywords: Mapped[list["Keyword"]] = relationship(back_populates="product")  # type: ignore[name-defined]
    listings: Mapped[list["Listing"]] = relationship(back_populates="product")  # type: ignore[name-defined]
    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="product")  # type: ignore[name-defined]
