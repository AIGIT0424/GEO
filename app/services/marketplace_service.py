"""Marketplace management business logic."""

import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.marketplace import MARKETPLACE_REGISTRY, UserMarketplace
from app.schemas.marketplace import MarketplaceInfo, UserMarketplaceCreate, UserMarketplaceRead


def list_supported_marketplaces() -> list[MarketplaceInfo]:
    return [
        MarketplaceInfo(marketplace_id=mid, **meta) for mid, meta in MARKETPLACE_REGISTRY.items()
    ]


async def get_user_marketplaces(db: AsyncSession, user_id: uuid.UUID) -> list[UserMarketplaceRead]:
    stmt = select(UserMarketplace).where(UserMarketplace.user_id == user_id)
    result = await db.execute(stmt)
    return [UserMarketplaceRead.model_validate(m) for m in result.scalars().all()]


async def add_marketplace(
    db: AsyncSession, user_id: uuid.UUID, payload: UserMarketplaceCreate
) -> UserMarketplaceRead:
    meta = MARKETPLACE_REGISTRY.get(payload.marketplace_id)
    if not meta:
        raise HTTPException(
            status_code=400, detail=f"Unknown marketplace: {payload.marketplace_id}"
        )

    # Check duplicate
    existing = await db.execute(
        select(UserMarketplace).where(
            UserMarketplace.user_id == user_id,
            UserMarketplace.marketplace_id == payload.marketplace_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Marketplace already added")

    if payload.is_default:
        await _clear_default(db, user_id)

    marketplace = UserMarketplace(
        user_id=user_id,
        marketplace_id=payload.marketplace_id,
        is_default=payload.is_default,
        name=meta["name"],
        region=meta["region"],
        currency=meta["currency"],
    )
    db.add(marketplace)
    await db.flush()
    return UserMarketplaceRead.model_validate(marketplace)


async def set_default_marketplace(
    db: AsyncSession, user_id: uuid.UUID, marketplace_id: str
) -> UserMarketplaceRead:
    result = await db.execute(
        select(UserMarketplace).where(
            UserMarketplace.user_id == user_id,
            UserMarketplace.marketplace_id == marketplace_id,
        )
    )
    marketplace = result.scalar_one_or_none()
    if not marketplace:
        raise HTTPException(status_code=404, detail="Marketplace not found for this user")

    await _clear_default(db, user_id)
    marketplace.is_default = True
    await db.flush()
    return UserMarketplaceRead.model_validate(marketplace)


async def remove_marketplace(db: AsyncSession, user_id: uuid.UUID, marketplace_id: str) -> None:
    result = await db.execute(
        select(UserMarketplace).where(
            UserMarketplace.user_id == user_id,
            UserMarketplace.marketplace_id == marketplace_id,
        )
    )
    marketplace = result.scalar_one_or_none()
    if not marketplace:
        raise HTTPException(status_code=404, detail="Marketplace not found")
    if marketplace.is_default:
        raise HTTPException(status_code=400, detail="Cannot remove the default marketplace")
    await db.delete(marketplace)
    await db.flush()


async def _clear_default(db: AsyncSession, user_id: uuid.UUID) -> None:
    result = await db.execute(
        select(UserMarketplace).where(
            UserMarketplace.user_id == user_id, UserMarketplace.is_default.is_(True)
        )
    )
    for m in result.scalars().all():
        m.is_default = False
