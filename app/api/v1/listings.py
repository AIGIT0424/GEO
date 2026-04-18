import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.listing import Listing
from app.models.user import User
from app.schemas.listing import (
    ListingComplianceResult,
    ListingOptimizeRequest,
    ListingOptimizeResult,
    ListingRead,
    ListingVariantRead,
)
from app.services import compliance_service, listing_service

router = APIRouter(prefix="/listings", tags=["listings"])


@router.post("/optimize", response_model=ListingOptimizeResult)
async def optimize(
    payload: ListingOptimizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ListingOptimizeResult:
    try:
        return await listing_service.generate_optimized_listing(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/by-product/{product_id}", response_model=ListingRead | None)
async def get_by_product(
    product_id: uuid.UUID,
    language: str = "en",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ListingRead | None:
    listing = await listing_service.get_listing_by_product(db, product_id, language)
    return ListingRead.model_validate(listing) if listing else None


@router.post("/{listing_id}/variants", response_model=ListingVariantRead, status_code=201)
async def save_variant(
    listing_id: uuid.UUID,
    payload: ListingOptimizeResult,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ListingVariantRead:
    variant = await listing_service.save_listing_variant(
        db, listing_id, payload, ai_model="claude-sonnet-4-6"
    )
    return ListingVariantRead.model_validate(variant)


@router.post("/{listing_id}/compliance-check", response_model=ListingComplianceResult)
async def compliance_check(
    listing_id: uuid.UUID,
    marketplace: str = Query("US", pattern="^[A-Z]{2}$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ListingComplianceResult:
    """Run AI-powered Amazon policy compliance audit on a saved listing."""
    listing = await db.get(Listing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    # Ownership: the listing's product must belong to current_user
    from app.models.product import Product

    product = await db.get(Product, listing.product_id)
    if not product or product.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Listing not found")

    return await compliance_service.check_listing_compliance(listing, marketplace)
