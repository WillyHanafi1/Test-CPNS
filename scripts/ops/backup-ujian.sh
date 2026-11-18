#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
umask 077
image="$(sed -n 's/^POSTGRES_BACKUP_IMAGE=//p' .server-notes/images.env | tr -d '\r')"
case "$image" in *@sha256:*) ;; *) printf 'Set a compatible, digest-pinned POSTGRES_BACKUP_IMAGE first.\n' >&2; exit 2;; esac
exec 9>/tmp/ujian-backup.lock
flock -n 9 || { printf 'Backup is already running.\n' >&2; exit 1; }
python3 scripts/ops/prepare_backup.py
compose() { bash scripts/ops/compose.sh "$@"; }
# The dump is verified in container tmpfs, encrypted in tmpfs, then uploaded.
compose --profile operations run --rm -T --no-deps -e BACKUP_STDOUT=1 database-backup \
    | compose --profile operations run --rm -T --no-deps backup-store capture database
compose --profile operations run --rm -T --no-deps backup-store configuration
