/**
 * ResultScreen — displays the processed voice note.
 *
 * Order (per spec): Summary → Key Points → collapsible Transcript.
 * A "New Recording" action returns to the Record screen to repeat the flow.
 */
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import ResultSection from "../components/ResultSection";
import type { ResultScreenProps } from "../lib/navigation";
import { colors, radius, spacing } from "../lib/theme";

export default function ResultScreen({ navigation, route }: ResultScreenProps) {
  const { result } = route.params;
  const [transcriptVisible, setTranscriptVisible] = useState(false);

  function startNewRecording(): void {
    // Return to the (already mounted) Record screen and reset the stack.
    navigation.popToTop();
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Your Voice Note</Text>

        <ResultSection title="Summary">
          <Text style={styles.summaryText}>{result.summary}</Text>
        </ResultSection>

        <ResultSection title="Key Points">
          {result.keyPoints.length > 0 ? (
            <View>
              {result.keyPoints.map((point, index) => (
                <View
                  key={`${index}-${point}`}
                  style={[
                    styles.bulletRow,
                    index === result.keyPoints.length - 1 && styles.bulletRowLast,
                  ]}
                >
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{point}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.mutedText}>No key points were found.</Text>
          )}
        </ResultSection>

        <ResultSection title="Transcript">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              transcriptVisible ? "Hide transcript" : "Show transcript"
            }
            hitSlop={8}
            onPress={() => setTranscriptVisible((prev) => !prev)}
            style={({ pressed }) => [
              styles.toggle,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.toggleText}>
              {transcriptVisible ? "Hide Transcript" : "Show Transcript"}
            </Text>
          </Pressable>

          {transcriptVisible ? (
            <Text style={styles.transcriptText}>{result.transcript}</Text>
          ) : null}
        </ResultSection>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start a new recording"
          hitSlop={8}
          onPress={startNewRecording}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>New Recording</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heading: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.xl,
  },
  summaryText: {
    fontSize: 17,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  bulletRowLast: {
    marginBottom: 0,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 9,
    marginRight: spacing.sm,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  mutedText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  toggle: {
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.accent,
  },
  transcriptText: {
    marginTop: spacing.md,
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
});
