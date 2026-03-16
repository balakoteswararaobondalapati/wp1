from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=('.env', 'backend/.env'), extra='ignore')

    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str = 'HS256'
    access_token_expire_minutes: int = 120
    backend_cors_origins: str = 'http://localhost:5173,http://127.0.0.1:5173'
    seed_demo_data: bool = False
    blood_bank_sync_on_startup: bool = False
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_pass: str | None = None
    smtp_from: str | None = None
    smtp_use_tls: bool = True
    email_user: str | None = None
    email_pass: str | None = None
    email_from: str | None = None
    otp_secret: str | None = None
    otp_expire_minutes: int = 10

    @field_validator('jwt_secret_key')
    @classmethod
    def validate_jwt_secret_key(cls, value: str) -> str:
        if value.strip().lower() in {'change-me', 'changeme', 'secret', 'default'}:
            raise ValueError('JWT_SECRET_KEY must be set to a strong non-default value')
        if len(value.strip()) < 32:
            raise ValueError('JWT_SECRET_KEY must be at least 32 characters')
        return value

    @field_validator('database_url')
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        if 'postgres:postgres@' in value or '://user:password@' in value:
            raise ValueError('DATABASE_URL must not use default/example credentials')
        return value

    @field_validator('otp_secret')
    @classmethod
    def validate_otp_secret(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if len(value.strip()) < 16:
            raise ValueError('OTP_SECRET must be at least 16 characters')
        return value

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(',') if origin.strip()]


settings = Settings()
