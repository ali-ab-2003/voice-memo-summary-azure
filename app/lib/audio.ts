/**
 * Audio configuration helpers for VoiceNote AI.
 *
 * Keeps the expo-av configuration in one typed place so RecordScreen can stay
 * focused on UI state and the record / stop / play flow.
 */
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";

/**
 * Recording quality preset. expo-av ships a HIGH_QUALITY preset that produces a
 * playable file on both iOS (.m4a / AAC) and Android.
 */
export const RECORDING_OPTIONS: Audio.RecordingOptions =
  Audio.RecordingOptionsPresets.HIGH_QUALITY;

/**
 * Configure the audio session so recording is allowed and playback is audible
 * (including when the iOS silent switch is on).
 */
export async function configureAudioModeForRecording(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    shouldDuckAndroid: true,
  });
}

/**
 * Switch the audio session back to playback-only after recording has stopped.
 */
export async function configureAudioModeForPlayback(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    shouldDuckAndroid: true,
  });
}
