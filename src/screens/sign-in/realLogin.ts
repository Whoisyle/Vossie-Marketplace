import type { CampusId, Profile } from "@/data/types";
import { auth, backendEnabled } from "@/services";

/** True when the app talks to the real backend; there only approved accounts may sign in. */
export const signInLimited = (): boolean => backendEnabled;

/**
 * Real accounts the server lets in without an emailed code. Returns the signed-in profile from the
 * database, or null when this address is not one of them (or the backend is not configured), in which
 * case the normal demo flow carries on.
 */
export async function signInDirect(email: string): Promise<Profile | null> {
  if (!backendEnabled) return null;
  try {
    const session = await auth.directLogin(email);
    if (!session) return null;
    const [row, studentNumber] = await Promise.all([auth.getMyProfile(), auth.getMyStudentNumber()]);
    if (!row) return null;
    return {
      campusId: (row.preferred_campus_id ?? "potchefstroom") as CampusId,
      email: row.email ?? email.trim().toLowerCase(),
      fullName: row.display_name,
      id: row.id,
      isVerifiedStudent: row.student_status === "verified",
      phone: row.phone ?? "",
      real: true,
      role: "buyer",
      studentNumber: studentNumber ?? undefined,
    };
  } catch {
    return null;
  }
}
