from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from backend.config import settings

engine_options = {"echo": settings.LOG_LEVEL.upper() == "DEBUG", "pool_pre_ping": True}
if not settings.DATABASE_URL.startswith("sqlite"):
    engine_options.update(connect_args={"statement_cache_size": 0}, pool_size=3,
                          max_overflow=5, pool_timeout=30, pool_recycle=1800)
engine = create_async_engine(settings.DATABASE_URL, **engine_options)

async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_async_session():
    async with async_session_maker() as session:
        yield session
