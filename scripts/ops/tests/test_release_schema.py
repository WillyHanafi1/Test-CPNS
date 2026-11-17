import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location(
    "release_schema", Path(__file__).resolve().parents[1] / "check-release-schema.py"
)
schema = importlib.util.module_from_spec(spec)
spec.loader.exec_module(schema)


class SchemaPreflightTests(unittest.TestCase):
    def test_resolves_annotated_revisions_and_merge_parents_without_executing_modules(self):
        with tempfile.TemporaryDirectory() as directory:
            versions = Path(directory)
            files = {
                "base.py": "revision = 'base'\ndown_revision = None\nraise RuntimeError('must not run')\n",
                "left.py": "revision: str = 'left'\ndown_revision: str = 'base'\n",
                "right.py": "revision = 'right'\ndown_revision = 'base'\n",
                "merge.py": "revision = 'merge'\ndown_revision = ('left', 'right')\n",
            }
            for name, content in files.items():
                (versions / name).write_text(content)
            self.assertEqual(schema.expected_revision(versions), "merge")
            (versions / "merge.py").unlink()
            with self.assertRaisesRegex(RuntimeError, "exactly one"):
                schema.expected_revision(versions)

    def test_bootstrap_keeps_candidate_check_and_live_probe_failure_blocks_release(self):
        with patch.object(schema, "expected_revision", return_value="expected"), \
             patch.object(schema.subprocess, "check_output", return_value="") as status, \
             patch.object(schema.subprocess, "run") as probe:
            schema.main()
            probe.assert_not_called()
            status.return_value = "running-container"
            probe.side_effect = schema.subprocess.CalledProcessError(1, "schema-probe")
            with self.assertRaises(schema.subprocess.CalledProcessError):
                schema.main()
            self.assertIn("SELECT version_num FROM alembic_version", probe.call_args.args[0][-2])
            self.assertEqual(probe.call_args.args[0][-1], "expected")


if __name__ == "__main__":
    unittest.main()
