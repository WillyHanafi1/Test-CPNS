import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

bucket_name = "exam-assets"

for i in range(3, 7):
    folder = f"figural/latihan{i}"
    try:
        res = supabase.storage.from_(bucket_name).list(folder)
        print(f"Files in {folder}: {len(res)} files found.")
    except Exception as e:
        print(f"Error listing {folder}: {e}")
