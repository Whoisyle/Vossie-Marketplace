import { backendEnabled } from "@/services/client";

/**
 * True when the app should read and write the real Supabase backend instead of the in-memory demo store.
 * Needs real credentials (`EXPO_PUBLIC_SUPABASE_URL` and key) and the switch `EXPO_PUBLIC_USE_BACKEND=true`.
 * Everything defaults to demo mode, so tests and Expo Go keep working with no setup.
 */
export const liveBackend: boolean = backendEnabled && process.env.EXPO_PUBLIC_USE_BACKEND === "true";
