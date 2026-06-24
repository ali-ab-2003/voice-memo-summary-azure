# VoiceNote AI — Backend (Phase 1)

FastAPI backend that turns a voice memo into a transcript, an abstractive
summary, and a list of key points using Azure AI services.

- **Transcription:** Azure AI Speech (Fast Transcription API)
- **Summarization:** Azure AI Language (abstractive summarization)
- **Key points:** Azure AI Language (key-phrase extraction)

## Project structure

```
backend/
├── main.py            # FastAPI app: GET /health, POST /process
├── azure_speech.py    # transcribe(audio_bytes) -> str
├── azure_language.py  # summarize(text) -> str, key_points(text) -> list[str]
├── models.py          # ProcessResponse, ErrorResponse
├── config.py          # environment variable loading + validation
├── requirements.txt
├── .env.example
└── tests/             # pytest suite with all Azure calls mocked
```

## Setup

From the `backend/` directory:

```bash
pip install -r requirements.txt
cp .env.example .env   # then fill in your Azure credentials
uvicorn main:app --reload
```

### Environment variables

All secrets are read from environment variables (loaded from `.env` in
development via `python-dotenv`). The app fails fast with a clear error if any
are missing.

| Variable                  | Description                                   |
| ------------------------- | --------------------------------------------- |
| `AZURE_SPEECH_KEY`        | Azure AI Speech resource key                  |
| `AZURE_SPEECH_REGION`     | Azure Speech region, e.g. `eastus`            |
| `AZURE_LANGUAGE_ENDPOINT` | Azure AI Language resource endpoint URL       |
| `AZURE_LANGUAGE_KEY`      | Azure AI Language resource key                |

## API

### `GET /health`

```json
{ "status": "ok" }
```

### `POST /process`

`multipart/form-data` with a single `audio` field.

```bash
curl -F "audio=@sample.m4a" http://localhost:8000/process
```

Success (`200`):

```json
{
  "transcript": "...",
  "summary": "...",
  "keyPoints": ["...", "..."]
}
```

Errors:

| Status | Body                                   | When                                |
| ------ | -------------------------------------- | ----------------------------------- |
| `400`  | `{"error": "No audio file provided"}`  | Missing or empty `audio` field      |
| `502`  | `{"error": "Azure service failed"}`    | An Azure service returned an error   |
| `500`  | `{"error": "Unexpected error"}`        | Any other unexpected failure        |

## Tests

All Azure calls are mocked — the suite never reaches Azure.

```bash
pytest
```
