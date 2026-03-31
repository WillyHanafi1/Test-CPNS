from google import genai
from google.genai import types
import json
import asyncio
import logging
from backend.config import settings
from backend.core.knowledge_service import knowledge_service

from pydantic import BaseModel
from typing import Optional, List, Dict, Any

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
            self.client = None
            return
        
        # Initialize the newer GenAI SDK client
        self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        self.model_name = 'gemini-3-flash-preview'

    async def generate_balanced_options(self, question: str, correct_answer: str, discussion: str, segment: str, custom_prompt: str = "") -> Dict[str, str]:
        """
        Generate 4 distractors that are plausible and balanced in length with the correct answer.
        Uses Gemini 3 Thinking Mode (High) for superior reasoning.
        """
        if not self.client:
            return {}

        custom_section = ""
        if custom_prompt:
            custom_section = f"\n        INSTRUKSI TAMBAHAN DARI ADMIN:\n        {custom_prompt}\n"

        prompt = f"""
        Kamu adalah Ahli Pembuat Soal CPNS (BKN). 
        Tugasmu adalah membuat 4 pilihan jawaban pengecoh (distractor) yang berkualitas untuk soal berikut.
        
        SOAL: {question}
        JAWABAN BENAR: {correct_answer}
        PEMBAHASAN KONTEKS: {discussion}
        SEGMEN: {segment}
        {custom_section}
        
        KRITERIA KUALITAS:
        1. MANDATORY VERBATIM: Kamu WAJIB menyertakan teks JAWABAN BENAR secara persis (word-for-word) tanpa mengubah satu karakter pun (termasuk dilarang menambah titik di akhir, mengubah kapitalisasi, atau memperbaiki typo pada jawaban benar tersebut). Jika kamu mengubahnya, sistem audit kami akan menolak hasil kerjamu.
        2. PANJANG KARAKTER: Setiap pengecoh (distractor) HARUS memiliki panjang karakter dan kedetailan yang setara dengan JAWABAN BENAR (±15%).
        3. PLAUSIBILITAS: Pengecoh harus terlihat masuk akal bagi peserta yang kurang teliti, namun tetap salah secara substansi.
        4. KHUSUS TKP: Pengecoh harus merepresentasikan gradasi nilai 1-4, bukan jawaban yang terlihat "jahat".
        
        OUTPUT: Harus dalam format JSON valid dengan key: option_a, option_b, option_c, option_d, option_e.
        Tentukan sendiri mana yang menjadi jawaban benar di antara A-E, dan isi sisanya dengan pengecoh buatanmu.
        """

        try:
            # High-level thinking for balanced distractors via specialized Async Client (aio)
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    thinking_config=types.ThinkingConfig(thinking_level="high")
                )
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Failed to generate balanced options: {str(e)}")
            return {}

    async def generate_balanced_options_batch(
        self,
        questions: List[Dict[str, Any]],
        custom_prompt: str = "",
        batch_size: int = 5
    ) -> List[Dict[str, str]]:
        """
        Process multiple questions in parallel using asyncio.gather.
        Batched to respect Gemini API rate limits.
        
        Each item in `questions` must have:
          - question_text, correct_answer, discussion, segment
        """
        if not self.model:
            return [{} for _ in questions]

        async def _process_single(q: dict) -> Dict[str, str]:
            try:
                return await self.generate_balanced_options(
                    question=q["question_text"],
                    correct_answer=q["correct_answer"],
                    discussion=q.get("discussion", ""),
                    segment=q.get("segment", "TWK"),
                    custom_prompt=custom_prompt
                )
            except Exception as e:
                logger.error(f"Batch item failed: {e}")
                return {}

        results = []
        for i in range(0, len(questions), batch_size):
            batch = questions[i:i + batch_size]
            batch_results = await asyncio.gather(
                *[_process_single(q) for q in batch],
                return_exceptions=False
            )
            results.extend(batch_results)
            # Small delay between batches to be kind to rate limits
            if i + batch_size < len(questions):
                await asyncio.sleep(1)

        return results

    async def generate_analysis(self, stats: dict, history: list = None) -> dict:
        """
        Generate AI analysis with Thinking Mode enabled for deeper insights into exam performance.
        """
        if not self.client:
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
        1. Berikan ringkasan objektif mengenai performa user (1-2 kalimat).
        2. Identifikasi 2-3 area kelemahan spesifik.
        3. Berikan 'Action Plan' konkret 7 hari ke depan.
        4. Berikan pesan motivasi singkat.

        Wajib format JSON: summary, weaknesses, action_plan, motivation.
        """

        try:
            # High-level thinking for quality analysis via specialized Async Client (aio)
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    thinking_config=types.ThinkingConfig(thinking_level="high")
                )
            )
            
            raw_data = json.loads(response.text)
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
        Generate a conversational AI response for the Mentor Chatbot using Gemini 3 Thinking.
        Thinking is used internally for better reasoning but not shown to the user.
        """
        if not self.client:
            return "Maaf, Tutor AI saat ini sedang tidak tersedia."

        current_query = messages[-1]['content']
        kb_context = knowledge_service.get_relevant_context(current_query)

        system_instruction = f"""
        Kamu adalah 'Tutor AI', mentor ahli seleksi CPNS yang sabar, cerdas, dan suportif.
        Tugasmu adalah membantu user memahami materi SKD dan memberikan strategi pengerjaan soal.
        
        PENDEKATAN TUTORIAL:
        1. Jelaskan langkah-langkah logika secara bertahap.
        2. Gunakan analogi jika materi dirasa sulit.
        3. MANDATORY: Gunakan sintaks LaTeX $...$ untuk simbol matematika (inline) atau $$...$$ untuk baris terpisah (block).
        
        {kb_context}
        """

        context_str = ""
        if context_data:
            context_str = f"\nCONTEXT DATA: {json.dumps(context_data)}\n"

        chat_history = ""
        for msg in messages[:-1]:
            role_label = "User" if msg['role'] == 'user' else "Tutor AI"
            chat_history += f"{role_label}: {msg['content']}\n"
        
        full_final_prompt = f"""{context_str}
{system_instruction}
{chat_history}
User: {current_query}
Tutor AI:"""

        try:
            # Enable high thinking for deep reasoning via aio
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=full_final_prompt,
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_level="high")
                )
            )
            # sdk.text automatically filters out thinking blocks
            return response.text.strip()
        except Exception as e:
            logger.error(f"Failed to get AI chat response: {str(e)}")
            return "Maaf, terjadi gangguan koneksi saat Tutor AI mencoba membalas."



    async def generate_mastery_digest(self, mastery_data: List[Dict[str, Any]], weak_points: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate a personalized AI digest using Gemini 3 Thinking.
        Thinking is internal only as requested.
        """
        if not self.client:
            return {"error": "AI Service is disabled"}

        prompt = f"""
        Kamu adalah Mentor Ahli CPNS. Berdasarkan Topic Mastery dan Titik Kelemahan berikut, berikan analisis singkat.
        DATA: {json.dumps(mastery_data[:10])}
        KELEMAHAN: {json.dumps(weak_points)}
        Tugas: 2 kalimat ringkasan, 3 topik kritis, 3 tips taktis, 1 motivasi.
        Wajib format JSON.
        """

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    thinking_config=types.ThinkingConfig(thinking_level="high")
                )
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Error generating mastery digest: {str(e)}")
            return {"error": "Gagal menghasilkan analisis AI"}

    async def generate_full_question(
        self,
        segment: str,
        sub_category: str,
        difficulty: str,
        regulation_context: str,
        example_question: str = "",
        custom_prompt: str = "",
        existing_topics: list[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate a complete CPNS question from scratch with options, scores, and discussion.
        Used by scripts/generate_questions.py for bulk question generation.
        """
        if not self.client:
            return {}

        difficulty_profiles = {
            "easy": {
                "instruction": "Buat soal dengan konteks SEDERHANA dan UMUM. Buat 1 opsi sebagai pengecoh utama (distractor) yang sedikit mengecoh. Buat 3 opsi lainnya sebagai opsi sederhana yang salah secara fakta/logika, tapi JANGAN dibuat terlalu kentara salah. Opsi sederhana harus tetap terlihat masuk akal secara sekilas. Gunakan bahasa lugas.",
                "twk_hint": "Gunakan konsep dasar yang sering dibahas di buku PKN SMA/umum.",
                "tiu_hint": "Gunakan angka kecil (1-100), operasi dasar, pola sederhana, dan hanya 1-2 langkah penyelesaian.",
                "tkp_hint": "Buat situasi kerja sehari-hari yang jelas. Gradasi pilihan harus mudah dibedakan antara sikap baik dan buruk."
            },
            "medium": {
                "instruction": "Buat soal SETARA level SKD CPNS. Buat 2 opsi pengecoh utama yang SANGAT MIRIP dengan jawaban benar dan terdengar sangat positif/ideal/logis, namun secara substansi keliru berdasarkan konteks soal. 2 opsi lainnya adalah jawaban salah standar yang masuk akal namun lebih mudah dikenali salahnya.",
                "twk_hint": "Gunakan konteks situasional yang membutuhkan penerapan nilai, bukan sekadar hafalan.",
                "tiu_hint": "Gunakan angka menengah, operasi campuran, pola bertingkat, dan 2-3 langkah penyelesaian. Sertakan LaTeX ketat untuk rumus.",
                "tkp_hint": "Buat dilema kerja realistis. Gradasi pilihan harus halus, butuh analisis untuk membedakan skor tertinggi."
            },
            "hard": {
                "instruction": "Buat soal SULIT dengan konteks BERLAPIS. Buat 4 opsi pengecoh di mana KESEMUANYA terdengar sangat positif, ideal, dan sangat masuk akal secara mandiri. Peserta harus benar-benar jeli memahami akar masalah spesifik pada soal untuk bisa membedakan 1 jawaban paling benar di antara 4 pengecoh bersinar tersebut.",
                "twk_hint": "Gabungkan 2+ konsep (misal: nasionalisme + otonomi daerah + HAM). Gunakan kasus kontemporer yang kontroversial.",
                "tiu_hint": "Gunakan angka besar/pecahan, operasi bertingkat, pola non-trivial, dan 3-4 langkah penyelesaian. Sertakan jebakan logis. Sertakan LaTeX ketat untuk rumus.",
                "tkp_hint": "Buat dilema etis yang kompleks di mana SEMUA opsi terlihat saling menguntungkan (win-win) lalu buat kontradiksi halus."
            },
            "extreme": {
                "instruction": "Buat soal SANGAT SULIT (HOTS Maksimal). Ke-4 pengecoh BUKAN sekadar positif, melainkan harus mewakili KESALAHAN UMUM (Common Misconception) orang pandai. Pengecoh tersebut mungkin legal/benar di situasi lain, tapi menabrak satu aturan kecil yang tersembunyi/tersirat pada kasus unik di soal.",
                "twk_hint": "Gunakan kasus hukum tata negara yang ambigu, konflik silang antar-pasal UUD. Pengecoh bersandar pada norma yang salah konteks.",
                "tiu_hint": "Gunakan kombinatorik tingkat lanjut. 4 Pengecoh adalah angka yang muncul jika peserta salah menjumlahkan di langkah terakhir atau lupa salah satu syarat kecil di narasi. Sertakan LaTeX ketat.",
                "tkp_hint": "Buat skenario persimpangan di mana 4 opsi terlihat BENAR. Perbedaan hanya pada prosedur administratif mikroskopis atau penjatuhan hirarki kebijakan (loyalitas pimpinan vs hukum negara)."
            }
        }

        profile = difficulty_profiles.get(difficulty, difficulty_profiles["medium"])

        segment_hint = ""
        if segment == "TWK":
            segment_hint = profile["twk_hint"]
        elif segment == "TIU":
            segment_hint = profile["tiu_hint"]
        elif segment == "TKP":
            segment_hint = profile["tkp_hint"]

        scoring_instruction = ""
        if segment in ("TWK", "TIU"):
            scoring_instruction = """
            ATURAN SKOR (TWK/TIU):
            - Tepat 1 opsi bernilai 5 (jawaban benar), 4 opsi lainnya bernilai 0.
            - Tentukan sendiri posisi jawaban benar (acak di A-E).
            - Key JSON skor: score_a, score_b, score_c, score_d, score_e.
            """
        else:  # TKP
            scoring_instruction = """
            ATURAN SKOR (TKP):
            - TIDAK ADA jawaban salah. Semua 5 opsi memiliki skor 1, 2, 3, 4, atau 5 (masing-masing UNIK, tidak boleh ada duplikat skor).
            - Skor 5 = sikap PALING ideal. Skor 1 = sikap PALING tidak ideal.
            - Tentukan sendiri distribusi skor di A-E.
            - Key JSON skor: score_a, score_b, score_c, score_d, score_e.
            """

        example_section = ""
        if example_question:
            example_section = f"""
            CONTOH SOAL REFERENSI (untuk gaya bahasa dan format, JANGAN salin kontennya):
            {example_question}
            """

        custom_section = ""
        if custom_prompt:
            custom_section = f"\n            INSTRUKSI TAMBAHAN: {custom_prompt}\n"

        existing_topics_section = ""
        if existing_topics:
            topics_str = "\n".join(f"  - {t}" for t in existing_topics)
            existing_topics_section = f"""
            TOPIK YANG SUDAH DIBUAT SEBELUMNYA (WAJIB buat topik/skenario/pola yang BERBEDA TOTAL):
            {topics_str}
            """

        prompt = f"""
        Kamu adalah Ahli Senior Pembuat Soal CPNS BKN dengan pengalaman 20 tahun.
        Buatkan 1 soal ORIGINAL untuk Seleksi Kompetensi Dasar (SKD) CPNS.

        REGULASI ACUAN:
        {regulation_context}

        SPESIFIKASI SOAL:
        - Segmen: {segment}
        - Sub-Kategori/Materi: {sub_category}
        - Level Kesulitan: {difficulty.upper()}

        INSTRUKSI LEVEL:
        {profile["instruction"]}

        DETAIL SEGMEN:
        {segment_hint}

        {scoring_instruction}
        {example_section}
        {custom_section}
        {existing_topics_section}

        ATURAN OUTPUT:
        1. Soal WAJIB original, tidak boleh menyalin soal yang sudah beredar.
        2. Teks soal harus PANJANG dan KONTEKSTUAL (minimal 2-3 kalimat situasi, lalu pertanyaan).
        3. Setiap opsi jawaban harus PANJANG dan SETARA (±15% karakter antar opsi). Hindari opsi terlalu pendek.
        4. Pembahasan (discussion) harus JELAS menjelaskan MENGAPA jawaban benar itu benar dan yang lain salah.
        5. KHUSUS TIU (Matematika/Logika/Analitis): Anda WAJIB menggunakan format LaTeX ketat `$ ... $` untuk angka/rumus inline dan `$$ ... $$` untuk rumus blok terpisah. Apabila menyajikan data berkolom/tabel, WAJIB gunakan sintaks Markdown Table terstruktur.
        6. JANGAN membuat soal tentang gambar/figural/visual.

        ATURAN AKURASI MATEMATIS (WAJIB untuk TIU):
        1. Hitung jawaban step-by-step SEBELUM menyusun opsi. Jawaban benar WAJIB cocok persis dengan salah satu opsi.
        2. DILARANG KERAS menyertakan catatan revisi, self-correction, atau komentar internal ("ini tidak mungkin, mari revisi...") di dalam teks soal maupun pembahasan.
        3. Setiap pengecoh (distractor) harus merupakan angka yang BISA muncul jika peserta salah langkah di titik tertentu — bukan angka acak.
        4. Pembahasan WAJIB membuktikan perhitungan rigor step-by-step hingga jawaban final.

        FORMAT OUTPUT (JSON VALID):
        {{
            "content": "Teks soal lengkap...",
            "option_a": "Teks opsi A...",
            "option_b": "Teks opsi B...",
            "option_c": "Teks opsi C...",
            "option_d": "Teks opsi D...",
            "option_e": "Teks opsi E...",
            "score_a": 0,
            "score_b": 5,
            "score_c": 0,
            "score_d": 0,
            "score_e": 0,
            "discussion": "Pembahasan lengkap..."
        }}
        """

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    thinking_config=types.ThinkingConfig(thinking_level="high")
                )
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Failed to generate full question ({segment}/{sub_category}): {str(e)}")
            return {}

    async def generate_full_question_batch(
        self,
        segment: str,
        sub_category: str,
        count: int,
        difficulty: str,
        regulation_context: str,
        example_question: str = "",
        custom_prompt: str = "",
        existing_topics: list[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Generate multiple CPNS questions for a sub-category in a SINGLE API call.
        This prevents duplicates naturally since the AI sees all questions at once.
        Returns a list of question dicts.
        """
        if not self.client:
            return []

        difficulty_profiles = {
            "easy": {
                "instruction": "Buat soal dengan konteks SEDERHANA dan UMUM. Buat 1 opsi sebagai pengecoh utama (distractor) yang sedikit mengecoh. Buat 3 opsi lainnya sebagai opsi sederhana yang salah secara fakta/logika, tapi JANGAN dibuat terlalu kentara salah. Opsi sederhana harus tetap terlihat masuk akal secara sekilas. Gunakan bahasa lugas.",
                "twk_hint": "Gunakan konsep dasar yang sering dibahas di buku PKN SMA/umum.",
                "tiu_hint": "Gunakan angka kecil (1-100), operasi dasar, pola sederhana, dan hanya 1-2 langkah penyelesaian.",
                "tkp_hint": "Buat situasi kerja sehari-hari yang jelas. Gradasi pilihan harus mudah dibedakan antara sikap baik dan buruk."
            },
            "medium": {
                "instruction": "Buat soal SETARA level SKD CPNS. Buat 2 opsi pengecoh utama yang SANGAT MIRIP dengan jawaban benar dan terdengar sangat positif/ideal/logis, namun secara substansi keliru berdasarkan konteks soal. 2 opsi lainnya adalah jawaban salah standar yang masuk akal namun lebih mudah dikenali salahnya.",
                "twk_hint": "Gunakan konteks situasional yang membutuhkan penerapan nilai, bukan sekadar hafalan.",
                "tiu_hint": "Gunakan angka menengah, operasi campuran, pola bertingkat, dan 2-3 langkah penyelesaian. Sertakan LaTeX ketat untuk rumus.",
                "tkp_hint": "Buat dilema kerja realistis. Gradasi pilihan harus halus, butuh analisis untuk membedakan skor tertinggi."
            },
            "hard": {
                "instruction": "Buat soal SULIT dengan konteks BERLAPIS. Buat 4 opsi pengecoh di mana KESEMUANYA terdengar sangat positif, ideal, dan sangat masuk akal secara mandiri. Peserta harus benar-benar jeli memahami akar masalah spesifik pada soal untuk bisa membedakan 1 jawaban paling benar di antara 4 pengecoh bersinar tersebut.",
                "twk_hint": "Gabungkan 2+ konsep (misal: nasionalisme + otonomi daerah + HAM). Gunakan kasus kontemporer yang kontroversial.",
                "tiu_hint": "Gunakan angka besar/pecahan, operasi bertingkat, pola non-trivial, dan 3-4 langkah penyelesaian. Sertakan jebakan logis. Sertakan LaTeX ketat untuk rumus.",
                "tkp_hint": "Buat dilema etis yang kompleks di mana SEMUA opsi terlihat saling menguntungkan (win-win) lalu buat kontradiksi halus."
            },
            "extreme": {
                "instruction": "Buat soal SANGAT SULIT (HOTS Maksimal). Ke-4 pengecoh BUKAN sekadar positif, melainkan harus mewakili KESALAHAN UMUM (Common Misconception) orang pandai. Pengecoh tersebut mungkin legal/benar di situasi lain, tapi menabrak satu aturan kecil yang tersembunyi/tersirat pada kasus unik di soal.",
                "twk_hint": "Gunakan kasus hukum tata negara yang ambigu, konflik silang antar-pasal UUD. Pengecoh bersandar pada norma yang salah konteks.",
                "tiu_hint": "Gunakan kombinatorik tingkat lanjut. 4 Pengecoh adalah angka yang muncul jika peserta salah menjumlahkan di langkah terakhir atau lupa salah satu syarat kecil di narasi. Sertakan LaTeX ketat.",
                "tkp_hint": "Buat skenario persimpangan di mana 4 opsi terlihat BENAR. Perbedaan hanya pada prosedur administratif mikroskopis atau penjatuhan hirarki kebijakan (loyalitas pimpinan vs hukum negara)."
            }
        }

        profile = difficulty_profiles.get(difficulty, difficulty_profiles["medium"])

        segment_hint = ""
        if segment == "TWK":
            segment_hint = profile["twk_hint"]
        elif segment == "TIU":
            segment_hint = profile["tiu_hint"]
        elif segment == "TKP":
            segment_hint = profile["tkp_hint"]

        scoring_instruction = ""
        if segment in ("TWK", "TIU"):
            scoring_instruction = """
            ATURAN SKOR (TWK/TIU):
            - Tepat 1 opsi bernilai 5 (jawaban benar), 4 opsi lainnya bernilai 0.
            - Tentukan sendiri posisi jawaban benar (acak di A-E, variasikan antar soal!).
            - Key JSON skor: score_a, score_b, score_c, score_d, score_e.
            """
        else:  # TKP
            scoring_instruction = """
            ATURAN SKOR (TKP):
            - TIDAK ADA jawaban salah. Semua 5 opsi memiliki skor 1, 2, 3, 4, atau 5 (masing-masing UNIK, tidak boleh ada duplikat skor).
            - Skor 5 = sikap PALING ideal. Skor 1 = sikap PALING tidak ideal.
            - Tentukan sendiri distribusi skor di A-E (variasikan antar soal!).
            - Key JSON skor: score_a, score_b, score_c, score_d, score_e.
            """

        example_section = ""
        if example_question:
            example_section = f"""
            CONTOH SOAL REFERENSI (untuk gaya bahasa dan format, JANGAN salin kontennya):
            {example_question}
            """

        custom_section = ""
        if custom_prompt:
            custom_section = f"\n            INSTRUKSI TAMBAHAN: {custom_prompt}\n"

        existing_topics_section = ""
        if existing_topics:
            topics_str = "\n".join(f"  - {t}" for t in existing_topics)
            existing_topics_section = f"""
            TOPIK YANG SUDAH DIBUAT (WAJIB hindari pengulangan):
            {topics_str}
            """

        prompt = f"""
        Kamu adalah Ahli Senior Pembuat Soal CPNS BKN dengan pengalaman 20 tahun.
        Buatkan {count} soal ORIGINAL untuk Seleksi Kompetensi Dasar (SKD) CPNS.

        REGULASI ACUAN:
        {regulation_context}

        SPESIFIKASI SOAL:
        - Segmen: {segment}
        - Sub-Kategori/Materi: {sub_category}
        - Level Kesulitan: {difficulty.upper()}
        - Jumlah Soal: {count}

        INSTRUKSI LEVEL:
        {profile["instruction"]}

        DETAIL SEGMEN:
        {segment_hint}

        {scoring_instruction}
        {example_section}
        {custom_section}
        {existing_topics_section}

        ATURAN KRITIS - VARIASI & ANTI-DUPLIKAT:
        1. Setiap soal WAJIB memiliki KONTEKS/SKENARIO/SUDUT PANDANG yang BERBEDA TOTAL.
        2. DILARANG KERAS mengulang tema, situasi, atau pola kalimat yang mirip antar soal.
        3. Variasikan: setting (kantor/lapangan/rapat/digital), aktor (atasan/rekan/masyarakat), dan konflik.
        4. Sebar posisi jawaban benar secara acak (jangan semua di opsi yang sama).
        5. Pastikan SETIAP soal berkualitas tinggi — jangan menurunkan kualitas di soal terakhir.

        ATURAN OUTPUT:
        1. Soal WAJIB original, tidak boleh menyalin soal yang sudah beredar.
        2. Teks soal harus PANJANG dan KONTEKSTUAL (minimal 2-3 kalimat situasi, lalu pertanyaan).
        3. Setiap opsi jawaban harus PANJANG dan SETARA (±15% karakter antar opsi). Hindari opsi terlalu pendek.
        4. Pembahasan (discussion) harus JELAS menjelaskan MENGAPA jawaban benar itu benar dan yang lain salah.
        5. KHUSUS TIU (Matematika/Logika/Analitis): Anda WAJIB menggunakan format LaTeX ketat `$ ... $` untuk angka/rumus inline dan `$$ ... $$` untuk rumus blok terpisah. Apabila menyajikan data berkolom/tabel, WAJIB gunakan sintaks Markdown Table terstruktur.
        6. JANGAN membuat soal tentang gambar/figural/visual.

        FORMAT OUTPUT (JSON ARRAY VALID berisi {count} objek):
        [
            {{
                "content": "Teks soal lengkap #1...",
                "option_a": "Teks opsi A...",
                "option_b": "Teks opsi B...",
                "option_c": "Teks opsi C...",
                "option_d": "Teks opsi D...",
                "option_e": "Teks opsi E...",
                "score_a": 0,
                "score_b": 5,
                "score_c": 0,
                "score_d": 0,
                "score_e": 0,
                "discussion": "Pembahasan lengkap #1..."
            }},
            ... (total {count} soal)
        ]
        """

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    thinking_config=types.ThinkingConfig(thinking_level="high")
                )
            )
            result = json.loads(response.text)

            # Handle case where response is a single dict instead of list
            if isinstance(result, dict):
                result = [result]

            return result if isinstance(result, list) else []
        except Exception as e:
            logger.error(f"Failed to generate batch questions ({segment}/{sub_category} x{count}): {str(e)}")
            return []

ai_service = AIService()
