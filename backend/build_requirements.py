"""Derive the runtime pins from the common requirements without development CLIs/tests."""
from pathlib import Path
import re

excluded = {
    'pytest', 'pytest-asyncio', 'aiosqlite', 'fastapi-cli', 'fastapi-cloud-cli',
    'fastar', 'midtransclient', 'passlib',
    'pytest-cov', 'ruff', 'google-cloud-aiplatform',
}
for line in Path('requirements.txt').read_text().splitlines():
    name = re.split(r'[=<>!~;\[]', line.strip(), maxsplit=1)[0].lower().replace('_', '-')
    if name not in excluded:
        print(line)
