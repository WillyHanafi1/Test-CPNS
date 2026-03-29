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

BASE_DIR = Path("d:/ProjectAI/Test-CPNS/data/figural/import_batch2")

def upload_file(local_path: Path, remote_path: str):
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{remote_path}"
    
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "image/png"
    }
    
    with open(local_path, "rb") as f:
        file_data = f.read()
    
    # Use POST to create. 
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
            
    print(f"Processing batch: import_batch2")
    for i in range(1, 19):
        img_name = f"{i}.png"
        img_path = BASE_DIR / img_name
        if not img_path.exists():
            print(f"Skipping {img_name}, file not found.")
            continue
            
        # Remote path structure: figural/import_batch2/1.png
        remote_path = f"figural/import_batch2/{img_name}"
        upload_file(img_path, remote_path)

if __name__ == "__main__":
    main()
