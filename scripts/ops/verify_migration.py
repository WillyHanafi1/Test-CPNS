"""Rehearse the additive migration against an empty, explicitly local test DB."""
import asyncio
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid
import asyncpg
from alembic.config import Config
from alembic.script import ScriptDirectory

ROOT = Path(__file__).resolve().parents[2]
PORT = int(os.environ.get("LOCAL_PG_PORT", "55439"))
DB = "tocpns_migration_test"


async def prepare():
    admin = await asyncpg.connect(host="127.0.0.1", port=PORT, user="tocpns", password="development-only", database="postgres")
    try:
        if not await admin.fetchval("SELECT 1 FROM pg_database WHERE datname=$1", DB):
            await admin.execute("CREATE DATABASE tocpns_migration_test")
    finally:
        await admin.close()
    conn = await asyncpg.connect(host="127.0.0.1", port=PORT, user="tocpns", password="development-only", database=DB)
    try:
        if await conn.fetchval("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"):
            raise RuntimeError("Migration rehearsal DB must be empty; refusing to overwrite existing data")
        await conn.execute((ROOT/"infra/verification/schema-667ecbb432df.sql").read_text(encoding="utf-8"))
        user_id = uuid.uuid4()
        await conn.execute("""INSERT INTO users(id,email,hashed_password,is_active,role,auth_provider,is_pro,created_at)
            VALUES($1,'migration@example.com','synthetic-no-login',true,'participant','local',false,now())""", user_id)
        await conn.execute("""INSERT INTO user_transactions(id,user_id,transaction_type,payment_status,amount,is_anonymous,created_at)
            VALUES($1,$2,'donation','success',3000,false,now())""", uuid.uuid4(), user_id)
    finally:
        await conn.close()


async def verify():
    conn = await asyncpg.connect(host="127.0.0.1", port=PORT, user="tocpns", password="development-only", database=DB)
    try:
        revision = await conn.fetchval("SELECT version_num FROM alembic_version")
        config = Config(str(ROOT / 'backend/alembic.ini'))
        config.set_main_option('script_location', str(ROOT / 'backend/alembic'))
        assert revision == ScriptDirectory.from_config(config).get_current_head()
        assert await conn.fetchval("SELECT count(*) FROM users") == 1
        payment = await conn.fetchrow('SELECT amount,payment_status,paid_at FROM user_transactions')
        assert dict(payment) == {'amount': 3000, 'payment_status': 'success', 'paid_at': None}
        for table in ["package_revisions", "exam_responses", "exam_jobs", "payment_events", "audit_events"]:
            assert await conn.fetchval(f"SELECT count(*) FROM {table}") == 0
        columns = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='exam_sessions'")
        assert {"revision_id", "writer_id", "writer_epoch", "submitted_at"}.issubset({r[0] for r in columns})
        payment_columns = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='user_transactions'")
        assert {"payment_environment", "payment_client_id", "payment_request_body", "payment_expires_at", "payment_checked_at", "paid_at"}.issubset({r[0] for r in payment_columns})
        return {"revision": revision, "legacy_user_preserved": True,
                "legacy_success_preserved_without_invented_date": True, "new_tables_empty": True}
    finally:
        await conn.close()


if __name__ == "__main__":
    started = time.monotonic()
    asyncio.run(prepare())
    env = os.environ.copy()
    env.update(DATABASE_URL=f"postgresql+asyncpg://tocpns:development-only@127.0.0.1:{PORT}/{DB}",
               SECRET_KEY="migration-rehearsal-only-not-production", ENV="development", GOOGLE_API_KEY="")
    subprocess.run([sys.executable, "-m", "alembic", "-c", "backend/alembic.ini", "upgrade", "head"], cwd=ROOT, env=env, check=True)
    report = {**asyncio.run(verify()), "elapsed_seconds": round(time.monotonic()-started, 2)}
    print(json.dumps(report))
