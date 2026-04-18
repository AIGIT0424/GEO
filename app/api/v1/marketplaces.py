from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.marketplace import (
    MarketplaceInfo,
    UserMarketplaceCreate,
    UserMarketplaceRead,
    UserMarketplaceSetDefault,
)
from app.services import marketplace_service

router = APIRouter(prefix="/marketplaces", tags=["marketplaces"])


@router.get("/supported", response_model=list[MarketplaceInfo])
async def list_supported() -> list[MarketplaceInfo]:
    """Return all Amazon marketplaces supported by GEO."""
    return marketplace_service.list_supported_marketplaces()


@router.get("", response_model=list[UserMarketplaceRead])
async def list_my_marketplaces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[UserMarketplaceRead]:
    return await marketplace_service.get_user_marketplaces(db, current_user.id)


@router.post("", response_model=UserMarketplaceRead, status_code=201)
async def add_marketplace(
    payload: UserMarketplaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserMarketplaceRead:
    return await marketplace_service.add_marketplace(db, current_user.id, payload)


@router.post("/default", response_model=UserMarketplaceRead)
async def set_default(
    payload: UserMarketplaceSetDefault,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserMarketplaceRead:
    return await marketplace_service.set_default_marketplace(
        db, current_user.id, payload.marketplace_id
    )


@router.delete("/{marketplace_id}", status_code=204)
async def remove_marketplace(
    marketplace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await marketplace_service.remove_marketplace(db, current_user.id, marketplace_id)
