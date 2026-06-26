/**
 * Full-screen processing overlay shown while the recording is uploaded and
 * processed by the backend.
 *
 * The backend returns a single response at the end, so rather than faking a
 * progress percentage we cycle through honest status messages to keep the wait
 * feeling responsive.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../lib/theme";

const STATUS_MESSAGES = [
  "Uploading audio…",
  "Generating transcript…",
  "Preparing summary…",
] as const;

const MESSAGE_INTERVAL_MS = 2200;

type Props = {
  visible: boolean;
};

export default function ProcessingOverlay({ visible }: Props) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!visible) {
      setMessageIndex(0);
      return;
    }
    const id = setInterval(() => {
      // Advance but hold on the final message until processing completes.
      setMessageIndex((prev) => Math.min(prev + 1, STATUS_MESSAGES.length - 1));
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.title}>Processing Voice Note…</Text>
          <Text style={styles.status} accessibilityLiveRegion="polite">
            {STATUS_MESSAGES[messageIndex]}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  title: {
    marginTop: spacing.lg,
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  status: {
    marginTop: spacing.xs,
    fontSize: 15,
    color: colors.textMuted,
  },
});
