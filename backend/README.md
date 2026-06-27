# VoiceNote AI — Backend

FastAPI backend that turns a voice memo into a transcript, an abstractive
summary, and key phrases using **official Azure SDKs**. The mobile app talks
only to this backend; the backend is the single trusted place that holds the
Azure credentials and calls Azure.

- **Transcription:** Azure AI Speech via `azure-cognitiveservices-speech` (Speech SDK, continuous recognition)
- **Summarization + key phrases:** Azure AI Language via `azure-ai-textanalytics`

## Architecture

```
backend/
├── main.py                     # FastAPI app: GET /health, includes the process router
├── .env.example
├── requirements.txt
└── app/
    ├── config.py               # env-var loading + validation (python-dotenv)
    ├── services/
    │   ├── azure_speech.py      # SpeechService.transcribe(audio_path)
    │   └── azure_language.py    # LanguageService.summarize / extract_key_phrases
    ├── routers/
    │   └── process.py           # POST /process + dependency providers
    ├── models/
    │   └── response_models.py   # ProcessResponse, ErrorResponse
    └── utils/
        └── file_utils.py        # validation + temp-file save/cleanup
```

**Separation of responsibilities:** Speech and Language are distinct Azure
resources with different SDKs/keys, so they live in separate service classes.
Routing, file handling, config and models are each isolated so a junior dev can
change one without touching the others.

## Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # then fill in your Azure credentials
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Environment variables

All secrets are read from environment variables (loaded from `.env` in
development via `python-dotenv`). The app fails fast at startup if any are
missing. **Never hardcode secrets.**

| Variable                  | Description                              |
| ------------------------- | ---------------------------------------- |
| `AZURE_SPEECH_KEY`        | Azure AI Speech resource key             |
| `AZURE_SPEECH_REGION`     | Azure Speech region, e.g. `eastus`       |
| `AZURE_LANGUAGE_KEY`      | Azure AI Language resource key           |
| `AZURE_LANGUAGE_ENDPOINT` | Azure AI Language resource endpoint URL  |

## API

### `GET /health`
```json
{ "status": "ok" }
```

### `POST /process`
`multipart/form-data` with a single `audio` field. Accepts **`.wav`** and
**`.m4a`** only.

```bash
curl -F "audio=@sample.wav" http://localhost:8000/process
```

Success (`200`):
```json
{
  "transcript": "...",
  "summary": "...",
  "key_phrases": ["...", "..."]
}
```

Errors use FastAPI's `{ "detail": "..." }` shape:

| Status | When                                          |
| ------ | --------------------------------------------- |
| `400`  | Missing audio, empty file, unsupported format |
| `422`  | No speech could be recognized in the audio    |
| `502`  | An Azure service failed (transcription/language) |
| `500`  | Unexpected error                              |

## ⚠️ `.m4a` requires GStreamer

The Speech SDK decodes **`.wav`/PCM natively**, but **compressed `.m4a` input
requires GStreamer** to be installed on the host. Without it, `.m4a` files will
fail to transcribe.

- **macOS:** `brew install gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad`
- **Ubuntu/Debian:** `sudo apt-get install libgstreamer1.0-0 gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly`
- **Windows:** install GStreamer (runtime) from https://gstreamer.freedesktop.org and add its `bin` to `PATH`.

If GStreamer is not available, have the mobile app record/send **`.wav`**.

## Tests

All Azure access is replaced with fakes via FastAPI dependency overrides — the
suite never reaches Azure and needs no credentials.

```bash
pytest
```
