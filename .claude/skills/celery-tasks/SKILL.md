---
name: celery-tasks
description: Use when writing or debugging Celery tasks in GEO (product sync, keyword research, ad report pulls).
---

# Celery Task Conventions

## Task template

```python
from celery import shared_task

from app.core.celery_app import celery_app


@celery_app.task(
    name="app.tasks.products.sync",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    max_retries=5,
    acks_late=True,
)
def sync_product(product_id: str) -> dict:
    ...
    return {"product_id": product_id, "status": "ok"}
```

## Rules

1. **Tasks are sync functions.** They cannot be `async def`. Use `asyncio.run()` inside if you must call async code, but prefer a pure-sync service-layer helper for Celery paths.
2. **Do not share DB sessions with FastAPI.** Open a new session inside the task from a sync engine, or use `asyncio.run()` + `AsyncSessionLocal`.
3. **Idempotent.** Tasks must be safe to retry. Use upsert-style writes and check preconditions.
4. **Bounded retries.** Always set `max_retries`. Exponential backoff on network errors.
5. **Small payloads.** Task arguments must be JSON-serializable. Pass IDs, not ORM objects.

## Naming

`app.tasks.<domain>.<action>` — e.g. `app.tasks.products.sync`, `app.tasks.keywords.research`, `app.tasks.reports.poll`.

## Testing

Use `CELERY_TASK_ALWAYS_EAGER=True` in tests and call `.delay()` as if it were a function.
