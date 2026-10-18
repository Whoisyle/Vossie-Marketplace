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

export type BiometricStatus = {
  /** The phone has Face ID, Touch ID or a fingerprint reader. */
  hardware: boolean;
  /** The student has set one up in the phone's settings. */
  enrolled: boolean;
  /** "Face ID", "Touch ID", "fingerprint" or "biometrics", for wording. */
  label: string;
};

/** What this phone can do. In tests and on web nothing can be asked, so it reports no hardware. */
export async function biometricStatus(): Promise<BiometricStatus> {
  const auth = load();
  if (!auth) return { enrolled: false, hardware: false, label: "Face ID or Touch ID" };
  try {
    const [hardware, enrolled, types] = await Promise.all([auth.hasHardwareAsync(), auth.isEnrolledAsync(), auth.supportedAuthenticationTypesAsync()]);
    const face = types.includes(auth.AuthenticationType.FACIAL_RECOGNITION);
    const finger = types.includes(auth.AuthenticationType.FINGERPRINT);
    const label = face ? (Platform.OS === "ios" ? "Face ID" : "face unlock") : finger ? (Platform.OS === "ios" ? "Touch ID" : "fingerprint") : "biometrics";
    return { enrolled, hardware, label };
  } catch {
    return { enrolled: false, hardware: false, label: "Face ID or Touch ID" };
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

export type BiometricChange = { ok: true } | { ok: false; message: string };

/**
 * Switching Face ID or Touch ID on or off in Vossie. Turning it on needs a phone that has it set up and a
 * successful check right now (so we know it really works); turning it off also needs a check, so someone
 * holding an unlocked phone cannot quietly remove the protection.
 */
export async function changeBiometricSetting(turnOn: boolean): Promise<BiometricChange> {
  const status = await biometricStatus();
  const auth = load();
  // tests and web cannot ask the phone, so the change simply goes ahead
  if (!auth) return { ok: true };
  if (turnOn && !status.hardware) return { message: "This phone doesn't have Face ID, Touch ID or a fingerprint reader.", ok: false };
  if (turnOn && !status.enrolled) return { message: `${status.label} isn't set up on this phone. Set it up in the phone's Settings, then try again.`, ok: false };
  if (!status.hardware || !status.enrolled) return { ok: true };
  try {
    const result = await auth.authenticateAsync({
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
      promptMessage: turnOn ? `Use ${status.label} for Vossie` : `Confirm it's you to turn off ${status.label}`,
    });
    return result.success ? { ok: true } : { message: "That didn't work, so nothing was changed.", ok: false };
  } catch {
    return { message: "We couldn't check right now. Nothing was changed.", ok: false };
  }
}
