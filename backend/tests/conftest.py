"""Shared pytest configuration.

Puts the backend root on sys.path and sets fake Azure credentials so the app
can start without real secrets. No real Azure calls are made — services are
overridden with fakes in the tests.
"""

import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Fake credentials so config validation passes during tests.
os.environ.setdefault("AZURE_SPEECH_KEY", "test-speech-key")
os.environ.setdefault("AZURE_SPEECH_REGION", "eastus")
os.environ.setdefault("AZURE_LANGUAGE_KEY", "test-language-key")
os.environ.setdefault(
    "AZURE_LANGUAGE_ENDPOINT", "https://example.cognitiveservices.azure.com/"
)
