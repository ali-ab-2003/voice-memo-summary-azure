"""Helpers for validating and temporarily storing uploaded audio.

WHY TEMPORARY FILES:
    The Azure Speech SDK reads from a file path on disk, but we never want to
    keep users' recordings. We write the upload to the OS temp directory, hand
    the path to Azure, and delete it in a ``finally`` block so cleanup happens
    even if processing raises. Nothing is persisted.
"""

from __future__ import annotations

import logging
import os
import tempfile

from fastapi import UploadFile

logger = logging.getLogger("voicenote.files")

# Only these container formats are accepted. .wav is decoded by the Speech SDK
# natively; .m4a requires GStreamer on the host (see README).
ALLOWED_EXTENSIONS: frozenset[str] = frozenset({".m4a", ".wav"})


class UnsupportedFileError(ValueError):
    """Raised when an upload is missing, empty, or an unsupported format."""


def get_extension(filename: str | None) -> str:
    """Return the lower-cased file extension (including the dot) of ``filename``."""
    if not filename:
        return ""
    return os.path.splitext(filename)[1].lower()


def validate_extension(filename: str | None) -> str:
    """Validate the upload's extension and return it.

    Raises:
        UnsupportedFileError: if the extension is missing or not allowed.
    """
    ext = get_extension(filename)
    if ext not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise UnsupportedFileError(
            f"Unsupported file type '{ext or 'unknown'}'. Allowed: {allowed}."
        )
    return ext


async def save_upload_to_temp(audio: UploadFile) -> str:
    """Persist an uploaded file to a temporary path and return that path.

    The caller is responsible for deleting the file (use ``remove_file`` in a
    ``finally`` block).

    Raises:
        UnsupportedFileError: if the extension is invalid or the file is empty.
    """
    ext = validate_extension(audio.filename)

    contents = await audio.read()
    if not contents:
        raise UnsupportedFileError("Uploaded audio file is empty.")

    # delete=False so the file survives after the context manager closes; we
    # delete it explicitly once Azure is done with it.
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(contents)
        temp_path = tmp.name

    logger.info("Saved upload to temporary file (%d bytes)", len(contents))
    return temp_path


def remove_file(path: str | None) -> None:
    """Best-effort delete of a temporary file; never raises."""
    if not path:
        return
    try:
        os.remove(path)
        logger.info("Deleted temporary file")
    except FileNotFoundError:
        pass
    except OSError as exc:  # pragma: no cover - unexpected FS error
        logger.warning("Failed to delete temporary file: %s", exc)
