import os
import httpx
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET_NAME = "exam-assets"

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env")
    exit(1)

# Clean URL
if SUPABASE_URL.endswith("/"):
    SUPABASE_URL = SUPABASE_URL[:-1]

BASE_DIR = Path("d:/ProjectAI/Test-CPNS/frontend/public/images/figural")

def upload_file(local_path: Path, remote_path: str):
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{remote_path}"
    
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "image/png"
    }
    
    with open(local_path, "rb") as f:
        file_data = f.read()
    
    # Use put if you want to overwrite, or post if you want to create new
    # Supabase uses POST to create. If it exists, it might return 400.
    # To overwrite, Supabase uses a different header or different endpoint.
    # Actually, POST /object/{{path}} is for creation.
    # Let's use POST and ignore if it already exists (400 Conflict).
    
    response = httpx.post(url, headers=headers, content=file_data)
    
    if response.status_code == 200:
        print(f"Uploaded: {remote_path}")
    elif response.status_code == 400 and "already exists" in response.text:
        print(f"Already exists: {remote_path}")
    else:
        print(f"Failed to upload {remote_path}: {response.status_code} - {response.text}")

def main():
    if not BASE_DIR.exists():
        print(f"Error: Base directory {BASE_DIR} not found.")
        return

    # Categories to upload
    categories = ["latihan4", "latihan5", "latihan6"]
    
    for cat in categories:
        cat_dir = BASE_DIR / cat
        if not cat_dir.exists():
            print(f"Skipping {cat}, directory not found.")
            continue
            
        print(f"Processing category: {cat}")
        for img_path in cat_dir.glob("*.png"):
            # Remote path structure: figural/latihan4/filename.png
            remote_path = f"figural/{cat}/{img_path.name}"
            upload_file(img_path, remote_path)

if __name__ == "__main__":
    main()
