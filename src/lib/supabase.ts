import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://vossie-marketplace.supabase.co";
const fallbackAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake_dev_anon_key";

export const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || fallbackSupabaseUrl;

export const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || fallbackAnonKey;

// Web and cross-platform memory storage adapter
const memoryStorage = new Map<string, string>();

const customStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return memoryStorage.get(key) ?? null;
      }
    }
    return memoryStorage.get(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch {
        // Fall back to memoryStorage
      }
    }
    memoryStorage.set(key, value);
  },
  removeItem: (key: string): void => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch {
        // Fall back to memoryStorage
      }
    }
    memoryStorage.delete(key);
  },
};

export const isSupabaseConfigured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY !== fallbackAnonKey,
);

const isTestEnv =
  process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: !isTestEnv,
    persistSession: !isTestEnv,
    detectSessionInUrl: false,
  },
});
