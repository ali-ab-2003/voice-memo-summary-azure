"""Integration tests for the /process endpoint.

ALL Azure access is replaced with fakes through FastAPI's dependency override
mechanism, so the tests never reach Azure and require no credentials.
"""

import io
import os

import pytest
from fastapi.testclient import TestClient

import main
from app.routers.process import get_language_service, get_speech_service
from app.services.azure_speech import SpeechError


class FakeSpeechService:
    """Stand-in for SpeechService that records the path it was given."""

    def __init__(self, transcript: str = "This is a test memo.") -> None:
        self.transcript = transcript
        self.seen_paths: list[str] = []

    def transcribe(self, audio_path: str) -> str:
        self.seen_paths.append(audio_path)
        return self.transcript


class FailingSpeechService(FakeSpeechService):
    """Speech service that simulates 'no speech recognized'."""

    def transcribe(self, audio_path: str) -> str:
        self.seen_paths.append(audio_path)
        raise SpeechError("No speech could be recognized in the audio.")


class FakeLanguageService:
    """Stand-in for LanguageService with deterministic output."""

    def summarize(self, text: str) -> str:
        return "A short test summary."

    def extract_key_phrases(self, text: str) -> list[str]:
        return ["test", "memo"]


@pytest.fixture
def client():
    with TestClient(main.app) as test_client:
        yield test_client
    main.app.dependency_overrides.clear()


def _override(speech: FakeSpeechService) -> None:
    main.app.dependency_overrides[get_speech_service] = lambda: speech
    main.app.dependency_overrides[get_language_service] = FakeLanguageService


def _wav_upload():
    return {"audio": ("memo.wav", io.BytesIO(b"fake-wav-bytes"), "audio/wav")}


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_process_success(client):
    _override(FakeSpeechService())

    response = client.post("/process", files=_wav_upload())

    assert response.status_code == 200
    assert response.json() == {
        "transcript": "This is a test memo.",
        "summary": "A short test summary.",
        "key_phrases": ["test", "memo"],
    }


def test_temp_file_is_deleted_after_processing(client):
    speech = FakeSpeechService()
    _override(speech)

    response = client.post("/process", files=_wav_upload())

    assert response.status_code == 200
    # The service saw exactly one temp path, and it no longer exists on disk.
    assert len(speech.seen_paths) == 1
    assert not os.path.exists(speech.seen_paths[0])


def test_invalid_extension_is_rejected(client):
    _override(FakeSpeechService())
    files = {"audio": ("notes.txt", io.BytesIO(b"hello"), "text/plain")}

    response = client.post("/process", files=files)

    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_missing_audio_is_rejected(client):
    _override(FakeSpeechService())

    response = client.post("/process")

    assert response.status_code in (400, 422)


def test_empty_transcript_returns_422(client):
    _override(FailingSpeechService())

    response = client.post("/process", files=_wav_upload())

    assert response.status_code == 422
    assert "No speech could be recognized" in response.json()["detail"]
