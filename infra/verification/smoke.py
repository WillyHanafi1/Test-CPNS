"""Exercise production images only against a disposable, network-isolated database."""
import asyncio
import os
import base64
import hashlib
import hmac
import json
import time
import uuid

import httpx

from backend.db.session import Base, engine, async_session_maker
from backend.models import models  # noqa: F401
from sqlalchemy import select, func
from backend.core.redis_service import redis_service
from backend.config import settings
from backend.core.security import create_access_token, create_reset_token, verify_reset_token
import jwt


async def main():
    assert os.environ['DATABASE_URL'] == 'postgresql+asyncpg://ujian_verify:verification-only@postgres:5432/ujian_verify'
    def encode_part(value):
        return base64.urlsafe_b64encode(json.dumps(value, separators=(',', ':')).encode()).rstrip(b'=')
    # Existing python-jose HS256 tokens use the standard JWS wire format.
    payload = {'sub': 'legacy@example.com', 'exp': int(time.time()) + 60}
    message = encode_part({'alg': 'HS256', 'typ': 'JWT'}) + b'.' + encode_part(payload)
    legacy = message + b'.' + base64.urlsafe_b64encode(hmac.new(settings.SECRET_KEY.encode(), message, hashlib.sha256).digest()).rstrip(b'=')
    assert jwt.decode(legacy, settings.SECRET_KEY, algorithms=['HS256'])['sub'] == payload['sub']
    assert jwt.decode(create_access_token({'sub': payload['sub']}), settings.SECRET_KEY, algorithms=['HS256'])['sub'] == payload['sub']
    assert verify_reset_token(create_reset_token(payload['sub'])) == payload['sub']
    assert verify_reset_token('malformed.token') is None
    try:
        jwt.decode(jwt.encode(payload, settings.SECRET_KEY, algorithm='HS512'), settings.SECRET_KEY, algorithms=['HS256'])
    except jwt.InvalidAlgorithmError:
        pass
    else:
        raise AssertionError('Unexpected JWT algorithm was accepted')
    print('PASS: legacy HS256 compatibility, reset tokens, and rejection of a different JWT algorithm')
    # This creates schema ONLY in the named ephemeral verification DB.
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with async_session_maker() as database:
        package = models.Package(title='Disposable deployment verification', description='Synthetic data only',
                                 category='Mix', is_published=True, is_premium=False)
        database.add(package)
        await database.flush()
        package_id = str(package.id)
        for number in range(1, 111):
            segment = 'TWK' if number <= 30 else 'TIU' if number <= 65 else 'TKP'
            question = models.Question(package_id=package.id, content=f'Verification question {number}',
                                       segment=segment, number=number, discussion='Synthetic explanation.')
            database.add(question)
            await database.flush()
            for index, label in enumerate('ABCDE'):
                database.add(models.QuestionOption(question_id=question.id, label=label,
                             content=f'Option {label}', score=(5-index if segment == 'TKP' else 5 if index == 0 else 0)))
        await database.commit()
    async with httpx.AsyncClient(base_url='http://gateway:8080', headers={'Host': 'tocpns.my.id', 'X-Exam-Protocol':'2'}, timeout=20) as client:
        health = await client.get('/health')
        assert health.status_code == 200, health.text
        assert health.json()['db'] == health.json()['redis'] == 'ok'
        print('PASS: gateway, database, and Redis health')
        for name in ['x-content-type-options', 'x-frame-options', 'referrer-policy', 'strict-transport-security']:
            assert name in health.headers, name
        assert health.headers['cache-control'] == 'no-store'
        print('PASS: security headers and API cache prevention')
        landing = await client.get('/')
        assert landing.status_code == 200 and 'Latihan terarah' in landing.text
        assert 'http://localhost:8001' not in landing.text
        print('PASS: production frontend through gateway')
        redirect = await client.get('/catalog', headers={'Host': 'www.tocpns.my.id'})
        assert redirect.status_code == 308 and redirect.headers['location'] == 'https://tocpns.my.id/catalog'
        print('PASS: www canonical redirect')
        email = 'deployment-check@example.com'
        password = 'VerificationOnly123!'
        registered = await client.post('/api/v1/auth/register', json={'email': email, 'password': password, 'full_name': 'Disposable deployment check'})
        assert registered.status_code == 201, f'Registration returned {registered.status_code}'
        login = await client.post('/api/v1/auth/login', data={'username': email, 'password': password})
        assert login.status_code == 200, f'Login returned {login.status_code}'
        cookie = login.headers.get('set-cookie', '').lower()
        assert 'httponly' in cookie and 'secure' in cookie and 'samesite=lax' in cookie
        assert 'access_token' not in login.json()
        print('PASS: registration, login, Secure/HttpOnly/SameSite cookie')
        # The diagnostic transport is HTTP; manually forward this synthetic Secure cookie.
        token = login.cookies.get('access_token')
        me = await client.get('/api/v1/auth/me', headers={'Cookie': f'access_token={token}'})
        assert me.status_code == 200 and me.json()['email'] == email
        catalog = await client.get('/api/v1/packages')
        assert catalog.status_code == 200, f'Catalog returned {catalog.status_code}'
        print('PASS: authenticated profile and public catalog')
        auth = {'Cookie': f'access_token={token}'}
        started = await client.post(f'/api/v1/exam/start/{package_id}', headers=auth)
        assert started.status_code == 200, f'Exam start returned {started.status_code}'
        session_id = started.json()['session_id']
        questions = started.json()['package']['questions']
        assert len(questions) == 110
        chosen = {}
        for question in questions:
            assert 'discussion' not in question
            assert all('score' not in option for option in question['options'])
            chosen.setdefault(question['segment'], question)
        for question in chosen.values():
            answer = next(option for option in question['options'] if option['label'] == 'A')
            saved = await client.post(f'/api/v1/exam/autosave/{session_id}', headers=auth,
                                      json={'question_id': question['id'], 'option_id': answer['id']})
            assert saved.status_code == 200, f'Autosave returned {saved.status_code}'
        async with async_session_maker() as database:
            count = await database.scalar(select(func.count(models.ExamResponse.id)).where(models.ExamResponse.session_id == uuid.UUID(session_id)))
            assert count == 3
        await redis_service.redis.delete(f"exam_answers:{registered.json()['id']}:{session_id}")
        print('PASS: answer secrecy and database-acknowledged autosave independent of Redis answer cache')
        submitted = await client.post(f'/api/v1/exam/finish/{session_id}', headers=auth)
        assert submitted.status_code == 200
        for _ in range(60):
            result = await client.get(f'/api/v1/exam/result/{session_id}', headers=auth)
            assert result.status_code == 200
            if result.json()['status'] == 'finished':
                break
            await asyncio.sleep(0.5)
        else:
            raise AssertionError('Background scoring did not finish within 30 seconds')
        assert result.json()['total_score'] == 15
        assert all(result.json()[name] == 5 for name in ['score_twk', 'score_tiu', 'score_tkp'])
        duplicate = await client.post(f'/api/v1/exam/finish/{session_id}', headers=auth)
        assert duplicate.json()['status'] == 'finished'
        print('PASS: asynchronous Celery scoring, category totals, and idempotent duplicate submit')
        cors = await client.options('/api/v1/auth/me', headers={'Origin': 'https://tocpns.my.id', 'Access-Control-Request-Method': 'GET'})
        assert cors.headers.get('access-control-allow-origin') == 'https://tocpns.my.id'
        denied = await client.options('/api/v1/auth/me', headers={'Origin': 'https://untrusted.example', 'Access-Control-Request-Method': 'GET'})
        assert denied.status_code == 400 and 'access-control-allow-origin' not in denied.headers
        print('PASS: CORS allows the production origin and rejects an unrelated origin')
        # An untrusted direct caller cannot bypass the login limit using forged CF headers.
        outcomes = []
        for index in range(6):
            result = await client.post('/api/v1/auth/login', data={'username': email, 'password': 'incorrect'}, headers={'CF-Connecting-IP': f'198.51.100.{index+10}', 'X-Forwarded-For': f'198.51.100.{index+10}'})
            outcomes.append(result.status_code)
        assert 429 in outcomes, outcomes
        print('PASS: rate limiting resists forged forwarding headers')
        logout = await client.post('/api/v1/auth/logout', headers={'Cookie': f'access_token={token}'})
        assert logout.status_code == 200
        rejected = await client.get('/api/v1/auth/me', headers={'Cookie': f'access_token={token}'})
        assert rejected.status_code == 401
        print('PASS: logout revokes the token in Redis')
    await engine.dispose()
    await redis_service.redis.aclose()


if __name__ == '__main__':
    asyncio.run(main())
