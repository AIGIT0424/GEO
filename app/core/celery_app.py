from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "geo",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.tasks.product_tasks",
        "app.tasks.keyword_tasks",
        "app.tasks.report_tasks",
        "app.tasks.ranking_tasks",
        "app.tasks.advertising_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        # Daily keyword ranking snapshot at 02:00 UTC
        "daily-keyword-rankings": {
            "task": "app.tasks.rankings.track_all",
            "schedule": crontab(hour=2, minute=0),
        },
        # Pull Amazon Ads performance reports every 6 hours
        "ads-performance-report": {
            "task": "app.tasks.report_tasks.pull_ads_performance_report",
            "schedule": crontab(minute=0, hour="*/6"),
            "kwargs": {"profile_id": settings.amazon_ads_profile_id, "date_range_days": 30},
        },
    },
)
