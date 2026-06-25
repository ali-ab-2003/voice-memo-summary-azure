/**
 * RecordScreen — Phase 2 (Record + Playback only).
 *
 * Lets the user request mic permission, record a voice memo, stop, and play it
 * back locally. No backend, no navigation, no upload. expo-audio only.
 */
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AudioModule,
  createAudioPlayer,
  useAudioRecorder,
  type AudioPlayer,
} from "expo-audio";
import { StatusBar } from "expo-status-bar";

import {
  RECORDING_PRESET,
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
  const audioRecorder = useAudioRecorder(RECORDING_PRESET);

  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a handle to the active playback player so we can always release it.
  const playerRef = useRef<AudioPlayer | null>(null);

  // Release any active playback player when the screen unmounts.
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }
    };
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
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError("Microphone permission is required to record audio.");
        return;
      }

      await configureAudioModeForRecording();
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setRecordedUri(null);
      setIsRecording(true);
    } catch (err) {
      console.warn("startRecording failed", err);
      setError("Unable to start recording.");
      setIsRecording(false);
    }
  }

  async function stopRecording(): Promise<void> {
    try {
      await audioRecorder.stop();
      await configureAudioModeForPlayback();

      const uri = audioRecorder.uri;
      if (!uri) {
        setError("Recording failed: no audio file was created.");
        return;
      }

      setRecordedUri(uri);
    } catch (err) {
      console.warn("stopRecording failed", err);
      setError("Unable to stop recording.");
    } finally {
      setIsRecording(false);
    }
  }

  async function playRecording(): Promise<void> {
    setError(null);
    if (!recordedUri) {
      setError("No recording available.");
      return;
    }
    try {
      // Release any previously created player before starting a new playback.
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }

      const player = createAudioPlayer({ uri: recordedUri });
      playerRef.current = player;

      player.addListener("playbackStatusUpdate", (playbackStatus) => {
        if (playbackStatus.didJustFinish) {
          setIsPlaying(false);
          player.remove();
          if (playerRef.current === player) {
            playerRef.current = null;
          }
        }
      });

      player.play();
      setIsPlaying(true);
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
