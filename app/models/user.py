from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class User(BaseModel):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Amazon credentials stored per user (encrypted at rest)
    amazon_refresh_token: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    amazon_marketplace_id: Mapped[str | None] = mapped_column(String(50), nullable=True)

    products: Mapped[list["Product"]] = relationship(back_populates="user", lazy="dynamic")  # type: ignore[name-defined]
