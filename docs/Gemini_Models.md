# Daftar Model Gemini dan Penggunaannya

Dokumen ini memuat daftar model Gemini yang saat ini tersedia melalui API, cara melihatnya secara dinamis menggunakan *library* Python, serta analisis penggunaannya di dalam *codebase* proyek ini.

## Cara Mengetahui Seluruh Model yang Tersedia

Anda bisa mendapatkan daftar seluruh model yang didukung secara dinamis langsung dari API menggunakan library `google-genai` (SDK baru dari Google) yang sudah ter-install di proyek Anda. 

Berikut adalah script Python yang bisa digunakan untuk melist seluruh model:

```python
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

# Inisialisasi client menggunakan API key dari .env
client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

# Looping seluruh model yang tersedia dan print nama beserta deskripsinya
for model in client.models.list():
    print(f"- **{model.name}**: {model.description}")
```

## Daftar Model Saat Ini (Per April 2026)

Berdasarkan *script* di atas, berikut adalah beberapa model utama dari ekosistem Google AI yang saat ini tersedia dan relevan untuk proyek ini:

- **models/gemini-3.1-pro-preview**: Gemini 3.1 Pro Preview (Disarankan untuk TWK yang butuh reasoning logis tinggi dari sebuah teks panjang).
- **models/gemini-3.1-flash-lite-preview**: Gemini 3.1 Flash Lite Preview (Disarankan untuk TIU jika ingin hemat *cost* dan sangat cepat).
- **models/gemini-3-flash-preview**: Gemini 3 Flash Preview (Ini yang **sedang Anda gunakan saat ini** di kode).
- **models/gemini-3-pro-preview**: Gemini 3 Pro Preview
- **models/gemini-2.5-pro**: Stable release (June 17th, 2025) of Gemini 2.5 Pro
- **models/gemini-2.5-flash-lite**: Stable version of Gemini 2.5 Flash-Lite, released in July of 2025
- **models/gemini-2.0-flash**: Gemini 2.0 Flash
- **models/deep-research-preview-04-2026**: Preview release (April 21th, 2026) of Deep Research
- **models/gemini-embedding-2**: Model untuk *vector representation* dari teks (Krusial jika nanti benar-benar ingin mengimplementasikan RAG sungguhan dengan *Vector Database*).
- Serta berbagai varian model open weights (seperti `gemma-4-31b-it`) dan *generative media* (Veo untuk video, Imagen untuk gambar).

## Penggunaan Model di Codebase Saat Ini

Di dalam proyek, penggunaan model terpusat pada file `backend/core/ai_service.py` di dalam class `AIService`.

**Implementasi Saat Ini:**
```python
# Di dalam backend/core/ai_service.py
self.model_name = 'gemini-3-flash-preview'
self.client = genai.Client(api_key=api_key)
```

**Analisis Status Kode:**
1. **Hardcoded Model**: Saat ini sistem secara eksklusif hanya memanggil satu model yaitu `gemini-3-flash-preview` untuk **semua kategori** (TWK, TIU, TKP).
2. **Belum Multi-Model**: Di dalam file `docs/Rangkuman Soal.md`, Anda merencanakan penggunaan arsitektur *multi-model* (Gemini 3.1 Pro untuk TWK, Flash-Lite untuk TIU, dan Claude Opus 4.6 untuk TKP). Di dalam kode, integrasi dengan Claude (`anthropic` library) dan *routing* model belum ada.
3. **Pemanfaatan Thinking Mode**: Meskipun modelnya di-*hardcode*, proyek ini sudah sangat baik karena telah mengaktifkan `thinking_level="high"`. Konfigurasi ini yang membuat kualitas soal TIU dan analisisnya tetap dalam batas logis.

## Rekomendasi Pembaruan Kode (Roadmap)

Jika Anda ingin mengubah skrip pembuatan soal ini menjadi skrip tingkat *enterprise* seperti visi Anda, Anda perlu menambahkan logika *Model Router* di `ai_service.py`:

```python
def __init__(self, api_key: str, sub_category: str):
    # Logika routing model berdasarkan beban kerja
    if sub_category == 'TWK':
        self.model_name = 'gemini-3.1-pro-preview' # Konteks lebih kuat
    elif sub_category == 'TIU':
        self.model_name = 'gemini-3.1-flash-lite-preview' # Lebih cepat dan fokus matematis
    else:
        # Untuk TKP, ini adalah fallback jika Claude belum diimplementasikan
        self.model_name = 'gemini-3-flash-preview' 
    
    self.client = genai.Client(api_key=api_key)
```
