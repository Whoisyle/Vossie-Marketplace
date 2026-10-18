import { Platform } from "react-native";

import { playSound } from "./sounds";

/**
 * Soft haptic feedback. Safe everywhere: does nothing on web, in tests, or when the module is missing,
 * and never throws. Use sparingly: taps, likes and success, never on scroll ticks.
 */
type Haptics = typeof import("expo-haptics");

let enabled = true;

/** Turned off from Security and Settings; every haptic call then does nothing. */
export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

function load(): Haptics | null {
  if (Platform.OS === "web" || !enabled) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-haptics") as Haptics;
  } catch {
    return null;
  }
}

export const haptic = {
  /** A light tap: switching tabs, selecting a chip. */
  tap() {
    void load()?.impactAsync(load()!.ImpactFeedbackStyle.Light).catch(() => undefined);
  },
  /** A firmer press: primary buttons. */
  press() {
    void load()?.impactAsync(load()!.ImpactFeedbackStyle.Medium).catch(() => undefined);
  },
  /** Selection change: pickers, carousels settling. */
  select() {
    void load()?.selectionAsync().catch(() => undefined);
  },
  success() {
    playSound("success");
    void load()?.notificationAsync(load()!.NotificationFeedbackType.Success).catch(() => undefined);
  },
  error() {
    playSound("error");
    void load()?.notificationAsync(load()!.NotificationFeedbackType.Error).catch(() => undefined);
  },
};
