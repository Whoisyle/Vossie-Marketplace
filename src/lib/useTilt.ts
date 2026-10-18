import { useEffect } from "react";
import { Platform } from "react-native";
import { type SharedValue, useSharedValue, withSpring } from "react-native-reanimated";

import { spring } from "@/theme/motion";

/**
 * Smoothed phone tilt in roughly [-1, 1] on each axis (x: right is positive, y: toward you is positive).
 * Returns zeros on web, in tests, when motion sensors are unavailable, or when `enabled` is false.
 */
export function useTilt(enabled: boolean): { x: SharedValue<number>; y: SharedValue<number> } {
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Accelerometer } = require("expo-sensors") as typeof import("expo-sensors");
      void Accelerometer.isAvailableAsync().then((available) => {
        if (!available || cancelled) return;
        Accelerometer.setUpdateInterval(50);
        subscription = Accelerometer.addListener(({ x: ax, y: ay }) => {
          // gravity components: about +/-1 when the phone is tilted fully on that axis
          x.set(withSpring(Math.max(-1, Math.min(1, ax * 1.6)), spring.follow));
          y.set(withSpring(Math.max(-1, Math.min(1, -ay * 1.6 - 0.35)), spring.follow));
        });
      });
    } catch {
      // sensors unavailable: stay at rest
    }
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled, x, y]);

  return { x, y };
}
