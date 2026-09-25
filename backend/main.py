from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import CORS_ORIGINS
from .database import init_db, close_db
from .routers import drives, scans, analysis, duplicates, export
from .ws import scan_ws

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield
    close_db()

app = FastAPI(title="DiskViz", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])

app.include_router(drives.router, prefix="/api")
app.include_router(scans.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(duplicates.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.add_api_websocket_route("/ws/scan", scan_ws.scan_websocket)
