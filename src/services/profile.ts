import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  displayName: string;
  preferredCampus: string;
  avatarUrl?: string;
  studentNumber?: string;
}

let mockProfile: UserProfile = {
  id: "demo-user",
  displayName: "Avery Demo",
  preferredCampus: "potchefstroom",
  studentNumber: "eduv9981",
};

export async function getProfile(): Promise<UserProfile> {
  if (!isSupabaseConfigured) {
    return mockProfile;
  }

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return mockProfile;

    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, display_name, preferred_campus, avatar_url, student_number")
      .eq("id", authData.user.id)
      .single();

    if (error || !data) {
      return {
        id: authData.user.id,
        displayName: authData.user.user_metadata?.display_name || "Avery Demo",
        preferredCampus: "potchefstroom",
        avatarUrl: undefined,
        studentNumber: undefined,
      };
    }

    return {
      id: data.id,
      displayName: data.display_name || "Avery Demo",
      preferredCampus: data.preferred_campus || "potchefstroom",
      avatarUrl: data.avatar_url || undefined,
      studentNumber: data.student_number || undefined,
    };
  } catch {
    return mockProfile;
  }
}

export async function updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
  mockProfile = { ...mockProfile, ...patch };

  if (!isSupabaseConfigured) {
    return mockProfile;
  }

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return mockProfile;

    const updatePayload: Record<string, unknown> = {};
    if (patch.displayName !== undefined) updatePayload.display_name = patch.displayName;
    if (patch.preferredCampus !== undefined) updatePayload.preferred_campus = patch.preferredCampus;
    if (patch.avatarUrl !== undefined) updatePayload.avatar_url = patch.avatarUrl;

    const { data, error } = await supabase
      .from("user_profiles")
      .upsert({
        id: authData.user.id,
        ...updatePayload,
      })
      .select()
      .single();

    if (error || !data) {
      return mockProfile;
    }

    return {
      id: data.id,
      displayName: data.display_name || mockProfile.displayName,
      preferredCampus: data.preferred_campus || mockProfile.preferredCampus,
      avatarUrl: data.avatar_url || undefined,
      studentNumber: data.student_number || undefined,
    };
  } catch {
    return mockProfile;
  }
}
