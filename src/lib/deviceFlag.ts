/**
 * Remembers, on this device only, that a real account has finished first-time setup. A different phone or
 * browser sees the first-login flow again, which is wanted while several people test one account. Uses
 * localStorage where it exists (web); elsewhere it lasts until the app restarts.
 */
const memory = new Set<string>();

const keyFor = (userId: string) => `vossie.setup-done.${userId}`;

export function hasCompletedSetup(userId: string): boolean {
  const key = keyFor(userId);
  if (memory.has(key)) return true;
  try {
    return typeof window !== "undefined" && window.localStorage?.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function markSetupDone(userId: string): void {
  const key = keyFor(userId);
  memory.add(key);
  try {
    if (typeof window !== "undefined") window.localStorage?.setItem(key, "1");
  } catch {
    // memory copy above still covers this session
  }
}
