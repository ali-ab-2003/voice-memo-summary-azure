"""Centralized environment-variable handling for VoiceNote AI backend.

All secrets are read from environment variables (optionally loaded from a
local .env file via python-dotenv). The application fails fast with a clear
error message if any required variable is missing.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv

# Load variables from a local .env file if present. In CI / production the
# variables are expected to already be present in the environment, so a
# missing .env file is not an error.
load_dotenv()

REQUIRED_VARS = (
    "AZURE_SPEECH_KEY",
    "AZURE_SPEECH_REGION",
    "AZURE_LANGUAGE_ENDPOINT",
    "AZURE_LANGUAGE_KEY",
)


class ConfigError(RuntimeError):
    """Raised when required configuration is missing or invalid."""


def get_required(name: str) -> str:
    """Return the value of a required environment variable.

    Raises:
        ConfigError: if the variable is unset or empty.
    """
    value = os.environ.get(name, "").strip()
    if not value:
        raise ConfigError(
            f"Missing required environment variable: {name}. "
            f"Copy .env.example to .env and fill in the Azure credentials."
        )
    return value


def validate_config() -> None:
    """Validate that every required environment variable is present.

    Raises:
        ConfigError: listing all missing variables at once.
    """
    missing = [name for name in REQUIRED_VARS if not os.environ.get(name, "").strip()]
    if missing:
        raise ConfigError(
            "Missing required environment variables: "
            + ", ".join(missing)
            + ". Copy .env.example to .env and fill in the Azure credentials."
        )
