import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://cpns_user:cpns_password@localhost:5432/cpns_db"
engine = create_async_engine(DATABASE_URL)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

async def seed_package():
    async with async_session_maker() as session:
        try:
            # 1. Create a Package
            package_id = uuid.uuid4()
            await session.execute(
                text("""
                    INSERT INTO packages (id, title, description, price, is_premium, category) 
                    VALUES (:id, 'Paket Tryout SKD Akbar Nasional 2026', 'Simulasi SKD 110 Soal (TWK, TIU, TKP) dengan standar BKN terbaru. Sangat direkomendasikan untuk pemanasan.', 0, false, 'Mix')
                """),
                {"id": package_id}
            )
            print(f"Created Package: {package_id}")

            # 2. Generate 110 Questions
            categories = [
                {"name": "TWK", "count": 30, "scoring": "exact"},
                {"name": "TIU", "count": 35, "scoring": "exact"},
                {"name": "TKP", "count": 45, "scoring": "graduated"}
            ]
            
            q_num = 1
            for cat in categories:
                for idx in range(cat["count"]):
                    q_id = uuid.uuid4()
                    question_text = f"Soal {cat['name']} nomor {idx + 1}. Ini adalah pertanyaan simulasi untuk menguji kemampuan {cat['name']} Anda. Pilihlah jawaban yang paling tepat dari pilihan di bawah ini."
                    discussion_text = f"Pembahasan Soal {cat['name']} nomor {idx + 1}. Jawaban yang tepat menunjukkan penguasaan materi {cat['name']} yang baik."
                    
                    await session.execute(
                        text("""
                            INSERT INTO questions (id, package_id, content, discussion, segment, number) 
                            VALUES (:id, :pkg_id, :content, :discussion, :segment, :number)
                        """),
                        {"id": q_id, "pkg_id": package_id, "content": question_text, "discussion": discussion_text, "segment": cat["name"], "number": q_num}
                    )
                    
                    # Generate 5 options (A, B, C, D, E)
                    labels = ['A', 'B', 'C', 'D', 'E']
                    
                    if cat["scoring"] == "exact":
                        # One correct answer (weight 5), others 0
                        correct_idx = idx % 5 # Rotate correct answer
                        for o_idx, label in enumerate(labels):
                            weight = 5 if o_idx == correct_idx else 0
                            opt_text = f"Pilihan {label} - Jawaban yang {'benar' if weight == 5 else 'salah'}."
                            await session.execute(
                                text("""
                                    INSERT INTO question_options (id, question_id, label, content, score) 
                                    VALUES (:id, :q_id, :label, :content, :score)
                                """),
                                {"id": uuid.uuid4(), "q_id": q_id, "label": label, "content": opt_text, "score": weight}
                            )
                    else:
                        # TKP: Graduated scoring 1 to 5
                        for o_idx, label in enumerate(labels):
                            weight = ((idx + o_idx) % 5) + 1 # gives 1, 2, 3, 4, 5
                            opt_text = f"Pilihan {label} - Menunjukkan karakteristik pelayan publik dengan nilai {weight}."
                            await session.execute(
                                text("""
                                    INSERT INTO question_options (id, question_id, label, content, score) 
                                    VALUES (:id, :q_id, :label, :content, :score)
                                """),
                                {"id": uuid.uuid4(), "q_id": q_id, "label": label, "content": opt_text, "score": weight}
                            )
                    
                    q_num += 1
            
            await session.commit()
            print("Successfully seeded 1 Package with 110 Questions and 550 Options.")

        except Exception as e:
            print(f"Error seeding package: {e}")
            await session.rollback()
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_package())
