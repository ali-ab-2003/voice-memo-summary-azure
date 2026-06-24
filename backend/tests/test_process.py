"""Tests for the /process and /health endpoints.

ALL Azure calls are mocked — CI must never reach Azure.
"""

import io

import pytest
from fastapi.testclient import TestClient

import main
from azure_language import LanguageError

client = TestClient(main.app)


def _audio_file():
    return {"audio": ("memo.m4a", io.BytesIO(b"fake-audio-bytes"), "audio/m4a")}


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_process_success(monkeypatch):
    monkeypatch.setattr(main, "transcribe", lambda audio_bytes: "This is a test memo.")
    monkeypatch.setattr(main, "summarize", lambda text: "A short test summary.")
    monkeypatch.setattr(main, "key_points", lambda text: ["test", "memo"])

    response = client.post("/process", files=_audio_file())

    assert response.status_code == 200
    assert response.json() == {
        "transcript": "This is a test memo.",
        "summary": "A short test summary.",
        "keyPoints": ["test", "memo"],
    }


def test_process_missing_audio():
    response = client.post("/process")
    assert response.status_code == 400
    assert response.json() == {"error": "No audio file provided"}


def test_process_empty_audio():
    files = {"audio": ("memo.m4a", io.BytesIO(b""), "audio/m4a")}
    response = client.post("/process", files=files)
    assert response.status_code == 400
    assert response.json() == {"error": "No audio file provided"}


def test_process_azure_failure(monkeypatch):
    def _boom(text):
        raise LanguageError("Azure exploded")

    monkeypatch.setattr(main, "transcribe", lambda audio_bytes: "This is a test memo.")
    monkeypatch.setattr(main, "summarize", _boom)
    monkeypatch.setattr(main, "key_points", lambda text: ["test", "memo"])

    response = client.post("/process", files=_audio_file())

    assert response.status_code == 502
    assert response.json() == {"error": "Azure service failed"}


def test_process_unexpected_error(monkeypatch):
    def _boom(audio_bytes):
        raise ValueError("something weird")

    monkeypatch.setattr(main, "transcribe", _boom)

    response = client.post("/process", files=_audio_file())

    assert response.status_code == 500
    assert response.json() == {"error": "Unexpected error"}
