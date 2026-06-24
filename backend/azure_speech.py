"""Azure AI Speech integration using the Fast Transcription REST API.

The Fast Transcription API returns a synchronous transcription result for a
single audio file, which fits the request/response shape of the /process
endpoint without polling a long-running operation.

Docs: https://learn.microsoft.com/azure/ai-services/speech-service/fast-transcription-create
"""

from __future__ import annotations

import json

import requests

from config import get_required

# api-version for the Fast Transcription endpoint.
_API_VERSION = "2024-11-15"
# Hard timeout (seconds) so a hung Azure call cannot block the worker forever.
_TIMEOUT = 120


class TranscriptionError(RuntimeError):
    """Raised when Azure Speech transcription fails."""


def _endpoint(region: str) -> str:
    return (
        f"https://{region}.api.cognitive.microsoft.com"
        f"/speechtotext/transcriptions:transcribe?api-version={_API_VERSION}"
    )


def transcribe(audio_bytes: bytes) -> str:
    """Transcribe audio bytes to plain text using Azure Fast Transcription.

    Args:
        audio_bytes: Raw audio file contents (e.g. m4a/wav/mp3).

    Returns:
        The combined transcript text.

    Raises:
        TranscriptionError: if the audio is empty, the request fails, Azure
            returns an error status, or the response cannot be parsed.
    """
    if not audio_bytes:
        raise TranscriptionError("Cannot transcribe empty audio.")

    key = get_required("AZURE_SPEECH_KEY")
    region = get_required("AZURE_SPEECH_REGION")

    # The Fast Transcription API expects multipart/form-data with the audio
    # file and a JSON "definition" describing locales.
    definition = {"locales": ["en-US"]}
    files = {
        "audio": ("audio", audio_bytes, "application/octet-stream"),
        "definition": (None, json.dumps(definition), "application/json"),
    }
    headers = {"Ocp-Apim-Subscription-Key": key}

    try:
        response = requests.post(
            _endpoint(region), headers=headers, files=files, timeout=_TIMEOUT
        )
    except requests.RequestException as exc:  # network/timeout errors
        raise TranscriptionError(f"Azure Speech request failed: {exc}") from exc

    if response.status_code != 200:
        raise TranscriptionError(
            f"Azure Speech returned {response.status_code}: {response.text}"
        )

    try:
        payload = response.json()
    except ValueError as exc:
        raise TranscriptionError(
            "Azure Speech returned a non-JSON response."
        ) from exc

    return _extract_transcript(payload)


def _extract_transcript(payload: dict) -> str:
    """Pull the combined transcript text out of a Fast Transcription payload."""
    combined = payload.get("combinedPhrases")
    if isinstance(combined, list) and combined:
        text = " ".join(
            phrase.get("text", "") for phrase in combined if isinstance(phrase, dict)
        ).strip()
        if text:
            return text

    raise TranscriptionError(
        "Azure Speech response did not contain any transcript text."
    )
