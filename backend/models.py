"""Pydantic response models for the VoiceNote AI backend."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ProcessResponse(BaseModel):
    """Successful /process response."""

    transcript: str
    summary: str
    keyPoints: list[str] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    """Error response returned for 4xx/5xx failures."""

    error: str
