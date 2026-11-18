"""Prepare only backup-related paths for the numeric user configured by Compose."""
import argparse
import base64
import json
import os
from pathlib import Path
import re
import ssl
import subprocess
import sys
import tempfile
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
REQUIRED = ('.production.env', '.server-notes/images.env', '.secrets/application.env',
            '.secrets/operations.env', '.secrets/backup.key')
OPTIONAL = ('.server-notes/images.previous.env', '.secrets/cloudflare-token',
            '.secrets/backup-database.env', '.secrets/postgres-root-ca.crt')


def database_environment(url):
    """libpq does not expand a connection URI supplied through the PGDATABASE environment."""
    target = urlsplit(url)
    if (target.scheme not in ('postgresql+asyncpg', 'postgresql', 'postgres')
            or not target.hostname or not target.username or target.password is None or not target.path.lstrip('/')):
        raise ValueError('A complete PostgreSQL connection URL is required for backups')
    # A database dump needs a session connection, rather than Supavisor transaction mode.
    port = 5432 if target.hostname.endswith('.pooler.supabase.com') else (target.port or 5432)
    values = {'DATABASE_URL': unquote(target.path.lstrip('/')), 'PGHOST': target.hostname,
              'PGPORT': str(port), 'PGUSER': unquote(target.username),
              'PGPASSWORD': unquote(target.password)}
    if any(character in value for value in values.values() for character in '\r\n\0'):
        raise ValueError('Database backup environment cannot contain multiline values')
    return ''.join(f'{name}={value}\n' for name, value in values.items())


def write_database_environment(root):
    source = root / '.secrets/application.env'
    target = root / '.secrets/backup-database.env'
    if (root / '.secrets').is_symlink() or source.is_symlink() or target.is_symlink():
        raise ValueError('Private database configuration must not use symlinks')
    values = dict(line.split('=', 1) for line in source.read_text().splitlines()
                  if '=' in line and not line.lstrip().startswith('#'))
    content = database_environment(values.get('DATABASE_URL', ''))
    certificate = root / '.secrets/postgres-root-ca.crt'
    if certificate.is_symlink():
        raise ValueError('PostgreSQL root certificate must not be a symlink')
    if not certificate.exists():
        if urlsplit(values['DATABASE_URL']).hostname.endswith(('.supabase.com', '.supabase.co')):
            candidates = sorted((root / '.server-notes/backups').glob('*/supabase-root-ca.crt'),
                                key=lambda path: path.stat().st_mtime, reverse=True)
            candidates = [path for path in candidates if path.is_file() and not path.is_symlink()]
            if not candidates:
                raise ValueError('Save the database CA from Supabase Database Settings to .secrets/postgres-root-ca.crt')
            content_ca = candidates[0].read_bytes()
        else:
            content_ca = Path('/etc/ssl/certs/ca-certificates.crt').read_bytes()
        descriptor_ca = os.open(certificate, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor_ca, 'wb') as handle:
            handle.write(content_ca)
    ssl.create_default_context(cafile=str(certificate))
    descriptor, name = tempfile.mkstemp(dir=target.parent, prefix='backup-database.')
    temporary = Path(name)
    try:
        with os.fdopen(descriptor, 'w', encoding='utf-8', newline='\n') as handle:
            handle.write(content)
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)


def prepare(root, uid, gid, *, database_only=False):
    root = root.resolve()
    directories = [root / name for name in ('.secrets', '.server-notes', '.server-notes/backups')]
    for directory in directories:
        if directory.is_symlink():
            raise ValueError('Backup configuration directories must not be symlinks')
    required = ('.production.env', '.server-notes/images.env', '.secrets/application.env',
                '.secrets/backup-database.env') if database_only else REQUIRED
    files = [root / name for name in required]
    for path in files:
        if path.is_symlink() or not path.is_file():
            raise ValueError('Missing regular private configuration file: ' + str(path.relative_to(root)))
    if not database_only and len(base64.urlsafe_b64decode((root / '.secrets/backup.key').read_bytes().strip())) != 32:
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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database-only', action='store_true', help='Prepare a manual dump without requiring storage credentials')
    args = parser.parse_args()
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
    write_database_environment(ROOT)
    prepare(ROOT, uid, gid, database_only=args.database_only)
    print(f'Backup permissions and access verified for UID:GID {uid}:{gid}.')


if __name__ == '__main__':
    try:
        main()
    except (PermissionError, subprocess.CalledProcessError):
        raise SystemExit('Backup user cannot access private files or backup storage. Run this operation with sudo.')
