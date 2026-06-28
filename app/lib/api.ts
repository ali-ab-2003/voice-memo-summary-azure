/**
 * API layer for VoiceNote AI.
 *
 * Uploads a recorded audio file to the FastAPI backend's `/process` endpoint
 * and returns the transcript, summary and key points.
 */

/**
 * Base URL of the FastAPI backend.
 *
 * Centralized so it can be switched between local development and production
 * in one place. Override at runtime with the EXPO_PUBLIC_API_URL env var
 * (see app/.env.example) without touching code.
 *
 * NOTE: On a physical device, "localhost" refers to the phone, not your
 * computer. Use your machine's LAN IP (e.g. http://192.168.1.50:8000).
 */
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? "https://voicenote-ai-egcaetc5axdefqg5.centralindia-01.azurewebsites.net";;

/** Strongly-typed successful response from POST /process. */
export interface ProcessResult {
  transcript: string;
  summary: string;
  keyPhrases: string[];
}

/** Request timeout in milliseconds — Azure processing can take a while. */
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Error type carrying a user-friendly message safe to show in the UI.
 */
export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/** Narrow an unknown value to a ProcessResult, throwing on shape mismatch. */
function parseProcessResult(data: unknown): ProcessResult {
  if (typeof data !== "object" || data === null) {
    throw new ApiError("Voice processing failed: invalid server response.");
  }
  const record = data as Record<string, unknown>;
  // Backend (FastAPI) returns snake_case `key_phrases`; map it to the app's
  // camelCase `keyPhrases` at this boundary.
  const { transcript, summary, key_phrases: keyPhrases } = record;

  if (
    typeof transcript !== "string" ||
    typeof summary !== "string" ||
    !Array.isArray(keyPhrases) ||
    !keyPhrases.every((phrase) => typeof phrase === "string")
  ) {
    throw new ApiError("Voice processing failed: invalid server response.");
  }

  return { transcript, summary, keyPhrases: keyPhrases as string[] };
}

/** Best-effort extraction of the backend's error message. */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    // FastAPI returns errors as { detail: "..." }. Fall back to { error: "..." }
    // for resilience against older/alternate responses.
    const body = (await response.json()) as {
      detail?: unknown;
      error?: unknown;
    };
    const message = body?.detail ?? body?.error;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  } catch {
    // fall through to a generic message
  }
  if (response.status >= 500) {
    return "Voice processing failed. Please try again.";
  }
  return "Unable to process the recording.";
}

/** Derive a sensible filename + MIME type from the local file URI. */
function fileMetaFromUri(fileUri: string): { name: string; type: string } {
  const cleaned = fileUri.split("?")[0];
  const ext = cleaned.includes(".")
    ? cleaned.slice(cleaned.lastIndexOf(".") + 1).toLowerCase()
    : "m4a";
  const mimeByExt: Record<string, string> = {
    m4a: "audio/m4a",
    mp4: "audio/mp4",
    caf: "audio/x-caf",
    aac: "audio/aac",
    wav: "audio/wav",
    mp3: "audio/mpeg",
  };
  return { name: `recording.${ext}`, type: mimeByExt[ext] ?? "audio/m4a" };
}

/**
 * Upload a recorded audio file to the backend and return the processed result.
 *
 * @param fileUri Local file URI produced by expo-audio (e.g. file:///...).
 * @throws ApiError with a user-friendly message on any failure.
 */
export async function uploadRecording(fileUri: string): Promise<ProcessResult> {
  if (!fileUri) {
    throw new ApiError("Please record audio before continuing.");
  }

  const { name, type } = fileMetaFromUri(fileUri);

  const formData = new FormData();
  // React Native's FormData accepts this file shape for multipart uploads.
  formData.append("audio", {
    uri: fileUri,
    name,
    type,
  } as unknown as Blob);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/process`, {
      method: "POST",
      body: formData,
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(
        "The request timed out. Please check your connection and try again."
      );
    }
    throw new ApiError("Unable to connect to the server.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response));
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError("Voice processing failed: invalid server response.");
  }

  return parseProcessResult(data);
}
