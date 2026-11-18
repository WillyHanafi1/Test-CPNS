"""Read-only host checks with a tiny state file. Optional notifications only on change/cooldown."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
HOST_ISSUE_PREFIXES = ('container_', 'missing_', 'disk_', 'backup_')


def read_env(path):
    result = {}
    if path.exists():
        for line in path.read_text().splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                key, value = line.split('=', 1)
                result[key.strip()] = value.strip()
    return result


def run(args):
    result = subprocess.run(args, capture_output=True, text=True, timeout=40, cwd=ROOT)
    if result.returncode:
        raise RuntimeError('Command failed: ' + args[0])
    return result.stdout


def collect():
    issues = []
    backups = {}
    ids = run(['docker', 'ps', '-aq', '--filter', 'label=com.docker.compose.project=ujian']).split()
    containers = json.loads(run(['docker', 'inspect', *ids])) if ids else []
    seen = set()
    for row in containers:
        service = row['Config'].get('Labels', {}).get('com.docker.compose.service', '')
        if service not in {'backend', 'worker', 'payment-worker', 'beat', 'frontend', 'gateway', 'redis', 'tunnel'}:
            continue
        seen.add(service)
        health = row['State'].get('Health', {}).get('Status')
        if row['State']['Status'] != 'running' or health == 'unhealthy':
            issues.append({'code': 'container_' + service, 'message': service + ' belum sehat.'})
    for service in {'backend', 'worker', 'payment-worker', 'beat', 'frontend', 'gateway', 'redis'} - seen:
        issues.append({'code': 'missing_' + service, 'message': service + ' tidak berjalan.'})
    if 'backend' in seen:
        try:
            raw = run(['bash', 'scripts/ops/compose.sh', 'exec', '-T', 'backend', 'python', '-m', 'backend.ops.status'])
            application = json.loads(raw)
            # Host signals are recomputed below; do not feed last minute's Redis copy back in.
            issues.extend(issue for issue in application.get('issues', [])
                          if not issue['code'].startswith(HOST_ISSUE_PREFIXES + ('host_monitor',)))
        except Exception:
            issues.append({'code': 'application_check', 'message': 'Pemeriksaan aplikasi belum berhasil.'})
    usage = shutil.disk_usage(ROOT)
    if usage.free < max(2 * 1024**3, min(5 * 1024**3, usage.total * .1)):
        issues.append({'code': 'disk_space', 'message': 'Ruang disk untuk rilis dan pemulihan menipis.'})
    for kind in ('database', 'configuration'):
        path = ROOT / '.server-notes/backups' / ('latest-' + kind + '.json')
        try:
            backup = json.loads(path.read_text())
            age = (datetime.now(timezone.utc) - datetime.fromisoformat(backup['created_at'])).total_seconds()
            backups[kind] = {'destination': backup.get('destination'), 'age_hours': round(age / 3600, 1),
                             'verified': backup.get('verified', False)}
            if age > 36 * 3600 or not backup.get('verified'):
                raise ValueError('stale')
            if backup.get('destination') != 'supabase':
                issues.append({'code': 'backup_fallback_' + kind, 'message': 'Backup tersimpan lokal; backup off-host otomatis belum terverifikasi.'})
            elif backup.get('remote_issue'):
                issues.append({'code': 'backup_retention_' + kind, 'message': 'Backup tersimpan di Supabase; retensinya perlu diperiksa.'})
        except (OSError, ValueError, KeyError):
            issues.append({'code': 'backup_' + kind, 'message': 'Backup ' + kind + ' terbaru belum terverifikasi.'})
    issues = list({issue['code']: issue for issue in issues}.values())
    host = {'checked_at': datetime.now(timezone.utc).isoformat(), 'disk_free_gib': round(usage.free / 1024**3, 2),
        'backup': backups, 'issues': [issue for issue in issues if issue['code'].startswith(HOST_ISSUE_PREFIXES)]}
    return {'status': 'attention' if issues else 'healthy', 'issues': issues,
        'disk_free_gib': host['disk_free_gib'], 'container_count': len(seen), 'host': host}


def report_status(report, config, state_path, *, once=False):
    state = json.loads(state_path.read_text()) if state_path.exists() else {}
    fingerprint = hashlib.sha256(json.dumps(sorted(report['issues'], key=lambda issue: issue['code']), sort_keys=True).encode()).hexdigest()
    changed = fingerprint != state.get('fingerprint')
    now = time.time()
    due = now - state.get('last_alert_at', 0) > int(config.get('MONITOR_COOLDOWN_SECONDS', '1800'))
    endpoint = config.get('MONITOR_WEBHOOK_URL', '')
    if endpoint and (changed or (report['issues'] and due)):
        if urlsplit(endpoint).scheme != 'https':
            raise ValueError('Monitor webhook must use HTTPS')
        message = 'TOCPNS: ' + ('perlu diperiksa. ' + '; '.join(i['message'] for i in report['issues'])
            if report['issues'] else 'layanan kembali sehat.')
        request = Request(endpoint, data=json.dumps({'text': message}).encode(),
            headers={'Content-Type': 'application/json'}, method='POST')
        with urlopen(request, timeout=15) as response:
            if response.status >= 300:
                raise RuntimeError('Notification delivery failed')
        state['last_alert_at'] = now
    state.update(fingerprint=fingerprint, last_checked_at=now, status=report['status'])
    state_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = state_path.with_suffix('.partial')
    temporary.write_text(json.dumps(state))
    os.chmod(temporary, 0o600)
    temporary.replace(state_path)
    if once or changed:
        print(json.dumps(report))


def publish_host_status(host):
    code = "import sys,asyncio;from backend.core.redis_service import redis_service;asyncio.run(redis_service.redis.setex('ujian:host_status',180,sys.stdin.read()))"
    subprocess.run(['bash', 'scripts/ops/compose.sh', 'exec', '-T', 'backend', 'python', '-c', code],
        input=json.dumps(host), text=True, capture_output=True, timeout=15, cwd=ROOT, check=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--once', action='store_true')
    args = parser.parse_args()
    try:
        try:
            result = collect()
        except Exception as exc:
            result = {'status': 'attention', 'issues': [{'code': 'host_check_failed',
                'message': 'Pemeriksaan server gagal; Docker atau koneksi aplikasi perlu diperiksa.'}],
                'error_type': type(exc).__name__}
        try:
            if 'host' in result:
                publish_host_status(result['host'])
        except Exception:
            pass  # Host alerts remain available while the backend is unavailable.
        report_status(result, read_env(ROOT / '.secrets/operations.env'),
            ROOT / '.server-notes/monitor-state.json', once=args.once)
    except Exception as exc:
        print(json.dumps({'status': 'check_failed', 'error_type': type(exc).__name__}))
        raise SystemExit(1)
