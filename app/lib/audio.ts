/**
 * Audio configuration helpers for VoiceNote AI.
 *
 * Keeps the expo-audio configuration in one typed place so RecordScreen can
 * stay focused on UI state and the record / stop / play flow.
 */
import {
  AudioQuality,
  IOSOutputFormat,
  setAudioModeAsync,
  type RecordingOptions,
} from "expo-audio";

/**
 * Recording preset: 16 kHz, mono, 16-bit LINEAR PCM in a .wav container.
 *
 * WHY WAV (not the default .m4a):
 *   The backend transcribes with the Azure Speech SDK, which decodes WAV/PCM
 *   natively. Compressed .m4a would require GStreamer installed on the server.
 *   16 kHz mono 16-bit is the format Azure recommends for speech — smaller than
 *   CD-quality stereo while keeping recognition accuracy.
 */
export const RECORDING_PRESET: RecordingOptions = {
  extension: ".wav",
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 256000,
  android: {
    outputFormat: "default",
    audioEncoder: "default",
  },
  ios: {
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/wav",
    bitsPerSecond: 256000,
  },
};

/**
 * Configure the audio session so recording is allowed and playback is audible
 * (including when the iOS silent switch is on).
 */
export async function configureAudioModeForRecording(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: true,
  });
}

/**
 * Switch the audio session back to playback-only after recording has stopped.
 */
export async function configureAudioModeForPlayback(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: false,
  });
}
