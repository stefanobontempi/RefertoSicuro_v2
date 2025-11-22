"""
Database Configuration
=====================
PostgreSQL with async SQLAlchemy
"""

from typing import AsyncGenerator

from app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool

# Create async engine with environment-specific configuration
if settings.ENVIRONMENT == "test":
    # Test environment: use NullPool (no connection pooling)
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        poolclass=NullPool,
    )
else:
    # Development/Production: use connection pooling
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.ENVIRONMENT == "development",
        pool_pre_ping=True,
        pool_size=10 if settings.ENVIRONMENT == "production" else 5,
        max_overflow=20 if settings.ENVIRONMENT == "production" else 10,
    )

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Create base class for models
Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get database session.
    Usage:
        @router.get("/")
        async def read_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database with tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_db() -> None:
    """Drop all database tables. Use with caution!"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
