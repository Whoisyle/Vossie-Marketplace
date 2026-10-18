import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface DemoCredentials {
  email: string;
  studentNumber?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    isDemoStudent: boolean;
    studentNumber?: string;
  } | null;
}

export function validateDemoEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith("@vossie.net") || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function validateDemoStudentNumber(studentNumber: string): boolean {
  const normalized = studentNumber.trim().toLowerCase();
  return normalized.startsWith("eduv") && normalized.length >= 6;
}

export async function requestOtp(email: string): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!isSupabaseConfigured) {
    // Development / preview simulation mode
    return { success: true };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to request OTP code.",
    };
  }
}

export async function verifyOtp(
  email: string,
  token: string,
  studentNumber?: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: token.trim(),
      type: "email",
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user && studentNumber) {
      // Store student number in protected user_profiles table
      const normalizedStudentNumber = studentNumber.trim().toLowerCase();
      await supabase.from("user_profiles").upsert({
        id: data.user.id,
        student_number: normalizedStudentNumber,
        preferred_campus: "potchefstroom",
      });
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to verify OTP.",
    };
  }
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
  }
}

export async function getCurrentSession() {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}
