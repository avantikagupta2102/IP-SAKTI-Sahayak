"""
core/config.py — Application settings loaded from environment variables.

All settings can be overridden via a .env file at the backend root.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- LLM --------------------------------------------------------
    anthropic_api_key: str = ""
    claude_model: str = "claude-3-5-sonnet-20241022"

    # ---- Embeddings -------------------------------------------------
    embed_model: str = "paraphrase-multilingual-mpnet-base-v2"

    # ---- Vector store -----------------------------------------------
    chroma_persist_dir: str = "./data/chroma_db"
    chroma_collection: str = "ip_sakti_kb"

    # ---- Database ---------------------------------------------------
    database_url: str = "sqlite+aiosqlite:///./ip_sakti.db"

    # ---- CORS -------------------------------------------------------
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    # ---- Retrieval --------------------------------------------------
    retrieval_top_k: int = 6
    similarity_threshold_high: float = 0.75

    # ---- Upload -----------------------------------------------------
    max_upload_size_bytes: int = 20 * 1024 * 1024  # 20 MB

    # ---- Feature flags ----------------------------------------------
    enable_verification_call: bool = False

    # ---- Multilingual -----------------------------------------------
    supported_languages: str = "en,hi,ta"

    @property
    def supported_language_list(self) -> List[str]:
        return [lang.strip() for lang in self.supported_languages.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()
