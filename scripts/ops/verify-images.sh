#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
exec 9>/tmp/ujian-release.lock
flock -n 9 || { printf 'Another Ujian operation is running.\n' >&2; exit 1; }
compose() { docker compose -p ujian-verify --env-file .server-notes/images.env -f infra/verification/compose.yml "$@"; }
# This project has only disposable test containers, tmpfs DB storage and no host ports.
cleanup() { compose down --volumes --remove-orphans; }
trap cleanup EXIT
compose config --quiet
compose up -d --no-build --wait --wait-timeout 180
compose exec -T backend python /checks/smoke.py
if [ "${RUN_LOAD_CHECK:-0}" = 1 ]; then
    compose exec -T backend python /checks/load.py
fi
if compose exec -T backend python -m backend.ops.check_schema; then
    printf 'FAIL: missing schema revision was accepted.\n' >&2
    exit 1
fi
# The disposable schema above was built from metadata; stamp only this isolated test DB.
compose exec -T backend alembic -c backend/alembic.ini stamp head
compose exec -T backend python -m backend.ops.check_schema
printf 'PASS: schema gate rejects missing revisions and accepts the expected revision\n'
compose exec -T worker celery -A backend.core.celery_app.celery_app inspect ping --timeout 5
compose exec -T beat python -c "import os,pathlib;os.kill(int(pathlib.Path('/tmp/celerybeat.pid').read_text()),0);print('PASS: scheduler process is alive')"
compose exec -T backend python -c "import os;assert os.getuid()==10001;print('PASS: backend runs without root')"
compose exec -T gateway nginx -t
printf 'Production image integration checks passed in the disposable environment.\n'
