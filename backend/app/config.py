import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "OnlyBooks University Library Archive"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "onlybooks-super-secret-academic-key-2026-xyz-882")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7
    
    # SQLite async database location
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./data/onlybooks.db")

    # Gemini LLM configuration
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    
    # SMTP Email Configuration for Real Verification Delivery
    SMTP_HOST: Optional[str] = os.getenv("SMTP_HOST") or os.getenv("SMPT_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT") or os.getenv("SMPT_PORT", "587"))
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER") or os.getenv("SMPT_USER", "")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD") or os.getenv("SMPT_PASSWORD", "")
    SMTP_FROM_EMAIL: Optional[str] = os.getenv("SMTP_FROM_EMAIL") or os.getenv("SMPT_FROM_EMAIL", "")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "OnlyBooks Academic Library")
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "true").lower() in ("true", "1", "yes")

    # CORS origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

settings = Settings()
