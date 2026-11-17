import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components";
import { color } from "@/theme/tokens";

import { useSellerDispatch } from "./actions";
import { Hero } from "./Packaging";

type Slide = { first: string; second: string; text: string };

/** The three slides: what selling on Vossie is, how an order moves, and what is yours to run. */
export const SLIDES: readonly Slide[] = [
  { first: "Your Store.", second: "Your Campus.", text: "List what you sell, take orders from students on your campus and withdraw your earnings." },
  { first: "Orders In.", second: "Couriers Out.", text: "Accept an order, hand it over with a code, and a campus courier gets it to the student." },
  { first: "Your Shop.", second: "Your Rules.", text: "Set your own hours, prices and offers. Verified students buy from you with confidence." },
];

const DWELL_MS = 4800;
const DEEP = "#14292F";
const TEAL = "#376371";

/** The seller's first page: three short slides in the Vossie teal, then the button that starts the setup. */
export function SellerWelcomeScreen() {
  const router = useRouter();
  const dispatch = useSellerDispatch();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const float = useSharedValue(0);
  const fill = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    float.set(withRepeat(withSequence(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) })), -1));
  }, [float, reduced]);

  // each slide fills its bar, then the next one comes in; the last one rests
  useEffect(() => {
    fill.set(0);
    if (reduced) {
      fill.set(1);
      return;
    }
    fill.set(withTiming(1, { duration: DWELL_MS, easing: Easing.linear }));
    if (index >= SLIDES.length - 1) return;
    const timer = setTimeout(() => setIndex((current) => Math.min(current + 1, SLIDES.length - 1)), DWELL_MS);
    return () => clearTimeout(timer);
  }, [fill, index, reduced]);

  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: -float.get() * 10 }, { rotate: `${(float.get() - 0.5) * 2}deg` }] }));
  const bar = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  const slide = SLIDES[index]!;

  const start = () => {
    dispatch({ type: "sellerStart" });
    router.push("/seller-setup/type" as Href);
  };

  return (
    <View style={styles.page} testID="seller-welcome">
      <LinearGradient colors={["#274E5B", TEAL, DEEP]} locations={[0, 0.35, 1]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <View style={[styles.top, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.count}>{`0${index + 1} / 0${SLIDES.length}`}</Text>
        <View style={styles.bars}>
          {SLIDES.map((item, position) => (
            <Pressable accessibilityLabel={`Show slide ${position + 1} of ${SLIDES.length}`} accessibilityRole="button" hitSlop={10} key={item.first} onPress={() => setIndex(position)} style={styles.barTrack}>
              {position < index ? <View style={[styles.barFill, { width: "100%" }]} /> : position === index ? <Animated.View style={[styles.barFill, bar]} /> : null}
            </Pressable>
          ))}
        </View>
        <Pressable accessibilityLabel="Skip to the last slide" accessibilityRole="button" hitSlop={10} onPress={() => setIndex(SLIDES.length - 1)}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.copy}>
        <Text style={styles.eyebrow}>Seller mode</Text>
        <Animated.View entering={reduced ? undefined : FadeInDown.duration(480)} key={`t-${index}`}>
          <Text accessibilityRole="header" style={styles.first}>
            {slide.first}
          </Text>
          <Text style={styles.second}>{slide.second}</Text>
          <Text style={styles.text}>{slide.text}</Text>
        </Animated.View>
      </View>

      <Animated.View entering={reduced ? undefined : FadeIn.duration(500)} key={`h-${index}`} style={[styles.hero, bob]} testID="welcome-story">
        <Hero index={index} />
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) + 8 }]}>
        <Pressable accessibilityLabel="Set up my shop" accessibilityRole="button" onPress={start} style={({ pressed }) => [styles.cta, pressed && styles.pressed]} testID="seller-start">
          <Text style={styles.ctaText}>Set up my shop</Text>
          <Icon color={color.charcoal} name="arrow-right" size={20} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => {
            dispatch({ role: "buyer", type: "switchRole" });
            router.replace("/home" as Href);
          }}
        >
          <Text style={styles.later}>Not now, back to buying</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barFill: { backgroundColor: color.sage, borderRadius: 2, height: 4 },
  barTrack: { backgroundColor: "rgba(223,226,220,0.25)", borderRadius: 2, flex: 1, height: 4, overflow: "hidden" },
  bars: { flex: 1, flexDirection: "row", gap: 6 },
  copy: { paddingHorizontal: 28, paddingTop: 34 },
  count: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  cta: { alignItems: "center", backgroundColor: "#F4F5F2", borderRadius: 30, flexDirection: "row", gap: 10, height: 60, justifyContent: "center", width: "100%" },
  ctaText: { color: color.charcoal, fontSize: 17, fontWeight: "700" },
  eyebrow: { color: color.steelGrey, fontSize: 13, fontWeight: "700", letterSpacing: 1.2, marginBottom: 10, textTransform: "uppercase" },
  first: { color: "#FFFFFF", fontSize: 40, fontWeight: "800", letterSpacing: -1, lineHeight: 46 },
  footer: { alignItems: "center", gap: 14, paddingHorizontal: 24 },
  hero: { alignItems: "center", flex: 1, justifyContent: "center" },
  later: { color: "rgba(255,255,255,0.78)", fontSize: 14, fontWeight: "600" },
  page: { backgroundColor: DEEP, flex: 1 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  second: { color: color.sage, fontSize: 40, fontWeight: "800", letterSpacing: -1, lineHeight: 46 },
  skip: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  text: { color: "rgba(255,255,255,0.86)", fontSize: 16, lineHeight: 23, marginTop: 14, maxWidth: 340 },
  top: { alignItems: "center", flexDirection: "row", gap: 14, paddingHorizontal: 24 },
});
