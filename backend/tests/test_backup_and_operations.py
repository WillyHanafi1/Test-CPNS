import base64
from contextlib import redirect_stdout
from datetime import datetime, timezone
import importlib.util
import io
import json
import os
from pathlib import Path

import pytest
from cryptography.exceptions import InvalidTag
from sqlalchemy import select
from backend.ops import backup
from backend.models.models import AuditEvent, ExamJob, ExamSession
from backend.services.operations import status
from backend.tests.conftest import login_and_get_cookies, mock_redis


def test_backup_roundtrip_is_authenticated_and_bounded():
    key = os.urandom(32)
    source = b'PGDMP synthetic database contents' * 10000
    encrypted, plain = io.BytesIO(), io.BytesIO()
    size, digest = backup.encrypt(io.BytesIO(source), encrypted, key, len(source))
    assert size == len(source) and len(digest) == 64 and source[:30] not in encrypted.getvalue()
    backup.decrypt(encrypted, plain, key)
    assert plain.read() == source
    tampered = bytearray(encrypted.getvalue())
    tampered[-20] ^= 1
    with pytest.raises(InvalidTag):
        backup.decrypt(io.BytesIO(tampered), io.BytesIO(), key)
    with pytest.raises(ValueError):
        backup.encrypt(io.BytesIO(source), io.BytesIO(), key, 10)


def configure_backup(monkeypatch, tmp_path):
    key = tmp_path / 'key'
    key.write_bytes(base64.urlsafe_b64encode(os.urandom(32)))
    monkeypatch.setenv('BACKUP_KEY_FILE', str(key))
    monkeypatch.setenv('BACKUP_TMP_DIRECTORY', str(tmp_path))
    monkeypatch.setenv('BACKUP_DIRECTORY', str(tmp_path / 'backups'))
    monkeypatch.setenv('BACKUP_STORAGE', 'supabase')


def test_remote_backup_leaves_only_small_status_file_on_disk(monkeypatch, tmp_path):
    configure_backup(monkeypatch, tmp_path)
    uploads = []
    class Store:
        def put_verified(self, key, file, digest):
            uploads.append((key, file.read(), digest))
        def prune(self, kind, name):
            assert kind == 'database' and name.endswith('.enc')
    monkeypatch.setattr(backup, 'Storage', Store)
    with redirect_stdout(io.StringIO()):
        backup.capture(io.BytesIO(b'PGDMP synthetic'), 'database')
    assert len(uploads) == 1
    assert not list((tmp_path / 'backups').glob('*.enc'))
    state = json.loads((tmp_path / 'backups/latest-database.json').read_text())
    assert state['destination'] == 'supabase' and state['verified']


def test_remote_failure_keeps_at_most_two_encrypted_local_copies(monkeypatch, tmp_path):
    configure_backup(monkeypatch, tmp_path)
    monkeypatch.setenv('BACKUP_LOCAL_KEEP', '2')
    class Store:
        def put_verified(self, *args):
            raise OSError('simulated outage')
    monkeypatch.setattr(backup, 'Storage', Store)
    with redirect_stdout(io.StringIO()):
        for _ in range(5):
            backup.capture(io.BytesIO(b'PGDMP synthetic'), 'database')
    files = list((tmp_path / 'backups').glob('*.enc'))
    state = json.loads((tmp_path / 'backups/latest-database.json').read_text())
    assert len(files) == 2 and state['destination'] == 'local'
    assert (tmp_path / 'backups' / ('database-' + state['object'].rsplit('/', 1)[-1])).exists()
    assert all(b'PGDMP' not in p.read_bytes() for p in files)


def test_verified_remote_recovery_removes_only_its_own_local_fallback(monkeypatch, tmp_path):
    configure_backup(monkeypatch, tmp_path)
    root = tmp_path / 'backups'
    root.mkdir()
    fallback = root / 'database-20261117T010000Z-1234abcd.enc'
    unrelated = root / 'database-manual-archive.enc'
    fallback.write_bytes(b'encrypted fallback')
    unrelated.write_bytes(b'keep this operator file')
    class Store:
        def put_verified(self, *args):
            pass
        def prune(self, *args):
            pass
    monkeypatch.setattr(backup, 'Storage', Store)
    with redirect_stdout(io.StringIO()):
        backup.capture(io.BytesIO(b'PGDMP synthetic'), 'database')
    assert not fallback.exists() and unrelated.exists()


def test_failed_remote_verification_removes_only_the_new_object(monkeypatch):
    from unittest.mock import Mock
    store = object.__new__(backup.Storage)
    store.base, store.bucket, store.headers = 'https://storage.example/storage/v1', 'private', {}
    key = 'ujian/database/20261117T010000Z-1234abcd.enc'
    bucket = Mock()
    bucket.json.return_value = {'public': False}
    reader = Mock()
    reader.__enter__ = Mock(return_value=reader)
    reader.__exit__ = Mock(return_value=False)
    reader.iter_content.return_value = [b'different ciphertext']
    store.call = Mock(side_effect=[bucket, reader, Mock()])
    monkeypatch.setattr(backup.requests, 'post', Mock(return_value=Mock(ok=True)))
    with pytest.raises(RuntimeError, match='checksum mismatch'):
        store.put_verified(key, io.BytesIO(b'encrypted'), 'wrong-hash')
    assert store.call.call_args.args[0] == 'DELETE'
    assert store.call.call_args.kwargs['json'] == {'prefixes': [key]}


def test_object_collision_never_deletes_an_existing_backup(monkeypatch):
    from unittest.mock import Mock
    store = object.__new__(backup.Storage)
    store.base, store.bucket, store.headers = 'https://storage.example/storage/v1', 'private', {}
    bucket = Mock()
    bucket.json.return_value = {'public': False}
    store.call = Mock(return_value=bucket)
    monkeypatch.setattr(backup.requests, 'post', Mock(return_value=Mock(ok=False, status_code=409)))
    with pytest.raises(RuntimeError, match='409'):
        store.put_verified('ujian/database/20261117T010000Z-1234abcd.enc', io.BytesIO(b'encrypted'), 'hash')
    assert store.call.call_count == 1


async def test_operations_detects_stale_worker_and_failed_scoring_without_exposing_participants(client, db_session, test_user, test_package_with_questions):
    session = ExamSession(user_id=test_user.id, package_id=test_package_with_questions.id, status='processing',
        start_time=datetime.now(timezone.utc), end_time=datetime.now(timezone.utc))
    db_session.add(session)
    await db_session.flush()
    db_session.add(ExamJob(session_id=session.id, status='failed', attempts=8))
    await db_session.commit()
    result = await status(db_session)
    assert {'worker_heartbeat', 'scoring_failed'} <= {i['code'] for i in result['issues']}
    assert test_user.email not in json.dumps(result, default=str)
    mock_redis._store['ujian:worker_heartbeat'] = datetime.now(timezone.utc).isoformat()
    result = await status(db_session)
    assert 'worker_heartbeat' not in {i['code'] for i in result['issues']}


async def test_operation_retry_requires_admin_and_records_actor(client, test_user, admin_user, db_session, test_package_with_questions):
    session = ExamSession(user_id=test_user.id, package_id=test_package_with_questions.id, status='processing',
        start_time=datetime.now(timezone.utc), end_time=datetime.now(timezone.utc))
    db_session.add(session)
    await db_session.flush()
    job = ExamJob(session_id=session.id, status='failed', attempts=8, last_error='simulated')
    db_session.add(job)
    await db_session.commit()
    endpoint = f'/api/v1/admin/analytics/infrastructure/retry/scoring/{job.id}'
    await login_and_get_cookies(client, test_user.email, 'TestPassword123')
    assert (await client.post(endpoint)).status_code == 403
    await login_and_get_cookies(client, admin_user.email, 'AdminPassword123')
    assert (await client.post(endpoint)).status_code == 200
    await db_session.refresh(job)
    assert job.status == 'pending' and job.attempts == 0
    audit = await db_session.scalar(select(AuditEvent).where(AuditEvent.action == 'operations.retry'))
    assert audit.actor_id == admin_user.id


def test_monitor_does_not_repeat_unchanged_healthy_output_or_send_unconfigured_notifications(tmp_path):
    path = Path(__file__).parents[2] / 'scripts/ops/monitor.py'
    spec = importlib.util.spec_from_file_location('ujian_monitor', path)
    monitor = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(monitor)
    report = {'status': 'healthy', 'issues': []}
    state = tmp_path / 'monitor.json'
    output = io.StringIO()
    with redirect_stdout(output):
        monitor.report_status(report, {}, state)
        monitor.report_status(report, {}, state)
    assert len(output.getvalue().splitlines()) == 1 and state.stat().st_size < 1024


def test_monitor_clears_old_host_faults_instead_of_feeding_them_back_from_redis(monkeypatch, tmp_path):
    from unittest.mock import Mock
    from types import SimpleNamespace
    path = Path(__file__).parents[2] / 'scripts/ops/monitor.py'
    spec = importlib.util.spec_from_file_location('ujian_monitor_recovery', path)
    monitor = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(monitor)
    monkeypatch.setattr(monitor, 'ROOT', tmp_path)
    backup_root = tmp_path / '.server-notes/backups'
    backup_root.mkdir(parents=True)
    for kind in ('database', 'configuration'):
        (backup_root / ('latest-' + kind + '.json')).write_text(json.dumps({
            'created_at': datetime.now(timezone.utc).isoformat(), 'destination': 'supabase', 'verified': True}))
    services = ['backend', 'worker', 'payment-worker', 'beat', 'frontend', 'gateway', 'redis']
    rows = [{'Config': {'Labels': {'com.docker.compose.service': name}},
             'State': {'Status': 'running', 'Health': {'Status': 'healthy'}}} for name in services]
    application = {'issues': [{'code': 'backup_database', 'message': 'Stale cached fault'},
                               {'code': 'worker_heartbeat', 'message': 'Current worker fault'}]}
    monkeypatch.setattr(monitor, 'run', Mock(side_effect=[' '.join(services), json.dumps(rows), json.dumps(application)]))
    monkeypatch.setattr(monitor.shutil, 'disk_usage', lambda _: SimpleNamespace(free=10 * 1024**3, total=30 * 1024**3))
    result = monitor.collect()
    assert [issue['code'] for issue in result['issues']] == ['worker_heartbeat']
    assert result['host']['issues'] == []
