/**
 * Shared design tokens for VoiceNote AI.
 *
 * Centralizes the Apple-inspired minimal palette and spacing so screens and
 * components stay visually consistent without duplicating hex values.
 */
export const colors = {
  background: "#FAFAFA",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  hairline: "#E5E7EB",

  textPrimary: "#0F172A",
  textSecondary: "#334155",
  textMuted: "#64748B",

  record: "#DC2626",
  stop: "#0F172A",
  play: "#2563EB",
  primary: "#0F172A",
  accent: "#2563EB",
  success: "#16A34A",

  disabled: "#CBD5E1",

  errorBg: "#FEF2F2",
  errorBorder: "#FECACA",
  errorText: "#B91C1C",

  white: "#FFFFFF",
} as const;

export const spacing = {
  xs: 6,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 12,
  lg: 16,
} as const;
