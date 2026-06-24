"""FastAPI application for VoiceNote AI (Phase 1 — Backend + Azure).

Endpoints:
  GET  /health   -> {"status": "ok"}
  POST /process  -> transcribe + summarize + key points
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse

from azure_language import LanguageError, key_points, summarize
from azure_speech import TranscriptionError, transcribe
from config import validate_config
from models import ErrorResponse, ProcessResponse

logger = logging.getLogger("voicenote")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Fail fast at startup if required Azure credentials are missing."""
    validate_config()
    yield


app = FastAPI(title="VoiceNote AI", version="1.0.0", lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _error(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code, content=ErrorResponse(error=message).model_dump()
    )


@app.post(
    "/process",
    response_model=ProcessResponse,
    responses={400: {"model": ErrorResponse}, 502: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def process(audio: UploadFile | None = File(default=None)) -> JSONResponse:
    """Transcribe, summarize and extract key points from an uploaded audio file."""
    if audio is None:
        return _error(400, "No audio file provided")

    audio_bytes = await audio.read()
    if not audio_bytes:
        return _error(400, "No audio file provided")

    try:
        transcript = transcribe(audio_bytes)
        summary = summarize(transcript)
        points = key_points(transcript)
    except (TranscriptionError, LanguageError):
        logger.exception("Azure service failed")
        return _error(502, "Azure service failed")
    except Exception:  # noqa: BLE001 - last-resort guard
        logger.exception("Unexpected error during processing")
        return _error(500, "Unexpected error")

    response = ProcessResponse(
        transcript=transcript, summary=summary, keyPoints=points
    )
    return JSONResponse(status_code=200, content=response.model_dump())
