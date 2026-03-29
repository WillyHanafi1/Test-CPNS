import asyncio
import os
import json
import sys
from dotenv import load_dotenv

# Add parent directory to path to import backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.core.ai_service import ai_service

async def test_ai_response():
    load_dotenv('backend/.env')
    print(f"Testing with model: {ai_service.model_name}")
    
    # Simplified few-shot from generate_questions.py
    example = """
    Contoh gaya soal TWK:
    "Di era digital, gempuran produk impor dengan harga sangat murah melalui platform e-commerce asing mengancam eksistensi UMKM lokal. Sikap nasionalisme ekonomi yang paling tepat dan adaptif bagi seorang ASN dalam menyikapi fenomena ini adalah..."
    Opsi: Panjang 1-2 kalimat per opsi, kontekstual, gunakan bahasa formal birokrasi.
    Pembahasan: Jelaskan konsep dan mengapa jawaban benar paling tepat.
    """
    
    try:
        # We'll use the service method first to see if it even gets there
        result = await ai_service.generate_full_question(
            segment="TWK",
            sub_category="Nasionalisme",
            difficulty="medium",
            regulation_context="CPNS Test",
            example_question=example
        )
        print(f"\nResult from generate_full_question (keys): {list(result.keys()) if result else 'EMPTY'}")
        print(f"Full result: {json.dumps(result, indent=2)}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_ai_response())
