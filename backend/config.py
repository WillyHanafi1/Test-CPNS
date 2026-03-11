from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List
import os
import warnings

class Settings(BaseSettings):
    PROJECT_NAME: str = "CPNS Platform"
    
    # These will be automatically loaded from .env if present
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str = "your-secret-key-keep-it-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days

    # CORS — comma-separated origins in .env, e.g. CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://localhost:3002,http://127.0.0.1:3001,http://127.0.0.1:3002")

    # Cookie security — set to True when running behind HTTPS in production
    COOKIE_SECURE: bool = os.getenv("ENV") == "production"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=[".env", os.path.join(os.path.dirname(__file__), ".env")],
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()

# Issue #9: Warn if default SECRET_KEY is used
if settings.SECRET_KEY == "your-secret-key-keep-it-secret" and os.getenv("ENV") == "production":
    warnings.warn(
        "\n⚠️  CRITICAL SECURITY WARNING: Anda menggunakan SECRET_KEY default di production!\n"
        "   Set SECRET_KEY di file .env dengan string acak yang kuat.\n"
        "   Contoh: openssl rand -hex 32",
        stacklevel=1,
    )
