"""Check dump streaming, numeric container users and failed archive verification."""
import os
import importlib.util
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
BASH = (shutil.which('bash') if os.name != 'nt' else
        shutil.which('bash', path=r'C:\Program Files\Git\bin'))

DUMP = '''#!/usr/bin/env bash
set -eu
test "$PGUSER" = postgres
test "$PGDATABASE" = test
test "$PGHOST" = 127.0.0.1
test "$PGPASSWORD" = private-test-password
test "${DATABASE_URL-unset}" = unset
printf '%s\\n' "$*" > "$TRACE"
for arg in "$@"; do
    case "$arg" in --file=*) output="${arg#--file=}";; esac
done
printf 'PGDMP synthetic verified archive' > "$output"
'''

RESTORE = '''#!/usr/bin/env bash
set -eu
test "${FAIL_RESTORE:-0}" = 0
test "$1" = --list
test -s "$2"
'''


@unittest.skipUnless(BASH, 'Bash is required')
class BackupDumpTests(unittest.TestCase):
    def run_dump(self, fail=False):
        with tempfile.TemporaryDirectory(prefix='ujian-dump-test-') as name:
            root = Path(name)
            for command, source in [('pg_dump', DUMP), ('pg_restore', RESTORE)]:
                path = root / command
                path.write_text(source, newline='\n')
                path.chmod(0o755)
            trace = root / 'trace'
            env = {**os.environ, 'TRACE': trace.as_posix(), 'BACKUP_STDOUT': '1',
                   'DATABASE_URL': 'test', 'PGHOST': '127.0.0.1', 'PGPASSWORD': 'private-test-password',
                   'FAIL_RESTORE': '1' if fail else '0'}
            env.pop('PGUSER', None)
            result = subprocess.run([BASH, '-c',
                'export PATH="$(cd "$1" && pwd):$PATH"; exec bash scripts/ops/dump-postgres.sh',
                '_', root.as_posix()], cwd=ROOT, env=env, capture_output=True)
            arguments = trace.read_text()
            self.assertNotIn('private-test-password', arguments)
            self.assertNotIn(b'private-test-password', result.stdout + result.stderr)
            return result

    def test_numeric_user_fallback_streams_only_the_verified_archive(self):
        result = self.run_dump()
        self.assertEqual(result.returncode, 0, result.stderr.decode())
        self.assertEqual(result.stdout, b'PGDMP synthetic verified archive')

    def test_failed_archive_validation_does_not_stream_plaintext(self):
        result = self.run_dump(fail=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout, b'')


class DatabaseEnvironmentTests(unittest.TestCase):
    def test_pooler_credentials_are_decoded_into_libpq_fields_without_using_command_arguments(self):
        spec = importlib.util.spec_from_file_location('prepare_backup', ROOT / 'scripts/ops/prepare_backup.py')
        helper = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(helper)
        result = helper.database_environment('postgresql+asyncpg://postgres.ref:p%40ss%24%23%25@pooler.example:5432/postgres?sslmode=require')
        self.assertEqual(dict(line.split('=', 1) for line in result.splitlines()), {
            'DATABASE_URL': 'postgres', 'PGHOST': 'pooler.example', 'PGPORT': '5432',
            'PGUSER': 'postgres.ref', 'PGPASSWORD': 'p@ss$#%'})
        with self.assertRaises(ValueError):
            helper.database_environment('postgresql://user:pass%0Aline@db.example/database')
        result = helper.database_environment('postgresql://postgres.ref:synthetic@aws-1.pooler.supabase.com:6543/postgres')
        self.assertIn('PGPORT=5432\n', result)


if __name__ == '__main__':
    unittest.main()
