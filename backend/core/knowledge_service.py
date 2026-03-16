import os
import logging
from typing import List, Optional

logger = logging.getLogger("backend.core.knowledge_service")

class KnowledgeService:
    def __init__(self, knowledge_dir: str = "backend/knowledge"):
        self.knowledge_dir = knowledge_dir
        self.files = {
            "twk": "twk_materi.md",
            "tiu": "tiu_materi.md",
            "tkp": "tkp_materi.md"
        }

    def get_all_context(self) -> str:
        """
        Retrieves the entire content of the knowledge base.
        Suitable for small files where full context is beneficial.
        """
        combined_context = "# KNOWLEDGE BASE CONTEXT\n\n"
        try:
            for category, filename in self.files.items():
                file_path = os.path.join(self.knowledge_dir, filename)
                if os.path.exists(file_path):
                    with open(file_path, "r", encoding="utf-8") as f:
                        combined_context += f"## {category.upper()} MATERIAL\n"
                        combined_context += f.read() + "\n\n"
            return combined_context
        except Exception as e:
            logger.error(f"Error reading knowledge base: {str(e)}")
            return ""

    def get_relevant_context(self, query: str) -> str:
        """
        Simple keyword-based context retrieval (RAG-lite).
        """
        query_lower = query.lower()
        relevant_files = []
        
        # Keyword mapping
        keywords = {
            "twk": ["twk", "kebangsaan", "negara", "pancasila", "uud", "bela negara", "nasionalisme", "integritas", "bahasa"],
            "tiu": ["tiu", "hitung", "numerik", "aritmetika", "logika", "silogisme", "analogi", "figural", "gambar"],
            "tkp": ["tkp", "karakteristik", "pribadi", "pelayanan", "profesional", "kerja", "sosial", "budaya", "tik", "radikalisme"]
        }

        for category, kws in keywords.items():
            if any(kw in query_lower for kw in kws):
                relevant_files.append(self.files[category])

        if not relevant_files:
            # If no keyword matches, return a brief summary or wait for AI to decide
            return ""

        context = "# RELEVANT KNOWLEDGE CONTEXT\n\n"
        try:
            for filename in relevant_files:
                file_path = os.path.join(self.knowledge_dir, filename)
                if os.path.exists(file_path):
                    with open(file_path, "r", encoding="utf-8") as f:
                        context += f.read() + "\n\n"
            return context
        except Exception as e:
            logger.error(f"Error retrieving relevant context: {str(e)}")
            return ""

knowledge_service = KnowledgeService()
