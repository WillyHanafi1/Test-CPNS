"""Check the live schema read-only before building; production migrations stay explicit."""
import ast
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[2]
COMPOSE = ["bash", "scripts/ops/compose.sh"]


def expected_revision(versions):
    revisions = set()
    parents = set()
    for path in versions.glob("*.py"):
        values = {}
        for node in ast.parse(path.read_text(encoding="utf-8")).body:
            if isinstance(node, ast.Assign):
                targets = node.targets
            elif isinstance(node, ast.AnnAssign):
                targets = [node.target]
            else:
                continue
            for target in targets:
                if isinstance(target, ast.Name) and target.id in {"revision", "down_revision"}:
                    values[target.id] = ast.literal_eval(node.value)
        if values.get("revision"):
            revisions.add(values["revision"])
            parent = values.get("down_revision")
            parents.update([parent] if isinstance(parent, str) else (parent or []))
    heads = revisions - parents
    if len(heads) != 1:
        raise RuntimeError("Release requires exactly one Alembic head")
    return heads.pop()


PROBE = """import asyncio, sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine
import backend.db.session as db

async def check():
    engine = next(value for value in vars(db).values() if isinstance(value, AsyncEngine))
    try:
        async with engine.connect() as connection:
            result = await connection.execute(text('SELECT version_num FROM alembic_version'))
            revisions = set(result.scalars().all())
        if revisions != {sys.argv[1]}:
            raise SystemExit('Production schema differs from the release. Prepare backup/rehearsal and '
                             'run the explicit migration before deploying. No images were built.')
        print('Production schema matches the release; read-only pre-build check passed.')
    finally:
        await engine.dispose()

asyncio.run(check())
"""


def main():
    expected = expected_revision(ROOT / "backend/alembic/versions")
    running = subprocess.check_output(
        [*COMPOSE, "ps", "--status", "running", "-q", "backend"], cwd=ROOT, text=True
    ).strip()
    if not running:
        print("No running backend: the candidate image will perform the schema check after build.")
        return
    subprocess.run([*COMPOSE, "exec", "-T", "backend", "python", "-c", PROBE, expected],
                   cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
