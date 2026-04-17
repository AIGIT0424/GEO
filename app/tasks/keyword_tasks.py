"""Background tasks for keyword research."""
import asyncio

from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.schemas.keyword import KeywordResearchRequest
from app.services import keyword_service


@celery_app.task(
    name="app.tasks.keywords.research",
    autoretry_for=(Exception,),
    retry_backoff=True,
    max_retries=3,
    acks_late=True,
)
def research_keywords_task(
    product_id: str, seed_keywords: list[str], marketplace_id: str
) -> dict:
    """Run AI keyword research and persist results for a product."""
    import uuid as _uuid

    async def _run() -> int:
        request = KeywordResearchRequest(
            seed_keywords=seed_keywords,
            marketplace_id=marketplace_id,
        )
        results = await keyword_service.research_keywords(request)
        async with AsyncSessionLocal() as db:
            saved = await keyword_service.save_keywords_for_product(
                db, _uuid.UUID(product_id), results
            )
            await db.commit()
            return len(saved)

    count = asyncio.run(_run())
    return {"product_id": product_id, "keywords_saved": count}
