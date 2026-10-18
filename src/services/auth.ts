import type { Session } from "@supabase/supabase-js";

import { rpc, supabase, unwrap } from "./client";
import { toServiceError } from "./errors";
import type { ProfileRow } from "./types";

/**
 * Demo sign-in: an email one-time code. The @vossie.net and eduv checks are demo gates only and never
 * mean the person is an Eduvos student. They are enforced again on the server (auth hook and RPC).
 */
export const DEMO_EMAIL_DOMAIN = "vossie.net";
export const DEMO_STUDENT_PREFIX = "eduv";

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isDemoEmail(email: string): boolean {
  return new RegExp(`^[^\\s@]+@${DEMO_EMAIL_DOMAIN.replace(".", "\\.")}$`).test(normaliseEmail(email));
}

export function isDemoStudentNumber(value: string): boolean {
  const clean = value.trim().toLowerCase();
  return clean.startsWith(DEMO_STUDENT_PREFIX) && clean.length >= DEMO_STUDENT_PREFIX.length + 3;
}

/** Sends the one-time code. Creates the account on first use. */
export async function requestOtp(email: string, displayName?: string): Promise<void> {
  if (!isDemoEmail(email)) throw toServiceError("Demo accounts need an @vossie.net email address.");
  const { error } = await supabase.auth.signInWithOtp({
    email: normaliseEmail(email),
    options: { shouldCreateUser: true, data: displayName ? { display_name: displayName } : undefined },
  });
  if (error) throw toServiceError(error);
}

export async function verifyOtp(email: string, token: string): Promise<Session> {
  const { data, error } = await supabase.auth.verifyOtp({ email: normaliseEmail(email), token: token.trim(), type: "email" });
  if (error || !data.session) throw toServiceError(error ?? "not_authenticated");
  return data.session;
}

export async function submitStudentNumber(studentNumber: string): Promise<void> {
  await rpc("submit_student_number", { p_student_number: studentNumber });
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(listener: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => listener(session));
  return () => data.subscription.unsubscribe();
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw toServiceError(error);
}

export async function getMyProfile(): Promise<ProfileRow | null> {
  const session = await getSession();
  if (!session) return null;
  const result = await supabase
    .from("profiles")
    .select("id, display_name, email, phone, avatar_path, preferred_campus_id, workspace, student_status, onboarded_at")
    .eq("id", session.user.id)
    .maybeSingle();
  return unwrap(result);
}

export async function updateMyProfile(patch: {
  displayName?: string;
  phone?: string;
  campusId?: string;
  avatarPath?: string;
  workspace?: ProfileRow["workspace"];
}): Promise<ProfileRow> {
  return rpc<ProfileRow>("update_my_profile", {
    p_display_name: patch.displayName ?? null,
    p_phone: patch.phone ?? null,
    p_campus_id: patch.campusId ?? null,
    p_avatar_path: patch.avatarPath ?? null,
    p_workspace: patch.workspace ?? null,
  });
}

export async function requestAccountDeletion(): Promise<string> {
  return rpc<string>("request_account_deletion");
}

export async function acceptInvitation(token: string, fullName?: string, phone?: string): Promise<string> {
  return rpc<string>("accept_invitation", { p_token: token, p_full_name: fullName ?? null, p_phone: phone ?? null });
}

/** Roles the signed-in person holds (seller, courier, staff). Buyers hold none. */
export async function getMyRoles(): Promise<{ role: string; campus_id: string | null; state: string }[]> {
  return unwrap(await supabase.from("memberships").select("role, campus_id, state").eq("state", "active"));
}
