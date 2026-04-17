# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**GEO** is an AI-powered Amazon cross-border e-commerce optimization platform (comparable to Linkfox). The backend is Python 3.11+ / FastAPI and integrates Amazon SP-API, Amazon Advertising API, and Anthropic Claude.

## Commands

```bash
# Install (editable + dev deps)
pip install -e ".[dev]"

# Run the API locally
uvicorn app.main:app --reload                      # http://localhost:8000/docs

# Run the full stack
docker compose up --build                          # api + worker + beat + postgres + redis

# Celery worker / beat (when running outside docker)
celery -A app.core.celery_app.celery_app worker --loglevel=info
celery -A app.core.celery_app.celery_app beat --loglevel=info

# Tests
pytest                                              # full suite w/ coverage
pytest tests/test_auth.py                           # single file
pytest tests/test_services/test_product_service.py::test_opportunity_score_in_unit_range  # single test
pytest -k "opportunity"                             # pattern match
pytest --no-cov                                     # skip coverage for speed

# Lint / format / types
ruff check app/ tests/
ruff format app/ tests/
mypy app/

# Alembic migrations
alembic revision --autogenerate -m "add widget table"
alembic upgrade head
alembic downgrade -1
```

Slash commands (defined in `.claude/commands/`): `/test`, `/lint`, `/migrate`, `/api-new`.

## Architecture

### Layering (top → bottom)

1. **`app/api/v1/*.py`** — FastAPI routers. Handlers stay thin: validate input via Pydantic, call a service, return a schema. Dependencies (`get_db`, `get_current_user`) live in `app/api/deps.py`.
2. **`app/schemas/*.py`** — Pydantic v2 request/response models. Nothing else may be returned from an endpoint.
3. **`app/services/*.py`** — Business logic. Services own transactions-logic decisions and orchestrate external API calls. A service function may be called by both an API handler and a Celery task.
4. **`app/models/*.py`** — SQLAlchemy 2.0 `Mapped[...]` ORM models. All models share a UUID PK + timestamp mixin via `app/models/base.py::BaseModel`.
5. **`app/services/amazon/`**, **`app/services/ai/`** — External API clients. SP-API and Advertising API clients handle LWA token refresh + retry; AI client routes through Claude with prompts in `app/services/ai/prompts.py`.
6. **`app/tasks/*.py`** — Celery tasks. Tasks are sync; when they need async code (DB, httpx) they wrap a helper in `asyncio.run()`. Task names follow `app.tasks.<domain>.<action>`.

### Why the split matters

- **Services are the only place that knows both the DB and external APIs.** Never call `SPAPIClient` from a handler; never open a DB session inside `app/services/amazon/`.
- **Celery and FastAPI share service functions but never share DB sessions.** A task opens its own `AsyncSessionLocal`.
- **Async DB, sync Celery.** The DB engine is asyncpg. Any code path that touches the DB must be `async def`. The Celery boundary is the only place we bridge to sync.

### Domain model relationships

```
User ─┬─< Product ─┬─< Keyword ─< KeywordRanking
      │            ├─< Listing ─< ListingVariant
      │            └─< Campaign ─< CampaignKeyword
```

A `Product` is a user's tracked ASIN. A `Listing` is the (possibly AI-generated) copy for that product in a given language; `ListingVariant` holds alternatives for A/B testing. `Campaign` mirrors Amazon Sponsored Products campaigns and stores aggregated performance; `Campaign.acos` and `.roas` are computed properties.

### AI integration

All prompts live in `app/services/ai/prompts.py`; do not inline prompts elsewhere. The Claude client is `app/services/ai/claude_client.py` and the default model constant is `MODEL = "claude-sonnet-4-6"`. Every prompt requests structured JSON and is parsed with `json.loads` before use. When changing a production prompt, bump `ListingVariant.prompt_version` so outputs remain traceable.

### Amazon API integration

- SP-API base: `https://sellingpartnerapi-<region>.amazon.com`. Regional base URLs and common marketplace IDs are in `.claude/skills/amazon-sp-api/SKILL.md`.
- LWA tokens are cached in-memory on the client; a 403 triggers a single refresh before failing.
- Long-running operations (report polling, catalog walks) **must** go through Celery — never block an HTTP handler on them.

## Conventions (must follow)

- **Python 3.11+ syntax**: `X | Y` unions, `list[T]`, `dict[K, V]`. Type hints on every public signature.
- **Handlers return Pydantic schemas**, never ORM models. Use `response_model=...` on every route.
- **Auth**: `Depends(get_current_user)` on any authenticated endpoint. Authorization (ownership checks) happens in the service layer.
- **Secrets** only via `app.core.config.settings` (pydantic-settings loads from env). Never hardcode API keys or log full tokens.
- **No sync DB calls in async handlers.** No `Session`; only `AsyncSession`.
- **Celery arguments must be JSON-serializable** — pass IDs, not ORM objects.
- **Retries** on external calls use `tenacity` with bounded `stop_after_attempt` + exponential backoff.

See `.claude/rules/` for expanded style, security, and AI-prompt rules.

## Hooks and subagents

`.claude/settings.json` wires up three hooks:
- **PostToolUse (Edit|Write)** → `ruff format` + `ruff check --fix` on saved `*.py` files.
- **PreToolUse (Bash)** → blocks a small denylist of destructive commands.
- **Stop** → runs `ruff check` + `ruff format --check` on changed Python files as an informational quality gate.

Specialist subagents in `.claude/agents/`:
- **`python-reviewer`** — async/Pydantic v2/SQLAlchemy 2.0 correctness review on Python changes.
- **`amazon-api-expert`** — SP-API / Ads API authentication, rate limits, report flow.
- **`listing-copy-critic`** — Amazon listing policy + quality review of generated copy.

Invoke them proactively via `Agent(subagent_type=...)` when the task matches their description.

## Testing

- Tests use `pytest-asyncio` (`asyncio_mode = "auto"`).
- `tests/conftest.py` provides `client` (httpx `AsyncClient`) and `db_session` fixtures; the DB fixture creates the full schema once per session against the URL in `DATABASE_URL` (defaults to a local `geo_test` DB).
- Unit tests for pure helpers live in `tests/test_services/`; API tests in `tests/test_*.py` at the top level.
