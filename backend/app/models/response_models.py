"""Pydantic models describing the /process API contract."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ProcessResponse(BaseModel):
    """Successful response returned by POST /process."""

    transcript: str
    summary: str
    key_phrases: list[str] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    """Shape used to document error responses in the OpenAPI schema."""

    detail: str
