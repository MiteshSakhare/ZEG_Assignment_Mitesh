import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from config import settings
from routers.analysis import router as analysis_router
from services.data_loader import DataStore

# Set up structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S%z"
)
logger = logging.getLogger("buildable-land")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Loaded once at process startup, kept in memory + spatially indexed for
    # the lifetime of the process. See services/data_loader.py.
    app.state.settings = settings
    app.state.store = DataStore(settings.data_dir)
    logger.info(f"Loaded layers: {app.state.store.summary()}")
    yield
    logger.info("Shutting down API...")

app = FastAPI(
    title="Buildable Land Analysis API",
    description="Computes usable buildable area for a parcel after subtracting "
    "constraint layers (wetlands, flood zones, easements) and their setbacks.",
    version="1.0.0",
    lifespan=lifespan,
)

# Gzip compression for large GeoJSON responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_router)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."}
    )

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {
        "service": "Buildable Land Analysis API",
        "docs": "/docs",
        "endpoints": ["/api/parcels", "/api/constraints", "/api/analyze"],
    }
