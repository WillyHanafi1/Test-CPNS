import uuid


async def test_finish_requires_authentication(client):
    response = await client.post(f"/api/v1/exam/finish/{uuid.uuid4()}")
    assert response.status_code == 401
