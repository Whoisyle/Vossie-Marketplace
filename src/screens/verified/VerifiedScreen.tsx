import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  FadeInDown,
  ZoomIn,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon, StudentCard, type IconName } from "@/components";
import { cardHeight } from "@/components/StudentCard";
import { getCampusName } from "@/data/repository";
import { formatStudentNumber, lookupStudentRecord } from "@/data/studentRecord";
import { haptic } from "@/lib/haptics";
import { useDemoStore } from "@/state/DemoStore";
import { ease, seeded, spring } from "@/theme/motion";
import { color, corner, space } from "@/theme/tokens";

/**
 * The verified sequence, in four beats (times in ms):
 *  1. scan: a scan line sweeps the card outline while the student record is checked
 *  2. fill: email, student number and campus fill in one by one, each with a tick
 *  3. verified: the digital student card lands, a stamp pops and bubbles float up
 *  4. flood: a navy circle floods the screen (like the intro) and the app carries on
 */
export const SCAN_MS = 1300;
export const FILL_STEP_MS = 480;
export const FIELD_COUNT = 3;
export const VERIFIED_HOLD_MS = 1900;
export const FLOOD_MS = 700;
/** Total time from opening the screen to moving on. */
export const TOTAL_MS = SCAN_MS + FIELD_COUNT * FILL_STEP_MS + 350 + VERIFIED_HOLD_MS + FLOOD_MS;

type Phase = "scan" | "fill" | "verified" | "flood";


export function VerifiedScreen() {
  const router = useRouter();
  const { dispatch } = useDemoStore();
  const reduced = useReducedMotion();
  const { height, width } = useWindowDimensions();
  // the card is upright and as big as the screen allows, at real card proportions
  const cardWidth = Math.min(width - 88, Math.max(180, Math.round((height - 250) * 0.631)), 250);
  const cardH = cardHeight(cardWidth);
  const { email = "" } = useLocalSearchParams<{ email?: string }>();
  const record = lookupStudentRecord(email);
  const campusName = getCampusName(record.campusId);
  const [phase, setPhase] = useState<Phase>("scan");
  const [filled, setFilled] = useState(0);
  const scan = useSharedValue(0);
  const stamp = useSharedValue(0);
  const ripple = useSharedValue(0);
  const flood = useSharedValue(0);
  // timers run once; the latest callbacks are read from here so a re-render never restarts them
  const latest = useRef({ dispatch, email, reduced, router });
  useEffect(() => {
    latest.current = { dispatch, email, reduced, router };
  });

  useEffect(() => {
    if (!latest.current.reduced) scan.set(withRepeat(withTiming(1, { duration: 850, easing: ease.inOut }), -1, true));
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase("fill"), SCAN_MS));
    for (let step = 1; step <= FIELD_COUNT; step += 1) {
      timers.push(
        setTimeout(() => {
          setFilled(step);
          haptic.select();
        }, SCAN_MS + step * FILL_STEP_MS),
      );
    }
    const verifiedAt = SCAN_MS + FIELD_COUNT * FILL_STEP_MS + 350;
    timers.push(
      setTimeout(() => {
        cancelAnimation(scan);
        setPhase("verified");
        haptic.success();
        const still = latest.current.reduced;
        stamp.set(still ? 1 : withSequence(withTiming(1.5, { duration: 0 }), withSpring(1, spring.bouncy)));
        ripple.set(still ? 0 : withTiming(1, { duration: 1000, easing: ease.out }));
      }, verifiedAt),
    );
    const floodAt = verifiedAt + VERIFIED_HOLD_MS;
    timers.push(
      setTimeout(() => {
        setPhase("flood");
        flood.set(withTiming(1, { duration: FLOOD_MS, easing: ease.inOut }));
      }, floodAt),
    );
    timers.push(
      setTimeout(() => {
        latest.current.dispatch({ email: latest.current.email, type: "signIn" });
        latest.current.router.replace("/home");
      }, floodAt + FLOOD_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [flood, ripple, scan, stamp]);

  const scanStyle = useAnimatedStyle(() => ({ opacity: 0.9, transform: [{ translateY: scan.get() * (cardH - 56) }] }));
  const stampStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, stamp.get() * 1.5),
    transform: [{ scale: stamp.get() }, { rotate: "-10deg" }],
  }));
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - ripple.get()),
    transform: [{ scale: 1 + ripple.get() * 2.4 }],
  }));
  const diameter = Math.hypot(width, height) * 2.2;
  const floodStyle = useAnimatedStyle(() =>
    reduced
      ? { opacity: flood.get(), transform: [{ scale: 1 }] }
      : { opacity: flood.get() > 0 ? 1 : 0, transform: [{ scale: Math.max(0.001, flood.get()) }] },
  );

  const checking = phase === "scan" || phase === "fill";
  const title = phase === "scan" ? "Scanning your student record" : phase === "fill" ? "Checking your details" : "You're verified";

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={["#DCE5EA", "#FFFFFF"]} pointerEvents="none" style={styles.wash} />
      <View style={styles.header}>
        <Text accessibilityLiveRegion="polite" accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.subtitle}>
          {checking ? "This only takes a moment." : "Welcome to Vossie. Setting things up for you…"}
        </Text>
      </View>

      <View style={styles.stage}>
        {checking ? (
          <View style={[styles.skeleton, { height: cardH, width: cardWidth }]} testID="record-skeleton">
            <FieldRow done={filled >= 1} icon="mail" label="Student email" value={email} visible={phase === "fill"} />
            <FieldRow done={filled >= 2} icon="hash" label="Student number" value={formatStudentNumber(record.studentNumber)} visible={filled >= 1} />
            <FieldRow done={filled >= 3} icon="map-pin" label="Campus" value={campusName} visible={filled >= 2} />
            {!reduced ? (
              <Animated.View pointerEvents="none" style={[styles.scanLine, scanStyle]}>
                <LinearGradient colors={["rgba(55,99,113,0)", "rgba(55,99,113,0.55)", "rgba(55,99,113,0)"]} style={StyleSheet.absoluteFill} />
              </Animated.View>
            ) : null}
          </View>
        ) : (
          <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.cardWrap}>
            {!reduced ? <Bubbles /> : null}
            <StudentCard campusName={campusName} name={emailName(email)} studentNumber={record.studentNumber} width={cardWidth} />
            <View pointerEvents="none" style={styles.stampSpot}>
              <Animated.View style={[styles.ripple, rippleStyle]} />
              <Animated.View style={[styles.stamp, stampStyle]}>
                <Icon color={color.onPrimary} name="check" size={26} />
              </Animated.View>
            </View>
          </Animated.View>
        )}
      </View>

      <Animated.View pointerEvents="none" style={[styles.flood, { height: diameter, width: diameter, borderRadius: diameter / 2 }, floodStyle]} />
    </SafeAreaView>
  );
}

/** Until the student fills in their name, show the part of their email before the @ as a friendly handle. */
function emailName(email: string): string {
  return email.split("@")[0] || "Vossie student";
}

function FieldRow({ done, icon, label, value, visible }: { icon: IconName; label: string; value: string; done: boolean; visible: boolean }) {
  const tick = useSharedValue(0);
  useEffect(() => {
    tick.set(done ? withSpring(1, spring.bouncy) : 0);
  }, [done, tick]);
  const tickStyle = useAnimatedStyle(() => ({ opacity: tick.get(), transform: [{ scale: 0.4 + 0.6 * tick.get() }] }));
  return (
    <View accessible style={[styles.row, !visible && styles.rowHidden]}>
      <View style={styles.rowIcon}>
        <Icon color={color.heading} name={icon} size={16} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {visible ? (
          <Animated.Text entering={FadeInDown.duration(260)} numberOfLines={1} style={styles.rowValue}>
            {value}
          </Animated.Text>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
      <Animated.View style={[styles.tick, tickStyle]}>
        <Icon color={color.onPrimary} name="check" size={14} />
      </Animated.View>
    </View>
  );
}

const BUBBLES = Array.from({ length: 9 }, (_, index) => ({
  delay: Math.round(seeded(index + 3) * 900),
  left: 6 + seeded(index + 11) * 88,
  rise: 140 + seeded(index + 21) * 140,
  size: 8 + Math.round(seeded(index + 31) * 14),
}));

/** Soft bubbles that float up behind the card when the student is verified. */
function Bubbles() {
  return (
    <View pointerEvents="none" style={styles.bubbles}>
      {BUBBLES.map((bubble, index) => (
        <Bubble bubble={bubble} key={index} />
      ))}
    </View>
  );
}

function Bubble({ bubble }: { bubble: (typeof BUBBLES)[number] }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withDelay(bubble.delay, withRepeat(withTiming(1, { duration: 2400, easing: ease.out }), -1, false)));
    return () => cancelAnimation(progress);
  }, [bubble.delay, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.7 * (1 - progress.get()),
    transform: [{ translateY: -progress.get() * bubble.rise }],
  }));
  return (
    <Animated.View
      style={[
        styles.bubble,
        { borderRadius: bubble.size / 2, height: bubble.size, left: `${bubble.left}%`, width: bubble.size },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bubble: { backgroundColor: color.mist, bottom: 0, position: "absolute" },
  bubbles: { ...StyleSheet.absoluteFill, overflow: "visible" },
  cardWrap: { alignSelf: "center" },
  flood: {
    alignSelf: "center",
    backgroundColor: color.ink,
    bottom: "-60%",
    position: "absolute",
  },
  header: { alignItems: "center", gap: space.xs, marginTop: 40, paddingHorizontal: space.lg },
  placeholder: { backgroundColor: color.surfaceIcon, borderRadius: 6, height: 14, marginTop: 2, width: "70%" },
  ripple: { backgroundColor: color.mist, borderRadius: 30, height: 60, position: "absolute", width: 60 },
  row: { alignItems: "center", flexDirection: "row", gap: space.sm },
  rowHidden: { opacity: 0.55 },
  rowIcon: { alignItems: "center", backgroundColor: color.surfaceIcon, borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  rowLabel: { color: color.textMuted, fontSize: 11 },
  rowText: { flex: 1, gap: 1 },
  rowValue: { color: color.heading, fontSize: 16, fontWeight: "700" },
  safe: { backgroundColor: color.background, flex: 1, overflow: "hidden" },
  scanLine: { height: 56, left: 0, position: "absolute", right: 0, top: 0 },
  skeleton: {
    backgroundColor: color.surface,
    borderColor: color.mist,
    borderCurve: "continuous",
    borderRadius: corner.xl,
    borderStyle: "dashed",
    borderWidth: 1.5,
    gap: space.md,
    justifyContent: "space-evenly",
    overflow: "hidden",
    padding: space.md,
  },
  stage: { alignItems: "center", marginHorizontal: space.lg, marginTop: space.lg },
  stamp: {
    alignItems: "center",
    backgroundColor: color.primary,
    borderColor: color.onPrimary,
    borderRadius: 30,
    borderWidth: 3,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  stampSpot: { alignItems: "center", bottom: 56, justifyContent: "center", position: "absolute", right: -14 },
  subtitle: { color: color.textSecondary, fontSize: 15, lineHeight: 22, textAlign: "center" },
  tick: { alignItems: "center", backgroundColor: color.success, borderRadius: 11, height: 22, justifyContent: "center", width: 22 },
  title: { color: color.heading, fontSize: 26, fontWeight: "700", textAlign: "center" },
  wash: { ...StyleSheet.absoluteFill, height: 320 },
});
