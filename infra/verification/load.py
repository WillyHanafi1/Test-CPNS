"""Bounded concurrency measurements only inside the named disposable image environment."""
import asyncio
import json
import math
import os
from time import perf_counter
import uuid

import httpx
from sqlalchemy import select, func
from backend.db.session import async_session_maker, engine
from backend.models.models import Package, User, ExamResponse
from backend.core.security import create_access_token


async def main():
    if os.environ.get('DATABASE_URL') != 'postgresql+asyncpg://ujian_verify:verification-only@postgres:5432/ujian_verify':
        raise RuntimeError('Load checks are restricted to the disposable ujian_verify database')
    async with async_session_maker() as db:
        package = await db.scalar(select(Package).where(Package.title == 'Disposable deployment verification'))
        assert package and package.published_revision_id
        package_id = package.id
        users = [User(email=f'load-{uuid.uuid4().hex}@example.com', hashed_password='synthetic-disabled-login',
            is_active=True, role='participant') for _ in range(50)]
        db.add_all(users)
        await db.commit()
        tokens = [create_access_token({'sub': u.email}) for u in users]
    acknowledged = set()
    async with httpx.AsyncClient(base_url='http://gateway:8080', headers={'Host':'tocpns.my.id','X-Exam-Protocol':'2'},
            timeout=45, limits=httpx.Limits(max_connections=50, max_keepalive_connections=50)) as http:
        async def participant(token, stage):
            headers = {'Authorization': f'Bearer {token}'}
            started = perf_counter()
            opened = await http.post(f'/api/v1/exam/start/{package_id}?writer_id=load-tab', headers=headers)
            assert opened.status_code == 200, f'start status={opened.status_code}'
            state = opened.json(); sid = state['session_id']; q = state['package']['questions'][0]
            selected = q['options'][stage % 2]['id']
            body = {'question_id':q['id'], 'option_id':selected, 'mutation_id':str(uuid.uuid4()),
                'expected_revision':state['revisions'].get(q['id'],0), 'writer_epoch':state['writer_epoch'],
                'writer_id':'load-tab'}
            t = perf_counter()
            saved = await http.post(f'/api/v1/exam/autosave/{sid}',headers=headers,json=body)
            save_ms = (perf_counter()-t)*1000
            assert saved.status_code == 200, f'save status={saved.status_code}'
            resumed = await http.get(f'/api/v1/exam/session/{sid}/state', headers=headers)
            assert resumed.status_code == 200, f'state status={resumed.status_code}'
            assert resumed.json()['answers'][q['id']] == selected
            assert resumed.json()['revisions'][q['id']] == saved.json()['revision']
            acknowledged.add(uuid.UUID(sid))
            return save_ms, (perf_counter()-started)*1000
        for stage, concurrency in enumerate((10,25,50)):
            results = await asyncio.gather(*(participant(token, stage) for token in tokens[:concurrency]))
            def percentile(values):
                ordered=sorted(values)
                return round(ordered[math.ceil(len(ordered)*.95)-1],1)
            print('LOAD ' + json.dumps({'concurrent_users':concurrency,'successful_flows':len(results),
                'autosave_p95_ms':percentile([r[0] for r in results]),
                'start_save_resume_p95_ms':percentile([r[1] for r in results])}), flush=True)
    async with async_session_maker() as db:
        saved = await db.scalar(select(func.count(ExamResponse.id)).where(ExamResponse.session_id.in_(acknowledged)))
        assert saved == 50
    print('PASS: 85 concurrent-stage answer acknowledgements verified; 50 durable response rows. Synthetic environment only.', flush=True)
    await engine.dispose()


if __name__ == '__main__':
    asyncio.run(main())
