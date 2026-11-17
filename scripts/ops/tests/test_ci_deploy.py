"""Exercise release failures with disposable files and fake Docker/Compose commands."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[3]
SHA = "a" * 40
BASH = (shutil.which("bash") if os.name != "nt" else
        shutil.which("bash", path=r"C:\Program Files\Git\bin"))

MOCK = r'''#!/usr/bin/env bash
set -eu
name="${0##*/}"
printf '%s %s\n' "$name" "$*" >> "$TRACE"
case "$name" in
  flock) [[ "${FAIL_MODE:-}" != lock ]] ;;
  git) printf '%s\n' "$TEST_SHA" ;;
  python3)
    case "$*" in
      'scripts/ops/preflight.py app') [[ "${FAIL_MODE:-}" != preflight ]] ;;
      scripts/ops/release-tag.py)
        sed -i '/^RELEASE_TAG=/d' .server-notes/images.env
        printf 'RELEASE_TAG=candidate\n' >> .server-notes/images.env ;;
      *) exit 2 ;;
    esac ;;
  docker)
    case "$*" in
      'buildx inspect ujian-ci --format '*) printf 'docker-container\n' ;;
      'buildx inspect ujian-ci') [[ "${FAIL_MODE:-}" != create ]] ;;
      'buildx prune --help') printf '%s\n' --max-used-space ;;
      'image ls '*)
        repository="$3"
        printf '%s\n' "$repository:candidate" "$repository:previous" "$repository:oldest" ;;
    esac ;;
esac
'''

COMPOSE = r'''#!/usr/bin/env bash
set -eu
tag="$(sed -n 's/^RELEASE_TAG=//p' .server-notes/images.env)"
printf 'compose@%s %s\n' "$tag" "$*" >> "$TRACE"
case "$*" in
  'build --builder ujian-ci frontend') [[ "${FAIL_MODE:-}" != build ]] ;;
  'run --rm --no-deps backend python -m backend.ops.check_schema')
    [[ "${FAIL_MODE:-}" != schema || "$tag" != candidate ]] ;;
  'up -d --no-build --wait --wait-timeout 180 backend frontend gateway worker beat')
    [[ "${FAIL_MODE:-}" != startup || "$tag" != candidate ]] ;;
  'exec -T gateway wget '*) [[ "${FAIL_MODE:-}" != health || "$tag" != candidate ]] ;;
esac
'''


@unittest.skipUnless(BASH, "Bash is required")
class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="ujian-ci-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        for name in ("scripts/ops", "bin", ".server-notes"):
            (self.root / name).mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / "scripts/ops/deploy-ujian.sh", self.root / "scripts/ops/deploy-ujian.sh")
        self.write("scripts/ops/compose.sh", COMPOSE)
        for name in ("docker", "git", "python3", "flock"):
            self.write(f"bin/{name}", MOCK)
        self.manifest = self.root / ".server-notes/images.env"
        self.manifest.write_text("PYTHON_IMAGE=python@sha256:example\nRELEASE_TAG=previous\n")

    def write(self, relative, content):
        path = self.root / relative
        path.write_text(content, newline="\n")
        path.chmod(0o755)

    def release(self, mode="", sha=SHA):
        env = os.environ.copy()
        env.update(
            PATH=str(self.root / "bin") + os.pathsep + env["PATH"],
            TRACE=(self.root / "trace").as_posix(), TEST_SHA=SHA, FAIL_MODE=mode,
        )
        result = subprocess.run(
            [BASH, "-c", 'export PATH="$(cd "$1" && pwd)/bin:$PATH"; exec bash scripts/ops/deploy-ujian.sh release "$2"',
             "release-test", self.root.as_posix(), sha],
            cwd=self.root, env=env, capture_output=True, text=True, timeout=20,
        )
        trace = self.root / "trace"
        return result, trace.read_text() if trace.exists() else ""

    def test_success_prunes_only_old_project_tags_and_its_own_builder(self):
        result, trace = self.release()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("RELEASE_TAG=candidate", self.manifest.read_text())
        self.assertIn("RELEASE_TAG=previous", (self.root / ".server-notes/images.previous.env").read_text())
        removed = [line for line in trace.splitlines() if line.startswith("docker image rm")]
        self.assertEqual(removed, [f"docker image rm ujian-{name}:oldest" for name in ("backend", "frontend", "gateway")])
        self.assertIn("--builder ujian-ci --all --force --reserved-space 0 --max-used-space 512MB", trace)
        self.assertIn("docker buildx stop ujian-ci", trace)
        self.assertNotIn("system prune", trace)
        self.assertNotIn("volume", trace)

    def test_build_or_schema_failure_leaves_running_application_alone(self):
        for mode in ("build", "schema"):
            with self.subTest(mode=mode):
                result, trace = self.release(mode)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("RELEASE_TAG=previous", self.manifest.read_text())
                self.assertNotIn("compose@candidate up", trace)
                self.assertIn("buildx prune --builder ujian-ci", trace)
                (self.root / "trace").unlink()

    def test_startup_and_health_failures_restore_previous_release(self):
        for mode in ("startup", "health"):
            with self.subTest(mode=mode):
                result, trace = self.release(mode)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("RELEASE_TAG=previous", self.manifest.read_text())
                self.assertIn("compose@previous up -d --no-build", trace)
                self.assertIn("Previous release recovered", result.stderr)
                (self.root / "trace").unlink()

    def test_invalid_sha_and_lock_refusal_never_build(self):
        result, trace = self.release(sha="b" * 40)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("compose@", trace)
        result, trace = self.release("lock")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("compose@", trace)

    def test_creates_a_dedicated_builder_when_missing(self):
        result, trace = self.release("create")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("buildx create --name ujian-ci --driver docker-container", trace)


if __name__ == "__main__":
    unittest.main()
