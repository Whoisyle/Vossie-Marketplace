import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Button, Chip, Icon, Screen, TextField, useToast, type IconName } from "@/components";
import { campusPlaces } from "@/data/geo";
import { getCampusName, getCategories } from "@/data/repository";
import { referralCodeFor, validateReferralCode } from "@/data/phase4";
import type { CategoryId } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { requestNotificationPermission } from "@/lib/notifications";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

/**
 * "Make Vossie yours": the last step for a new student after their profile. What they like (so Home and For you
 * start useful), whether to get order and courier notifications, a friend's referral code, and where they usually
 * want things delivered. Every step is optional; Skip goes straight to Home.
 */
export function OnboardingScreen() {
  const router = useRouter();
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const profile = state.profile;
  const [picked, setPicked] = useState<CategoryId[]>(state.interests);
  const [notify, setNotify] = useState(true);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [spot, setSpot] = useState<string | null>(null);

  const campusId = profile?.campusId ?? "potchefstroom";
  const places = campusPlaces(campusId);
  const own = profile ? referralCodeFor(profile.fullName || profile.email, profile.studentNumber) : "";

  const toggle = (id: CategoryId) => {
    haptic.select();
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const finish = async () => {
    if (code.trim()) {
      const problem = validateReferralCode(code, own);
      if (problem) {
        setCodeError(problem);
        return;
      }
      dispatch({ code, type: "applyReferral" });
    }
    dispatch({ interests: picked, type: "setInterests" });
    if (spot) {
      const place = places.find((item) => item.id === spot);
      if (place) dispatch({ address: `${place.name}, ${getCampusName(campusId)}`, point: place.coordinate, type: "setAddress" });
    }
    dispatch({ key: "notifyOrders", type: "setSetting", value: notify });
    dispatch({ key: "notifyMessages", type: "setSetting", value: notify });
    if (notify) {
      const result = await requestNotificationPermission();
      if (result === "denied") toast.show("Notifications are off in your phone's settings. You can turn them on later.");
    }
    router.replace("/home");
  };

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button fullWidth label="Start exploring" onPress={() => void finish()} size="lg" testID="onboarding-finish" />
          <Button fullWidth label="Skip for now" onPress={() => router.replace("/home")} size="sm" testID="onboarding-skip" variant="soft" />
        </View>
      }
      inTabs={false}
      testID="onboarding-screen"
    >
      <LinearGradient colors={["#DCE5EA", "#FFFFFF"]} pointerEvents="none" style={styles.wash} />
      <Animated.View entering={FadeInDown.duration(380)} style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Make Vossie yours{profile?.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}
        </Text>
        <Text style={text.bodySmall}>A few quick choices so your Home starts with things you will like. You can change any of it later.</Text>
      </Animated.View>

      <Section delay={80} icon="heart" title="What are you into?">
        <View style={styles.chips}>
          {getCategories().map((category) => (
            <Chip icon={category.icon as IconName} key={category.id} label={category.name} onPress={() => toggle(category.id)} selected={picked.includes(category.id)} testID={`interest-${category.id}`} />
          ))}
        </View>
      </Section>

      <Section delay={140} icon="bell" title="Stay in the loop">
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={text.cardTitle}>Order and courier updates</Text>
            <Text style={text.caption}>Know when your order is accepted, on its way, and about to arrive.</Text>
          </View>
          <Switch accessibilityLabel="Order and courier updates" onValueChange={setNotify} thumbColor={color.onPrimary} trackColor={{ false: color.borderStrong, true: color.primary }} value={notify} />
        </View>
      </Section>

      <Section delay={200} icon="map-pin" title="Where do you usually get things?">
        <View style={styles.chips}>
          {places.map((place) => (
            <Chip key={place.id} label={place.name} onPress={() => setSpot(spot === place.id ? null : place.id)} selected={spot === place.id} testID={`spot-${place.id}`} />
          ))}
        </View>
      </Section>

      <Section delay={260} icon="gift" title="Got a friend's code?">
        <TextField
          autoCapitalize="characters"
          autoCorrect={false}
          error={codeError ?? undefined}
          label="Referral code (optional)"
          onChangeText={(value) => {
            setCode(value);
            setCodeError(null);
          }}
          placeholder="KAMO-1234"
          value={code}
        />
        <Text style={text.caption}>You and your friend each earn 200 points after your first delivered order.</Text>
      </Section>
    </Screen>
  );
}

function Section({ children, delay, icon, title }: { title: string; icon: IconName; delay: number; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(380)} style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.badge}>
          <Icon color={color.onPrimary} name={icon} size={14} />
        </View>
        <Text style={text.sectionTitle}>{title}</Text>
      </View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", backgroundColor: color.primary, borderRadius: 14, height: 28, justifyContent: "center", width: 28 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  flex: { flex: 1 },
  footer: { gap: space.xs },
  header: { gap: space.xs, marginTop: space.lg },
  row: { alignItems: "center", flexDirection: "row", gap: space.sm },
  section: { backgroundColor: color.surface, borderColor: color.border, borderCurve: "continuous", borderRadius: corner.lg, borderWidth: 1, gap: space.sm, marginTop: space.md, padding: space.md },
  sectionHead: { alignItems: "center", flexDirection: "row", gap: space.xs },
  title: { color: color.heading, fontSize: 28, fontWeight: "800", lineHeight: 34 },
  wash: { height: 280, left: -space.xl, position: "absolute", right: -space.xl, top: -space.xl },
});

