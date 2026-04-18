import uuid

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

# Well-known marketplace IDs for reference
MARKETPLACE_REGISTRY: dict[str, dict] = {
    "ATVPDKIKX0DER": {"name": "Amazon US", "region": "NA", "currency": "USD", "locale": "en_US"},
    "A2EUQ1WTGCTBG2": {"name": "Amazon CA", "region": "NA", "currency": "CAD", "locale": "en_CA"},
    "A1AM78C64UM0Y8": {"name": "Amazon MX", "region": "NA", "currency": "MXN", "locale": "es_MX"},
    "A1F83G8C2ARO7P": {"name": "Amazon UK", "region": "EU", "currency": "GBP", "locale": "en_GB"},
    "A1PA6795UKMFR9": {"name": "Amazon DE", "region": "EU", "currency": "EUR", "locale": "de_DE"},
    "A13V1IB3VIYZZH": {"name": "Amazon FR", "region": "EU", "currency": "EUR", "locale": "fr_FR"},
    "APJ6JRA9NG5V4": {"name": "Amazon IT", "region": "EU", "currency": "EUR", "locale": "it_IT"},
    "A1RKKUPIHCS9HS": {"name": "Amazon ES", "region": "EU", "currency": "EUR", "locale": "es_ES"},
    "A1VC38T7YXB528": {"name": "Amazon JP", "region": "FE", "currency": "JPY", "locale": "ja_JP"},
    "A39IBJ37TRP1C6": {"name": "Amazon AU", "region": "FE", "currency": "AUD", "locale": "en_AU"},
}


class UserMarketplace(BaseModel):
    """Records which Amazon marketplaces a user has enabled."""

    __tablename__ = "user_marketplaces"
    __table_args__ = (UniqueConstraint("user_id", "marketplace_id", name="uq_user_marketplace"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    marketplace_id: Mapped[str] = mapped_column(String(50), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Denormalised from MARKETPLACE_REGISTRY for display
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    region: Mapped[str] = mapped_column(String(10), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False)

    user: Mapped["User"] = relationship()  # type: ignore[name-defined]
