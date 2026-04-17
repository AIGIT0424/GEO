import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Listing(BaseModel):
    __tablename__ = "listings"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    bullet_points: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    search_terms: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")

    product: Mapped["Product"] = relationship(back_populates="listings")  # type: ignore[name-defined]
    variants: Mapped[list["ListingVariant"]] = relationship(back_populates="listing")


class ListingVariant(BaseModel):
    __tablename__ = "listing_variants"

    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # AI-generated alternative for A/B testing
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    bullet_points: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_model: Mapped[str | None] = mapped_column(String(50), nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String(20), nullable=True)

    listing: Mapped[Listing] = relationship(back_populates="variants")
