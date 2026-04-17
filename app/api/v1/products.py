import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.product import Product
from app.models.user import User
from app.schemas.product import (
    ProductCreate,
    ProductRead,
    ProductResearchRequest,
    ProductResearchResult,
)
from app.services import product_service

router = APIRouter(prefix="/products", tags=["products"])


@router.post("", response_model=ProductRead, status_code=201)
async def add_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductRead:
    product = await product_service.sync_product(
        db, current_user.id, payload.asin, payload.marketplace_id
    )
    return ProductRead.model_validate(product)


@router.get("", response_model=list[ProductRead])
async def list_products(
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProductRead]:
    stmt = (
        select(Product)
        .where(Product.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .order_by(Product.created_at.desc())
    )
    result = await db.execute(stmt)
    return [ProductRead.model_validate(p) for p in result.scalars().all()]


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductRead:
    product = await db.get(Product, product_id)
    if not product or product.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductRead.model_validate(product)


@router.post("/research", response_model=list[ProductResearchResult])
async def research(
    payload: ProductResearchRequest,
    current_user: User = Depends(get_current_user),
) -> list[ProductResearchResult]:
    return await product_service.research_products(payload)
