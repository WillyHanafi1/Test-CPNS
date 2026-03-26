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
            self._redis = redis.from_url(
                settings.REDIS_URL, 
                decode_responses=True,
                max_connections=50,           # Tuned untuk 1 vCPU/2GB. Naik ke 200 saat upgrade ke 4+ vCPU
                socket_timeout=5,
                socket_connect_timeout=5,     # Timeout saat membuka koneksi baru
                retry_on_timeout=True,
                health_check_interval=30
            )
        return self._redis

    async def set_cache(self, key: str, value: Any, expire: int = 3600):
        try:
            def json_serial(obj):
                if isinstance(obj, datetime):
                    return obj.isoformat()
                if isinstance(obj, uuid.UUID):
                    return str(obj)
                return str(obj) # Fallback for other non-serializable types
                
            await self.redis.set(key, json.dumps(value, default=json_serial), ex=expire)
        except Exception as e:
            # Fallback: log error but don't break the request
            print(f"REDIS CACHE SET ERROR: {e}")
            pass

    async def get_cache(self, key: str) -> Optional[Any]:
        try:
            data = await self.redis.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            # Fallback: log error and treat as cache miss
            print(f"REDIS CACHE GET ERROR: {e}")
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
