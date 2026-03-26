from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from backend.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.LOG_LEVEL.upper() == "DEBUG"),
    connect_args={"statement_cache_size": 0},
    # --- Connection Pool Configuration ---
    # Tuned for: 1 vCPU / 2 GB RAM droplet (Aggressive Tuning)
    # Upgrade ke pool_size=20, max_overflow=40 saat pindah ke 4+ vCPU
    pool_size=3,        # Lebih efisien di VPS kecil (2 workers x 3 = 6 persistent total)
    max_overflow=5,     # Mencegah lonjakan koneksi membunuh Supabase Pooler
    pool_timeout=30,    # Seconds to wait for a connection before raising PoolTimeout
    pool_recycle=1800,  # Recycle connections every 30 min to avoid stale handles
    pool_pre_ping=True, # Verify connection health before checkout (prevents dead connections)
)

async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_async_session():
    async with async_session_maker() as session:
        yield session
