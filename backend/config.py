from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, model_validator
import os
import warnings

DOKU_SUPPORTED_METHODS = frozenset({
    "QRIS", "VIRTUAL_ACCOUNT_BANK_MANDIRI", "VIRTUAL_ACCOUNT_BNI", "VIRTUAL_ACCOUNT_BRI",
    "VIRTUAL_ACCOUNT_BCA", "VIRTUAL_ACCOUNT_DOKU", "VIRTUAL_ACCOUNT_BANK_PERMATA",
    "VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI", "VIRTUAL_ACCOUNT_BANK_CIMB", "VIRTUAL_ACCOUNT_BANK_DANAMON",
    "VIRTUAL_ACCOUNT_BTN", "VIRTUAL_ACCOUNT_BNC", "VIRTUAL_ACCOUNT_BSS", "VIRTUAL_ACCOUNT_BJB",
    "VIRTUAL_ACCOUNT_MAYBANK", "VIRTUAL_ACCOUNT_SINARMAS",
})

class Settings(BaseSettings):
    PROJECT_NAME: str = "CPNS Platform"
    
    # These will be automatically loaded from .env if present
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str = "your-secret-key-keep-it-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days

    # Frontend URL — dedicated config for reset emails, not dependent on CORS list ordering
    # pydantic-settings will override from env/file if FRONTEND_URL is set
    FRONTEND_URL: str = "http://localhost:3000"

    # CORS — comma-separated origins in .env, e.g. CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://localhost:3002,http://127.0.0.1:3001,http://127.0.0.1:3002"

    # Environment mode — pydantic-settings will load from .env
    ENV: str = "development"

    # Cookie security — derived from ENV via model_validator, NOT os.getenv()
    COOKIE_SECURE: bool = False

    @model_validator(mode="after")
    def derive_cookie_secure(self):
        """Set COOKIE_SECURE=True when ENV=production, after pydantic-settings has loaded .env"""
        if self.ENV == "production":
            self.COOKIE_SECURE = True
        return self

    # Google SSO
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")

    # Mail Settings (Optional for Forgot Password)
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD: str = os.getenv("MAIL_PASSWORD", "")
    MAIL_FROM: str = os.getenv("MAIL_FROM", "noreply@test-cpns.com")
    MAIL_PORT: int = int(os.getenv("MAIL_PORT", "587"))
    MAIL_SERVER: str = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_FROM_NAME: str = os.getenv("MAIL_FROM_NAME", "CAT CPNS Admin")
    MAIL_STARTTLS: bool = os.getenv("MAIL_STARTTLS", "True").lower() == "true"
    MAIL_SSL_TLS: bool = os.getenv("MAIL_SSL_TLS", "False").lower() == "true"
    
    # DOKU
    DOKU_CLIENT_ID: str = os.getenv("DOKU_CLIENT_ID", "")
    DOKU_SECRET_KEY: str = os.getenv("DOKU_SECRET_KEY", "")
    DOKU_ENVIRONMENT: str = os.getenv("DOKU_ENVIRONMENT", "sandbox")
    DOKU_ENABLED: bool = True
    DOKU_WEBHOOK_PROFILE: str = "non-snap"
    DOKU_PAYMENT_METHODS: str = "QRIS,VIRTUAL_ACCOUNT_DOKU,VIRTUAL_ACCOUNT_BNI"
    DOKU_CHECKOUT_DUE_MINUTES: int = Field(default=60, ge=5, le=1440)
    DOKU_EXPIRY_TIMEZONE: str = "Asia/Jakarta"
    DOKU_NOTIFICATION_URL: str = ""

    @property
    def doku_notification_url(self) -> str:
        return self.DOKU_NOTIFICATION_URL or f"{self.FRONTEND_URL.rstrip('/')}/api/payments/doku/notifications"

    @property
    def doku_payment_methods(self) -> list[str]:
        return list(dict.fromkeys(method.strip() for method in self.DOKU_PAYMENT_METHODS.split(',') if method.strip()))

    @property
    def doku_checkout_available(self) -> bool:
        from urllib.parse import urlsplit
        target = urlsplit(self.doku_notification_url)
        return bool(self.DOKU_ENABLED and self.DOKU_CLIENT_ID and self.DOKU_SECRET_KEY
                    and self.DOKU_ENVIRONMENT in {"sandbox", "production"}
                    and self.DOKU_WEBHOOK_PROFILE == "non-snap" and self.doku_payment_methods
                    and set(self.doku_payment_methods) <= DOKU_SUPPORTED_METHODS
                    and target.hostname and not target.username and not target.password
                    and target.path == "/api/payments/doku/notifications"
                    and not target.query and not target.fragment
                    and target.scheme in ({"https"} if self.DOKU_ENVIRONMENT == "production" else {"http", "https"}))
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # Donation Settings
    DONATION_MONTHLY_GOAL: int = int(os.getenv("DONATION_MONTHLY_GOAL", "2000000"))
    
    # Business Logic Constants (Early Bird -> Normal pricing ladder)
    PRO_PRICE: int = Field(default=29000, ge=1000)
    PRO_NORMAL_PRICE: int = Field(default=49000, ge=1000)
    PRO_PRICE_LABEL: str = "Early Bird"
    PRO_DURATION_DAYS: int = Field(default=365, ge=1)
    PRO_TARGET_PACKAGES: int = Field(default=60, ge=1)

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=[
            os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"), # Project Root .env
            os.path.join(os.path.dirname(__file__), ".env"), # Backend .env (fallback)
            ".env" # Current Dir
        ],
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()

# Issue #9: Refuse to start with default SECRET_KEY in production, warn in all others
if settings.SECRET_KEY == "your-secret-key-keep-it-secret":
    if settings.ENV == "production":
        raise RuntimeError(
            "\n🚨 FATAL: Default SECRET_KEY detected in production — refusing to start.\n"
            "   Set SECRET_KEY di file .env dengan string acak yang kuat.\n"
            "   Contoh: openssl rand -hex 64"
        )
    else:
        warnings.warn(
            "\n⚠️  Using default SECRET_KEY. Set a real value before exposing this service.",
            stacklevel=1,
        )
