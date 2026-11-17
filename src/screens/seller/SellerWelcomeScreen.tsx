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
import Svg, { Circle, Defs, Ellipse, G, LinearGradient as SvgGradient, Path, Polygon, Rect, Stop, Text as SvgText } from "react-native-svg";

import { Icon } from "@/components";
import { color } from "@/theme/tokens";

import { useSellerDispatch } from "./actions";

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

/** A glossy object on a podium, drawn in code: a shopping bag and card, a parcel, or a shop front. */
function Hero({ index }: { index: number }) {
  return (
    <Svg height={350} viewBox="0 0 300 290" width={362}>
      <Defs>
        <SvgGradient id="pod" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#4C7B89" />
          <Stop offset="1" stopColor="#1E414B" />
        </SvgGradient>
        <SvgGradient id="obj" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#3C6C7B" />
          <Stop offset="1" stopColor="#173540" />
        </SvgGradient>
        <SvgGradient id="card" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#E8EBEE" />
          <Stop offset="1" stopColor="#8B9DA6" />
        </SvgGradient>
        <SvgGradient id="lid" x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor="#5C8C9A" />
          <Stop offset="1" stopColor="#2D5866" />
        </SvgGradient>
      </Defs>
      <Ellipse cx={150} cy={262} fill="rgba(0,0,0,0.28)" rx={118} ry={20} />
      <Rect fill="url(#pod)" height={34} rx={4} width={176} x={62} y={228} />
      <Ellipse cx={150} cy={228} fill="#5B8795" rx={88} ry={20} />
      <Ellipse cx={150} cy={226} fill="#3E6E7C" rx={74} ry={15} />

      {index === 0 ? (
        <G>
          <G transform="rotate(-14 186 150)">
            <Rect fill="url(#card)" height={86} rx={11} width={134} x={120} y={98} />
            <Rect fill="#B9A06A" height={20} rx={4} width={26} x={134} y={120} />
            <Rect fill="rgba(25,27,29,0.22)" height={5} rx={2} width={50} x={134} y={158} />
            <Circle cx={232} cy={150} fill="rgba(25,27,29,0.28)" r={11} />
            <Circle cx={244} cy={150} fill="rgba(25,27,29,0.18)" r={11} />
          </G>
          <Path d="M110 128 C110 92 190 92 190 128" fill="none" stroke="#DFE2DC" strokeLinecap="round" strokeWidth={7} />
          <Path d="M82 128 H218 L228 224 Q228 232 220 232 H80 Q72 232 72 224 Z" fill="url(#obj)" />
          <Path d="M82 128 H218 L220 142 H80 Z" fill="rgba(255,255,255,0.12)" />
          <Circle cx={150} cy={184} fill="#DFE2DC" r={22} />
          <SvgText fill={DEEP} fontSize={28} fontWeight="800" textAnchor="middle" x={150} y={194}>
            V
          </SvgText>
        </G>
      ) : null}

      {index === 1 ? (
        <G>
          <Polygon fill="#2A5361" points="86,150 150,180 150,236 86,206" />
          <Polygon fill="url(#obj)" points="150,180 214,150 214,206 150,236" />
          <Polygon fill="url(#lid)" points="86,150 150,120 214,150 150,180" />
          <Polygon fill="#DFE2DC" points="136,126 164,114 192,128 164,140" opacity={0.9} />
          <Polygon fill="rgba(223,226,220,0.55)" points="150,180 150,236 160,232 160,176" />
          <Circle cx={196} cy={112} fill="#DFE2DC" r={26} />
          <Path d="M184 112 L193 121 L209 103" fill="none" stroke={DEEP} strokeLinecap="round" strokeLinejoin="round" strokeWidth={7} />
        </G>
      ) : null}

      {index === 2 ? (
        <G>
          <Rect fill="url(#obj)" height={78} rx={6} width={150} x={75} y={152} />
          <Rect fill="#DFE2DC" height={42} rx={4} width={48} x={90} y={176} />
          <Rect fill="rgba(25,27,29,0.35)" height={52} rx={4} width={34} x={160} y={178} />
          <Rect fill="rgba(223,226,220,0.35)" height={34} rx={3} width={22} x={196} y={178} />
          <Path d="M66 154 L84 104 H216 L234 154 Z" fill="#DFE2DC" />
          <Path d="M84 104 H104 L98 154 H66 Z M126 104 H146 L146 154 H122 Z M170 104 H190 L194 154 H170 Z" fill="#8B9DA6" />
          <Path d="M66 154 Q80 170 94 154 Q108 170 122 154 Q136 170 150 154 Q164 170 178 154 Q192 170 206 154 Q220 170 234 154 Z" fill="#586879" />
          <Rect fill={DEEP} height={22} rx={5} width={86} x={107} y={78} />
          <SvgText fill="#DFE2DC" fontSize={13} fontWeight="800" textAnchor="middle" x={150} y={93}>
            OPEN
          </SvgText>
        </G>
      ) : null}
    </Svg>
  );
}

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
