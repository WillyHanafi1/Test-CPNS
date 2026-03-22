"""
import_figural_batch.py
=======================
Script satu-kali-jalan untuk:
1. Parse input.md -> ambil data soal figural (No, Sub-Kategori, Jawaban, Pembahasan)
2. Upload gambar ke Supabase Storage (figural/latihan{x}/l{x}_q{y}_problem.png)
3. Patch baris figural di 4 CSV (Latihan 3, 4, 5, 6)

Distribusi gambar:
  Gambar 1-12  -> Latihan 3 (soal no. 54-65)
  Gambar 13-21 -> Latihan 4 (soal no. 57-65)
  Gambar 22-29 -> Latihan 5 (soal no. 58-65)
  Gambar 30-39 -> Latihan 6 (soal no. 56-65)
  Gambar 40-41 -> Cadangan (tidak digunakan)
"""

import os
import re
import csv
import sys
import httpx
from pathlib import Path
from dotenv import load_dotenv

# Force UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────
load_dotenv(dotenv_path="d:/ProjectAI/Test-CPNS/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
BUCKET       = "exam-assets"

BASE_DIR = Path("d:/ProjectAI/Test-CPNS")
IMG_DIR  = BASE_DIR / "data/figural/import_batch"
INPUT_MD = IMG_DIR / "input.md"
CSV_DIR  = BASE_DIR / "data/csv"

# Distribusi: (gambar_mulai, gambar_selesai, paket_name, soal_mulai, soal_selesai)
DISTRIBUTIONS = [
    (1,  12, "latihan3", 54, 65),
    (13, 21, "latihan4", 57, 65),
    (22, 29, "latihan5", 58, 65),
    (30, 39, "latihan6", 56, 65),
]

CSV_FILES = {
    "latihan3": CSV_DIR / "Latihan3 - 80.csv",
    "latihan4": CSV_DIR / "Latihan4 - 70.csv",
    "latihan5": CSV_DIR / "Latihan5 - 90.csv",
    "latihan6": CSV_DIR / "Latihan6 - 100.csv",
}

# Default content per sub-kategori
CONTENT_MAP = {
    "Analogi Gambar":       "**Analogi Gambar:** Perhatikan hubungan gambar pertama dan kedua. Pilihlah gambar yang tepat untuk melengkapi pasangan kedua berdasarkan pola yang ada :",
    "Ketidaksamaan Gambar": "**Ketidaksamaan Gambar:** Di antara lima gambar berikut, manakah gambar yang memiliki pola atau karakteristik logika yang PALING BERBEDA / tidak sejalan dengan yang lainnya",
    "Serial Gambar":        "**Serial Gambar:** Perhatikan urutan perubahan gambar. Tentukan gambar selanjutnya yang paling tepat untuk melengkapi deret tersebut :",
}

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: PARSE input.md
# ─────────────────────────────────────────────────────────────────────────────
def parse_input_md(filepath: Path) -> dict:
    """Return dict: {soal_section_no(int): {sub_category, jawaban, pembahasan}}"""
    text = filepath.read_text(encoding="utf-8")

    # Split by "## Soal N"
    blocks = re.split(r"##\s+Soal\s+(\d+)", text)

    result = {}
    i = 1
    while i < len(blocks) - 1:
        soal_num = int(blocks[i])
        content  = blocks[i + 1]

        sub_match = re.search(r"Sub-Kategori\s*:\s*(.+)", content)
        jaw_match = re.search(r"Jawaban\s*:\s*\(?([A-Ea-e])\)?", content)
        pem_match = re.search(r"Pembahasan\s*:([\s\S]+?)(?=##|$)", content)

        sub_cat    = sub_match.group(1).strip() if sub_match else "Analogi Gambar"
        jawaban    = jaw_match.group(1).upper() if jaw_match else "A"
        pembahasan = pem_match.group(1).strip() if pem_match else ""
        # CSV-safe: strip newlines and trim to 400 chars
        pembahasan = pembahasan.replace("\r\n", " ").replace("\n", " ").replace("\r", " ")
        pembahasan = re.sub(r" {2,}", " ", pembahasan).strip()
        if len(pembahasan) > 400:
            trunc = pembahasan[:400]
            last_dot = max(trunc.rfind(". "), trunc.rfind("! "), trunc.rfind("? "))
            pembahasan = (trunc[:last_dot + 1] if last_dot > 100 else trunc.rstrip(",;:- ") + ".").strip()

        result[soal_num] = {
            "sub_category": sub_cat,
            "jawaban":      jawaban,
            "pembahasan":   pembahasan,
        }
        i += 2

    return result


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: UPLOAD TO SUPABASE
# ─────────────────────────────────────────────────────────────────────────────
def upload_image(local_path: Path, remote_path: str):
    """Upload image, return public URL or None on failure."""
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{remote_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type":  "image/png",
        "x-upsert":      "true",
    }
    with open(local_path, "rb") as f:
        data = f.read()

    resp = httpx.post(url, headers=headers, content=data, timeout=60)

    if resp.status_code in (200, 201):
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{remote_path}"
        print(f"  [OK] Uploaded: {remote_path}")
        return public_url
    else:
        print(f"  [ERR] Failed {remote_path}: {resp.status_code} - {resp.text[:120]}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: BUILD SCORE COLUMNS
# ─────────────────────────────────────────────────────────────────────────────
def build_scores(jawaban: str) -> dict:
    scores = {"score_a": 0, "score_b": 0, "score_c": 0, "score_d": 0, "score_e": 0}
    key = f"score_{jawaban.lower()}"
    if key in scores:
        scores[key] = 5
    return scores


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: PATCH CSV
# ─────────────────────────────────────────────────────────────────────────────
def patch_csv(csv_path: Path, new_rows: dict):
    """
    new_rows: {soal_number(int): {all CSV columns}}
    Read the entire CSV, replace matching rows, write back.
    """
    rows = []
    header = None
    with open(csv_path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        header = reader.fieldnames
        for row in reader:
            soal_no = int(row["number"])
            if soal_no in new_rows:
                rows.append(new_rows[soal_no])
            else:
                rows.append(row)

    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=header)
        writer.writeheader()
        writer.writerows(rows)

    print(f"  [CSV] Patched {len(new_rows)} rows in {csv_path.name}")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[ERR] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env")
        return

    # STEP 1: Parse input.md
    print("\n[1] Parsing input.md...")
    soal_data = parse_input_md(INPUT_MD)
    print(f"    Found {len(soal_data)} soal entries")

    # CSV patches per paket
    csv_patches = {k: {} for k in CSV_FILES}

    # STEP 2 & 3: Upload + build rows
    for (img_start, img_end, paket, soal_start, soal_end) in DISTRIBUTIONS:
        print(f"\n[2] Processing {paket.upper()} (gambar {img_start}-{img_end}, soal {soal_start}-{soal_end})")

        img_index = img_start
        soal_num  = soal_start

        while img_index <= img_end and soal_num <= soal_end:
            img_file    = IMG_DIR / f"{img_index}.png"
            remote_name = f"l{paket[-1]}_q{soal_num}_problem.png"
            remote_path = f"figural/{paket}/{remote_name}"

            if not img_file.exists():
                print(f"  [WARN] Image not found: {img_file}")
                img_index += 1
                soal_num  += 1
                continue

            # Upload
            public_url = upload_image(img_file, remote_path)

            if public_url is None:
                print(f"  [SKIP] Skipping soal {soal_num} due to upload failure")
                img_index += 1
                soal_num  += 1
                continue

            # Get metadata from input.md
            meta    = soal_data.get(img_index, {})
            sub_cat = meta.get("sub_category", "Analogi Gambar")
            jawaban = meta.get("jawaban", "A")
            pem     = meta.get("pembahasan", "")
            content = CONTENT_MAP.get(sub_cat, CONTENT_MAP["Analogi Gambar"])
            scores  = build_scores(jawaban)

            new_row = {
                "number":         soal_num,
                "segment":        "TIU",
                "sub_category":   sub_cat,
                "content":        content,
                "image_url":      public_url,
                "option_a":       "Opsi A",
                "option_b":       "Opsi B",
                "option_c":       "Opsi C",
                "option_d":       "Opsi D",
                "option_e":       "Opsi E",
                "score_a":        scores["score_a"],
                "score_b":        scores["score_b"],
                "score_c":        scores["score_c"],
                "score_d":        scores["score_d"],
                "score_e":        scores["score_e"],
                "discussion":     pem,
                "option_image_a": "",
                "option_image_b": "",
                "option_image_c": "",
                "option_image_d": "",
                "option_image_e": "",
            }

            csv_patches[paket][soal_num] = new_row
            img_index += 1
            soal_num  += 1

    # STEP 4: Patch all CSVs
    print("\n[3] Patching CSV files...")
    for paket, patches in csv_patches.items():
        if not patches:
            print(f"  [WARN] No patches for {paket}, skipping.")
            continue
        csv_path = CSV_FILES[paket]
        if not csv_path.exists():
            print(f"  [ERR] CSV not found: {csv_path}")
            continue
        patch_csv(csv_path, patches)

    print("\n[DONE] Summary:")
    for paket, patches in csv_patches.items():
        print(f"  {paket}: {len(patches)} rows replaced")


if __name__ == "__main__":
    main()
