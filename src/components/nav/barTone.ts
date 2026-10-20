import { useSyncExternalStore } from "react";

/**
 * The colour of the seller's tab bar follows the page under it: a dark bar on the white pages and a light bar on the
 * blue pages. The page says which it is when it comes into view, and the bar listens.
 */
export type BarTone = "light" | "dark";

let current: BarTone = "light";
const listeners = new Set<() => void>();

export function setBarTone(tone: BarTone): void {
  if (tone === current) return;
  current = tone;
  listeners.forEach((listener) => listener());
}

export function useBarTone(): BarTone {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => current,
  );
}
