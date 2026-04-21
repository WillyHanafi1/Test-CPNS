import pytest
import json
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, patch
from backend.core.redis_service import RedisService

@pytest.fixture
def redis_service():
    service = RedisService()
    service._redis = AsyncMock()
    return service

@pytest.mark.asyncio
async def test_set_cache(redis_service):
    key = "test_key"
    value = {"a": 1, "b": "2"}
    expire = 3600
    await redis_service.set_cache(key, value, expire)
    redis_service.redis.set.assert_called_once_with(key, json.dumps(value), ex=expire)

@pytest.mark.asyncio
async def test_set_cache_with_datetime(redis_service):
    key = "test_key"
    now = datetime.now()
    value = {"date": now}
    expire = 3600
    await redis_service.set_cache(key, value, expire)
    redis_service.redis.set.assert_called_once()
    called_args = redis_service.redis.set.call_args
    assert called_args[0][0] == key
    assert called_args[1]["ex"] == expire
    parsed_value = json.loads(called_args[0][1])
    assert parsed_value["date"] == now.isoformat()

@pytest.mark.asyncio
async def test_set_cache_with_uuid(redis_service):
    key = "test_key"
    uid = uuid.uuid4()
    value = {"id": uid}
    expire = 3600
    await redis_service.set_cache(key, value, expire)
    redis_service.redis.set.assert_called_once()
    called_args = redis_service.redis.set.call_args
    assert called_args[0][0] == key
    assert called_args[1]["ex"] == expire
    parsed_value = json.loads(called_args[0][1])
    assert parsed_value["id"] == str(uid)

@pytest.mark.asyncio
async def test_set_cache_with_unserializable(redis_service):
    key = "test_key"
    value = {"obj": object()}
    expire = 3600
    await redis_service.set_cache(key, value, expire)
    # The inner error should be caught and print called, so set should not be called
    redis_service.redis.set.assert_not_called()

@pytest.mark.asyncio
async def test_set_cache_exception_handling(redis_service):
    redis_service.redis.set.side_effect = Exception("Redis error")
    # Should not raise exception
    await redis_service.set_cache("key", "value")

@pytest.mark.asyncio
async def test_get_cache_hit(redis_service):
    key = "test_key"
    value = {"a": 1, "b": "2"}
    redis_service.redis.get.return_value = json.dumps(value)
    result = await redis_service.get_cache(key)
    redis_service.redis.get.assert_called_once_with(key)
    assert result == value

@pytest.mark.asyncio
async def test_get_cache_miss(redis_service):
    key = "test_key"
    redis_service.redis.get.return_value = None
    result = await redis_service.get_cache(key)
    redis_service.redis.get.assert_called_once_with(key)
    assert result is None

@pytest.mark.asyncio
async def test_get_cache_exception_handling(redis_service):
    redis_service.redis.get.side_effect = Exception("Redis error")
    result = await redis_service.get_cache("key")
    assert result is None

@pytest.mark.asyncio
async def test_delete_cache(redis_service):
    key = "test_key"
    await redis_service.delete_cache(key)
    redis_service.redis.delete.assert_called_once_with(key)

@pytest.mark.asyncio
async def test_clear_pattern(redis_service):
    pattern = "test_*"
    # Simulate scan returning cursor=0 and a list of keys
    redis_service.redis.scan.return_value = (0, ["test_1", "test_2"])
    await redis_service.clear_pattern(pattern)
    redis_service.redis.scan.assert_called_once_with(cursor=0, match=pattern, count=100)
    redis_service.redis.delete.assert_called_once_with("test_1", "test_2")

@pytest.mark.asyncio
async def test_clear_pattern_empty(redis_service):
    pattern = "test_*"
    # Simulate scan returning cursor=0 and an empty list of keys
    redis_service.redis.scan.return_value = (0, [])
    await redis_service.clear_pattern(pattern)
    redis_service.redis.scan.assert_called_once_with(cursor=0, match=pattern, count=100)
    redis_service.redis.delete.assert_not_called()

@pytest.mark.asyncio
async def test_clear_pattern_multiple_iterations(redis_service):
    pattern = "test_*"
    # Simulate scan returning cursor=1 and keys, then cursor=0 and keys
    redis_service.redis.scan.side_effect = [
        (1, ["test_1", "test_2"]),
        (0, ["test_3"])
    ]
    await redis_service.clear_pattern(pattern)
    assert redis_service.redis.scan.call_count == 2
    redis_service.redis.scan.assert_any_call(cursor=0, match=pattern, count=100)
    redis_service.redis.scan.assert_any_call(cursor=1, match=pattern, count=100)
    assert redis_service.redis.delete.call_count == 2
    redis_service.redis.delete.assert_any_call("test_1", "test_2")
    redis_service.redis.delete.assert_any_call("test_3")

def test_redis_property_initialization():
    service = RedisService()
    # Ensure settings.REDIS_URL is mocked or available in the test environment
    # Actually, we should patch redis.from_url to not attempt connection
    with patch('backend.core.redis_service.redis.from_url') as mock_from_url:
        mock_redis = AsyncMock()
        mock_from_url.return_value = mock_redis

        # Accessing the property should initialize _redis
        redis_client = service.redis
        assert redis_client == mock_redis
        mock_from_url.assert_called_once()

        # Accessing it again should not call from_url again
        redis_client2 = service.redis
        assert redis_client2 == mock_redis
        mock_from_url.assert_called_once()
