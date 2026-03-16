import google.generativeai as genai
import json
import logging
from backend.config import settings
from backend.core.knowledge_service import knowledge_service

from pydantic import BaseModel
from typing import Optional, List

logger = logging.getLogger("backend.core.ai_service")

class AIAnalysisResult(BaseModel):
    summary: str
    weaknesses: List[str]
    action_plan: List[str]
    motivation: str

class AIService:
    def __init__(self):
        if not settings.GOOGLE_API_KEY:
            logger.warning("GOOGLE_API_KEY not set. AI Analysis will be disabled.")
            self.model = None
            return
        
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def generate_analysis(self, stats: dict, history: list = None) -> dict:
        """
        Generate AI analysis for an exam session based on summarized stats and past history.
        """
        if not self.model:
            return {
                "summary": "AI Analysis tidak tersedia karena API Key tidak dikonfigurasi.",
                "weaknesses": [],
                "action_plan": [],
                "motivation": "Tetap semangat!"
            }

        history_context = ""
        if history:
            history_str = "\n".join([
                f"- Tanggal: {h['date']}, Skor: {h['total_score']} (TWK:{h['score_twk']}, TIU:{h['score_tiu']}, TKP:{h['score_tkp']})"
                for h in history
            ])
            history_context = f"\nRIWAYAT UJIAN SEBELUMNYA:\n{history_str}\n"

        prompt = f"""
        Kamu adalah Tutor CPNS Profesional yang ahli dalam membantu peserta lulus SKD.
        Analisis hasil tryout berikut untuk memberikan insight mendalam bagi peserta.
        {history_context}
        HASIL SKOR SEKARANG:
        - TWK (Tes Wawasan Kebangsaan): {stats['score_twk']}/150 (Ambang Batas: 65)
        - TIU (Tes Intelegensia Umum): {stats['score_tiu']}/175 (Ambang Batas: 80)
        - TKP (Tes Karakteristik Pribadi): {stats['score_tkp']}/225 (Ambang Batas: 166)
        - Status Kelulusan: {"LULUS AMBANG BATAS" if stats['is_passed'] else "BELUM LULUS AMBANG BATAS"}

        DETAIL PER SUB-KATEGORI SEKARANG:
        {json.dumps(stats.get('sub_categories', {}), indent=2)}

        Tugasmu:
        1. Berikan ringkasan objektif mengenai performa user (1-2 kalimat). Jika ada data RIWAYAT SEBELUMNYA, bandingkan secara spesifik (misal: "Score TIU kamu meningkat 15 poin dari ujian terakhir").
        2. Identifikasi 2-3 area kelemahan spesifik berdasarkan skor atau sub-kategori. Perhatikan jika ada pola kelemahan yang berulang dari riwayat sebelumnya.
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
            
            raw_data = json.loads(response.text)
            # Pydantic Validation & Normalization
            return AIAnalysisResult(**raw_data).model_dump()
            
        except Exception as e:
            logger.error(f"Failed to generate AI analysis: {str(e)}")
            return {
                "summary": "Terjadi kesalahan saat memproses analisis AI.",
                "weaknesses": ["Gagal mengambil data kelemahan"],
                "action_plan": ["Silakan coba lagi beberapa saat lagi"],
                "motivation": "Jangan menyerah karena kendala teknis!"
            }

    async def get_chat_response(self, messages: list, context_data: dict = None) -> str:
        """
        Generate a conversational AI response for the Mentor Chatbot.
        'messages' is a list of dicts with 'role' (user/assistant) and 'content'.
        'context_data' can contain question content, segment, user's choice, and discussion.
        """
        if not self.model:
            return "Maaf, Tutor AI saat ini sedang tidak tersedia."

        current_query = messages[-1]['content']
        kb_context = knowledge_service.get_relevant_context(current_query)

        system_instruction = f"""
        Kamu adalah 'Tutor AI', mentor ahli seleksi CPNS yang sabar, cerdas, dan suportif.
        Tugasmu adalah membantu user memahami materi SKD (TWK, TIU, TKP) dan memberikan strategi pengerjaan soal sesuai standar BKN.
        
        MEKANIKA PEMROSESAN (TACTICAL LOGIC):
        1. Stratifikasi Klaster Pengetahuan Silang (Cross-Domain Knowledge Parsing):
           - Jika user bertanya tentang TIU Numerik, fokuslah pada metode aproksimasi dan manipulasi aljabar cepat.
           - Jika user bertanya tentang TWK, gunakan peta batas konseptual yang ketat (Nasionalisme vs Bela Negara vs Cinta Tanah Air).
        2. Resolusi Ambiguitas Nilai Kontinum (SJT Conflict Matrix Alignment):
           - Untuk soal TKP, jangan mencari jawaban yang sekadar "baik secara moral", tapi cari yang "paling ideal secara birokratis".
           - Gunakan prinsip stoikisme fungsional (tetap profesional di tengah tekanan/konflik).
        3. Ekspansi Kueri Modul Logika Proposisional Murni (Pure Syntactic Deduction Engine):
           - Untuk Silogisme, abaikan fakta dunia nyata dan fokus sepenuhnya pada hukum logika formal (Modus Ponens/Tollens).
        
        ETIKA & GAYA BAHASA:
        1. Gunakan bahasa Indonesia yang santun namun tetap akrab dan memotivasi.
        2. Berikan penjelasan yang terstruktur, gunakan poin-poin agar mudah dibaca.
        3. Jika user bertanya tentang soal spesifik, jelaskan langkah logikanya, bukan hanya jawabannya.
        4. Jangan memberikan jawaban untuk hal-hal di luar konteks persiapan CPNS.

        {kb_context}
        """

        context_str = ""
        if context_data:
            context_str = f"""
            KONTEKS SOAL YANG SEDANG DIBAHAS:
            - Soal: {context_data.get('question_content', '')}
            - Segmen: {context_data.get('segment', '')}
            - Jawaban User: {context_data.get('user_answer', 'Tidak dijawab')}
            - Pembahasan/Kunci: {context_data.get('discussion', '')}
            """

        # Simple prompt-based conversation tracking
        chat_history = ""
        for msg in messages[:-1]:
            role_label = "User" if msg['role'] == 'user' else "Tutor AI"
            chat_history += f"{role_label}: {msg['content']}\n"
        
        # Defense against Prompt Injection with XML tags
        full_final_prompt = f"""{system_instruction}

{context_str}

RIWAYAT CHAT:
{chat_history}

<user_message>
{current_query}
</user_message>

Tutor AI:"""

        try:
            response = self.model.generate_content(full_final_prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Failed to get AI chat response: {str(e)}")
            return "Maaf, terjadi gangguan koneksi saat Tutor AI mencoba membalas."

ai_service = AIService()
