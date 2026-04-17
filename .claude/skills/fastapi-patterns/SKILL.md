---
name: fastapi-patterns
description: Use when writing or reviewing FastAPI endpoints in GEO. Enforces async-only, dependency-injected DB sessions, and Pydantic-schema-first responses.
---

# FastAPI Patterns for GEO

## Handler template

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.product import ProductCreate, ProductRead
from app.services import product_service

router = APIRouter(prefix="/products", tags=["products"])


@router.post("", response_model=ProductRead, status_code=201)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductRead:
    product = await product_service.sync_product(
        db, current_user.id, payload.asin, payload.marketplace_id
    )
    return ProductRead.model_validate(product)
```

## Rules

1. **Always async.** No `def` handlers, no sync DB calls.
2. **Thin handlers.** Business logic lives in `app/services/*`.
3. **Schema I/O.** Never return ORM models; always `response_model=...` with a Pydantic v2 schema.
4. **Explicit status codes** for 201/204/202 cases.
5. **HTTPException for errors** — never bubble bare exceptions to the client.
6. **Per-request DB session** via `get_db`. Do not keep sessions in module scope.
7. **Authentication** via `get_current_user` dependency; authorization via explicit checks on `current_user`.

## Common dependencies (`app/api/deps.py`)

- `get_db()` — yields `AsyncSession`.
- `get_current_user()` — decodes JWT and loads `User`.
- `get_current_active_superuser()` — same as above + `is_superuser` check.

## Pagination

For list endpoints, accept `skip: int = 0, limit: int = Query(50, le=200)` and return a `{items, total}` envelope if totals are cheap.

## Background work

Never run long work inside a handler. Dispatch a Celery task and return 202 Accepted with a task ID:

```python
task = product_sync_task.delay(product_id=str(product.id))
return {"task_id": task.id}
```
