#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
umask 077
mkdir -p .secrets .server-notes
chmod 700 .secrets .server-notes
if [[ ! -e .production.env ]]; then
    install -m 600 infra/production.env.example .production.env
fi
if [[ ! -e .secrets/application.env ]]; then
    python3 - <<'PY'
from pathlib import Path
import secrets
source = Path('infra/application.env.example').read_text()
target = Path('.secrets/application.env')
with target.open('x') as handle:
    handle.write(source.replace('GENERATE_ON_SERVER', secrets.token_hex(48)))
target.chmod(0o600)
PY
fi
if [[ ! -e .secrets/cloudflare-token ]]; then
    install -m 600 /dev/null .secrets/cloudflare-token
fi
exclude="$(git rev-parse --git-path info/exclude)"
for pattern in /.secrets/ /.server-notes/ /.production.env; do
    if ! grep -Fxq "$pattern" "$exclude"; then printf '\n%s\n' "$pattern" >> "$exclude"; fi
done
printf 'Private files prepared without overwriting existing configuration.\n'
