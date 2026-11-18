"""Encrypted, bounded backups through RAM. Supabase first; two small local copies on failure."""
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import sys
import tarfile
import tempfile
from datetime import datetime, timezone
from urllib.parse import quote

import requests
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

MAGIC = b'TOCPNSB1'
CHUNK = 65536
KINDS = {'database', 'configuration'}


def _sha256_file(handle):
    """Compute SHA-256 hex digest from a binary stream without requiring Python 3.11+."""
    digest = hashlib.sha256()
    while chunk := handle.read(CHUNK):
        digest.update(chunk)
    return digest.hexdigest()


def encryption_key():
    key = base64.urlsafe_b64decode(Path(os.getenv('BACKUP_KEY_FILE', '/run/secrets/backup_key')).read_bytes().strip())
    if len(key) != 32:
        raise ValueError('Backup encryption key must be 32 bytes')
    return key


def encrypt(source, destination, key, max_bytes):
    nonce = os.urandom(12)
    cipher = Cipher(algorithms.AES(key), modes.GCM(nonce)).encryptor()
    destination.write(MAGIC + nonce)
    total = 0
    while chunk := source.read(CHUNK):
        total += len(chunk)
        if total > max_bytes:
            raise ValueError('Backup exceeds configured size limit')
        destination.write(cipher.update(chunk))
    if not total:
        raise ValueError('Refusing an empty backup')
    destination.write(cipher.finalize() + cipher.tag)
    destination.seek(0)
    digest = _sha256_file(destination)
    destination.seek(0)
    return total, digest


def decrypt(source, destination, key):
    # Callers use RAM-backed temporary storage, and release plaintext only after authentication.
    if source.read(len(MAGIC)) != MAGIC:
        raise ValueError('Unrecognized backup format')
    nonce = source.read(12)
    source.seek(-16, 2)
    tag = source.read(16)
    end = source.tell() - 16
    source.seek(len(MAGIC) + 12)
    cipher = Cipher(algorithms.AES(key), modes.GCM(nonce, tag)).decryptor()
    while source.tell() < end:
        destination.write(cipher.update(source.read(min(CHUNK, end - source.tell()))))
    destination.write(cipher.finalize())
    destination.seek(0)


class Storage:
    def __init__(self):
        self.base = os.environ['BACKUP_SUPABASE_URL'].rstrip('/') + '/storage/v1'
        self.bucket = os.getenv('BACKUP_BUCKET', 'tocpns-backups')
        key = os.environ['BACKUP_SUPABASE_KEY']
        self.headers = {'apikey': key}
        # New Supabase secret keys are opaque API keys, not bearer JWTs.
        if not key.startswith('sb_secret_'):
            self.headers['Authorization'] = 'Bearer ' + key

    def call(self, method, path, **kwargs):
        response = requests.request(method, self.base + path, headers=self.headers,
                                    timeout=(10, 120), allow_redirects=False, **kwargs)
        if not response.ok:
            raise RuntimeError(f'Storage HTTP {response.status_code}')
        return response

    def put_verified(self, key, file, digest):
        bucket = self.call('GET', '/bucket/' + quote(self.bucket, safe='')).json()
        if bucket.get('public'):
            raise RuntimeError('Backup bucket must be private')
        if not re.fullmatch(r'ujian/(database|configuration)/\d{8}T\d{6}Z-[a-f0-9]{8}\.enc', key):
            raise ValueError('Unexpected backup object path')
        may_have_uploaded = True
        try:
            file.seek(0)
            response = requests.post(self.base + '/object/' + quote(self.bucket, safe='') + '/' + key,
                headers={**self.headers, 'Content-Type': 'application/octet-stream', 'x-upsert': 'false'},
                data=file, timeout=(10, 120), allow_redirects=False)
            if not response.ok:
                may_have_uploaded = response.status_code >= 500
                raise RuntimeError(f'Storage upload HTTP {response.status_code}')
            check = hashlib.sha256()
            with self.call('GET', '/object/authenticated/' + quote(self.bucket, safe='') + '/' + key, stream=True) as response:
                for chunk in response.iter_content(CHUNK):
                    check.update(chunk)
            if check.hexdigest() != digest:
                raise RuntimeError('Remote backup checksum mismatch')
        except Exception:
            # A timed-out upload may have succeeded; remove only this new, unverified object.
            try:
                if may_have_uploaded:
                    self.call('DELETE', '/object/' + quote(self.bucket, safe=''), json={'prefixes': [key]})
            except Exception:
                pass
            raise

    def prune(self, kind, current_name=None):
        prefix = 'ujian/' + kind
        rows = self.call('POST', '/object/list/' + quote(self.bucket, safe=''),
            json={'prefix': prefix, 'limit': 1000, 'sortBy': {'column': 'name', 'order': 'desc'}}).json()
        rows = [row for row in rows if re.fullmatch(r'\d{8}T\d{6}Z-[a-f0-9]{8}\.enc', row.get('name', ''))]
        rows.sort(key=lambda row: (row['name'] == current_name, row['name']), reverse=True)
        keep = max(1, int(os.getenv('BACKUP_KEEP', '7')))
        budget = int(os.getenv('BACKUP_REMOTE_MAX_MB', '256')) * 1048576
        used, remove = 0, []
        for index, row in enumerate(rows):
            size = int((row.get('metadata') or {}).get('size', 0))
            if index and (index >= keep or used + size > budget):
                remove.append(prefix + '/' + row['name'])
            else:
                used += size
        if remove:
            self.call('DELETE', '/object/' + quote(self.bucket, safe=''), json={'prefixes': remove})


def local_archives(root, kind):
    return [p for p in root.glob(f'{kind}-*.enc') if not p.is_symlink() and
            re.fullmatch(kind + r'-\d{8}T\d{6}Z-[a-f0-9]{8}\.enc', p.name)]


def save_local(file, kind, name, root):
    root = root.resolve()
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    target = root / f'{kind}-{name}'
    temporary = target.with_suffix('.partial')
    file.seek(0)
    try:
        with temporary.open('xb') as output:
            shutil.copyfileobj(file, output, CHUNK)
        os.chmod(temporary, 0o600)
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)
    file.seek(0)
    expected = _sha256_file(file)
    with target.open('rb') as written:
        if _sha256_file(written) != expected:
            raise RuntimeError('Local backup checksum mismatch')
    matches = sorted(local_archives(root, kind),
                     key=lambda p: (p.name == target.name, p.stat().st_mtime_ns, p.name), reverse=True)
    used = 0
    budget = int(os.getenv('BACKUP_LOCAL_MAX_MB', '96')) * 1048576
    keep = max(1, int(os.getenv('BACKUP_LOCAL_KEEP', '2')))
    for index, path in enumerate(matches):
        if index and (index >= keep or used + path.stat().st_size > budget):
            path.unlink()
        else:
            used += path.stat().st_size
    return target.name


def capture(source, kind):
    if kind not in KINDS:
        raise ValueError('Unknown backup kind')
    from uuid import uuid4
    now = datetime.now(timezone.utc)
    name = now.strftime('%Y%m%dT%H%M%SZ') + '-' + uuid4().hex[:8] + '.enc'
    limit = int(os.getenv('BACKUP_MAX_MB', '40')) * 1048576
    root = Path(os.getenv('BACKUP_DIRECTORY', '/backups'))
    for path in root.glob(f'{kind}-*.partial'):
        if (not path.is_symlink() and re.fullmatch(kind + r'-\d{8}T\d{6}Z-[a-f0-9]{8}\.partial', path.name)
                and now.timestamp() - path.stat().st_mtime > 86400):
            path.unlink()  # An interrupted fallback write must not accumulate indefinitely.
    with tempfile.TemporaryFile(dir=os.getenv('BACKUP_TMP_DIRECTORY', '/tmp')) as output:
        size, digest = encrypt(source, output, encryption_key(), limit)
        destination, remote_error = 'local', None
        if os.getenv('BACKUP_STORAGE') == 'supabase':
            try:
                store = Storage()
                store.put_verified('ujian/' + kind + '/' + name, output, digest)
                destination = 'supabase'
                try:
                    store.prune(kind, name)
                except Exception as exc:
                    remote_error = 'retention_' + type(exc).__name__
            except Exception as exc:
                remote_error = type(exc).__name__
        if destination == 'local':
            save_local(output, kind, name, root)
        else:
            # Once a remote copy is verified, temporary fallback copies need no server disk.
            for path in local_archives(root, kind):
                path.unlink()
        report = {'kind': kind, 'created_at': now.isoformat(), 'destination': destination,
            'object': 'ujian/' + kind + '/' + name, 'plaintext_bytes': size, 'sha256': digest,
            'encrypted': True, 'verified': True, 'remote_issue': remote_error}
        root.mkdir(parents=True, exist_ok=True, mode=0o700)
        state = root / ('latest-' + kind + '.json')
        state.write_text(json.dumps(report, indent=2) + '\n')
        os.chmod(state, 0o600)
        print(json.dumps(report))


def configuration_archive():
    output = io.BytesIO()
    root = Path('/backup-config')
    names = ('public.env', 'manifests/images.env', 'manifests/images.previous.env', 'secrets/application.env',
             'secrets/operations.env', 'secrets/cloudflare-token', 'secrets/postgres-root-ca.crt',
             'manifests/operations.override.yml')
    with tarfile.open(fileobj=output, mode='w:gz') as archive:
        for name in names:
            path = root / name
            if path.is_file() and not path.is_symlink():
                archive.add(path, arcname=name, recursive=False)
    output.seek(0)
    return output


if __name__ == '__main__':
    try:
        mode = sys.argv[1] if len(sys.argv) > 1 else ''
        if mode == 'capture':
            capture(sys.stdin.buffer, sys.argv[2])
        elif mode == 'configuration':
            capture(configuration_archive(), 'configuration')
        elif mode == 'decrypt':
            with tempfile.TemporaryFile(dir=os.getenv('BACKUP_TMP_DIRECTORY', '/tmp')) as source, tempfile.TemporaryFile(dir=os.getenv('BACKUP_TMP_DIRECTORY', '/tmp')) as plain:
                limit = int(os.getenv('BACKUP_MAX_MB', '40')) * 1048576 + 1024
                total = 0
                while chunk := sys.stdin.buffer.read(CHUNK):
                    total += len(chunk)
                    if total > limit:
                        raise ValueError('Backup exceeds configured size limit')
                    source.write(chunk)
                source.seek(0)
                decrypt(source, plain, encryption_key())
                shutil.copyfileobj(plain, sys.stdout.buffer, CHUNK)
        else:
            raise ValueError('Use capture database, configuration, or decrypt')
    except Exception as exc:
        print(json.dumps({'status': 'failed', 'error_type': type(exc).__name__}), file=sys.stderr)
        raise SystemExit(1)
