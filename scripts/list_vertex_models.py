"""
scripts/list_vertex_models.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Melihat daftar semua model Gemini yang tersedia di project Vertex AI Anda.

Usage:
    python scripts/list_vertex_models.py
"""

import asyncio
import os
import sys

# Pastikan root proyek ada di path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def list_models():
    # Load .env variables
    try:
        from dotenv import load_dotenv
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        load_dotenv(env_path)
    except ImportError:
        pass

    project_id = os.getenv("VERTEX_PROJECT_ID")
    location = os.getenv("VERTEX_LOCATION", "us-central1")
    
    if not project_id:
        print("❌ ERROR: VERTEX_PROJECT_ID tidak diset di .env")
        sys.exit(1)
        
    print(f"Mencari model di Project: {project_id}")
    print(f"Region: {location}")
    print("-" * 50)

    try:
        from google import genai
        client = genai.Client(
            vertexai=True,
            project=project_id,
            location=location,
        )
        
        # Panggil API untuk melist model
        models = await client.aio.models.list(config={'query_base': True})
        
        count = 0
        async for m in models:
            # Filter hanya menampilkan model Gemini (opsional, bisa dihapus jika ingin lihat semua)
            if 'gemini' in m.name.lower():
                # Nama model pada Vertex AI akan muncul sebagai publishers/google/models/[nama_model]
                # Kita bisa ambil bagian akhirnya saja untuk mempermudah konfigurasi di .env
                short_name = m.name.split("/")[-1]
                print(f"✅ {short_name}")
                count += 1
                
        print("-" * 50)
        print(f"Total model Gemini ditemukan: {count}")
        print("\nNote: Gunakan nama-nama di atas untuk variabel VERTEX_MODEL_NAME di .env")
        
    except Exception as e:
        print(f"\n❌ Gagal memuat daftar model: {e}")

if __name__ == "__main__":
    asyncio.run(list_models())
