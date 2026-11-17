#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
exec 9>/tmp/ujian-release.lock
flock -n 9 || { printf 'Another Ujian operation is running.\n' >&2; exit 1; }
compose() { bash scripts/ops/compose.sh "$@"; }
case "${1:-help}" in
    build)
        python3 scripts/ops/preflight.py build
        python3 scripts/ops/release-tag.py
        compose config --quiet
        # Serialize builds on the shared 4 GB server.
        for service in backend frontend gateway; do compose build "$service"; done
        ;;
    preview)
        python3 scripts/ops/preflight.py build
        compose up -d --no-build --wait --wait-timeout 120 frontend gateway
        ;;
    start)
        python3 scripts/ops/preflight.py app
        compose config --quiet
        compose up -d --no-build --wait --wait-timeout 60 redis
        compose run --rm --no-deps backend python -m backend.ops.check_schema
        compose up -d --no-build --wait --wait-timeout 180 backend frontend gateway worker beat
        ;;
    connect)
        # Bootstrap the connector before the dashboard's route setup step.
        # Does not create public DNS/hostname routes or start database consumers.
        python3 scripts/ops/preflight.py connector
        compose config --quiet
        compose --profile public up -d --no-build --wait --wait-timeout 180 tunnel
        ;;
    tunnel)
        python3 scripts/ops/preflight.py tunnel
        # Refuse to publish until application dependencies and schema are ready.
        compose run --rm --no-deps backend python -m backend.ops.check_schema
        compose exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/health',timeout=5)"
        compose --profile public up -d --no-build --wait --wait-timeout 120 tunnel
        ;;
    status)
        compose --profile public ps --all
        ;;
    *)
        printf 'Usage: bash scripts/ops/deploy-ujian.sh {build|preview|start|connect|tunnel|status}\n'
        printf 'Migrations are intentionally manual after database backup and review.\n'
        exit 2
        ;;
esac
