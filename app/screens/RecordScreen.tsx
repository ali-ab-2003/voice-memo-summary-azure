/**
 * RecordScreen — record / stop / playback plus "Generate Summary".
 *
 * Generate Summary uploads the local recording to the backend and, on success,
 * navigates to the Result screen. Audio handled by expo-audio; no persistence.
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

import ProcessingOverlay from "../components/ProcessingOverlay";
import { ApiError, uploadRecording } from "../lib/api";
import type { RecordScreenProps } from "../lib/navigation";
import { colors, radius, spacing } from "../lib/theme";
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
  ready: colors.textMuted,
  recording: colors.record,
  saved: colors.success,
  playing: colors.play,
};

export default function RecordScreen({ navigation }: RecordScreenProps) {
  const audioRecorder = useAudioRecorder(RECORDING_PRESET);

  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
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

  async function generateSummary(): Promise<void> {
    setError(null);
    if (!recordedUri) {
      setError("Please record audio before continuing.");
      return;
    }
    setIsUploading(true);
    try {
      const result = await uploadRecording(recordedUri);
      navigation.navigate("Result", { result });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Voice processing failed.";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  }

  const busy = isUploading;
  const recordDisabled = isPlaying || busy;
  const playDisabled = !recordedUri || isRecording || isPlaying || busy;
  const generateDisabled = !recordedUri || isRecording || isPlaying || busy;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ProcessingOverlay visible={isUploading} />

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
            accessibilityLabel="Generate summary"
            accessibilityState={{ disabled: generateDisabled }}
            hitSlop={8}
            disabled={generateDisabled}
            onPress={generateSummary}
            style={({ pressed }) => [
              styles.button,
              styles.generateButton,
              pressed && styles.buttonPressed,
              generateDisabled && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>Generate Summary</Text>
          </Pressable>

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
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    alignItems: "stretch",
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: 15,
    color: colors.textMuted,
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
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.md,
  },
  button: {
    minHeight: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  recordButton: {
    backgroundColor: colors.record,
  },
  stopButton: {
    backgroundColor: colors.stop,
  },
  generateButton: {
    backgroundColor: colors.primary,
  },
  playButton: {
    backgroundColor: colors.play,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    backgroundColor: colors.disabled,
  },
  buttonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "600",
  },
  errorBox: {
    marginTop: spacing.xl,
    backgroundColor: colors.errorBg,
    borderColor: colors.errorBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  errorText: {
    color: colors.errorText,
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
});
