"""Production migration preflight. Read-only SQL; emits aggregate counts, never connection credentials."""
import asyncio
import json
from pathlib import Path
import sys
import re
from urllib.parse import urlsplit,unquote

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from backend.config import settings


async def main():
    config=Config('/app/backend/alembic.ini')
    expected=set(ScriptDirectory.from_config(config).get_heads())
    engine=create_async_engine(settings.DATABASE_URL,echo=False,connect_args={
        'statement_cache_size':0,'timeout':15,'command_timeout':15,
        # Transaction poolers may reject arbitrary startup parameters. Read-only
        # mode is established inside the transaction before any application query.
    })
    try:
        async with engine.connect() as connection:
            await connection.execute(text('SET TRANSACTION READ ONLY'))
            readonly=await connection.scalar(text('SHOW transaction_read_only'))
            assert readonly=='on'
            current=await connection.run_sync(lambda raw:set(MigrationContext.configure(raw).get_current_heads()))
            report={'database_connected':True,'transaction_read_only':True,
                    'schema_matches':current==expected,'current_revisions':sorted(current),
                    'expected_revisions':sorted(expected)}
            for table in ['users','packages','questions','exam_sessions']:
                exists=await connection.scalar(text('SELECT to_regclass(:name)'),{'name':'public.'+table})
                if exists:
                    report[table+'_count']=await connection.scalar(text('SELECT count(*) FROM '+table))
            if 'exam_sessions_count' in report:
                rows=(await connection.execute(text('SELECT status, count(*) FROM exam_sessions GROUP BY status'))).all()
                report['session_status_counts']={row[0]:int(row[1]) for row in rows}
                report['unfinished_sessions']=await connection.scalar(text("SELECT count(*) FROM exam_sessions WHERE status IN ('ongoing','processing')"))
                report['expired_unfinished_sessions']=await connection.scalar(text("SELECT count(*) FROM exam_sessions WHERE status IN ('ongoing','processing') AND end_time < now()"))
            await connection.rollback()
            print(json.dumps(report,indent=2))
    finally:await engine.dispose()


if __name__=='__main__':
    try:asyncio.run(main())
    except Exception as error:
        # Connection errors may contain usernames/URLs. Emit only the exception type.
        diagnostic=str(error).lower()
        known_reasons={
            'tenant or user not found':'database tenant or user not found',
            'unsupported startup parameter':'pooler rejected a startup parameter',
            'password authentication failed':'database authentication failed',
            'connection refused':'database endpoint refused the connection',
            'circuit breaker':'database pooler circuit breaker is open',
            'too many clients':'database connection limit reached',
            'certificate verify failed':'database TLS certificate validation failed',
            'timeout':'database connection timed out',
        }
        reason=next((safe for match,safe in known_reasons.items() if match in diagnostic),'database connection requires further diagnosis')
        # Show a bounded diagnostic only after removing every configured value
        # and decoded URL credential. Never emit a raw database exception.
        redacted=str(error)
        secrets={str(value) for value in settings.model_dump().values() if isinstance(value,str) and len(value)>=4}
        url=urlsplit(settings.DATABASE_URL)
        for value in [url.username,url.password]:
            if value:secrets.update([value,unquote(value)])
        for value in sorted(secrets,key=len,reverse=True):redacted=redacted.replace(value,'[redacted]')
        redacted=re.sub(r'(?:postgresql\+asyncpg|postgresql|postgres)://\S+','[database-url]',redacted)
        redacted=' '.join(redacted.split())[:240]
        print(json.dumps({'database_connected':False,'error_type':type(error).__name__,'reason':reason,'redacted_diagnostic':redacted}))
        sys.exit(1)
