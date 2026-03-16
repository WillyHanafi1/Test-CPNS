import google.generativeai as genai
import json
import logging
from backend.config import settings

logger = logging.getLogger("backend.core.ai_service")

class AIService:
    def __init__(self):
        if not settings.GOOGLE_API_KEY:
            logger.warning("GOOGLE_API_KEY not set. AI Analysis will be disabled.")
            self.model = None
            return
        
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def generate_analysis(self, stats: dict) -> dict:
        """
        Generate AI analysis for an exam session based on summarized stats.
        """
        if not self.model:
            return {
                "summary": "AI Analysis tidak tersedia karena API Key tidak dikonfigurasi.",
                "weaknesses": [],
                "action_plan": [],
                "motivation": "Tetap semangat!"
            }

        prompt = f"""
        Kamu adalah Tutor CPNS Profesional yang ahli dalam membantu peserta lulus SKD.
        Analisis hasil tryout berikut untuk memberikan insight mendalam bagi peserta:

        HASIL SKOR:
        - TWK (Tes Wawasan Kebangsaan): {stats['score_twk']}/150 (Ambang Batas: 65)
        - TIU (Tes Intelegensia Umum): {stats['score_tiu']}/175 (Ambang Batas: 80)
        - TKP (Tes Karakteristik Pribadi): {stats['score_tkp']}/225 (Ambang Batas: 166)
        - Status Kelulusan: {"LULUS AMBANG BATAS" if stats['is_passed'] else "BELUM LULUS AMBANG BATAS"}

        DETAIL PER SUB-KATEGORI (Jika ada):
        {json.dumps(stats.get('sub_categories', {}), indent=2)}

        Tugasmu:
        1. Berikan ringkasan objektif mengenai performa user (1-2 kalimat).
        2. Identifikasi 2-3 area kelemahan spesifik berdasarkan skor atau sub-kategori.
        3. Berikan 'Action Plan' (rencana tindakan) konkret yang harus dilakukan user dalam 7 hari ke depan.
        4. Berikan pesan motivasi singkat yang profesional namun menginspirasi.

        Wajib memberikan respons HANYA dalam format JSON yang valid dengan struktur berikut:
        {{
            "summary": "...",
            "weaknesses": ["...", "..."],
            "action_plan": ["...", "..."],
            "motivation": "..."
        }}
        """

        try:
            # Using generation_config for JSON mode (response_mime_type)
            response = self.model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            return json.loads(response.text)
            
        except Exception as e:
            logger.error(f"Failed to generate AI analysis: {str(e)}")
            return {
                "summary": "Terjadi kesalahan saat memproses analisis AI.",
                "weaknesses": ["Gagal mengambil data kelemahan"],
                "action_plan": ["Silakan coba lagi beberapa saat lagi"],
                "motivation": "Jangan menyerah karena kendala teknis!"
            }

ai_service = AIService()
