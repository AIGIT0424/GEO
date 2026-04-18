"""Celery tasks for daily keyword ranking tracking."""

import asyncio

from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.services.keyword_ranking_service import fetch_and_store_rankings


@celery_app.task(
    name="app.tasks.rankings.track_all",
    autoretry_for=(Exception,),
    retry_backoff=True,
    max_retries=3,
    acks_late=True,
)
def track_all_keyword_rankings() -> dict:
    """Daily beat task: iterate every active product and snapshot keyword positions."""

    async def _run() -> dict:
        from sqlalchemy import select

        from app.models.product import Product
        from app.models.user import User

        total_products = 0
        total_rankings = 0

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Product, User)
                .join(User, Product.user_id == User.id)
                .where(User.amazon_refresh_token.isnot(None))
            )
            rows = result.all()

        for product, user in rows:
            marketplace_id = product.marketplace_id or user.amazon_marketplace_id or "ATVPDKIKX0DER"
            async with AsyncSessionLocal() as db:
                saved = await fetch_and_store_rankings(
                    db,
                    product_id=product.id,
                    marketplace_id=marketplace_id,
                    refresh_token=user.amazon_refresh_token,
                )
                await db.commit()
            total_products += 1
            total_rankings += saved

        return {"products_processed": total_products, "rankings_saved": total_rankings}

    return asyncio.run(_run())


@celery_app.task(
    name="app.tasks.rankings.track_product",
    autoretry_for=(Exception,),
    retry_backoff=True,
    max_retries=3,
    acks_late=True,
)
def track_product_keyword_rankings(product_id: str, user_id: str) -> dict:
    """On-demand ranking snapshot for a single product."""

    async def _run() -> int:
        import uuid

        from app.models.user import User

        async with AsyncSessionLocal() as db:
            user = await db.get(User, uuid.UUID(user_id))
            if not user or not user.amazon_refresh_token:
                return 0
            from app.models.product import Product

            product = await db.get(Product, uuid.UUID(product_id))
            if not product:
                return 0
            marketplace_id = product.marketplace_id or user.amazon_marketplace_id or "ATVPDKIKX0DER"
            saved = await fetch_and_store_rankings(
                db,
                product_id=product.id,
                marketplace_id=marketplace_id,
                refresh_token=user.amazon_refresh_token,
            )
            await db.commit()
            return saved

    saved = asyncio.run(_run())
    return {"product_id": product_id, "rankings_saved": saved}
