import numpy as np
import sys

def inspect_npz(file_path):
    try:
        data = np.load(file_path, allow_pickle=True)
        print(f"Keys in {file_path}: {list(data.keys())}")
        for key in data.keys():
            val = data[key]
            if isinstance(val, np.ndarray):
                print(f"  {key}: shape={val.shape}, dtype={val.dtype}")
            else:
                print(f"  {key}: {val}")
                
        # If it's a standard RAVEN file, it might have 'image', 'meta_matrix', 'target', 'predict'
        if 'image' in data:
            print(f"Image sample (first row): {data['image'][0][:10]}")
        if 'meta_matrix' in data:
            print(f"Meta Matrix: {data['meta_matrix']}")

    except Exception as e:
        print(f"Error reading {file_path}: {e}")

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "RAVEN-10000/distribute_nine/RAVEN_0_train.npz"
    inspect_npz(path)
