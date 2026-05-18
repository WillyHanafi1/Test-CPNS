"""
scripts/verify_vertex_auth.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Verifikasi koneksi ke Vertex AI menggunakan Service Account credentials.

Usage:
    python -m scripts.verify_vertex_auth

    # Atau dari root direktori proyek:
    python scripts/verify_vertex_auth.py
"""

import asyncio
import os
import sys
import logging

# Pastikan root proyek ada di path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("verify_vertex_auth")


async def verify():
    logger.info("=" * 60)
    logger.info("VERIFIKASI KONEKSI VERTEX AI")
    logger.info("=" * 60)

    # --- 1. Cek environment variables ---
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    project_id = os.getenv("VERTEX_PROJECT_ID", "")
    location = os.getenv("VERTEX_LOCATION", "us-central1")
    model_name = os.getenv("VERTEX_MODEL_NAME", "gemini-2.5-pro-preview-05-06")

    logger.info(f"GOOGLE_APPLICATION_CREDENTIALS : {creds_path or '(tidak diset)'}")
    logger.info(f"VERTEX_PROJECT_ID              : {project_id or '(tidak diset)'}")
    logger.info(f"VERTEX_LOCATION                : {location}")
    logger.info(f"VERTEX_MODEL_NAME              : {model_name}")

    if not creds_path:
        logger.error("❌ GOOGLE_APPLICATION_CREDENTIALS tidak diset di .env!")
        sys.exit(1)
    if not os.path.exists(creds_path):
        logger.error(f"❌ File credentials tidak ditemukan: {creds_path}")
        sys.exit(1)
    if not project_id:
        logger.error("❌ VERTEX_PROJECT_ID tidak diset di .env!")
        sys.exit(1)

    logger.info("✅ File credentials ditemukan.")

    # --- 2. Inisialisasi client ---
    logger.info("\nMenginisialisasi Vertex AI client...")
    try:
        from google import genai
        client = genai.Client(
            vertexai=True,
            project=project_id,
            location=location,
        )
        logger.info("✅ Client berhasil diinisialisasi.")
    except Exception as e:
        logger.error(f"❌ Gagal inisialisasi client: {e}")
        sys.exit(1)

    # --- 3. Kirim prompt minimal ---
    logger.info(f"\nMengirim prompt test ke model: {model_name}...")
    test_prompt = "Sebutkan satu fakta singkat tentang Jakarta. Jawab dalam 1 kalimat saja."
    try:
        from google.genai import types
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=test_prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=100,
            )
        )
        logger.info("✅ Respons diterima dari Vertex AI:")
        logger.info(f"   → {response.text.strip()}")
    except Exception as e:
        logger.error(f"❌ Gagal mendapatkan respons: {e}")
        logger.error("   Kemungkinan penyebab:")
        logger.error("   1. Service Account belum diberi peran 'Vertex AI User'")
        logger.error("   2. Vertex AI API belum diaktifkan di project GCP")
        logger.error("   3. Model belum tersedia di region tersebut")
        logger.error(f"   4. Cek Vertex AI quota di: https://console.cloud.google.com/apis/api/aiplatform.googleapis.com/quotas?project={project_id}")
        sys.exit(1)

    # --- 4. Test JSON mode (digunakan oleh ai_service) ---
    logger.info("\nMenguji JSON response mode (digunakan oleh pipeline)...")
    json_prompt = 'Jawab HANYA dengan JSON valid: {"status": "ok", "pesan": "Vertex AI berjalan normal"}'
    try:
        import json
        response_json = await client.aio.models.generate_content(
            model=model_name,
            contents=json_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                max_output_tokens=100,
            )
        )
        parsed = json.loads(response_json.text)
        logger.info(f"✅ JSON mode berfungsi: {parsed}")
    except Exception as e:
        logger.warning(f"⚠️  JSON mode gagal (non-fatal): {e}")
        logger.warning("   Pipeline akan tetap berjalan tapi mungkin perlu fallback parsing.")

    logger.info("\n" + "=" * 60)
    logger.info("✅ SEMUA VERIFIKASI BERHASIL! Vertex AI siap digunakan.")
    logger.info("=" * 60)


if __name__ == "__main__":
    # Load .env dari root proyek
    try:
        from dotenv import load_dotenv
        # Cari .env di root proyek (2 level atas dari scripts/)
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        load_dotenv(env_path)
        logger.info(f"Loaded .env dari: {env_path}")
    except ImportError:
        logger.warning("python-dotenv tidak terinstall, env vars harus diset manual.")

    asyncio.run(verify())
