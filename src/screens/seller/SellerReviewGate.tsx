import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { Wordmark } from "@/components";
import { haptic } from "@/lib/haptics";

import { SlidePill } from "./SlidePill";
import { Pill, SELLER, Text } from "./ui";

const SIZE = 34;
const R = 13;
const LENGTH = 2 * Math.PI * R;

/** A small ring with a gap that keeps turning: the loading circle under the text. It sits still with Reduce Motion. */
export function Spinner() {
  const reduced = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    turn.set(withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1));
  }, [reduced, turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 360}deg` }] }));
  return (
    <Animated.View accessibilityLabel="Checking your documents" accessibilityRole="progressbar" style={[styles.spinner, style]} testID="review-spinner">
      <Svg height={SIZE} width={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} fill="none" r={R} stroke="rgba(255,255,255,0.22)" strokeWidth={3.5} />
        <Circle cx={SIZE / 2} cy={SIZE / 2} fill="none" r={R} stroke="#FFFFFF" strokeDasharray={`${LENGTH * 0.28} ${LENGTH}`} strokeLinecap="round" strokeWidth={3.5} />
      </Svg>
    </Animated.View>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const TICK = "M 22 54 L 46 78 L 90 28";

/** A tick that draws itself, with a soft ring that pops out behind it. */
function Tick() {
  const reduced = useReducedMotion();
  const draw = useSharedValue(reduced ? 1 : 0);
  const pop = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    pop.set(withTiming(1, { duration: 520, easing: Easing.out(Easing.back(1.6)) }));
    draw.set(withDelay(260, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) })));
    const timer = setTimeout(() => haptic.success(), 700);
    return () => clearTimeout(timer);
  }, [draw, pop, reduced]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: 130 * (1 - draw.get()) }));
  const ring = useAnimatedStyle(() => ({ opacity: pop.get() * 0.5, transform: [{ scale: 0.6 + pop.get() * 0.5 }] }));
  return (
    <View style={styles.tickBox} testID="verified-tick">
      <Animated.View style={[styles.tickRing, ring]} />
      <Svg height={112} width={112}>
        <AnimatedPath animatedProps={props} d={TICK} fill="none" stroke="#FFFFFF" strokeDasharray="130" strokeLinecap="round" strokeLinejoin="round" strokeWidth={9} />
      </Svg>
    </View>
  );
}

/**
 * Over the whole seller app from the moment the documents are sent in. While Vossie Operations checks them it says so, with a
 * small loading circle and a sliding way to reach support. The moment the shop is approved the same screen turns into "You are
 * verified" with a tick that draws itself, and a slide that carries the seller on to the dashboard.
 */
export function SellerReviewGate({ onContinue, phase, storeName }: { phase: "review" | "verified"; storeName: string; onContinue: () => void }) {
  const router = useRouter();
  const verified = phase === "verified";
  return (
    <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(420)} style={styles.page} testID={verified ? "seller-verified-gate" : "seller-review-gate"}>
      <LinearGradient colors={[SELLER.bgTop, SELLER.bgMid, SELLER.bgBottom]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.markRow}>{verified ? <Wordmark tone="white" width={150} /> : null}</View>
        <View style={styles.center}>
          {verified ? (
            <Animated.View entering={FadeIn.duration(300)} key="verified" style={styles.stack}>
              <Tick />
              <Animated.View entering={FadeInDown.delay(500).duration(420)} style={styles.copy}>
                <Text accessibilityRole="header" style={styles.title}>
                  You&apos;re verified!
                </Text>
                <Text style={styles.sub}>{storeName} is approved and ready to sell on Vossie</Text>
              </Animated.View>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(260)} key="review" style={styles.stack}>
              <Animated.View entering={FadeInDown.duration(500)}>
                <Wordmark tone="white" width={170} />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(120).duration(420)} style={styles.pill}>
                <Pill label="In review" tone="warn" />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(220).duration(420)} style={styles.copy}>
                <Text accessibilityRole="header" style={styles.title}>
                  We&apos;re verifying your documents
                </Text>
                <Text style={styles.sub}>This usually takes up to 24 hours. We&apos;ll notify you as soon as your shop is approved.</Text>
              </Animated.View>
              <Animated.View entering={FadeIn.delay(480).duration(400)} style={styles.spin}>
                <Spinner />
              </Animated.View>
            </Animated.View>
          )}
        </View>
        <Animated.View entering={FadeInDown.delay(380).duration(420)} key={phase} style={styles.footer}>
          {verified ? (
            <SlidePill label="Go to dashboard" onComplete={() => setTimeout(onContinue, 420)} testID="gate-dashboard" />
          ) : (
            <SlidePill label="Contact support" onComplete={() => router.push("/seller/account/support/new" as Href)} resetAfter testID="gate-support" />
          )}
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  markRow: { alignItems: "center", paddingTop: 8 },
  stack: { alignItems: "center" },
  tickBox: { alignItems: "center", height: 112, justifyContent: "center", marginBottom: 18, width: 112 },
  tickRing: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 60, height: 120, position: "absolute", width: 120 },
  copy: { alignItems: "center", gap: 10, marginTop: 14 },
  footer: { paddingBottom: 18, paddingHorizontal: 20 },
  page: { ...StyleSheet.absoluteFill, backgroundColor: SELLER.bgBottom, zIndex: 50 },
  pill: { marginTop: 18 },
  safe: { flex: 1 },
  spin: { marginTop: 26 },
  spinner: { height: SIZE, width: SIZE },
  sub: { color: "rgba(255,255,255,0.72)", fontSize: 14, lineHeight: 20, textAlign: "center" },
  title: { color: "#FFFFFF", fontSize: 24, fontWeight: "800", lineHeight: 30, textAlign: "center" },
});
