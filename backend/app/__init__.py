import os
import logging
from app.config import settings

logger = logging.getLogger("app_init")

# Set Cognee environment variables before any other imports occur
os.environ["SYSTEM_ROOT_DIRECTORY"] = settings.system_root_directory
os.environ["DATA_ROOT_DIRECTORY"] = settings.data_root_directory
os.environ["LLM_PROVIDER"] = settings.LLM_PROVIDER
os.environ["LLM_MODEL"] = settings.LLM_MODEL
os.environ["LLM_API_KEY"] = settings.GEMINI_API_KEY

os.environ["EMBEDDING_PROVIDER"] = settings.EMBEDDING_PROVIDER
os.environ["EMBEDDING_MODEL"] = settings.EMBEDDING_MODEL
os.environ["EMBEDDING_API_KEY"] = settings.GEMINI_API_KEY

os.environ["GRAPH_DATABASE_PROVIDER"] = "kuzu"
os.environ["VECTOR_DB_PROVIDER"] = "lancedb"
os.environ["ENABLE_BACKEND_ACCESS_CONTROL"] = "false"

logger.info("Shared environment variables configured for Cognee.")
