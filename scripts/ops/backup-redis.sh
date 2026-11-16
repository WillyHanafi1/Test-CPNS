#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
umask 077
exec 9>/tmp/ujian-release.lock
flock -n 9 || { printf 'Another Ujian operation is running.\n' >&2; exit 1; }
mkdir -p .server-notes/backups
chmod 700 .server-notes/backups
backup=".server-notes/backups/redis-$(date -u +%Y%m%dT%H%M%SZ).rdb"
temporary="$(mktemp .server-notes/backups/snapshot.XXXXXX)"
trap 'rm -f -- "$temporary"' EXIT
bash scripts/ops/compose.sh exec -T redis sh -ec \
    'redis-cli --rdb /tmp/ujian-snapshot.rdb >/dev/null 2>&1; cat /tmp/ujian-snapshot.rdb; rm -f /tmp/ujian-snapshot.rdb' > "$temporary"
test -s "$temporary"
chmod 600 "$temporary"
mv -- "$temporary" "$backup"
printf 'Private Redis snapshot saved: %s\n' "$backup"
printf 'This backup is on the same server; copy it to protected off-host storage for disaster recovery.\n'
