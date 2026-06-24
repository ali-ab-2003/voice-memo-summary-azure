"""Azure AI Language integration for summarization and key-phrase extraction.

Uses the azure-ai-textanalytics SDK:
  - abstractive summarization via ``begin_abstract_summary``
  - key-phrase extraction via ``extract_key_phrases``
"""

from __future__ import annotations

from functools import lru_cache

from azure.ai.textanalytics import TextAnalyticsClient
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import AzureError

from config import get_required


class LanguageError(RuntimeError):
    """Raised when an Azure Language operation fails."""


@lru_cache(maxsize=1)
def _client() -> TextAnalyticsClient:
    """Build (and cache) a TextAnalyticsClient from environment configuration."""
    endpoint = get_required("AZURE_LANGUAGE_ENDPOINT")
    key = get_required("AZURE_LANGUAGE_KEY")
    return TextAnalyticsClient(endpoint=endpoint, credential=AzureKeyCredential(key))


def summarize(text: str) -> str:
    """Return a concise 2-3 sentence abstractive summary of ``text``.

    Raises:
        LanguageError: if the input is empty or Azure returns an error.
    """
    if not text or not text.strip():
        raise LanguageError("Cannot summarize empty text.")

    try:
        poller = _client().begin_abstract_summary(
            documents=[text], sentence_count=3
        )
        results = list(poller.result())
    except AzureError as exc:
        raise LanguageError(f"Azure abstractive summarization failed: {exc}") from exc

    for doc in results:
        if getattr(doc, "is_error", False):
            error = getattr(doc, "error", None)
            raise LanguageError(f"Azure summarization document error: {error}")
        summaries = getattr(doc, "summaries", None) or []
        text_out = " ".join(s.text for s in summaries).strip()
        if text_out:
            return text_out

    raise LanguageError("Azure summarization returned no summary text.")


def key_points(text: str) -> list[str]:
    """Return a list of key phrases extracted from ``text``.

    Raises:
        LanguageError: if the input is empty or Azure returns an error.
    """
    if not text or not text.strip():
        raise LanguageError("Cannot extract key points from empty text.")

    try:
        results = list(_client().extract_key_phrases(documents=[text]))
    except AzureError as exc:
        raise LanguageError(f"Azure key-phrase extraction failed: {exc}") from exc

    for doc in results:
        if getattr(doc, "is_error", False):
            error = getattr(doc, "error", None)
            raise LanguageError(f"Azure key-phrase document error: {error}")
        return list(doc.key_phrases)

    raise LanguageError("Azure key-phrase extraction returned no results.")
