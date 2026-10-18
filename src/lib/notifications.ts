import Constants from "expo-constants";
import { AppState, Platform } from "react-native";

/**
 * System notifications. Local ones (an order was accepted, your courier is two minutes away) work in Expo Go
 * and builds; a push token for server-sent pushes needs a build with a project id. Every call is safe: on web, in
 * tests, or when the module or permission is missing, it does nothing and never throws.
 */
type Notifications = typeof import("expo-notifications");

function load(): Notifications | null {
  if (Platform.OS === "web" || process.env.JEST_WORKER_ID) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-notifications") as Notifications;
  } catch {
    return null;
  }
}

export type PermissionState = "granted" | "denied" | "undetermined" | "unavailable";

export async function notificationPermission(): Promise<PermissionState> {
  const api = load();
  if (!api) return "unavailable";
  try {
    const result = await api.getPermissionsAsync();
    return result.granted ? "granted" : result.canAskAgain ? "undetermined" : "denied";
  } catch {
    return "unavailable";
  }
}

/** Asks the student for permission (the phone shows its own prompt once). */
export async function requestNotificationPermission(): Promise<PermissionState> {
  const api = load();
  if (!api) return "unavailable";
  try {
    const current = await api.getPermissionsAsync();
    if (current.granted) return "granted";
    if (!current.canAskAgain) return "denied";
    const result = await api.requestPermissionsAsync();
    return result.granted ? "granted" : "denied";
  } catch {
    return "unavailable";
  }
}

/** While the app is open Vossie shows its own banner; the phone only shows a notification when the app is away. */
export function configureNotificationHandler() {
  const api = load();
  if (!api) return;
  try {
    api.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: true,
        shouldShowBanner: false,
        shouldShowList: true,
      }),
    });
  } catch {
    // not available in this environment
  }
}

/** Shows a notification on the phone straight away. Used when the app is in the background. */
export async function presentLocalNotification(input: { title: string; body: string; href?: string }): Promise<void> {
  const api = load();
  if (!api) return;
  try {
    if ((await notificationPermission()) !== "granted") return;
    if (Platform.OS === "android") {
      await api.setNotificationChannelAsync("orders", { importance: api.AndroidImportance.HIGH, name: "Orders and deliveries" });
    }
    await api.scheduleNotificationAsync({
      content: { body: input.body, data: { href: input.href }, title: input.title },
      trigger: null,
    });
  } catch {
    // a missed notification is not an error
  }
}

/** True while the app is on screen, so we can show our own banner instead of a system one. */
export function appIsActive(): boolean {
  return AppState.currentState === "active";
}

/** The Expo push token for this phone, or null (Expo Go, no permission, no project id, simulator). */
export async function registerForPushToken(): Promise<string | null> {
  const api = load();
  if (!api) return null;
  try {
    if ((await notificationPermission()) !== "granted") return null;
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;
    return (await api.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}

/** Sets the number on the app icon. */
export async function setBadgeCount(count: number): Promise<void> {
  const api = load();
  if (!api) return;
  try {
    await api.setBadgeCountAsync(count);
  } catch {
    // ignore
  }
}
