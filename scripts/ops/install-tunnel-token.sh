#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
umask 077
test -d .secrets
read -rsp 'Paste the Cloudflare Docker command or token (input hidden): ' private_input
printf '\n'
printf '%s' "$private_input" | python3 scripts/ops/store_tunnel_token.py
unset private_input
