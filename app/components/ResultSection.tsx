/**
 * A titled content section: an uppercase label with a hairline divider above a
 * white card. Used to build the Result screen's Apple-inspired layout.
 */
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../lib/theme";

type Props = {
  title: string;
  children: ReactNode;
};

export default function ResultSection({ title, children }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{title}</Text>
      <View style={styles.divider} />
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
});
