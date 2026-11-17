#!/bin/sh
set -eu
umask 077
export PGDATABASE="$(printf '%s' "$DATABASE_URL" | sed 's/^postgresql+asyncpg:/postgresql:/')"
unset DATABASE_URL
export PGSSLMODE=verify-full PGSSLROOTCERT=/etc/ssl/certs/ca-certificates.crt PGCONNECT_TIMEOUT=15
export PGOPTIONS='-c default_transaction_read_only=on'
file="/backups/postgres-$(date -u +%Y%m%dT%H%M%SZ).dump"
temporary="${file}.partial"
trap 'rm -f -- "$temporary"' EXIT
pg_dump --format=custom --no-owner --no-acl --file="$temporary"
test -s "$temporary"
pg_restore --list "$temporary" >/dev/null
mv -- "$temporary" "$file"
chmod 600 "$file"
printf 'Private database archive created: %s\n' "$(basename "$file")"
