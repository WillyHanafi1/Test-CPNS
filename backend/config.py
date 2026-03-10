import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "CPNS Platform"
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "cpns_user")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "cpns_password")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "cpns_db")
    DATABASE_URL: str = f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@localhost:5432/{POSTGRES_DB}"
    
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    class Config:
        case_sensitive = True

settings = Settings()
