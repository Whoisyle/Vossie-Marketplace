import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppHeader, Avatar, Button, Icon, Screen, TextField, useToast, PageHero } from "@/components";
import type { CampusId } from "@/data/types";
import { CampusCard } from "@/screens/profile/CampusCard";
import { CampusPicker } from "@/screens/profile/CampusPicker";
import { formatSouthAfricanPhone, isValidSouthAfricanPhone } from "@/screens/profile/phone";
import { usePickPhoto } from "@/screens/profile/usePickPhoto";
import { useDemoStore } from "@/state/DemoStore";
import { color, space } from "@/theme/tokens";

/** Edit profile: photo, name, phone and campus. Email comes from Eduvos and is locked. */
export function EditProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const pickPhoto = usePickPhoto();
  const { dispatch, state } = useDemoStore();
  const profile = state.profile;
  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [campusId, setCampusId] = useState<CampusId>(profile?.campusId ?? "potchefstroom");
  const [avatarUri, setAvatarUri] = useState(profile?.avatarUri);
  const [campusOpen, setCampusOpen] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  if (!profile) return null;

  const save = () => {
    const next: typeof errors = {};
    if (fullName.trim().length < 2) next.name = "Enter your full name.";
    if (phone.trim() && !isValidSouthAfricanPhone(phone)) next.phone = "Enter a South African mobile number, like 071 234 5678.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    dispatch({
      patch: {
        avatarUri,
        campusId,
        fullName: fullName.trim(),
        phone: phone.trim() ? formatSouthAfricanPhone(phone) : "",
      },
      type: "updateProfile",
    });
    toast.show("Profile saved");
    router.back();
  };

  return (
    <Screen footer={<Button fullWidth label="Save changes" onPress={save} size="lg" testID="save-profile" />}>
      <AppHeader back subtitle="Update your personal information." title="Edit Profile" />
      <PageHero
        chips={profile.isVerifiedStudent ? [{ icon: "check-circle", label: "Verified student" }] : []}
        icon="user"
        subtitle="Your name and campus show on your student card."
        testID="profile-hero"
        title={profile.fullName || "Your profile"}
        tone="slate"
      />
      <View style={styles.photo}>
        <Pressable
          accessibilityLabel="Change photo"
          accessibilityRole="button"
          onPress={async () => {
            const uri = await pickPhoto();
            if (uri) setAvatarUri(uri);
          }}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Avatar name={fullName || profile.email} size={88} uri={avatarUri} />
          <View style={styles.badge}>
            <Icon color={color.heading} name="edit-2" size={12} />
          </View>
        </Pressable>
        <Text style={styles.photoLabel}>Change photo</Text>
      </View>
      <View style={styles.form}>
        <TextField
          autoCapitalize="words"
          error={errors.name}
          label="Full name"
          onChangeText={setFullName}
          value={fullName}
        />
        <TextField label="Email" locked right={<Icon color={color.textMuted} name="lock" size={16} />} value={profile.email} />
        <TextField
          error={errors.phone}
          keyboardType="phone-pad"
          label="Phone number"
          onChangeText={setPhone}
          placeholder="071 234 5678"
          value={phone}
        />
        <CampusCard campusId={campusId} onPress={() => setCampusOpen(true)} />
      </View>
      <CampusPicker onClose={() => setCampusOpen(false)} onSelect={setCampusId} selected={campusId} visible={campusOpen} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: color.surfaceIcon,
    borderColor: color.background,
    borderRadius: 13,
    borderWidth: 2,
    bottom: 0,
    height: 26,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    width: 26,
  },
  form: { gap: space.sm, marginTop: space.md },
  photo: { alignItems: "center", gap: space.xs, marginTop: space.sm },
  photoLabel: { color: color.link, fontSize: 13, fontWeight: "600" },
  pressed: { opacity: 0.7 },
});
