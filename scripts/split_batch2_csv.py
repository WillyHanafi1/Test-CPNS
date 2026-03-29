import pandas as pd
import os

# Define the input and output paths
INPUT_CSV = r'd:\ProjectAI\Test-CPNS\data\figural\import_batch2\input_fixed.csv'
OUTPUT_DIR = r'd:\ProjectAI\Test-CPNS\data\figural\import_batch2'

# Load the CSV
df = pd.read_csv(INPUT_CSV)

# Group the questions by sub_category
analogi = df[df['sub_category'] == 'Analogi Gambar'].copy()
serial = df[df['sub_category'] == 'Serial Gambar'].copy()
ketidaksamaan = df[df['sub_category'] == 'Ketidaksamaan Gambar'].copy()

# Ensure we have exactly 6 of each
assert len(analogi) == 6
assert len(serial) == 6
assert len(ketidaksamaan) == 6

# Split into 3 batches of 2 each
batches = []
for i in range(3):
    batch = pd.concat([
        analogi.iloc[i*2:(i+1)*2],
        serial.iloc[i*2:(i+1)*2],
        ketidaksamaan.iloc[i*2:(i+1)*2]
    ])
    # Reset question numbers for the package to start from 60
    batch['number'] = range(60, 66)
    batches.append(batch)

# Save the files
file_names = ['Latihan7.csv', 'Latihan8.csv', 'Latihan9.csv']
for i, name in enumerate(file_names):
    file_path = os.path.join(OUTPUT_DIR, name)
    batches[i].to_csv(file_path, index=False)
    print(f'Generated: {name} (6 questions: 2 Analogi, 2 Serial, 2 Ketidaksamaan)')
