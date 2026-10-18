/**
 * Typed service boundary over Supabase. Screens import from here, never from `@supabase/supabase-js`,
 * so the provider can change without touching UI. Until a screen is switched over it keeps using the
 * in-memory demo store (`src/state`); `backendEnabled` says whether real credentials are configured.
 */
export { backendEnabled } from "./client";
export * as auth from "./auth";
export * as catalog from "./catalog";
export * as commerce from "./commerce";
export * as seller from "./seller";
export * as courier from "./courier";
export * as money from "./money";
export * as messaging from "./messaging";
export * as rewards from "./rewards";
export * as staff from "./staff";
export { ServiceError, handoffMessages, toServiceError } from "./errors";
export type * from "./types";
