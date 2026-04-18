import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

os.environ.setdefault("DATABASE_URL", "postgresql://geo:geo@localhost:5432/geo_test")
os.environ.setdefault("SECRET_KEY", "test-secret")

from app.core.config import settings  # noqa: E402
from app.core.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402

_TEST_URL = settings.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)


def _make_engine():
    # NullPool: no connection reuse across event loops (required for per-test isolation)
    return create_async_engine(_TEST_URL, poolclass=NullPool, echo=False)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create schema once per session using a sync engine."""
    import sqlalchemy as sa

    sync_url = settings.database_url  # plain postgresql:// for psycopg2 / sync
    # Use psycopg2 if available, otherwise fall back to asyncpg via asyncio.run
    try:
        sync_engine = sa.create_engine(
            sync_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        )
        Base.metadata.create_all(sync_engine)
        yield
        Base.metadata.drop_all(sync_engine)
        sync_engine.dispose()
    except Exception:
        import asyncio

        async def _setup():
            engine = _make_engine()
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            await engine.dispose()

        async def _teardown():
            engine = _make_engine()
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.drop_all)
            await engine.dispose()

        asyncio.get_event_loop().run_until_complete(_setup())
        yield
        asyncio.get_event_loop().run_until_complete(_teardown())


@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    engine = _make_engine()
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncClient:
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
