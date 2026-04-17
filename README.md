# GEO

AI-powered Amazon cross-border e-commerce optimization platform.

## Features

- **Product research** — surface opportunities by category, BSR, review count, and price.
- **Keyword research** — AI-expanded keyword lists with search volume, competition, and bid estimates.
- **Listing optimization** — generate Amazon-compliant titles, bullets, descriptions, and backend search terms.
- **Advertising analysis** — ACoS/ROAS analysis and bid-adjustment recommendations for Sponsored Products.
- **AI assistant** — conversational helper grounded in the seller's product and campaign context.

## Stack

- **Python 3.11+**, **FastAPI** (async)
- **PostgreSQL** via **SQLAlchemy 2.0** (async) + **Alembic**
- **Celery** + **Redis** for background tasks
- **Anthropic Claude** for AI features
- **Amazon SP-API** + **Amazon Advertising API**

## Quick start

```bash
cp .env.example .env
# fill in ANTHROPIC_API_KEY and Amazon credentials
docker compose up --build
# API at http://localhost:8000/docs
```

Run locally without Docker:

```bash
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
# in another terminal:
celery -A app.core.celery_app.celery_app worker --loglevel=info
```

## Development

```bash
pytest                                # tests + coverage
ruff check app/ tests/                # lint
ruff format app/ tests/               # auto-format
mypy app/                             # type check
alembic revision --autogenerate -m "msg"   # create migration
alembic upgrade head                  # apply migrations
```

## Claude Code

This repo is configured for use with Claude Code. See `CLAUDE.md` for architecture notes and `.claude/` for subagents, slash commands, and hooks.
