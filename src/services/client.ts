import { isSupabaseConfigured, supabase } from "@/lib/supabase";

import { toServiceError } from "./errors";

/** True when the app has real Supabase credentials; otherwise screens keep using the in-memory demo store. */
export const backendEnabled = isSupabaseConfigured;

type Params = Record<string, unknown>;

/** Calls a database function and returns its result, or throws a ServiceError. */
export async function rpc<T = void>(name: string, params: Params = {}): Promise<T> {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw toServiceError(error);
  return data as T;
}

/** Unwraps a query result, throwing a ServiceError on failure. */
export function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw toServiceError(result.error);
  return result.data as T;
}

export { supabase };
