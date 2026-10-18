import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components";
import { getCampusName } from "@/data/repository";
import { formatStudentNumber, lookupStudentRecord } from "@/data/studentRecord";
import { haptic } from "@/lib/haptics";
import { useDemoStore } from "@/state/DemoStore";
import { ease, spring } from "@/theme/motion";
import { color, corner, gradient, space } from "@/theme/tokens";

/** How long the student record "check" takes and how long the verified badge stays before moving on. */
export const CHECK_MS = 1100;
export const HOLD_MS = 2300;

/**
 * Shown after the Eduvos email: checks the student record, pops a verified badge with the student's email,
 * student number and campus, then carries on by itself. The record is mock data until the backend returns it.
 */
export function VerifiedScreen() {
  const router = useRouter();
  const { dispatch } = useDemoStore();
  const reduced = useReducedMotion();
  const { email = "" } = useLocalSearchParams<{ email?: string }>();
  const [verified, setVerified] = useState(false);
  const record = lookupStudentRecord(email);
  const badge = useSharedValue(0);
  const burst = useSharedValue(0);
  // timers run once; the latest callbacks are read from here so a re-render never restarts them
  const latest = useRef({ dispatch, email, reduced, router });
  useEffect(() => {
    latest.current = { dispatch, email, reduced, router };
  });

  useEffect(() => {
    const check = setTimeout(() => {
      setVerified(true);
      haptic.success();
      badge.set(latest.current.reduced ? 1 : withSpring(1, spring.bouncy));
      burst.set(latest.current.reduced ? 0 : withTiming(1, { duration: 900, easing: ease.out }));
    }, CHECK_MS);
    const next = setTimeout(() => {
      latest.current.dispatch({ email: latest.current.email, type: "signIn" });
      latest.current.router.replace("/home");
    }, CHECK_MS + HOLD_MS);
    return () => {
      clearTimeout(check);
      clearTimeout(next);
    };
  }, [badge, burst]);

  const badgeStyle = useAnimatedStyle(() => ({ opacity: badge.get(), transform: [{ scale: 0.4 + 0.6 * badge.get() }] }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - burst.get()),
    transform: [{ scale: 1 + burst.get() * 1.1 }],
  }));
  const rise = (delay: number) => FadeInDown.delay(delay).duration(380);

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={["#DCE5EA", "#FFFFFF"]} pointerEvents="none" style={styles.wash} />
      <View style={styles.hero}>
        <View style={styles.badgeWrap}>
          {verified ? <Animated.View style={[styles.burst, burstStyle]} /> : null}
          {verified ? (
            <Animated.View style={[styles.badge, badgeStyle]}>
              <LinearGradient colors={gradient.primary} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
              <Icon color={color.onPrimary} name="check" size={44} />
            </Animated.View>
          ) : (
            <ActivityIndicator color={color.primary} size="large" />
          )}
        </View>
        <Text accessibilityLiveRegion="polite" accessibilityRole="header" style={styles.title}>
          {verified ? "You're verified" : "Checking your student record"}
        </Text>
        <Text style={styles.subtitle}>
          {verified ? "Welcome to Vossie. Setting things up for you…" : "This only takes a moment."}
        </Text>
      </View>

      {verified ? (
        <Animated.View entering={rise(250)} style={styles.card}>
          <Row icon="mail" label="Student email" value={email} />
          <Row icon="hash" label="Student number" value={formatStudentNumber(record.studentNumber)} />
          <Row icon="map-pin" label="Campus" value={getCampusName(record.campusId)} />
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

function Row({ icon, label, value }: { icon: "mail" | "hash" | "map-pin"; label: string; value: string }) {
  return (
    <View accessible style={styles.row}>
      <View style={styles.rowIcon}>
        <Icon color={color.heading} name={icon} size={16} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.rowValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", borderRadius: 48, height: 96, justifyContent: "center", overflow: "hidden", width: 96 },
  badgeWrap: { alignItems: "center", height: 120, justifyContent: "center", width: 120 },
  burst: { backgroundColor: color.mist, borderRadius: 48, height: 96, position: "absolute", width: 96 },
  card: {
    alignSelf: "stretch",
    backgroundColor: color.surface,
    borderColor: color.mist,
    borderCurve: "continuous",
    borderRadius: corner.lg,
    borderWidth: 1.5,
    boxShadow: "6px 6px 14px rgba(30, 42, 56, 0.10), -5px -5px 12px rgba(255, 255, 255, 0.95)",
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.xl,
    padding: space.md,
  },
  hero: { alignItems: "center", gap: space.xs, marginTop: 96, paddingHorizontal: space.lg },
  row: { alignItems: "center", flexDirection: "row", gap: space.sm },
  rowIcon: { alignItems: "center", backgroundColor: color.surfaceIcon, borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  rowLabel: { color: color.textMuted, fontSize: 11 },
  rowText: { flex: 1, gap: 1 },
  rowValue: { color: color.heading, fontSize: 16, fontWeight: "700" },
  safe: { backgroundColor: color.background, flex: 1 },
  subtitle: { color: color.textSecondary, fontSize: 15, lineHeight: 22, textAlign: "center" },
  title: { color: color.heading, fontSize: 26, fontWeight: "700", textAlign: "center" },
  wash: { ...StyleSheet.absoluteFill, height: 320 },
});
