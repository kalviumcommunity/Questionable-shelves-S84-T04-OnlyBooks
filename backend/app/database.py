import os
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

from .config import settings

from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

def get_normalized_database_url(url: str) -> str:
    """
    Normalizes database connection URLs for async SQLAlchemy.
    Automatically handles Neon/Heroku/Supabase URLs:
      - postgres:// or postgresql:// -> postgresql+asyncpg://
      - maps ?sslmode=... to ?ssl=... (as required by asyncpg)
      - removes unsupported asyncpg query params (e.g. channel_binding)
    """
    if not url:
        return "sqlite+aiosqlite:///./data/onlybooks.db"
    
    clean = url.strip().strip("'\"")
    if clean.startswith("postgres://"):
        clean = "postgresql+asyncpg://" + clean[len("postgres://"):]
    elif clean.startswith("postgresql://"):
        clean = "postgresql+asyncpg://" + clean[len("postgresql://"):]
    
    if "sqlite" in clean:
        return clean

    try:
        parsed = urlparse(clean)
        query_params = parse_qs(parsed.query, keep_blank_values=True)
        # asyncpg does not support channel_binding query param
        query_params.pop("channel_binding", None)
        # asyncpg expects ssl instead of sslmode
        if "sslmode" in query_params:
            query_params["ssl"] = query_params.pop("sslmode")
        new_query = urlencode(query_params, doseq=True)
        return urlunparse(parsed._replace(query=new_query))
    except Exception:
        return clean

DATABASE_URL = get_normalized_database_url(settings.DATABASE_URL)

# Ensure data directory exists if using SQLite
if "sqlite" in DATABASE_URL:
    data_dir = Path("./data")
    data_dir.mkdir(parents=True, exist_ok=True)

engine_kwargs = {"echo": False}
if "sqlite" in DATABASE_URL:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL / Neon configuration
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300
    # Neon PgBouncer connection poolers use transaction mode: disable prepared statement cache
    if "-pooler" in DATABASE_URL:
        engine_kwargs["connect_args"] = {"statement_cache_size": 0}

engine = create_async_engine(
    DATABASE_URL,
    **engine_kwargs
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
