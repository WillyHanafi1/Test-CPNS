"""Prepare only backup-related paths for the numeric user configured by Compose."""
import base64
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
REQUIRED = ('.production.env', '.server-notes/images.env', '.secrets/application.env',
            '.secrets/operations.env', '.secrets/backup.key')
OPTIONAL = ('.server-notes/images.previous.env', '.secrets/cloudflare-token')


def prepare(root, uid, gid):
    root = root.resolve()
    directories = [root / name for name in ('.secrets', '.server-notes', '.server-notes/backups')]
    for directory in directories:
        if directory.is_symlink():
            raise ValueError('Backup configuration directories must not be symlinks')
    files = [root / name for name in REQUIRED]
    for path in files:
        if path.is_symlink() or not path.is_file():
            raise ValueError('Missing regular private configuration file: ' + str(path.relative_to(root)))
    if len(base64.urlsafe_b64decode((root / '.secrets/backup.key').read_bytes().strip())) != 32:
        raise ValueError('Backup encryption key must contain 32 bytes encoded with base64url')
    for name in OPTIONAL:
        path = root / name
        if path.is_symlink():
            raise ValueError('Backup configuration files must not be symlinks')
        if path.is_file():
            files.append(path)
    backup_root = directories[-1]
    backup_root.mkdir(exist_ok=True, mode=0o700)
    for path in backup_root.iterdir():
        if re.fullmatch(r'(latest-(database|configuration)\.json|(database|configuration)-\d{8}T\d{6}Z-[a-f0-9]{8}\.(enc|partial))', path.name):
            if path.is_symlink():
                raise ValueError('Generated backup files must not be symlinks')
            if path.is_file():
                files.append(path)
    for path in directories + files:
        info = path.stat()
        if (info.st_uid, info.st_gid) != (uid, gid):
            os.chown(path, uid, gid)
        path.chmod(0o700 if path in directories else 0o600)
    # Exercise the container's identity, including status files created by earlier root runs.
    probe = """import sys,tempfile
from pathlib import Path
root=Path(sys.argv[1])
for name in sys.argv[2:]:
 with (root/name).open('rb') as f: f.read(1)
for name in ('latest-database.json','latest-configuration.json'):
 p=root/'.server-notes/backups'/name
 if p.exists():
  with p.open('ab'): pass
with tempfile.TemporaryFile(dir=root/'.server-notes/backups') as f: f.write(b'access check')
"""
    identity = {'user': uid, 'group': gid, 'extra_groups': []} if os.geteuid() == 0 else {}
    subprocess.run([sys.executable, '-c', probe, str(root),
                    *(str(path.relative_to(root)) for path in files if path.parent != backup_root)],
                   check=True, capture_output=True, **identity)


def main():
    if os.name != 'posix':
        raise RuntimeError('Run backup preparation on the Linux Docker host')
    result = subprocess.run(['bash', 'scripts/ops/compose.sh', '--profile', 'operations', 'config', '--format', 'json'],
                            cwd=ROOT, capture_output=True, text=True, check=False)
    if result.returncode:
        raise RuntimeError('Compose backup configuration is incomplete; check private files and image pins')
    user = json.loads(result.stdout)['services']['backup-store']['user']
    if not re.fullmatch(r'\d+:\d+', user):
        raise ValueError('Configure numeric RUN_UID and RUN_GID for backup containers')
    uid, gid = map(int, user.split(':'))
    prepare(ROOT, uid, gid)
    print(f'Backup permissions and access verified for UID:GID {uid}:{gid}.')


if __name__ == '__main__':
    try:
        main()
    except (PermissionError, subprocess.CalledProcessError):
        raise SystemExit('Backup user cannot access private files or backup storage. Run this operation with sudo.')
