from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    
    LLM_PROVIDER: str = "gemini"
    LLM_MODEL: str = "gemini/gemini-2.0-flash-lite"
    
    EMBEDDING_PROVIDER: str = "fastembed"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIMENSIONS: int = 384
    
    DATABASE_URL: str = "sqlite:///./data/app.db"
    
    COGNEE_API_KEY: str = ""
    COGNEE_BASE_URL: str = "https://api.cognee.ai"
    COGNEE_TENANT_ID: str = ""
    FRONTEND_URL: str = ""
    
    DATA_DIR: str = "./data"
    
    @property
    def system_root_directory(self) -> str:
        return os.path.abspath(os.path.join(self.DATA_DIR, "cognee_system"))
        
    @property
    def data_root_directory(self) -> str:
        return os.path.abspath(os.path.join(self.DATA_DIR, "cognee_data"))
        
    @property
    def upload_dir(self) -> str:
        return os.path.abspath(os.path.join(self.DATA_DIR, "uploads"))

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
