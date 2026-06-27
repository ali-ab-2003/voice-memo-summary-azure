"""POST /process router.

Request flow:
    Receive upload -> validate extension -> save temp file ->
    SpeechService.transcribe() -> LanguageService.summarize() ->
    LanguageService.extract_key_phrases() -> delete temp file -> return JSON.

The Azure SDK calls are synchronous/blocking, so we run them in a threadpool
via ``run_in_threadpool`` to avoid blocking FastAPI's async event loop.
"""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from app.config import get_settings
from app.models.response_models import ErrorResponse, ProcessResponse
from app.services.azure_language import LanguageError, LanguageService
from app.services.azure_speech import SpeechError, SpeechService
from app.utils.file_utils import (
    UnsupportedFileError,
    remove_file,
    save_upload_to_temp,
)

logger = logging.getLogger("voicenote.process")

router = APIRouter()


# --- Dependency providers --------------------------------------------------
# Constructing services here (rather than importing singletons) keeps Azure
# config out of the route logic and lets tests override them with fakes via
# ``app.dependency_overrides``.
def get_speech_service() -> SpeechService:
    settings = get_settings()
    return SpeechService(
        speech_key=settings.speech_key, speech_region=settings.speech_region
    )


def get_language_service() -> LanguageService:
    settings = get_settings()
    return LanguageService(
        endpoint=settings.language_endpoint, key=settings.language_key
    )


@router.post(
    "/process",
    response_model=ProcessResponse,
    responses={
        400: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
    },
)
async def process_audio(
    audio: UploadFile | None = File(default=None),
    speech_service: SpeechService = Depends(get_speech_service),
    language_service: LanguageService = Depends(get_language_service),
) -> ProcessResponse:
    """Transcribe, summarize and extract key phrases from an uploaded recording."""
    started = time.perf_counter()
    logger.info("Upload received: %s", audio.filename if audio else None)

    if audio is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No audio file provided.",
        )

    # Validate + persist to a temp file. Validation errors are client errors.
    try:
        temp_path = await save_upload_to_temp(audio)
    except UnsupportedFileError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    # Everything below must clean up the temp file, success or failure.
    try:
        logger.info("Transcription started")
        transcript = await run_in_threadpool(speech_service.transcribe, temp_path)
        logger.info("Transcription completed (%d chars)", len(transcript))

        summary = await run_in_threadpool(language_service.summarize, transcript)
        key_phrases = await run_in_threadpool(
            language_service.extract_key_phrases, transcript
        )
        logger.info("Summarization completed")

        return ProcessResponse(
            transcript=transcript, summary=summary, key_phrases=key_phrases
        )
    except SpeechError as exc:
        # An empty/unrecognized transcript is a 422; upstream Azure failures 502.
        message = str(exc)
        if "No speech could be recognized" in message:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=message
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Speech transcription failed.",
        ) from exc
    except LanguageError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Language processing failed.",
        ) from exc
    except Exception as exc:  # noqa: BLE001 - last-resort guard
        logger.exception("Unexpected error during processing")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error.",
        ) from exc
    finally:
        remove_file(temp_path)
        logger.info(
            "Processing finished in %.2fs", time.perf_counter() - started
        )
