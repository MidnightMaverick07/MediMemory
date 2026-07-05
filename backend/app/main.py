from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import init_db
from app.cognee_service.client import init_cognee_service
from app.routers import patients, documents, query, timeline, graph
import logging
from contextlib import asynccontextmanager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema
    logger.info("Initializing SQL Database...")
    init_db()
    
    # Initialize Cognee configurations and fallback engines
    logger.info("Initializing Cognee service...")
    await init_cognee_service()
    
    yield
    logger.info("Shutting down...")

app = FastAPI(
    title="MediMemory API",
    description="Longitudinal Health Memory platform API powered by Cognee.",
    version="1.0.0",
    lifespan=lifespan
)

from app.config import settings

# Enable CORS
origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
if settings.FRONTEND_URL:
    origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(patients.router)
app.include_router(documents.router)
app.include_router(query.router)
app.include_router(timeline.router)
app.include_router(graph.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "MediMemory API"}
