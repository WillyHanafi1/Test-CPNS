import pandas as pd
import os

# Paths
INPUT_CSV = r"d:\ProjectAI\Test-CPNS\data\figural\import_batch2\input.csv"
OUTPUT_CSV = r"d:\ProjectAI\Test-CPNS\data\figural\import_batch2\input_fixed.csv"
SUPABASE_URL = "https://vyulvaxhpgvthfzyzhay.supabase.co" # Found in existing scripts or usual env
BUCKET_NAME = "exam-assets"
STORAGE_PREFIX = "figural/import_batch2"

def construct_url(filename):
    if not filename:
        return ""
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{STORAGE_PREFIX}/{filename}"

def main():
    if not os.path.exists(INPUT_CSV):
        print(f"Error: {INPUT_CSV} not found.")
        return

    df = pd.read_csv(INPUT_CSV)
    
    # Mapping logic:
    # 55 -> 1.png, 56 -> 2.png, ..., 67 -> 12.png
    # 68 -> None
    # 69 -> 13.png, ..., 74 -> 18.png
    
    def get_image_file(q_num):
        q_num = int(q_num)
        if q_num < 68:
            # Questions 55-67 (indices 0-11 in image list if sequential)
            # Actually, let's map by order of questions in CSV (excluding 68)
            return None # Placeholder
        return None

    # Let's do it by row matching since we know the exact mapping
    mapping = {
        55: "1.png", 56: "2.png", 57: "3.png", 58: "4.png", 59: "5.png",
        61: "6.png", 62: "7.png", 63: "8.png", 64: "9.png", 65: "10.png",
        66: "11.png", 67: "12.png",
        68: None,
        69: "13.png", 70: "14.png", 71: "15.png", 72: "16.png", 73: "17.png", 74: "18.png"
    }
    
    # Update image_url column
    df['image_url'] = df['number'].map(lambda x: construct_url(mapping.get(x)))
    
    # Optional: Fill empty option labels if needed, but CSV already has placeholders like "Opsi A"
    
    # Save fixed CSV
    df.to_csv(OUTPUT_CSV, index=False)
    print(f"Successfully created fixed CSV at: {OUTPUT_CSV}")
    
    # Display summary for user
    print("\nMapping Summary:")
    print(df[['number', 'image_url']].to_string(index=False))

if __name__ == "__main__":
    main()
