"""Bounded concurrency measurements only inside the named disposable image environment."""
import asyncio
import json
import math
import os
from time import perf_counter
import uuid
from datetime import datetime, timezone

import httpx
from sqlalchemy import select, func
from backend.db.session import async_session_maker, engine
from backend.models.models import Package, User, ExamResponse, ExamSession
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
    acknowledged, expected_rows, states = set(), set(), {}
    base_url = os.getenv('LOAD_BASE_URL', 'http://gateway:8080')
    if base_url not in {'http://gateway:8080', 'http://backend:8001'}:
        raise RuntimeError('Load target must stay inside the disposable Docker network')
    soak_seconds = max(0, min(7200, int(os.getenv('LOAD_SOAK_SECONDS', '0'))))
    interval = max(5, int(os.getenv('LOAD_INTERVAL_SECONDS', '15')))
    async with httpx.AsyncClient(base_url=base_url, headers={'Host':'tocpns.my.id','X-Exam-Protocol':'2'},
            timeout=45, limits=httpx.Limits(max_connections=50, max_keepalive_connections=50)) as http:
        async def participant(token, stage):
            headers = {'Authorization': f'Bearer {token}'}
            started = perf_counter()
            opened = await http.post(f'/api/v1/exam/start/{package_id}?writer_id=load-tab', headers=headers)
            assert opened.status_code == 200, f'start status={opened.status_code}'
            state = opened.json()
            sid = state['session_id']
            q = state['package']['questions'][0]
            states[token] = state
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
            expected_rows.add((sid, q['id']))
            return save_ms, (perf_counter()-started)*1000
        for stage, concurrency in enumerate((10,25,50)):
            results = await asyncio.gather(*(participant(token, stage) for token in tokens[:concurrency]))
            def percentile(values):
                ordered=sorted(values)
                return round(ordered[math.ceil(len(ordered)*.95)-1],1)
            print('LOAD ' + json.dumps({'concurrent_users':concurrency,'successful_flows':len(results),
                'autosave_p95_ms':percentile([r[0] for r in results]),
                'start_save_resume_p95_ms':percentile([r[1] for r in results])}), flush=True)
        deadline, round_number, saves = perf_counter() + soak_seconds, 0, 0
        while soak_seconds and perf_counter() < deadline:
            tick = perf_counter()
            async def save_existing(token):
                state = states[token]
                sid = state['session_id']
                headers = {'Authorization': f'Bearer {token}'}
                current = await http.get(f'/api/v1/exam/session/{sid}/state', headers=headers)
                assert current.status_code == 200, f'soak state={current.status_code}'
                q = state['package']['questions'][round_number % len(state['package']['questions'])]
                option = q['options'][round_number % 2]['id']
                saved = await http.post(f'/api/v1/exam/autosave/{sid}', headers=headers, json={
                    'question_id': q['id'], 'option_id': option, 'mutation_id': str(uuid.uuid4()),
                    'expected_revision': current.json()['revisions'].get(q['id'], 0),
                    'writer_epoch': current.json()['writer_epoch'], 'writer_id': 'load-tab'})
                assert saved.status_code == 200, f'soak save={saved.status_code}'
                resumed = await http.get(f'/api/v1/exam/session/{sid}/state', headers=headers)
                assert resumed.status_code == 200 and resumed.json()['answers'][q['id']] == option
                assert resumed.json()['revisions'][q['id']] == saved.json()['revision']
                expected_rows.add((sid, q['id']))
            await asyncio.gather(*(save_existing(token) for token in tokens))
            saves += len(tokens)
            round_number += 1
            print('SOAK ' + json.dumps({'round': round_number, 'acknowledged_saves': saves,
                'round_seconds': round(perf_counter() - tick, 2)}), flush=True)
            await asyncio.sleep(max(0, min(interval - (perf_counter() - tick), deadline - perf_counter())))
        if soak_seconds:
            async def submit(token):
                result = await http.post(f'/api/v1/exam/finish/{states[token]["session_id"]}',
                    headers={'Authorization': f'Bearer {token}'})
                assert result.status_code == 200, f'submit={result.status_code}'
            await asyncio.gather(*(submit(token) for token in tokens))
            until = perf_counter() + 90
            while True:
                async with async_session_maker() as db:
                    finished = await db.scalar(select(func.count()).select_from(ExamSession).where(
                        ExamSession.id.in_(acknowledged), ExamSession.status == 'finished'))
                if finished == len(acknowledged):
                    break
                assert perf_counter() < until, f'worker did not finish all sessions: {finished}/{len(acknowledged)}'
                await asyncio.sleep(2)
            print('PASS: all 50 submitted sessions scored by the worker after sustained writes.', flush=True)
    async with async_session_maker() as db:
        saved = await db.scalar(select(func.count(ExamResponse.id)).where(ExamResponse.session_id.in_(acknowledged)))
        assert saved == len(expected_rows), (saved, len(expected_rows))
    print('PASS: ' + json.dumps({'burst_flows': 85, 'durable_response_rows': saved,
        'soak_seconds': soak_seconds, 'observed_at': datetime.now(timezone.utc).isoformat(),
        'synthetic_environment_only': True}), flush=True)
    await engine.dispose()


if __name__ == '__main__':
    asyncio.run(main())
