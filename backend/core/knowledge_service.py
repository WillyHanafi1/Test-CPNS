import os
import logging
from typing import List, Optional

logger = logging.getLogger("backend.core.knowledge_service")

class KnowledgeService:
    def __init__(self, knowledge_dir: str = "backend/knowledge"):
        self.knowledge_dir = knowledge_dir
        self._cache: dict[str, str] = {}
        self.files = {
            "twk": "twk_materi.md",
            "tiu": "tiu_materi.md",
            "tkp": "tkp_materi.md"
        }
        self._load_all()

    def _load_all(self):
        """Loads knowledge base into memory for fast access (O(1))."""
        for category, filename in self.files.items():
            path = os.path.join(self.knowledge_dir, filename)
            if os.path.exists(path):
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        self._cache[category] = f.read()
                except Exception as e:
                    logger.error(f"Failed to load KB file {filename}: {e}")

    def get_all_context(self) -> str:
        """Retrieves the entire content from memory cache."""
        combined_context = "# KNOWLEDGE BASE CONTEXT\n\n"
        for category, content in self._cache.items():
            combined_context += f"## {category.upper()} MATERIAL\n"
            combined_context += content + "\n\n"
        return combined_context

    def get_relevant_context(self, query: str) -> str:
        """Memory-cached keyword retrieval."""
        query_lower = query.lower()
        relevant_categories = []
        
        # Keyword mapping
        keywords = {
            "twk": ["twk", "kebangsaan", "negara", "pancasila", "uud", "bela negara", "nasionalisme", "integritas", "bahasa"],
            "tiu": ["tiu", "hitung", "numerik", "aritmetika", "logika", "silogisme", "analogi", "figural", "gambar"],
            "tkp": ["tkp", "karakteristik", "pribadi", "pelayanan", "profesional", "kerja", "sosial", "budaya", "tik", "radikalisme"]
        }

        for category, kws in keywords.items():
            if any(kw in query_lower for kw in kws):
                relevant_categories.append(category)

        if not relevant_categories:
            return ""

        context = "# RELEVANT KNOWLEDGE CONTEXT\n\n"
        for cat in relevant_categories:
            if cat in self._cache:
                context += self._cache[cat] + "\n\n"
        return context

knowledge_service = KnowledgeService()
