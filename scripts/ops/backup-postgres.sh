#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
umask 077
image="$(sed -n 's/^POSTGRES_BACKUP_IMAGE=//p' .server-notes/images.env | tr -d '\r')"
case "$image" in *@sha256:*) ;; *) printf 'Set a compatible, digest-pinned POSTGRES_BACKUP_IMAGE first.\n' >&2; exit 2;; esac
mkdir -p .server-notes/backups
chmod 700 .server-notes/backups
exec 9>/tmp/ujian-backup.lock
flock -n 9 || { printf 'An Ujian backup is already running.\n' >&2; exit 1; }
bash scripts/ops/compose.sh --profile operations run --rm --no-deps database-backup
printf 'Copy the private archive to encrypted off-host storage and rehearse restore. A local archive alone is not disaster recovery.\n'
