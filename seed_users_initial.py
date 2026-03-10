import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from backend.core.security import get_password_hash

# Database configuration
DATABASE_URL = "postgresql+asyncpg://cpns_user:cpns_password@localhost:5432/cpns_db"
engine = create_async_engine(DATABASE_URL)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

async def seed_users():
    async with async_session_maker() as session:
        try:
            # First, clean existing test users if they were created with wrong hashes
            await session.execute(text("DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email IN ('admin@cpns.com', 'peserta@gmail.com'))"))
            await session.execute(text("DELETE FROM users WHERE email IN ('admin@cpns.com', 'peserta@gmail.com')"))
            
            users_to_create = [
                {
                    "email": "admin@cpns.com",
                    "password": "admin",
                    "full_name": "Administrator Tokcer"
                },
                {
                    "email": "peserta@gmail.com",
                    "password": "user",
                    "full_name": "Budi Calon ASN"
                }
            ]
            
            for u_data in users_to_create:
                user_id = uuid.uuid4()
                hashed_pwd = get_password_hash(u_data["password"])
                
                # Insert into users
                await session.execute(
                    text("INSERT INTO users (id, email, hashed_password, is_active, created_at) VALUES (:id, :email, :pwd, true, now())"),
                    {"id": user_id, "email": u_data["email"], "pwd": hashed_pwd}
                )
                
                # Insert into user_profiles
                await session.execute(
                    text("INSERT INTO user_profiles (id, user_id, full_name, target_agency) VALUES (:pid, :uid, :name, 'BKN')"),
                    {"pid": uuid.uuid4(), "uid": user_id, "name": u_data["full_name"]}
                )
                print(f"CREATED USER: {u_data['email']} | Password: {u_data['password']}")
            
            await session.commit()
            print("STATUS: USER_SEEDING_COMPLETE")
            
        except Exception as e:
            print(f"ERROR: {e}")
            await session.rollback()
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_users())
