"""Explicit local-only services/fixtures. Never reads a production database URL."""
import asyncio
import json
import os
from pathlib import Path
import subprocess
import sys
from uuid import NAMESPACE_URL, uuid5
from datetime import datetime, timedelta, timezone

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))


def environment(docker=False):
    env = os.environ.copy()
    env.update(DATABASE_URL="postgresql+asyncpg://tocpns:development-only@127.0.0.1:55439/tocpns_dev",
               REDIS_URL="redis://127.0.0.1:56389/0", ENV="development",
               SECRET_KEY="local-development-only-not-for-production-2026",
               FRONTEND_URL="http://localhost:3107", CORS_ORIGINS="http://localhost:3107",
               GOOGLE_API_KEY="", GOOGLE_CLIENT_ID="", ADMIN_AI_ENABLED="false",
               MAIL_USERNAME="", MAIL_PASSWORD="", DOKU_CLIENT_ID="", DOKU_SECRET_KEY="",
               DOKU_ENVIRONMENT="sandbox", NEXT_PUBLIC_API_URL="http://localhost:8017",
               NEXT_PUBLIC_GOOGLE_CLIENT_ID="", NEXT_PUBLIC_DOKU_ENVIRONMENT="sandbox")
    if docker:
        env.update(DATABASE_URL="postgresql+asyncpg://tocpns:development-only@postgres:5432/tocpns_dev",
                   REDIS_URL="redis://redis:6379/0")
    return env


async def seed_donations(db):
    """Insert the same 20 fictitious donations as the design studio, idempotently."""
    from sqlalchemy import select
    from backend.models.models import User, UserProfile, UserTransaction
    from backend.core.security import get_password_hash

    rows = json.loads((ROOT / "frontend/src/lib/donation-demo-data.json").read_text(encoding="utf-8"))
    preview_password = get_password_hash("PreviewOnly123!")
    for row in rows:
        user_id = uuid5(NAMESPACE_URL, f"tocpns-local-donation:{row['supporter_id']}")
        if not await db.get(User, user_id):
            db.add(User(id=user_id, email=f"{row['supporter_id']}@donation-preview.example.test",
                        hashed_password=preview_password, role="participant"))
            await db.flush()
            db.add(UserProfile(user_id=user_id, full_name=row["full_name"]))
        order_id = f"LOCAL-DONATION-{row['id']}"
        if not await db.scalar(select(UserTransaction.id).where(UserTransaction.order_id == order_id)):
            db.add(UserTransaction(user_id=user_id, order_id=order_id,
                                  transaction_type="donation", payment_status="success",
                                  amount=row["amount"], message=row["message"], is_anonymous=row["is_anonymous"],
                                  created_at=datetime.fromisoformat(row["created_at"]),
                                  paid_at=datetime.fromisoformat(row["paid_at"])))
    print(f"{len(rows)} synthetic donation fixtures ready (including anonymous and repeat supporters).")


async def seed(docker=False, donations=False):
    os.environ.update(environment(docker=docker))
    from sqlalchemy import select, func
    from backend.db.session import engine, async_session_maker, Base
    from backend.models.models import User, UserProfile, Package, Question, QuestionOption
    from backend.core.security import get_password_hash
    expected_host = "postgres" if docker else "127.0.0.1"
    if engine.url.host != expected_host or engine.url.database != "tocpns_dev":
        raise RuntimeError("Fixtures may only be inserted into the isolated tocpns_dev database.")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with async_session_maker() as db:
        for email, role, pro in [("demo@example.com", "participant", True), ("admin@example.com", "admin", False)]:
            if not await db.scalar(select(User.id).where(User.email == email)):
                user = User(email=email, hashed_password=get_password_hash("PreviewOnly123!"), role=role,
                            is_pro=pro, pro_expires_at=datetime.now(timezone.utc)+timedelta(days=365) if pro else None)
                db.add(user); await db.flush()
                db.add(UserProfile(user_id=user.id, full_name="Peserta Demo" if pro else "Admin Demo"))
        if not await db.scalar(select(func.count(Package.id))):
            for number in range(1, 4):
                package = Package(title=f"Simulasi SKD {number:02d} · Contoh infrastruktur", category="Mix",
                    description="Data sintetis untuk pemeriksaan aplikasi lokal, bukan bank soal production.",
                    is_premium=number>1, is_published=True, is_active=True)
                db.add(package); await db.flush()
                for index, segment in enumerate(["TWK"]*30+["TIU"]*35+["TKP"]*45, 1):
                    q = Question(package_id=package.id, content=f"Soal contoh **{index}**. Untuk simulasi ini, pilih jawaban dengan poin tertinggi. Nilai dari $2+2$ adalah berapa?",
                        discussion="Ini data sintetis untuk memeriksa alur penyimpanan dan pembahasan. $2+2=4$. Substansi bank soal akan ditinjau dalam tahap kualitas konten.",
                        segment=segment, sub_category="Contoh", number=index)
                    db.add(q); await db.flush()
                    for i, label in enumerate("ABCDE"):
                        db.add(QuestionOption(question_id=q.id, label=label, content=["4", "5", "6", "7", "8"][i],
                            score=(5-i if segment=="TKP" else (5 if i==0 else 0))))
        if donations:
            await seed_donations(db)
        await db.commit()
    await engine.dispose()
    print("Local fixtures ready. Synthetic demo/admin accounts use the documented preview password.")


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv)>1 else "help"
    if action == "seed":
        asyncio.run(seed(docker="--docker" in sys.argv, donations="--donations" in sys.argv))
    elif action == "api":
        subprocess.run([sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8017"], cwd=ROOT, env=environment(), check=True)
    elif action == "worker":
        subprocess.run([sys.executable, "-m", "celery", "-A", "backend.core.celery_app.celery_app", "worker", "--pool=solo", "--concurrency=1", "--loglevel=WARNING"], cwd=ROOT, env=environment(), check=True)
    elif action == "web":
        node = "node"
        subprocess.run([node, "node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3107"], cwd=ROOT/"frontend", env=environment(), check=True)
    else:
        print("Start infra/development/compose.yml first; then use seed, api, worker, or web.")
