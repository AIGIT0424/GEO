"""Background tasks for product syncing."""
import asyncio

from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.services import product_service


@celery_app.task(
    name="app.tasks.products.sync",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    max_retries=5,
    acks_late=True,
)
def sync_product_task(user_id: str, asin: str, marketplace_id: str) -> dict:
    """Sync a single product's metadata from Amazon SP-API."""
    import uuid as _uuid

    async def _run() -> str:
        async with AsyncSessionLocal() as db:
            product = await product_service.sync_product(
                db, _uuid.UUID(user_id), asin, marketplace_id
            )
            await db.commit()
            return str(product.id)

    product_id = asyncio.run(_run())
    return {"product_id": product_id, "asin": asin, "status": "synced"}
