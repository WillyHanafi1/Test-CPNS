import os
import numpy as np
import xml.etree.ElementTree as ET
from PIL import Image
import matplotlib.pyplot as plt
import httpx
import json
import asyncio
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# --- CONFIG ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET = "exam-assets"

RAVEN_BASE = Path("d:/ProjectAI/Test-CPNS/RAVEN-10000")
OUTPUT_CSV = Path("d:/ProjectAI/Test-CPNS/data/csv/figural_10_output.csv")
TEMP_IMAGE_DIR = Path("d:/ProjectAI/Test-CPNS/tmp/figural_10")
TEMP_IMAGE_DIR.mkdir(parents=True, exist_ok=True)

# Mapping Rule XML to BKN Discussion Style
RULE_MAP = {
    "Constant": "Statis/Tetap",
    "Progression": "Perubahan Bertahap (Sekuensial)",
    "Arithmetic": "Operasi Logika (Aritmatika)",
    "Distribute_Three": "Distribusi Tiga Unsur (Siklus Berulang)",
    "Position": "Posisi",
    "Type": "Bentuk (Shape)",
    "Size": "Ukuran",
    "Color": "Warna/Intensitas/Arsir"
}

def clean_url(url):
    return url.rstrip("/")

async def upload_to_supabase(local_path, remote_path):
    url = f"{clean_url(SUPABASE_URL)}/storage/v1/object/{BUCKET}/{remote_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "image/png"
    }
    with open(local_path, "rb") as f:
        file_data = f.read()
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, content=file_data)
        if response.status_code in [200, 201]:
            # Construct public URL
            return f"{clean_url(SUPABASE_URL)}/storage/v1/object/public/{BUCKET}/{remote_path}"
        elif response.status_code == 400 and "already exists" in response.text:
            return f"{clean_url(SUPABASE_URL)}/storage/v1/object/public/{BUCKET}/{remote_path}"
        else:
            print(f"Upload failed for {remote_path}: {response.text}")
            return None

def extract_rules(xml_path):
    tree = ET.parse(xml_path)
    rules = []
    for r in tree.findall(".//Rule"):
        attr = r.get("attr")
        name = r.get("name")
        rules.append(f"{RULE_MAP.get(attr, attr)}: {RULE_MAP.get(name, name)}")
    return " & ".join(rules)

def render_serial(images, output_path):
    # Render 0, 1, 2, 3 as 1 -> 2 -> 3 -> 4 -> ?
    fig, axes = plt.subplots(1, 4, figsize=(16, 4))
    for i in range(4):
        axes[i].imshow(images[i], cmap='gray')
        axes[i].axis('off')
        if i < 3:
            axes[i].annotate('', xy=(1.1, 0.5), xycoords='axes fraction', xytext=(1.0, 0.5),
                             arrowprops=dict(arrowstyle="->", color='black', lw=2))
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0.1)
    plt.close()

def render_analogi(images, output_path):
    # images are 2x2. Render as A:B = C:?
    fig, axes = plt.subplots(2, 2, figsize=(8, 8))
    for i in range(2):
        for j in range(2):
            idx = i * 2 + j
            if idx < 3:
                axes[i, j].imshow(images[idx], cmap='gray')
            else:
                axes[i, j].text(0.5, 0.5, '?', fontsize=60, ha='center', va='center')
            axes[i, j].axis('off')
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0.1)
    plt.close()

async def generate_discussion(rule, letter):
    if not GOOGLE_API_KEY:
        return f"Jawaban benar adalah {letter}. Pola didasarkan pada aturan {rule}."
    
    prompt = f"""
    Anda adalah Mentor CPNS Profesional. Buat pembahasan soal figural TIU.
    Data:
    - Aturan Logika: {rule}
    - Kunci Jawaban Benar: Opsi {letter}
    
    Instruksi:
    - Tulis pembahasan yang membenarkan mengapa opsi {letter} adalah jawaban yang paling tepat.
    - Jelaskan transisi pola gambar secara bertahap.
    - Gunakan gaya bahasa edukatif.
    - Jangan sebutkan 'RAVEN' atau dataset.
    - Format teks biasa (bisa pakai Markdown).
    """
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GOOGLE_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, timeout=30.0)
        if response.status_code == 200:
            result = response.json()
            return result['candidates'][0]['content']['parts'][0]['text'].strip()
        else:
            return f"Analisis pola menunjukkan bahwa Opsi {letter} memenuhi aturan {rule}."

async def process_one(num, category_name, sub_category, base_folder, file_stem):
    npz_path = RAVEN_BASE / base_folder / f"{file_stem}.npz"
    xml_path = RAVEN_BASE / base_folder / f"{file_stem}.xml"
    
    data = np.load(npz_path)
    images = data['image']
    target_idx = int(data['target'])
    rules_text = extract_rules(xml_path)
    
    # Generate 5 options
    # Correct is always first in our logic, then we shuffle.
    all_indices = [target_idx] + [i for i in range(8) if i != target_idx][:4]
    shuffled_indices = list(all_indices)
    import random
    random.seed(num) # Deterministic shuffle for this test
    random.shuffle(shuffled_indices)
    
    correct_letter = "ABCDE"[shuffled_indices.index(target_idx)]
    
    # Render Main Image
    main_img_name = f"q{num}_prob.png"
    main_img_path = TEMP_IMAGE_DIR / main_img_name
    if sub_category == "Serial Gambar":
        render_serial(images, main_img_path)
    else:
        render_analogi(images, main_img_path)
        
    main_url = await upload_to_supabase(main_img_path, f"figural_10/Q{num}/{main_img_name}")
    
    # Render Options
    opt_urls = []
    for i, idx in enumerate(shuffled_indices):
        opt_name = f"q{num}_opt_{'abcde'[i]}.png"
        opt_path = TEMP_IMAGE_DIR / opt_name
        # Raw image from RAVEN candidates (8-15 indices in 'image' array usually)
        # RAVEN dataset: 0-7 problem, 8-15 candidates.
        # But wait, npz 'image' shape is (16, 160, 160).
        # We need to render the candidate image (8 + index)
        plt.imsave(opt_path, images[8 + idx], cmap='gray')
        url = await upload_to_supabase(opt_path, f"figural_10/Q{num}/{opt_name}")
        opt_urls.append(url)

    discussion = await generate_discussion(rules_text, correct_letter)
    
    scores = ["5" if i == shuffled_indices.index(target_idx) else "0" for i in range(5)]
    
    # CSV Line: number,segment,sub_category,content,image_url,option_a...option_e,score_a...score_e,discussion,option_image_a...option_image_e
    line = [
        str(num), "TIU", sub_category, 
        f"**{sub_category}:** Perhatikan pola gambar berikut rtentukan jawaban yang tepat:",
        main_url, "Opsi A", "Opsi B", "Opsi C", "Opsi D", "Opsi E"
    ] + scores + [discussion] + opt_urls
    
    return ",".join(['"' + x.replace('"', '""') + '"' for x in line])

async def main():
    tasks = [
        # Serial
        process_one(1, "serial", "Serial Gambar", "distribute_nine", "RAVEN_0_train"),
        process_one(2, "serial", "Serial Gambar", "distribute_nine", "RAVEN_100_train"),
        process_one(3, "serial", "Serial Gambar", "distribute_nine", "RAVEN_1000_train"),
        process_one(4, "serial", "Serial Gambar", "distribute_nine", "RAVEN_1010_train"),
        # Analogi
        process_one(5, "analogi", "Analogi Gambar", "in_distribute_four_out_center_single", "RAVEN_100_train"),
        process_one(6, "analogi", "Analogi Gambar", "in_distribute_four_out_center_single", "RAVEN_1010_train"),
        process_one(7, "analogi", "Analogi Gambar", "in_distribute_four_out_center_single", "RAVEN_1011_train"),
        # Ketidaksamaan (Adapted as individual images)
        process_one(8, "ketidaksamaan", "Ketidaksamaan Gambar", "up_center_single_down_center_single", "RAVEN_1012_train"),
        process_one(9, "ketidaksamaan", "Ketidaksamaan Gambar", "up_center_single_down_center_single", "RAVEN_1013_train"),
        process_one(10, "ketidaksamaan", "Ketidaksamaan Gambar", "up_center_single_down_center_single", "RAVEN_1014_train"),
    ]
    
    results = await asyncio.gather(*tasks)
    
    with open(OUTPUT_CSV, "w", encoding="utf-8") as f:
        f.write("number,segment,sub_category,content,image_url,option_a,option_b,option_c,option_d,option_e,score_a,score_b,score_c,score_d,score_e,discussion,option_image_a,option_image_b,option_image_c,option_image_d,option_image_e\n")
        f.write("\n".join(results))
    
    print(f"🎉 Successfully generated 10 questions to {OUTPUT_CSV}")

if __name__ == "__main__":
    asyncio.run(main())
