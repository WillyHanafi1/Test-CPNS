#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
umask 077
test -d .server-notes
temporary="$(mktemp .server-notes/images.env.XXXXXX)"
trap 'rm -f -- "$temporary"' EXIT
for item in PYTHON_IMAGE=python:3.12-slim-bookworm NODE_IMAGE=node:24-alpine REDIS_IMAGE=redis:7-alpine NGINX_IMAGE=nginx:stable-alpine CLOUDFLARED_IMAGE=cloudflare/cloudflared:latest POSTGRES_TEST_IMAGE=postgres:16-alpine; do
    key="${item%%=*}"; image="${item#*=}"
    docker image inspect "$image" >/dev/null 2>&1 || docker pull "$image" >&2
    digest="$(docker image inspect "$image" --format '{{index .RepoDigests 0}}')"
    [[ "$digest" == *@sha256:* ]] || { printf 'Missing image digest: %s\n' "$image" >&2; exit 1; }
    printf '%s=%s\n' "$key" "$digest" >> "$temporary"
done
chmod 600 "$temporary"
chown --reference=.server-notes "$temporary"
mv -- "$temporary" .server-notes/images.env
printf 'Base images locked by digest.\n'
