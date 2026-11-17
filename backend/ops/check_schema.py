"""Read-only schema revision gate for a production release."""
import asyncio
from pathlib import Path

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy.ext.asyncio import create_async_engine

from backend.config import settings


async def main():
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "alembic"))
    expected = set(ScriptDirectory.from_config(config).get_heads())
    engine = create_async_engine(settings.DATABASE_URL, connect_args={"statement_cache_size": 0})
    try:
        async with engine.connect() as connection:
            current = await connection.run_sync(
                lambda conn: set(MigrationContext.configure(conn).get_current_heads())
            )
        if current != expected:
            raise SystemExit("Schema revision mismatch. Make a database backup, review migrations, then apply the release explicitly.")
        print("Database schema matches this release; read-only check passed.")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
