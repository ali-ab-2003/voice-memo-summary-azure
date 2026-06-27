"""Azure AI Speech integration.

WHY THE SPEECH SDK (and not a raw REST call):
    The official ``azure-cognitiveservices-speech`` SDK handles audio streaming,
    authentication, ret/keepalive and the recognition event lifecycle for us.
    It is the supported, first-party way to turn audio into text and gives us
    rich result reasons (RecognizedSpeech / NoMatch / Canceled) to act on.

WHY CONTINUOUS RECOGNITION (and not ``recognize_once``):
    ``recognize_once`` only returns the first utterance (~15 seconds). A voice
    memo can be much longer, so we run *continuous* recognition and concatenate
    every recognized segment into the full transcript.

NOTE ON COMPRESSED AUDIO (.m4a):
    ``AudioConfig(filename=...)`` decodes WAV/PCM natively. Compressed formats
    such as .m4a require GStreamer to be installed on the host (see README).
    WAV input works with no extra system dependencies.
"""

from __future__ import annotations

import logging
import threading

import azure.cognitiveservices.speech as speechsdk

logger = logging.getLogger("voicenote.speech")

# Safety net so a stuck recognition can never block a worker forever.
_RECOGNITION_TIMEOUT_SECONDS = 120.0


class SpeechError(RuntimeError):
    """Raised when transcription fails or produces no usable text."""


class SpeechService:
    """Transcribes audio files to plain text using Azure AI Speech."""

    def __init__(self, speech_key: str, speech_region: str) -> None:
        self._speech_key = speech_key
        self._speech_region = speech_region

    def _build_recognizer(
        self, audio_path: str
    ) -> speechsdk.SpeechRecognizer:
        """Create a SpeechRecognizer bound to the given audio file."""
        speech_config = speechsdk.SpeechConfig(
            subscription=self._speech_key, region=self._speech_region
        )
        audio_config = speechsdk.audio.AudioConfig(filename=audio_path)
        return speechsdk.SpeechRecognizer(
            speech_config=speech_config, audio_config=audio_config
        )

    def transcribe(self, audio_path: str) -> str:
        """Transcribe an audio file and return the transcript text only.

        Args:
            audio_path: Path to a local audio file (.wav natively; .m4a needs
                GStreamer on the host).

        Returns:
            The full transcript as plain text.

        Raises:
            SpeechError: on cancellation/authentication errors, timeout, or when
                no speech could be recognized (empty transcript).
        """
        recognizer = self._build_recognizer(audio_path)

        segments: list[str] = []
        done = threading.Event()
        # Mutable holder so the event callbacks can report a cancellation error
        # back to this thread.
        cancel_error: dict[str, str] = {}

        def on_recognized(evt: speechsdk.SpeechRecognitionEventArgs) -> None:
            if evt.result.reason == speechsdk.ResultReason.RecognizedSpeech:
                if evt.result.text:
                    segments.append(evt.result.text)

        def on_canceled(
            evt: speechsdk.SpeechRecognitionCanceledEventArgs,
        ) -> None:
            # Cancellation fires both on genuine errors and on normal end-of-
            # stream; only the former is a failure.
            if evt.reason == speechsdk.CancellationReason.Error:
                cancel_error["details"] = evt.error_details or "Unknown error"
            done.set()

        def on_session_stopped(evt: speechsdk.SessionEventArgs) -> None:
            done.set()

        recognizer.recognized.connect(on_recognized)
        recognizer.canceled.connect(on_canceled)
        recognizer.session_stopped.connect(on_session_stopped)

        recognizer.start_continuous_recognition()
        try:
            finished = done.wait(timeout=_RECOGNITION_TIMEOUT_SECONDS)
        finally:
            recognizer.stop_continuous_recognition()

        if not finished:
            raise SpeechError("Speech recognition timed out.")

        if "details" in cancel_error:
            # Do not leak raw Azure details to clients; log them, raise a clean
            # message. (Auth failures, quota, etc. surface here.)
            logger.error("Speech recognition canceled: %s", cancel_error["details"])
            raise SpeechError("Speech recognition failed.")

        transcript = " ".join(segments).strip()
        if not transcript:
            raise SpeechError("No speech could be recognized in the audio.")

        return transcript
