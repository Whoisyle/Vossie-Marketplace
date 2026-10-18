import { Platform } from "react-native";

type Auth = typeof import("expo-local-authentication");

function load(): Auth | null {
  if (Platform.OS === "web" || process.env.JEST_WORKER_ID) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-local-authentication") as Auth;
  } catch {
    return null;
  }
}

/**
 * Asks for Face ID or Touch ID before a payment or a wallet action, when the student switched it on in
 * Security and Settings. The phone's passcode is the fallback. Returns true when the action may go ahead:
 * the setting is off, there is no biometric hardware or nothing is enrolled (the phone cannot ask), or the
 * student passed the check. Returns false only when the check was cancelled or failed.
 */
export async function confirmWithBiometrics(enabled: boolean, reason: string): Promise<boolean> {
  if (!enabled) return true;
  const auth = load();
  if (!auth) return true;
  try {
    const [hardware, enrolled] = await Promise.all([auth.hasHardwareAsync(), auth.isEnrolledAsync()]);
    if (!hardware || !enrolled) return true;
    const result = await auth.authenticateAsync({
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
      promptMessage: reason,
    });
    return result.success;
  } catch {
    return false;
  }
}
