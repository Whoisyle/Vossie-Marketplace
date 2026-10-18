import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppHeader, Avatar, Button, Icon, MenuRow, Screen, TextField } from "@/components";
import { getCampusName } from "@/data/repository";
import type { CampusId } from "@/data/types";
import { useDemoStore } from "@/state/DemoStore";
import { color, space } from "@/theme/tokens";

import { CampusPicker } from "./CampusPicker";
import { formatSouthAfricanPhone, isValidSouthAfricanPhone } from "./phone";
import { usePickPhoto } from "./usePickPhoto";

type Errors = { name?: string; phone?: string; campus?: string };

/** First-time profile setup. Returning users skip straight to Home. */
export function ProfileSetupScreen() {
  const router = useRouter();
  const { dispatch, state } = useDemoStore();
  const pickPhoto = usePickPhoto();
  const [fullName, setFullName] = useState(state.profile?.fullName ?? "");
  const [phone, setPhone] = useState(state.profile?.phone ?? "");
  const [campusId, setCampusId] = useState<CampusId | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(state.profile?.avatarUri);
  const [campusOpen, setCampusOpen] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  if (!state.profile) return <Redirect href="/sign-in" />;
  const email = state.profile.email;

  const submit = () => {
    const next: Errors = {};
    if (fullName.trim().length < 2) next.name = "Enter your full name.";
    if (phone.trim() && !isValidSouthAfricanPhone(phone)) next.phone = "Enter a South African mobile number, like 071 234 5678.";
    if (!campusId) next.campus = "Choose your campus.";
    setErrors(next);
    if (Object.keys(next).length > 0 || !campusId) return;
    dispatch({
      profile: {
        avatarUri,
        campusId,
        email,
        fullName: fullName.trim(),
        phone: phone.trim() ? formatSouthAfricanPhone(phone) : "",
      },
      type: "completeProfile",
    });
    router.replace("/home");
  };

  return (
    <Screen
      footer={<Button fullWidth label="Continue" onPress={submit} size="lg" testID="profile-setup-continue" />}
      inTabs={false}
    >
      <AppHeader subtitle="Tell us a little about you to get started." title="Set up your profile" />

      <View style={styles.photo}>
        <Pressable
          accessibilityHint="Choose a profile photo"
          accessibilityLabel="Add photo"
          accessibilityRole="button"
          onPress={async () => {
            const uri = await pickPhoto();
            if (uri) setAvatarUri(uri);
          }}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Avatar name={fullName || email} size={96} uri={avatarUri} />
          <View style={styles.editBadge}>
            <Icon name="edit-2" size={12} color={color.heading} />
          </View>
        </Pressable>
        <Text style={styles.photoLabel}>{avatarUri ? "Change photo" : "Add photo"}</Text>
      </View>

      <View style={styles.form}>
        <TextField
          autoCapitalize="words"
          autoComplete="name"
          error={errors.name}
          label="Full name"
          onChangeText={setFullName}
          placeholder="Your name"
          returnKeyType="next"
          textContentType="name"
          value={fullName}
        />
        <TextField label="Email" locked right={<Icon name="lock" size={16} color={color.textMuted} />} value={email} />
        <TextField
          autoComplete="tel"
          error={errors.phone}
          keyboardType="phone-pad"
          label="Phone number (optional)"
          onChangeText={setPhone}
          placeholder="071 234 5678"
          textContentType="telephoneNumber"
          value={phone}
        />
        <View style={styles.campusField}>
          <MenuRow
            label={campusId ? getCampusName(campusId) : "Choose your campus"}
            onPress={() => setCampusOpen(true)}
            testID="profile-setup-campus"
            value={campusId ? undefined : "Campus"}
          />
          {errors.campus ? <Text style={styles.error}>{errors.campus}</Text> : null}
        </View>
      </View>

      <CampusPicker
        onClose={() => setCampusOpen(false)}
        onSelect={(campus) => {
          setCampusId(campus);
          setErrors((current) => ({ ...current, campus: undefined }));
        }}
        selected={campusId}
        visible={campusOpen}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  campusField: { gap: space.xxs },
  editBadge: {
    alignItems: "center",
    backgroundColor: color.surfaceIcon,
    borderColor: color.background,
    borderRadius: 13,
    borderWidth: 2,
    bottom: 2,
    height: 26,
    justifyContent: "center",
    position: "absolute",
    right: 2,
    width: 26,
  },
  error: { color: color.danger, fontSize: 12, marginLeft: space.xxs },
  form: { gap: space.sm, marginTop: space.lg },
  photo: { alignItems: "center", gap: space.xs, marginTop: space.md },
  photoLabel: { color: color.heading, fontSize: 13, fontWeight: "600" },
  pressed: { opacity: 0.7 },
});
