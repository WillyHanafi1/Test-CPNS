#!/usr/bin/env bash
set -Eeuo pipefail

for name in HOST USERNAME SSH_KEY SSH_KNOWN_HOSTS DEPLOY_PATH RELEASE_SHA; do
    if [[ -z "${!name:-}" ]]; then
        printf 'Missing %s. See docs/ci-cd.md for deployment setup.\n' "$name" >&2
        exit 1
    fi
done
[[ "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]] || { printf 'Invalid release SHA.\n' >&2; exit 1; }
[[ "${SSH_PORT:-9130}" =~ ^[0-9]+$ ]] || { printf 'Invalid SSH port.\n' >&2; exit 1; }

umask 077
temporary="$(mktemp -d)"
trap 'rm -f -- "$temporary/key" "$temporary/known_hosts"; rmdir -- "$temporary"' EXIT
printf '%s\n' "$SSH_KEY" > "$temporary/key"
printf '%s\n' "$SSH_KNOWN_HOSTS" > "$temporary/known_hosts"
unset SSH_KEY SSH_KNOWN_HOSTS
printf -v remote_command 'bash -s -- %q %q' "$DEPLOY_PATH" "$RELEASE_SHA"

ssh -T -i "$temporary/key" -p "${SSH_PORT:-9130}" -l "$USERNAME" \
    -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes \
    -o "UserKnownHostsFile=$temporary/known_hosts" -o ConnectTimeout=20 \
    -o ServerAliveInterval=15 -o ServerAliveCountMax=4 \
    "$HOST" "$remote_command" <<'REMOTE'
set -Eeuo pipefail
cd -- "$1"
expected="$2"
# Serialize source updates too; never overwrite uncommitted server work.
exec 8>/tmp/ujian-ci-source.lock
flock -w 120 8 || { printf 'Another CI source update is running.\n' >&2; exit 1; }
[[ "$(git branch --show-current)" == main ]] || { printf 'Server must be on main.\n' >&2; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { printf 'Server has local changes; preserve/review them before deploying.\n' >&2; exit 1; }
git fetch --no-tags origin main
if [[ "$(git rev-parse FETCH_HEAD)" != "$expected" ]]; then
    printf 'Skipping obsolete release; main has advanced.\n'
    exit 0
fi
git merge --ff-only "$expected"
[[ "$(git rev-parse HEAD)" == "$expected" ]] || { printf 'Server revision differs from tested commit.\n' >&2; exit 1; }
sudo -n /usr/bin/bash "$PWD/scripts/ops/deploy-ujian.sh" release "$expected"
REMOTE
