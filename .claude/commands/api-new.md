---
description: Scaffold a new FastAPI v1 endpoint with schema + service stub.
argument-hint: "<resource_name>"
---

Scaffold a new GEO v1 API resource named `$ARGUMENTS`.

Create these files if they don't exist:
- `app/api/v1/<resource>.py` — APIRouter with GET list / POST create / GET detail stubs
- `app/schemas/<resource>.py` — Pydantic create/update/read models
- `app/services/<resource>_service.py` — async business-logic module

Wire the router into `app/api/v1/router.py`.

Follow these conventions:
- Async handlers only.
- Depend on `get_db` for DB sessions and `get_current_user` for auth.
- Return Pydantic schemas, never raw ORM models.
- Keep handlers thin — push logic into the service layer.
