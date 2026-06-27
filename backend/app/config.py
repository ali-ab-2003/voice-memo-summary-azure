"""Application configuration.

Secrets (Azure keys/endpoints) are loaded from environment variables using
python-dotenv. We do this — rather than hardcoding — so the exact same code
runs locally and in production with different credentials, and so secrets are
never committed to source control. See ``.env.example`` for the required keys.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

# Load variables from a local .env file if present. In CI / production the
# variables are expected to already be in the environment, so a missing .env
# file is not an error.
load_dotenv()


class ConfigError(RuntimeError):
    """Raised when required configuration is missing."""


# Every secret the backend needs to talk to Azure. Kept in one place so adding
# a new credential is a single-line change.
REQUIRED_VARS = (
    "AZURE_SPEECH_KEY",
    "AZURE_SPEECH_REGION",
    "AZURE_LANGUAGE_KEY",
    "AZURE_LANGUAGE_ENDPOINT",
)


@dataclass(frozen=True)
class Settings:
    """Immutable, strongly-typed view of the backend's configuration."""

    speech_key: str
    speech_region: str
    language_key: str
    language_endpoint: str


def _require(name: str) -> str:
    """Return a required env var's value, or raise a clear ConfigError."""
    value = os.environ.get(name, "").strip()
    if not value:
        raise ConfigError(
            f"Missing required environment variable: {name}. "
            "Copy .env.example to .env and fill in the Azure credentials."
        )
    return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Build (and cache) the Settings object from the environment."""
    return Settings(
        speech_key=_require("AZURE_SPEECH_KEY"),
        speech_region=_require("AZURE_SPEECH_REGION"),
        language_key=_require("AZURE_LANGUAGE_KEY"),
        language_endpoint=_require("AZURE_LANGUAGE_ENDPOINT"),
    )


def validate_config() -> None:
    """Validate that every required variable is present, listing all missing.

    Raises:
        ConfigError: naming every missing variable at once (better DX than
            failing on the first one).
    """
    missing = [name for name in REQUIRED_VARS if not os.environ.get(name, "").strip()]
    if missing:
        raise ConfigError(
            "Missing required environment variables: "
            + ", ".join(missing)
            + ". Copy .env.example to .env and fill in the Azure credentials."
        )
