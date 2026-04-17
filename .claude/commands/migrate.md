---
description: Generate or apply Alembic database migrations.
argument-hint: "generate \"message\" | upgrade | downgrade | current | history"
---

Handle Alembic migrations for GEO.

Parse `$ARGUMENTS`:
- `generate "message"` → run `alembic revision --autogenerate -m "message"` and show the generated file.
- `upgrade` → run `alembic upgrade head` (ask the user first, this touches the DB).
- `downgrade` → run `alembic downgrade -1` (ask the user first).
- `current` → run `alembic current`.
- `history` → run `alembic history --verbose`.

Before running an `upgrade`, diff the pending migration against HEAD so the user can review what will change.
