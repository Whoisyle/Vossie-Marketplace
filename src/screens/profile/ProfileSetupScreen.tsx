import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppHeader, Avatar, Button, Icon, Screen, TextField } from "@/components";
import type { CampusId } from "@/data/types";
import { formatStudentNumber } from "@/data/studentRecord";
import { useDemoStore } from "@/state/DemoStore";
import { color, gradient, space } from "@/theme/tokens";

import { CampusCard } from "./CampusCard";
import { CampusPicker } from "./CampusPicker";
import { formatSouthAfricanPhone, isValidSouthAfricanPhone } from "./phone";
import { usePickPhoto } from "./usePickPhoto";

type Errors = { name?: string; phone?: string; campus?: string; terms?: string };

/** First-time profile setup. Returning users skip straight to Home. */
export function ProfileSetupScreen() {
  const router = useRouter();
  const { dispatch, state } = useDemoStore();
  const pickPhoto = usePickPhoto();
  const [fullName, setFullName] = useState(state.profile?.fullName ?? "");
  const [phone, setPhone] = useState(state.profile?.phone ?? "");
  const [campusId, setCampusId] = useState<CampusId | null>(state.profile?.campusId ?? null);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(state.profile?.avatarUri);
  const [campusOpen, setCampusOpen] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [agreed, setAgreed] = useState(Boolean(state.termsAcceptedAt));

  if (!state.profile) return <Redirect href="/sign-in" />;
  const email = state.profile.email;

  const submit = () => {
    const next: Errors = {};
    if (fullName.trim().length < 2) next.name = "Enter your full name.";
    if (phone.trim() && !isValidSouthAfricanPhone(phone)) next.phone = "Enter a South African mobile number, like 071 234 5678.";
    if (!campusId) next.campus = "Choose your campus.";
    if (!agreed) next.terms = "Please agree to the Terms and the Privacy Policy to continue.";
    setErrors(next);
    if (Object.keys(next).length > 0 || !campusId) return;
    if (!state.termsAcceptedAt) dispatch({ type: "acceptTerms" });
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
      <LinearGradient colors={["#DCE5EA", "#FFFFFF"]} pointerEvents="none" style={styles.wash} />
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
          <LinearGradient colors={gradient.mist} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.avatarRing}>
            <Avatar name={fullName || email} size={96} uri={avatarUri} />
          </LinearGradient>
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
          label="Student number"
          locked
          right={
            <View style={styles.verified}>
              <Icon color={color.success} name="check-circle" size={16} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          }
          value={state.profile.studentNumber ? formatStudentNumber(state.profile.studentNumber) : ""}
        />
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
        <CampusCard campusId={campusId} error={errors.campus} onPress={() => setCampusOpen(true)} testID="profile-setup-campus" />
      </View>

      <View style={styles.terms}>
        <Pressable
          accessibilityLabel="I agree to the Terms and the Privacy Policy"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          onPress={() => {
            setAgreed((value) => !value);
            setErrors((current) => ({ ...current, terms: undefined }));
          }}
          style={styles.termsRow}
          testID="agree-terms"
        >
          <View style={[styles.box, agreed && styles.boxOn]}>{agreed ? <Icon color={color.onPrimary} name="check" size={14} /> : null}</View>
          <Text style={styles.termsText}>
            I agree to the{" "}
            <Text onPress={() => router.push("/legal/terms" as Href)} style={styles.termsLink}>
              Terms and Conditions
            </Text>{" "}
            and the{" "}
            <Text onPress={() => router.push("/legal/privacy" as Href)} style={styles.termsLink}>
              Privacy Policy
            </Text>
            .
          </Text>
        </Pressable>
        {errors.terms ? <Text style={styles.error}>{errors.terms}</Text> : null}
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
  avatarRing: { alignItems: "center", borderRadius: 54, height: 108, justifyContent: "center", width: 108 },
  wash: { height: 300, left: -space.xl, position: "absolute", right: -space.xl, top: -space.xl },
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
  box: { alignItems: "center", backgroundColor: color.surface, borderColor: color.borderStrong, borderRadius: 6, borderWidth: 2, height: 24, justifyContent: "center", width: 24 },
  boxOn: { backgroundColor: color.primary, borderColor: color.primary },
  terms: { gap: space.xxs, marginTop: space.md },
  termsLink: { color: color.link, fontWeight: "700", textDecorationLine: "underline" },
  termsRow: { alignItems: "center", flexDirection: "row", gap: space.sm, minHeight: 44 },
  termsText: { color: color.textSecondary, flex: 1, fontSize: 13, lineHeight: 19 },
  verified: { alignItems: "center", flexDirection: "row", gap: 4 },
  verifiedText: { color: color.success, fontSize: 12, fontWeight: "700" },
});
