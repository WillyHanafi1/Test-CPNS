"""Validate deployment configuration without displaying credentials or contacting a database."""
import argparse
import os
from pathlib import Path
import shlex
import stat
import re
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]


def read_env(path):
    values = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        key, value = line.split('=', 1)
        # Compose uses raw format for application.env; quoted values stay literal there.
        if path.name != 'application.env':
            parts = shlex.split(value, comments=True)
            value = ' '.join(parts)
        values[key.strip()] = value
    return values


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['build', 'app', 'connector', 'tunnel'])
    args = parser.parse_args()
    problems = []
    for relative in ['.production.env', '.secrets/application.env', '.secrets/cloudflare-token', '.server-notes/images.env']:
        path = ROOT / relative
        if not path.is_file():
            problems.append(f'{relative}: missing; run prepare-secrets.sh and lock-images.sh')
        elif os.name != 'nt' and stat.S_IMODE(path.stat().st_mode) & 0o077:
            problems.append(f'{relative}: restrict permissions to 600')
    if problems:
        raise SystemExit('\n'.join(problems))
    public = read_env(ROOT / '.production.env')
    app = read_env(ROOT / '.secrets/application.env')
    images = read_env(ROOT / '.server-notes/images.env')
    for name in ['PYTHON_IMAGE', 'NODE_IMAGE', 'REDIS_IMAGE', 'NGINX_IMAGE', 'CLOUDFLARED_IMAGE']:
        if '@sha256:' not in images.get(name, ''):
            problems.append(f'{name}: image digest is required')
    if public.get('NEXT_PUBLIC_API_URL') != 'https://tocpns.my.id':
        problems.append('NEXT_PUBLIC_API_URL must be https://tocpns.my.id')
    if public.get('GATEWAY_BIND', '127.0.0.1') != '127.0.0.1':
        problems.append('The diagnostic gateway port must remain bound to loopback')
    if args.mode in ['app', 'tunnel']:
        database = urlparse(app.get('DATABASE_URL', ''))
        if database.scheme != 'postgresql+asyncpg' or not database.hostname or not database.password:
            problems.append('DATABASE_URL: configure a production PostgreSQL asyncpg connection')
        key = app.get('SECRET_KEY', '')
        if len(key) < 32 or key in ['GENERATE_ON_SERVER', 'your-secret-key-keep-it-secret']:
            problems.append('SECRET_KEY: requires a strong production value')
        for name, expected in [('ENV', 'production'), ('COOKIE_SECURE', 'true'), ('FRONTEND_URL', 'https://tocpns.my.id'), ('CORS_ORIGINS', 'https://tocpns.my.id')]:
            if app.get(name) != expected:
                problems.append(f'{name}: expected production domain/security configuration')
        for backend, frontend in [('GOOGLE_CLIENT_ID', 'NEXT_PUBLIC_GOOGLE_CLIENT_ID'), ('DOKU_CLIENT_ID', 'NEXT_PUBLIC_DOKU_CLIENT_ID'), ('DOKU_ENVIRONMENT', 'NEXT_PUBLIC_DOKU_ENVIRONMENT')]:
            if app.get(backend, '') != public.get(frontend, ''):
                problems.append(f'{backend} and {frontend} must match; rebuild frontend when changing public values')
        if app.get('DOKU_ENVIRONMENT') not in ['sandbox', 'production']:
            problems.append('DOKU_ENVIRONMENT: must be sandbox or production')
        if app.get('DOKU_ENVIRONMENT') == 'production' and not app.get('DOKU_SECRET_KEY'):
            problems.append('DOKU_SECRET_KEY is required for production payments')
    if args.mode in ['connector', 'tunnel']:
        token = (ROOT / '.secrets/cloudflare-token').read_text().strip()
        if not re.fullmatch(r'[A-Za-z0-9_+/=-]{50,8192}', token):
            problems.append('Cloudflare tunnel token is missing or malformed; use install-tunnel-token.sh')
    if problems:
        raise SystemExit('\n'.join(problems))
    print(f'{args.mode} configuration preflight passed; no secret values displayed.')
    if args.mode in ['app', 'tunnel']:
        for name in ['GOOGLE_CLIENT_ID', 'MAIL_USERNAME', 'DOKU_SECRET_KEY']:
            if not app.get(name):
                print(f'Optional feature not configured: {name}')
        if app.get('DOKU_ENVIRONMENT') == 'sandbox':
            print('Payments remain in sandbox mode; real-money payment readiness is not verified.')


if __name__ == '__main__':
    main()
