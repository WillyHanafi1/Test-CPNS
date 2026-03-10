import asyncio
import uuid
import sys
import os
import random

# Add the parent directory to sys.path to allow absolute imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db.session import async_session_maker
from backend.models.models import Package, Question, QuestionOption

async def seed_full_skd():
    async with async_session_maker() as session:
        # 1. Create the Full Package
        package_id = uuid.uuid4()
        full_package = Package(
            id=package_id,
            title="Tryout Nasional SKD CPNS 2026 - Paket Premium 01",
            description="Simulasi CAT BKN standar asli dengan 110 soal (30 TWK, 35 TIU, 45 TKP). Waktu pengerjaan 100 menit.",
            price=75000,
            is_premium=True,
            category="Mix"
        )
        session.add(full_package)

        # 2. Generate 30 TWK Questions (Numbers 1-30)
        # Standard: Correct = 5, Wrong = 0
        for i in range(1, 31):
            q_id = uuid.uuid4()
            q = Question(
                id=q_id,
                package_id=package_id,
                content=f"Pertanyaan TWK Nomor {i}: Mengenai materi Nasionalisme, Integritas, atau Bela Negara.",
                segment="TWK",
                number=i,
                discussion="Ini adalah pembahasan untuk soal TWK."
            )
            session.add(q)
            
            # Options A-E
            correct_label = random.choice(["A", "B", "C", "D", "E"])
            for label in ["A", "B", "C", "D", "E"]:
                opt = QuestionOption(
                    id=uuid.uuid4(),
                    question_id=q_id,
                    label=label,
                    content=f"Pilihan jawaban {label} untuk soal TWK nomor {i}",
                    score=5 if label == correct_label else 0
                )
                session.add(opt)

        # 3. Generate 35 TIU Questions (Numbers 31-65)
        # Standard: Correct = 5, Wrong = 0
        for i in range(31, 66):
            q_id = uuid.uuid4()
            q = Question(
                id=q_id,
                package_id=package_id,
                content=f"Pertanyaan TIU Nomor {i}: Mengenai kemampuan Verbal, Numerik, atau Figural.",
                segment="TIU",
                number=i,
                discussion="Ini adalah pembahasan untuk soal TIU."
            )
            # Add images for some figural questions
            if i > 60:
                q.image_url = "https://placehold.co/600x400?text=Figural+Question"
                
            session.add(q)
            
            correct_label = random.choice(["A", "B", "C", "D", "E"])
            for label in ["A", "B", "C", "D", "E"]:
                opt = QuestionOption(
                    id=uuid.uuid4(),
                    question_id=q_id,
                    label=label,
                    content=f"Pilihan jawaban {label} untuk soal TIU nomor {i}",
                    score=5 if label == correct_label else 0
                )
                session.add(opt)

        # 4. Generate 45 TKP Questions (Numbers 66-110)
        # Standard: Graded score 1-5 for all options
        for i in range(66, 111):
            q_id = uuid.uuid4()
            q = Question(
                id=q_id,
                package_id=package_id,
                content=f"Pertanyaan TKP Nomor {i}: Skenario mengenai Pelayanan Publik, Jejaring Kerja, atau Sosial Budaya.",
                segment="TKP",
                number=i,
                discussion="Ini adalah pembahasan untuk soal TKP. Dalam TKP, semua jawaban benar namun memiliki bobot nilai berbeda."
            )
            session.add(q)
            
            # Scores 1-5 shuffled
            scores = [1, 2, 3, 4, 5]
            random.shuffle(scores)
            
            for idx, label in enumerate(["A", "B", "C", "D", "E"]):
                opt = QuestionOption(
                    id=uuid.uuid4(),
                    question_id=q_id,
                    label=label,
                    content=f"Konten skenario {label} dengan respon yang berbeda-beda.",
                    score=scores[idx]
                )
                session.add(opt)

        await session.commit()
        print(f"Successfully created SKD Full Package (110 Questions) for Package ID: {package_id}")

if __name__ == "__main__":
    asyncio.run(seed_full_skd())
