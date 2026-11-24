#!/usr/bin/env python3
"""Upload staged Figural PNGs from /tmp/ to Supabase Storage bucket `exam-assets` using server operations.env."""

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

    files = sorted(glob.glob("/tmp/q6*_figural.png"))
    if not files:
        print("ERROR: No /tmp/q6*_figural.png files found.")
        return 1

    ok = 0
    for fpath in files:
        fname = os.path.basename(fpath)
        remote = f"figural/{pack_code}/{fname}"
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
        print(f"OK {fname}: upload={status} public={pstatus} ({plen} bytes)")
        ok += 1

    # Cleanup staged files in /tmp
    for fpath in files:
        os.remove(fpath)
    if os.path.exists("/tmp/upload_figural_from_ops_env.py"):
        os.remove("/tmp/upload_figural_from_ops_env.py")

    print(f"ALL {ok} UPLOADED & VERIFIED HTTP 200")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
