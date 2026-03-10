import asyncio
import uuid
import sys
import os

# Add the parent directory to sys.path to allow absolute imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db.session import async_session_maker
from backend.models.models import Package

async def seed_data():
    async with async_session_maker() as session:
        # Create mock packages
        packages = [
            Package(
                id=uuid.uuid4(),
                title="Simulasi SKD CPNS 2026 - Paket Hemat",
                description="Paket lengkap simulasi SKD BKN dengan 110 soal yang mencakup TWK, TIU, dan TKP sesuai kisi-kisi terbaru.",
                price=0,
                is_premium=False,
                category="Mix"
            ),
            Package(
                id=uuid.uuid4(),
                title="Mastering TIU (Tes Intelegensia Umum)",
                description="Fokus pada kemampuan verbal, numerik, dan figural. Cocok bagi Anda yang ingin meningkatkan skor TIU secara signifikan.",
                price=49000,
                is_premium=True,
                category="TIU"
            ),
            Package(
                id=uuid.uuid4(),
                title="Super TWK: Wawasan Kebangsaan",
                description="Kumpulan soal TWK paling update mengenai Nasionalisme, Integritas, Bela Negara, Pilar Negara, dan Bahasa Indonesia.",
                price=35000,
                is_premium=True,
                category="TWK"
            ),
            Package(
                id=uuid.uuid4(),
                title="TKP Bootcamp: Karakter Pribadi",
                description="Pelajari pola jawaban TKP untuk mendapatkan poin maksimal (5 poin) di setiap opsi jawaban.",
                price=0,
                is_premium=False,
                category="TKP"
            )
        ]
        
        session.add_all(packages)
        await session.commit()
        print("Successfully seeded 4 packages.")

if __name__ == "__main__":
    asyncio.run(seed_data())
