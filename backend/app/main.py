import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import projects, analysis, graph, debt, security, roadmap, ai, export, auth

logging.basicConfig(level=logging.INFO)

# Create workspace directory
os.makedirs(settings.WORKSPACE_DIR, exist_ok=True)

app = FastAPI(
    title="LegacyLens API",
    description="AI-Powered Legacy Code Migration Risk Analyzer",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(analysis.router, prefix="/api/projects", tags=["Analysis"])
app.include_router(graph.router, prefix="/api/projects", tags=["Graph"])
app.include_router(debt.router, prefix="/api/projects", tags=["Debt"])
app.include_router(security.router, prefix="/api/projects", tags=["Security"])
app.include_router(roadmap.router, prefix="/api/projects", tags=["Roadmap"])
app.include_router(ai.router, prefix="/api/projects", tags=["AI"])
app.include_router(export.router, prefix="/api/projects", tags=["Export"])


@app.on_event("startup")
async def startup():
    """Create all DB tables on startup."""
    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/")
def root():
    return {"message": "LegacyLens API — visit /api/docs for documentation"}
