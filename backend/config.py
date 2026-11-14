"""Configuración leída de variables de entorno (.env)."""

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")


def _list(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    voyage_api_key: str = os.getenv("VOYAGE_API_KEY", "")
    model_triage: str = os.getenv("MODEL_TRIAGE", "claude-haiku-5-5")
    model_extract: str = os.getenv("MODEL_EXTRACT", "claude-sonnet-5-5")
    model_chat: str = os.getenv("MODEL_CHAT", "claude-sonnet-5-5")
    db_path: Path = ROOT_DIR / os.getenv("DB_PATH", "data/flame.db")
    allowed_origins: list[str] = field(
        default_factory=lambda: _list(os.getenv("ALLOWED_ORIGINS", "http://localhost:5173"))
    )


settings = Settings()
