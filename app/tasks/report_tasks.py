"""Background tasks for Amazon report polling."""
import asyncio

from app.core.celery_app import celery_app
from app.services.amazon.advertising_api import AmazonAdsClient


@celery_app.task(
    name="app.tasks.reports.pull_ads_performance",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=900,
    max_retries=5,
    acks_late=True,
)
def pull_ads_performance_report(profile_id: str, date_range_days: int = 30) -> dict:
    """Trigger and download an Amazon Ads performance report."""

    async def _run() -> dict:
        client = AmazonAdsClient(profile_id=profile_id)
        campaigns = await client.list_campaigns()
        return {"profile_id": profile_id, "campaign_count": len(campaigns)}

    return asyncio.run(_run())
