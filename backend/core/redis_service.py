import redis.asyncio as redis
import json
import uuid
from datetime import datetime
from typing import Optional, Any
from backend.config import settings

class RedisService:
    def __init__(self):
        self._redis = None

    @property
    def redis(self):
        if self._redis is None:
            self._redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
        return self._redis

    async def set_cache(self, key: str, value: Any, expire: int = 3600):
        def json_serial(obj):
            if isinstance(obj, (datetime)):
                return obj.isoformat()
            if isinstance(obj, uuid.UUID):
                return str(obj)
            raise TypeError(f"Type {type(obj)} not serializable")
            
        await self.redis.set(key, json.dumps(value, default=json_serial), ex=expire)

    async def get_cache(self, key: str) -> Optional[Any]:
        data = await self.redis.get(key)
        if data:
            return json.loads(data)
        return None

    async def delete_cache(self, key: str):
        await self.redis.delete(key)

    async def clear_pattern(self, pattern: str):
        """SCAN-based pattern delete — safe for production (non-blocking)."""
        cursor = 0
        while True:
            cursor, keys = await self.redis.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                await self.redis.delete(*keys)
            if cursor == 0:
                break

redis_service = RedisService()
