"""Initialize backup secrets; optionally configure private Supabase storage interactively."""
import argparse
import base64
import getpass
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.error import HTTPError
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]


def read_env(path):
    return dict(line.split('=', 1) for line in path.read_text().splitlines()
                if '=' in line and not line.lstrip().startswith('#'))


def write_private(path, content):
    if path.is_symlink():
        raise ValueError('Private configuration must not be a symlink')
    descriptor, name = tempfile.mkstemp(dir=path.parent, prefix=path.name + '.')
    temporary = Path(name)
    try:
        with os.fdopen(descriptor, 'w', encoding='utf-8', newline='\n') as handle:
            handle.write(content)
        if path.exists() and os.name == 'posix':
            info = path.stat()
            os.chown(temporary, info.st_uid, info.st_gid)
        temporary.chmod(0o600)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def configure_bucket(url, key, bucket):
    target = urlsplit(url)
    if (target.scheme != 'https' or not target.hostname or target.username or target.password
            or target.path not in ('', '/') or target.query or target.fragment):
        raise ValueError('Use the HTTPS project URL without a path or credentials')
    if not re.fullmatch(r'[a-zA-Z0-9_-]+', bucket):
        raise ValueError('Bucket name must use letters, numbers, underscores or hyphens')
    headers = {'apikey': key, 'Content-Type': 'application/json'}
    if not key.startswith('sb_secret_'):
        try:
            payload = key.split('.')[1]
            claims = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
        except (IndexError, ValueError):
            raise ValueError('Use a Supabase secret key or legacy service_role key') from None
        if claims.get('role') != 'service_role':
            raise ValueError('An anon/publishable key cannot manage private backups')
        headers['Authorization'] = 'Bearer ' + key
    base = url.rstrip('/') + '/storage/v1'
    request = Request(base + '/bucket/' + quote(bucket, safe=''), headers=headers)
    try:
        with urlopen(request, timeout=20) as response:
            data = json.load(response)
    except HTTPError as exc:
        # Storage versions may report a missing bucket as either HTTP 400 or 404.
        try:
            error = json.load(exc)
        except ValueError:
            error = {}
        if exc.code not in (400, 404) or str(error.get('statusCode', exc.code)) != '404':
            raise RuntimeError(f'Supabase bucket check failed (HTTP {exc.code})') from None
        body = json.dumps({'id': bucket, 'name': bucket, 'public': False,
                           'file_size_limit': 48 * 1048576}).encode()
        with urlopen(Request(base + '/bucket', data=body, headers=headers, method='POST'), timeout=20):
            pass
        with urlopen(request, timeout=20) as response:
            data = json.load(response)
    if data.get('public') is not False:
        raise ValueError('Backup bucket must be private; existing public buckets are not changed')


def initialize(root):
    for name in ('.secrets', '.server-notes'):
        path = root / name
        if path.is_symlink():
            raise ValueError('Private configuration directory must not be a symlink')
        path.mkdir(exist_ok=True, mode=0o700)
    key = root / '.secrets/backup.key'
    if key.is_symlink():
        raise ValueError('Backup key must not be a symlink')
    if not key.exists():
        # Exclusive creation ensures a rerun never rotates the recovery key.
        descriptor = os.open(key, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, 'wb') as handle:
            handle.write(base64.urlsafe_b64encode(os.urandom(32)) + b'\n')
    if len(base64.b64decode(key.read_bytes().strip(), altchars=b'-_', validate=True)) != 32:
        raise ValueError('Existing backup key is invalid; recover it instead of replacing it')
    config = root / '.secrets/operations.env'
    if not config.exists():
        write_private(config, (root / 'infra/operations.env.example').read_text())
    if config.is_symlink():
        raise ValueError('Operations configuration must not be a symlink')
    return config


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--supabase', action='store_true', help='Prompt privately and verify/create the backup bucket')
    parser.add_argument('--postgres-image', help='Compatible postgres image already available in Docker, e.g. postgres:17-alpine')
    args = parser.parse_args()
    if os.name != 'posix':
        raise ValueError('Run on the Linux Docker server; edit .secrets/operations.env privately from Windows')
    os.umask(0o077)
    config = initialize(ROOT)
    if args.supabase:
        values = read_env(config)
        default = values.get('BACKUP_SUPABASE_URL', '')
        url = input(f'Supabase project URL [{default}]: ').strip() or default
        key = getpass.getpass('Secret/service_role key (Enter keeps existing): ').strip() or values.get('BACKUP_SUPABASE_KEY', '')
        if any(character in key for character in '\r\n\0'):
            raise ValueError('Multiline keys are not supported')
        bucket = values.get('BACKUP_BUCKET', 'tocpns-backups')
        configure_bucket(url, key, bucket)
        values.update(BACKUP_STORAGE='supabase', BACKUP_SUPABASE_URL=url.rstrip('/'), BACKUP_SUPABASE_KEY=key)
        write_private(config, ''.join(f'{name}={value}\n' for name, value in values.items()))
        print('Private Supabase bucket verified; storage credentials saved without displaying them.')
    if args.postgres_image:
        digest = subprocess.run(['docker', 'image', 'inspect', args.postgres_image, '--format', '{{index .RepoDigests 0}}'],
                                capture_output=True, text=True, check=True).stdout.strip()
        if not re.fullmatch(r'(?:docker.io/library/)?postgres@sha256:[a-f0-9]{64}', digest):
            raise ValueError('Select a locally available, digest-pinned PostgreSQL image')
        manifest = ROOT / '.server-notes/images.env'
        lines = [line for line in manifest.read_text().splitlines() if not line.startswith('POSTGRES_BACKUP_IMAGE=')]
        write_private(manifest, '\n'.join(lines) + '\nPOSTGRES_BACKUP_IMAGE=' + digest + '\n')
    print('Backup configuration ready. Keep a separate recovery copy of .secrets/backup.key.')
    print('Next: sudo bash scripts/ops/backup-ujian.sh && sudo bash scripts/ops/install-operations.sh')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        # HTTP error bodies and subprocess output can contain private configuration.
        print(f'Operations setup failed ({type(exc).__name__}); check private configuration and access.')
        raise SystemExit(1)
