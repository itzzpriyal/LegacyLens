from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./legacylens.db"
    OPENAI_API_KEY: str = ""
    SECRET_KEY: str = "legacylens-secret-key-change-in-production"
    WORKSPACE_DIR: str = "./workspaces"
    MAX_UPLOAD_SIZE_MB: int = 100
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # JWT
    JWT_SECRET_KEY: str = "legacylens-jwt-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 7

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
