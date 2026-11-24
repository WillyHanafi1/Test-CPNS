#!/usr/bin/env python3
"""Upload staged Figural (`q*_figural.png`) & Discussion diagram (`q*_pembahasan*.png`) PNGs
from /tmp/ (or a custom local folder) to Supabase Storage bucket `exam-assets` using server operations.env.
"""

import glob
import os
import sys
import urllib.error
import urllib.request

OPS_ENV = "/home/rusunawa/@docker/Ujian/.secrets/operations.env"
BUCKET = "exam-assets"


def load_env(path: str) -> dict[str, str]:
    env: dict[str, str] = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            s = line.strip()
            if not s or s.startswith("#") or "=" not in s:
                continue
            k, v = s.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def main() -> int:
    pack_code = sys.argv[1] if len(sys.argv) > 1 else "gen01"
    src_dir = sys.argv[2] if len(sys.argv) > 2 else "/tmp"
    env = load_env(OPS_ENV)
    base = env["BACKUP_SUPABASE_URL"].rstrip("/")
    key = env["BACKUP_SUPABASE_KEY"]

    headers = {
        "apikey": key,
        "Content-Type": "image/png",
        "x-upsert": "true",
    }
    if not key.startswith("sb_secret_"):
        headers["Authorization"] = f"Bearer {key}"

    figural_files = sorted(glob.glob(os.path.join(src_dir, "q*_figural.png")))
    discussion_files = sorted(glob.glob(os.path.join(src_dir, "q*_pembahasan*.png")))
    targets = [(p, f"figural/{pack_code}/{os.path.basename(p)}") for p in figural_files] + [
        (p, f"pembahasan/{pack_code}/{os.path.basename(p)}") for p in discussion_files
    ]
    if not targets:
        print(f"ERROR: No q*_figural.png or q*_pembahasan*.png files found in {src_dir}.")
        return 1

    ok = 0
    for fpath, remote in targets:
        fname = os.path.basename(fpath)
        url = f"{base}/storage/v1/object/{BUCKET}/{remote}"
        data = open(fpath, "rb").read()
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                status = resp.status
        except urllib.error.HTTPError as e:
            print(f"FAIL {fname}: HTTP {e.code} - {e.read().decode('utf-8', 'ignore')[:200]}")
            return 1

        pub_url = f"{base}/storage/v1/object/public/{BUCKET}/{remote}"
        with urllib.request.urlopen(pub_url, timeout=15) as presp:
            pstatus = presp.status
            plen = len(presp.read())
        print(f"OK {fname}: upload={status} public={pstatus} ({plen} bytes) -> {pub_url}")
        ok += 1

    # Cleanup staged files only when using default /tmp staging directory
    if os.path.abspath(src_dir) == "/tmp":
        for fpath, _ in targets:
            os.remove(fpath)
        if os.path.exists("/tmp/upload_figural_from_ops_env.py"):
            os.remove("/tmp/upload_figural_from_ops_env.py")

    print(f"ALL {ok} UPLOADED & VERIFIED HTTP 200")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
