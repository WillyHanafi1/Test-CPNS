"""Linux/root-only regression: fix root-owned 0700 storage, then back up as UID 1000."""
import base64
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('prepare_backup', '/checks/scripts/ops/prepare_backup.py')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


@unittest.skipUnless(os.name == 'posix' and os.geteuid() == 0, 'Requires an isolated Linux root container')
class BackupPermissions(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='ujian-backup-permissions-')
        self.root = Path(self.temporary.name)
        self.root.chmod(0o755)
        for name in ('.secrets', '.server-notes', '.server-notes/backups'):
            (self.root / name).mkdir(mode=0o700)
        for name in helper.REQUIRED:
            path = self.root / name
            path.write_bytes(base64.urlsafe_b64encode(os.urandom(32)) if name.endswith('backup.key') else b'synthetic-private-config')
            path.chmod(0o600)

    def tearDown(self):
        self.temporary.cleanup()

    def test_repairs_existing_root_metadata_without_exposing_secrets_or_touching_manual_archives(self):
        storage = self.root / '.server-notes/backups'
        metadata = storage / 'latest-database.json'
        metadata.write_text('{}')
        metadata.chmod(0o600)
        manual = storage / 'manual-retained.dump'
        manual.write_bytes(b'operator archive')
        manual.chmod(0o600)
        originals = {name: (self.root / name).read_bytes() for name in helper.REQUIRED}
        helper.prepare(self.root, 1000, 1000)
        for name in helper.REQUIRED:
            path = self.root / name
            self.assertEqual(path.read_bytes(), originals[name])
            self.assertEqual((path.stat().st_uid, path.stat().st_gid), (1000, 1000))
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(storage.stat().st_mode), 0o700)
        self.assertEqual(manual.stat().st_uid, 0)
        env = {**os.environ, 'BACKUP_KEY_FILE': str(self.root / '.secrets/backup.key'),
               'BACKUP_DIRECTORY': str(storage), 'BACKUP_STORAGE': 'local'}
        run = subprocess.run([sys.executable, '/checks/backup.py', 'capture', 'database'],
            input=b'PGDMP synthetic backup', capture_output=True, env=env, user=1000, group=1000, extra_groups=[])
        self.assertEqual(run.returncode, 0, run.stderr.decode())
        result = json.loads(metadata.read_text())
        self.assertTrue(result['encrypted'] and result['verified'])
        self.assertEqual(result['destination'], 'local')
        archives = list(storage.glob('database-*.enc'))
        self.assertEqual(len(archives), 1)
        self.assertEqual(archives[0].stat().st_uid, 1000)
        self.assertNotIn(b'PGDMP', archives[0].read_bytes())
        # A second invocation is routine and does not require manual chmod/chown.
        helper.prepare(self.root, 1000, 1000)

    def test_rejects_configuration_symlinks_before_changing_any_external_file(self):
        outside = self.root / 'external-config'
        outside.write_bytes(b'external content')
        original = outside.stat()
        target = self.root / '.secrets/operations.env'
        target.unlink()
        target.symlink_to(outside)
        with self.assertRaises(ValueError):
            helper.prepare(self.root, 1000, 1000)
        self.assertEqual(outside.stat().st_uid, original.st_uid)
        self.assertEqual(outside.read_bytes(), b'external content')


if __name__ == '__main__':
    unittest.main(verbosity=2)
