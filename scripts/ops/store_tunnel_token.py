"""Extract a Cloudflare token from private stdin; never execute pasted commands."""
import os
from pathlib import Path
import re
import shlex
import sys
import tempfile


def extract_token(value):
    try:
        parts = shlex.split(value.strip())
    except ValueError:
        raise ValueError('Input format rejected; copy the Docker command or token again.') from None
    candidates = []
    if len(parts) == 1:
        candidates = parts
    else:
        for index, part in enumerate(parts):
            if part == '--token' and index + 1 < len(parts):
                candidates.append(parts[index + 1])
            elif part.startswith('--token='):
                candidates.append(part.split('=', 1)[1])
        if not candidates and len(parts) >= 4 and parts[1:3] == ['service', 'install']:
            candidates = [parts[3]]
    if len(candidates) != 1 or not re.fullmatch(r'[A-Za-z0-9_+/=-]{50,8192}', candidates[0]):
        raise ValueError('Token missing, masked, or malformed. Paste the copied value, not a screenshot.')
    return candidates[0]


def main():
    try:
        token = extract_token(sys.stdin.read(16385))
    except ValueError as error:
        raise SystemExit(str(error)) from None
    directory = Path(__file__).resolve().parents[2] / '.secrets'
    if not directory.is_dir() or directory.is_symlink():
        raise SystemExit('Private directory is missing or unsafe; run prepare-secrets.sh first.')
    target = directory / 'cloudflare-token'
    if target.is_symlink():
        raise SystemExit('Token destination must not be a symbolic link.')
    descriptor, name = tempfile.mkstemp(prefix='.cloudflare-token-', dir=directory)
    temporary = Path(name)
    try:
        with os.fdopen(descriptor, 'w') as handle:
            handle.write(token)
        temporary.chmod(0o600)
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)
    print('Token saved privately; no container was started.')


if __name__ == '__main__':
    main()
