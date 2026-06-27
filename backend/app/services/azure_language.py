"""Azure AI Language integration.

WHY THIS IS SEPARATE FROM SPEECH:
    Speech-to-text and text analytics are two distinct Azure resources with
    different SDKs, endpoints and keys. Keeping them in separate service classes
    means each has a single responsibility, can be tested/mocked independently,
    and could later be scaled or swapped without touching the other.

Uses the official ``azure-ai-textanalytics`` SDK for:
  * abstractive summarization  -> ``begin_abstract_summary``
  * key-phrase extraction      -> ``extract_key_phrases``
"""

from __future__ import annotations

import logging

from azure.ai.textanalytics import TextAnalyticsClient
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import AzureError

logger = logging.getLogger("voicenote.language")

# Keep abstractive summaries to a concise 2-3 sentences.
_SUMMARY_SENTENCE_COUNT = 3


class LanguageError(RuntimeError):
    """Raised when an Azure Language operation fails."""


class LanguageService:
    """Summarizes text and extracts key phrases using Azure AI Language."""

    def __init__(self, endpoint: str, key: str) -> None:
        self._client = TextAnalyticsClient(
            endpoint=endpoint, credential=AzureKeyCredential(key)
        )

    def summarize(self, text: str) -> str:
        """Return a concise abstractive summary of ``text``.

        Raises:
            LanguageError: on empty input or any Azure error.
        """
        if not text or not text.strip():
            raise LanguageError("Cannot summarize empty text.")

        try:
            poller = self._client.begin_abstract_summary(
                documents=[text], sentence_count=_SUMMARY_SENTENCE_COUNT
            )
            results = list(poller.result())
        except AzureError as exc:
            logger.error("Abstractive summarization failed: %s", exc)
            raise LanguageError("Summarization failed.") from exc

        for doc in results:
            if getattr(doc, "is_error", False):
                logger.error("Summarization document error: %s", getattr(doc, "error", None))
                raise LanguageError("Summarization failed.")
            summaries = getattr(doc, "summaries", None) or []
            summary_text = " ".join(item.text for item in summaries).strip()
            if summary_text:
                return summary_text

        raise LanguageError("Summarization returned no text.")

    def extract_key_phrases(self, text: str) -> list[str]:
        """Return a list of key phrases extracted from ``text``.

        Raises:
            LanguageError: on empty input or any Azure error.
        """
        if not text or not text.strip():
            raise LanguageError("Cannot extract key phrases from empty text.")

        try:
            results = list(self._client.extract_key_phrases(documents=[text]))
        except AzureError as exc:
            logger.error("Key-phrase extraction failed: %s", exc)
            raise LanguageError("Key-phrase extraction failed.") from exc

        for doc in results:
            if getattr(doc, "is_error", False):
                logger.error("Key-phrase document error: %s", getattr(doc, "error", None))
                raise LanguageError("Key-phrase extraction failed.")
            return list(doc.key_phrases)

        raise LanguageError("Key-phrase extraction returned no results.")
