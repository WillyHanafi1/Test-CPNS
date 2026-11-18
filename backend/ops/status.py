"""Machine-readable checks for the host timer; never outputs credentials or participant data."""
import asyncio
import json
from backend.db.session import async_session_maker, engine
from backend.services.operations import status


async def main():
    try:
        async with async_session_maker() as db:
            result = await status(db)
        print(json.dumps(result, default=str))
    except Exception as exc:
        print(json.dumps({'status': 'unavailable', 'issues': [{'code': 'application_check',
            'message': 'Pemeriksaan aplikasi gagal.', 'error_type': type(exc).__name__}]}))
    finally:
        await engine.dispose()


if __name__ == '__main__':
    asyncio.run(main())
