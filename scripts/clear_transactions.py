import os
import asyncio
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

load_dotenv()

async def main():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in .env")
        return
        
    engine = create_async_engine(database_url)
    try:
        async with engine.begin() as conn:
            await conn.execute(text("DELETE FROM user_transactions"))
            print("Berhasil menghapus seluruh data transaksi dari tabel user_transactions.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
