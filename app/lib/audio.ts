/**
 * Audio configuration helpers for VoiceNote AI.
 *
 * Keeps the expo-audio configuration in one typed place so RecordScreen can
 * stay focused on UI state and the record / stop / play flow.
 */
import { RecordingPresets, setAudioModeAsync } from "expo-audio";

/**
 * Recording quality preset. expo-audio ships a HIGH_QUALITY preset that
 * produces a playable file on both iOS (.m4a / AAC) and Android.
 */
export const RECORDING_PRESET = RecordingPresets.HIGH_QUALITY;

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
