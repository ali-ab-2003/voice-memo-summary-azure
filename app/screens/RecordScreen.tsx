/**
 * RecordScreen — Phase 2 (Record + Playback only).
 *
 * Lets the user request mic permission, record a voice memo, stop, and play it
 * back locally. No backend, no navigation, no upload. expo-av only.
 */
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Audio } from "expo-av";
import { StatusBar } from "expo-status-bar";

import {
  RECORDING_OPTIONS,
  configureAudioModeForPlayback,
  configureAudioModeForRecording,
} from "../lib/audio";

type Status = "ready" | "recording" | "saved" | "playing";

const STATUS_LABEL: Record<Status, string> = {
  ready: "Ready to record",
  recording: "Recording…",
  saved: "Recording saved",
  playing: "Playing…",
};

const STATUS_COLOR: Record<Status, string> = {
  ready: "#64748B",
  recording: "#DC2626",
  saved: "#16A34A",
  playing: "#2563EB",
};

export default function RecordScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a handle to the active playback sound so we can always unload it.
  const soundRef = useRef<Audio.Sound | null>(null);

  // Clean up any in-flight recording / sound when the screen unmounts.
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => undefined);
      }
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => undefined);
      }
    };
    // We intentionally capture the current `recording` on unmount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status: Status = isRecording
    ? "recording"
    : isPlaying
    ? "playing"
    : recordedUri
    ? "saved"
    : "ready";

  async function startRecording(): Promise<void> {
    setError(null);
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError("Microphone permission is required to record audio.");
        return;
      }

      await configureAudioModeForRecording();

      const { recording: newRecording } = await Audio.Recording.createAsync(
        RECORDING_OPTIONS
      );

      setRecording(newRecording);
      setRecordedUri(null);
      setIsRecording(true);
    } catch (err) {
      console.warn("startRecording failed", err);
      setError("Unable to start recording.");
      setIsRecording(false);
      setRecording(null);
    }
  }

  async function stopRecording(): Promise<void> {
    if (!recording) {
      setError("No recording in progress.");
      return;
    }
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      await configureAudioModeForPlayback();

      if (!uri) {
        setError("Recording failed: no audio file was created.");
        setIsRecording(false);
        setRecording(null);
        return;
      }

      setRecordedUri(uri);
    } catch (err) {
      console.warn("stopRecording failed", err);
      setError("Unable to stop recording.");
    } finally {
      setIsRecording(false);
      setRecording(null);
    }
  }

  async function playRecording(): Promise<void> {
    setError(null);
    if (!recordedUri) {
      setError("No recording available.");
      return;
    }
    try {
      // Unload any previously loaded sound before starting a new playback.
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: recordedUri },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((playbackStatus) => {
        if (!playbackStatus.isLoaded) {
          if (playbackStatus.error) {
            setError("Playback failed.");
            setIsPlaying(false);
          }
          return;
        }
        if (playbackStatus.didJustFinish) {
          setIsPlaying(false);
          sound.unloadAsync().catch(() => undefined);
          soundRef.current = null;
        }
      });
    } catch (err) {
      console.warn("playRecording failed", err);
      setError("Unable to play recording.");
      setIsPlaying(false);
    }
  }

  const recordDisabled = isPlaying;
  const playDisabled = !recordedUri || isRecording || isPlaying;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>VoiceNote AI</Text>
          <Text style={styles.subtitle}>Record a voice memo</Text>
        </View>

        <View style={styles.statusRow}>
          <View
            style={[styles.statusDot, { backgroundColor: STATUS_COLOR[status] }]}
            accessibilityElementsHidden
          />
          <Text style={styles.statusText} accessibilityLiveRegion="polite">
            {STATUS_LABEL[status]}
          </Text>
        </View>

        <View style={styles.actions}>
          {!isRecording ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start recording"
              accessibilityState={{ disabled: recordDisabled }}
              hitSlop={8}
              disabled={recordDisabled}
              onPress={startRecording}
              style={({ pressed }) => [
                styles.button,
                styles.recordButton,
                pressed && styles.buttonPressed,
                recordDisabled && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.buttonText}>Start Recording</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Stop recording"
              hitSlop={8}
              onPress={stopRecording}
              style={({ pressed }) => [
                styles.button,
                styles.stopButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>Stop Recording</Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Play recording"
            accessibilityState={{ disabled: playDisabled }}
            hitSlop={8}
            disabled={playDisabled}
            onPress={playRecording}
            style={({ pressed }) => [
              styles.button,
              styles.playButton,
              pressed && styles.buttonPressed,
              playDisabled && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>
              {isPlaying ? "Playing…" : "Play Recording"}
            </Text>
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBox} accessibilityLiveRegion="assertive">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    alignItems: "stretch",
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: "#64748B",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#334155",
  },
  actions: {
    gap: 16,
  },
  button: {
    minHeight: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  recordButton: {
    backgroundColor: "#DC2626",
  },
  stopButton: {
    backgroundColor: "#0F172A",
  },
  playButton: {
    backgroundColor: "#2563EB",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    backgroundColor: "#CBD5E1",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  errorBox: {
    marginTop: 28,
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
});
