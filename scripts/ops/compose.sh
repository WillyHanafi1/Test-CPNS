#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
exec docker compose -p ujian --env-file .production.env \
    --env-file .server-notes/images.env -f compose.production.yml "$@"
