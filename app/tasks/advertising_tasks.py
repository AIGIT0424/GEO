"""Celery tasks for advertising bid execution."""

import asyncio
from decimal import Decimal

from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal


@celery_app.task(
    name="app.tasks.advertising.apply_bid_adjustments",
    autoretry_for=(Exception,),
    retry_backoff=True,
    max_retries=3,
    acks_late=True,
)
def apply_bid_adjustments_task(
    adjustments: list[dict],  # [{campaign_keyword_id, ad_group_id, keyword_id, new_bid}]
    user_id: str,
) -> dict:
    """Write bid adjustments back to Amazon Advertising API and persist locally."""

    async def _run() -> dict:
        import uuid

        from app.models.advertising import CampaignKeyword
        from app.models.user import User
        from app.services.amazon.advertising_api import AmazonAdsClient

        applied = 0
        failed = 0

        async with AsyncSessionLocal() as db:
            user = await db.get(User, uuid.UUID(user_id))
            if not user:
                return {"applied": 0, "failed": len(adjustments), "error": "user not found"}

            ads_client = AmazonAdsClient()

            for adj in adjustments:
                ck_id = uuid.UUID(adj["campaign_keyword_id"])
                ck = await db.get(CampaignKeyword, ck_id)
                if not ck:
                    failed += 1
                    continue

                new_bid = Decimal(str(adj["new_bid"]))
                try:
                    await ads_client.update_keyword_bid(
                        ad_group_id=adj["ad_group_id"],
                        keyword_id=adj["keyword_id"],
                        bid=float(new_bid),
                    )
                    ck.bid = new_bid
                    applied += 1
                except Exception:
                    failed += 1

            await db.commit()

        return {"applied": applied, "failed": failed}

    return asyncio.run(_run())
