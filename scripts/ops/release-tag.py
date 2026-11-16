"""Record a content-derived release tag without reading any private configuration."""
import hashlib
from pathlib import Path
import subprocess
from datetime import datetime, timezone

root = Path(__file__).resolve().parents[2]
paths = subprocess.check_output(
    ['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z',
     'backend', 'frontend', 'infra', 'scripts/ops', 'compose.production.yml'], cwd=root
).decode().split('\0')
digest = hashlib.sha256()
for name in sorted(set(paths) - {''}):
    path = root / name
    if path.is_file():
        digest.update(name.encode() + b'\0' + path.read_bytes().replace(b'\r\n', b'\n'))
digest.update((root / '.production.env').read_bytes())
revision = subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD'], cwd=root).decode().strip()
tag = revision + '-' + digest.hexdigest()[:12] + '-' + datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
path = root / '.server-notes/images.env'
lines = [line for line in path.read_text().splitlines() if not line.startswith('RELEASE_TAG=')]
path.write_text('\n'.join(lines + ['RELEASE_TAG=' + tag]) + '\n')
path.chmod(0o600)
print('Release tag:', tag)
