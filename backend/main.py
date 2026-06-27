"""VoiceNote AI — FastAPI application entrypoint.

WHY AZURE COMMUNICATION HAPPENS ONLY HERE (in the backend):
    Azure keys must never ship inside the mobile app — anyone could extract
    them from the bundle and run up the bill. The phone only ever talks to this
    backend; the backend is the single, trusted place that holds the Azure
    credentials and calls Azure on the user's behalf.

Run locally:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import validate_config
from app.routers import process

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("voicenote")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Fail fast at startup if any required Azure credential is missing."""
    validate_config()
    logger.info("Configuration validated; VoiceNote AI is ready.")
    yield


app = FastAPI(title="VoiceNote AI", version="2.0.0", lifespan=lifespan)

app.include_router(process.router)


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}
