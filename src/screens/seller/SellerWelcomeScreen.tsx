import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeInLeft,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Icon, type IconName } from "@/components";
import { ArtTile } from "@/components/art/ProductArt";
import { formatRand } from "@/data/format";
import { haptic } from "@/lib/haptics";
import { spring } from "@/theme/motion";

import { useSellerDispatch } from "./actions";
import { useCountUp } from "./motion";
import { SellerButton, SellerHeader, SellerScreen, Text } from "./ui";

const BENEFITS: { icon: IconName; text: string }[] = [
  { icon: "plus", text: "List what you sell" },
  { icon: "clipboard", text: "Get orders from your campus" },
  { icon: "credit-card", text: "Withdraw your earnings" },
];

/** The story, in milliseconds from the moment the page opens. It plays once and then rests. */
export const STORY = { awning: 300, sign: 1250, products: [1700, 2150, 2600], earnings: 3200, headline: 3600, button: 4500 } as const;

/** A value that goes from 0 to 1 after `delay`, on a spring or an ease, and stays there. With Reduce Motion it is there at once. */
function useBeat(delay: number, kind: "spring" | "ease" = "ease", duration = 420): SharedValue<number> {
  const reduced = useReducedMotion();
  const t = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    t.set(withDelay(delay, kind === "spring" ? withSpring(1, spring.bouncy) : withTiming(1, { duration, easing: Easing.out(Easing.cubic) })));
  }, [delay, duration, kind, reduced, t]);
  return t;
}

const WIDTH = 300;
const STRIPES = 6;
const STRIPE_W = WIDTH / STRIPES;
const BRICK_ROWS = 13;

/** The wall: warm stone with brick courses, lit from above and darkening towards the ground. */
function Wall() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={["#E4E0D8", "#C9C2B6", "#B3AB9E"]} style={StyleSheet.absoluteFill} />
      {Array.from({ length: BRICK_ROWS }, (_, row) => (
        <View key={row} style={[styles.course, { top: row * 18 }]}>
          {Array.from({ length: 8 }, (_, col) => (
            <View key={col} style={[styles.joint, { left: col * 40 + (row % 2) * 20 }]} />
          ))}
        </View>
      ))}
      <LinearGradient colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0)"]} end={{ x: 0.5, y: 0.35 }} start={{ x: 0.5, y: 0 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}

/** One stripe of the fabric awning: it falls into place, shaded as cloth is, with a rounded hem. */
function Stripe({ delay, dark, index }: { delay: number; dark: boolean; index: number }) {
  const t = useBeat(delay, "spring");
  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, t.get() * 2), transform: [{ translateY: (1 - t.get()) * -36 }, { scaleY: 0.5 + t.get() * 0.5 }] }));
  const base = dark ? ["#4A7685", "#2F5A67"] : ["#FFFFFF", "#DDE4E7"];
  return (
    <Animated.View style={[styles.stripe, { left: index * STRIPE_W }, style]}>
      <LinearGradient colors={base as [string, string]} style={styles.stripeBody} />
      <LinearGradient colors={["rgba(0,0,0,0.12)", "rgba(0,0,0,0)", "rgba(0,0,0,0.1)"]} end={{ x: 1, y: 0 }} start={{ x: 0, y: 0 }} style={styles.stripeBody} />
      <View style={[styles.hem, { backgroundColor: dark ? "#2F5A67" : "#DDE4E7" }]} />
    </Animated.View>
  );
}

function Awning() {
  const shadow = useBeat(STORY.awning + 300, "ease", 600);
  const style = useAnimatedStyle(() => ({ opacity: shadow.get() }));
  return (
    <View style={styles.awning}>
      {Array.from({ length: STRIPES }, (_, i) => (
        <Stripe dark={i % 2 === 0} delay={STORY.awning + i * 90} index={i} key={i} />
      ))}
      <Animated.View pointerEvents="none" style={[styles.awningShadow, style]}>
        <LinearGradient colors={["rgba(30,22,10,0.38)", "rgba(30,22,10,0)"]} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

/** The sign: a dark board with letters that light up like a neon tube, glowing once and then holding steady. */
function Sign() {
  const on = useBeat(STORY.sign, "ease", 700);
  const flicker = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    flicker.set(withDelay(STORY.sign, withSequence(withTiming(1, { duration: 120 }), withTiming(0.2, { duration: 90 }), withTiming(1, { duration: 140 }), withTiming(0.55, { duration: 80 }), withTiming(1, { duration: 400 }))));
  }, [flicker, reduced]);
  const letters = useAnimatedStyle(() => ({ opacity: reduced ? 1 : 0.18 + flicker.get() * 0.82, textShadowRadius: 4 + flicker.get() * 12 }));
  const board = useAnimatedStyle(() => ({ opacity: 0.4 + on.get() * 0.6 }));
  return (
    <Animated.View style={[styles.sign, board]}>
      <LinearGradient colors={["#1B2E38", "#0E1B22"]} style={StyleSheet.absoluteFill} />
      <View style={styles.signRim} />
      <Animated.Text style={[styles.signText, letters]}>YOUR SHOP</Animated.Text>
    </Animated.View>
  );
}

/** A product dropping onto the shelf, with a soft shadow under it and a small "+R" that floats up when it lands. */
function Shelved({ art, delay, left, price }: { art: string; delay: number; left: number; price: number }) {
  const reduced = useReducedMotion();
  const drop = useBeat(delay, "spring");
  const pop = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    pop.set(withDelay(delay + 250, withSequence(withTiming(1, { duration: 260 }), withDelay(550, withTiming(0, { duration: 420 })))));
    const timer = setTimeout(() => haptic.select(), delay + 180);
    return () => clearTimeout(timer);
  }, [delay, pop, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, drop.get() * 3), transform: [{ translateY: (1 - drop.get()) * -170 }, { rotate: `${(1 - drop.get()) * -16}deg` }] }));
  const contact = useAnimatedStyle(() => ({ opacity: 0.1 + drop.get() * 0.35, transform: [{ scaleX: 0.5 + drop.get() * 0.5 }] }));
  const plus = useAnimatedStyle(() => ({ opacity: pop.get(), transform: [{ translateY: -pop.get() * 22 }] }));
  return (
    <View style={[styles.slot, { left }]}>
      <Animated.View style={[styles.contact, contact]} />
      <Animated.View style={[styles.product, style]}>
        <ArtTile id={art} inset={0.04} />
        <LinearGradient colors={["rgba(255,255,255,0.4)", "rgba(255,255,255,0)"]} end={{ x: 0.8, y: 0.6 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.plus, plus]}>
        <Text style={styles.plusText}>+{formatRand(price)}</Text>
      </Animated.View>
    </View>
  );
}

/** The window: warm light inside, a wooden shelf, glass with a reflection that glides across once the shelf is full. */
function Window() {
  const glint = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    glint.set(withDelay(STORY.products[2] + 700, withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) })));
  }, [glint, reduced]);
  const sweep = useAnimatedStyle(() => ({ opacity: Math.sin(glint.get() * Math.PI) * 0.55, transform: [{ translateX: -80 + glint.get() * 260 }, { rotate: "18deg" }] }));
  return (
    <View style={styles.window}>
      <LinearGradient colors={["#FFF1CE", "#F1D9A0", "#D9B873"]} style={StyleSheet.absoluteFill} />
      <View style={styles.back} />
      <View style={styles.shelfWrap}>
        <LinearGradient colors={["#B98B5C", "#7D5834"]} style={styles.shelf} />
        <View style={styles.shelfEdge} />
      </View>
      <Shelved art="casio-calculator" delay={STORY.products[0]} left={8} price={220} />
      <Shelved art="headphones" delay={STORY.products[1]} left={68} price={320} />
      <Shelved art="eng-maths" delay={STORY.products[2]} left={128} price={240} />
      <Animated.View pointerEvents="none" style={[styles.glint, sweep]} />
      <LinearGradient colors={["rgba(255,255,255,0.32)", "rgba(255,255,255,0)"]} end={{ x: 0.7, y: 0.7 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.windowFrame} />
    </View>
  );
}

/** The door, with a glass panel, a brass handle and a small OPEN card that swings on its string. */
function Door() {
  const swing = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    swing.set(withDelay(STORY.sign + 200, withSequence(withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) }), withTiming(-0.7, { duration: 520 }), withTiming(0.4, { duration: 460 }), withTiming(-0.2, { duration: 420 }), withTiming(0, { duration: 380 }))));
  }, [reduced, swing]);
  const card = useAnimatedStyle(() => ({ transform: [{ rotate: `${swing.get() * 9}deg` }] }));
  return (
    <View style={styles.door}>
      <LinearGradient colors={["#42707E", "#223F4B"]} style={StyleSheet.absoluteFill} />
      <View style={styles.doorGlass}>
        <LinearGradient colors={["rgba(255,241,206,0.9)", "rgba(217,184,115,0.8)"]} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={["rgba(255,255,255,0.4)", "rgba(255,255,255,0)"]} end={{ x: 0.9, y: 0.9 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      </View>
      <LinearGradient colors={["#F3DA8A", "#B38A28"]} style={styles.handle} />
      <Animated.View style={[styles.openCard, card]}>
        <Text style={styles.openText}>OPEN</Text>
      </Animated.View>
    </View>
  );
}

/** The earnings chip: a coin drops in and the amount counts up, the way it will on the seller's Home. */
function Earnings() {
  const t = useBeat(STORY.earnings, "spring");
  const reduced = useReducedMotion();
  const [counting, setCounting] = useState(Boolean(reduced));
  useEffect(() => {
    if (reduced) return;
    const timer = setTimeout(() => setCounting(true), STORY.earnings + 150);
    return () => clearTimeout(timer);
  }, [reduced]);
  const shown = useCountUp(counting ? 1245 : 0, 900);
  const style = useAnimatedStyle(() => ({ opacity: t.get(), transform: [{ translateY: (1 - t.get()) * -18 }, { scale: 0.85 + t.get() * 0.15 }] }));
  return (
    <Animated.View style={[styles.earnings, style]} testID="welcome-earnings">
      <LinearGradient colors={["#FFE9A3", "#E3B53F"]} style={styles.coin}>
        <Icon color="#7A4F00" name="dollar-sign" size={14} />
      </LinearGradient>
      <View>
        <Text style={styles.earnLabel}>This week</Text>
        <Text style={styles.earnValue}>R {String(shown).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}</Text>
      </View>
    </Animated.View>
  );
}

/** The whole shop front, building itself on a pavement: wall, awning, sign, window with three products, door, then the earnings chip. */
function ShopStory() {
  const body = useBeat(0, "ease", 600);
  const style = useAnimatedStyle(() => ({ opacity: body.get(), transform: [{ translateY: (1 - body.get()) * 26 }, { scale: 0.96 + body.get() * 0.04 }] }));
  return (
    <View style={styles.scene} testID="welcome-story">
      <Earnings />
      <Animated.View style={[styles.stage, style]}>
        <View style={styles.shop}>
          <Wall />
          <View style={styles.cornice}>
            <LinearGradient colors={["#5B6B73", "#3C4A52"]} style={StyleSheet.absoluteFill} />
          </View>
          <Sign />
          <Awning />
          <Window />
          <Door />
        </View>
        <LinearGradient colors={["#9BA7AC", "#6B787F"]} style={styles.pavement} />
        <View style={styles.groundShadow} />
      </Animated.View>
    </View>
  );
}

/** The first seller page: a small shop builds itself, then "Welcome. Let's set up your shop." and the button that starts the setup. */
export function SellerWelcomeScreen() {
  const router = useRouter();
  const dispatch = useSellerDispatch();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    // two gentle pulses once the button is in, then it rests
    pulse.set(withDelay(STORY.button + 500, withRepeat(withSequence(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 700, easing: Easing.inOut(Easing.sin) })), 2)));
  }, [pulse, reduced]);
  const breathe = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.get() * 0.035 }] }));

  return (
    <SellerScreen tabs={false} testID="seller-welcome">
      <SellerHeader />
      <View style={styles.body}>
        <ShopStory />
        <Animated.View entering={reduced ? undefined : FadeInDown.delay(STORY.headline).duration(520)}>
          <Text accessibilityRole="header" style={styles.title}>
            Welcome.
          </Text>
          <Text style={styles.title}>Let&apos;s set up your shop.</Text>
        </Animated.View>
        <View style={styles.benefits}>
          {BENEFITS.map((item, index) => (
            <Animated.View entering={reduced ? undefined : FadeInLeft.delay(STORY.headline + 300 + index * 160).duration(420)} key={item.text} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Icon color="#38606F" name={item.icon} size={18} />
              </View>
              <Text style={styles.benefitText}>{item.text}</Text>
            </Animated.View>
          ))}
        </View>
      </View>
      <Animated.View entering={reduced ? undefined : FadeInDown.delay(STORY.button).duration(420)} style={[styles.footer, breathe]}>
        <SellerButton
          label="Set up my shop"
          onPress={() => {
            dispatch({ type: "sellerStart" });
            router.push("/seller-setup/type" as Href);
          }}
          size="lg"
          testID="seller-start"
          variant="glass"
        />
        <SellerButton
          label="Not now, back to buying"
          onPress={() => {
            dispatch({ role: "buyer", type: "switchRole" });
            router.replace("/home" as Href);
          }}
          size="sm"
          style={styles.later}
          variant="glass"
        />
      </Animated.View>
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  awning: { height: 56, left: 0, position: "absolute", right: 0, top: 44 },
  awningShadow: { height: 26, left: 0, position: "absolute", right: 0, top: 54 },
  back: { backgroundColor: "rgba(120,86,40,0.14)", bottom: 40, left: 0, position: "absolute", right: 0, top: 0 },
  benefit: { alignItems: "center", flexDirection: "row", gap: 12 },
  benefitIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  benefitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  benefits: { gap: 10, marginTop: 18 },
  body: { flex: 1, justifyContent: "center", paddingTop: 8 },
  coin: { alignItems: "center", borderRadius: 15, height: 30, justifyContent: "center", width: 30 },
  contact: { backgroundColor: "rgba(60,36,10,0.55)", borderRadius: 30, bottom: -3, height: 10, left: 6, position: "absolute", right: 6 },
  cornice: { height: 8, left: -4, position: "absolute", right: -4, top: 0 },
  course: { borderTopColor: "rgba(60,50,40,0.1)", borderTopWidth: 1, height: 18, left: 0, position: "absolute", right: 0 },
  door: { borderColor: "#1A3039", borderRadius: 8, borderWidth: 3, bottom: 0, height: 104, overflow: "hidden", position: "absolute", right: 16, width: 58 },
  doorGlass: { borderRadius: 4, height: 50, left: 7, overflow: "hidden", position: "absolute", right: 7, top: 8 },
  earnLabel: { color: "#5F6E76", fontSize: 11, fontWeight: "600" },
  earnValue: { color: "#1E2B33", fontSize: 17, fontWeight: "800" },
  earnings: { alignItems: "center", alignSelf: "flex-end", backgroundColor: "#EEF3F6", borderRadius: 18, boxShadow: "-4px -4px 10px rgba(255,255,255,0.18), 6px 6px 14px rgba(10,26,34,0.4)", flexDirection: "row", gap: 8, marginBottom: 8, marginRight: 14, paddingHorizontal: 12, paddingVertical: 8 },
  footer: { gap: 10, paddingBottom: 24, paddingTop: 20 },
  glint: { backgroundColor: "rgba(255,255,255,0.9)", bottom: -20, left: 0, position: "absolute", top: -20, width: 26 },
  groundShadow: { backgroundColor: "rgba(8,18,24,0.38)", borderRadius: 140, bottom: -12, filter: "blur(10px)", height: 18, left: 20, position: "absolute", right: 20 },
  handle: { borderRadius: 3, height: 22, position: "absolute", right: 6, top: 66, width: 5 },
  hem: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, bottom: -10, height: 20, left: 0, position: "absolute", right: 0 },
  joint: { backgroundColor: "rgba(60,50,40,0.1)", height: 18, position: "absolute", width: 1 },
  later: { alignSelf: "center" },
  openCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 5, height: 14, justifyContent: "center", left: 10, position: "absolute", top: 54, transformOrigin: "50% 0%", width: 38 },
  openText: { color: "#2F5A67", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  pavement: { borderRadius: 4, height: 16, left: -10, position: "absolute", right: -10, top: 244 },
  plus: { alignItems: "center", left: 0, position: "absolute", right: 0, top: -10 },
  plusText: { color: "#1E7A4A", fontSize: 12, fontWeight: "800" },
  product: { borderRadius: 12, boxShadow: "0 6px 10px rgba(60,36,10,0.3)", height: 58, overflow: "hidden", width: 58 },
  scene: { alignItems: "center", marginBottom: 30 },
  shelf: { borderRadius: 3, bottom: 0, height: 11, left: 0, position: "absolute", right: 0 },
  shelfEdge: { backgroundColor: "rgba(255,255,255,0.35)", bottom: 10, height: 1, left: 0, position: "absolute", right: 0 },
  shelfWrap: { bottom: 28, height: 11, left: 4, position: "absolute", right: 4 },
  shop: { borderRadius: 6, boxShadow: "0 18px 30px rgba(8,18,24,0.45)", height: 244, overflow: "hidden", width: WIDTH },
  sign: { alignItems: "center", borderRadius: 8, height: 34, justifyContent: "center", left: 56, overflow: "hidden", position: "absolute", right: 56, top: 8 },
  signRim: { borderColor: "rgba(255,255,255,0.18)", borderRadius: 8, borderWidth: 1.5, ...StyleSheet.absoluteFill },
  signText: { color: "#BFF3FF", fontSize: 15, fontWeight: "900", letterSpacing: 3, textShadowColor: "rgba(120,220,255,0.95)", textShadowOffset: { height: 0, width: 0 }, textShadowRadius: 10 },
  slot: { bottom: 38, height: 58, position: "absolute", width: 58 },
  stage: { height: 262, width: WIDTH },
  stripe: { height: 56, position: "absolute", top: 0, width: STRIPE_W },
  stripeBody: { height: 46, left: 0, position: "absolute", right: 0, top: 0 },
  title: { color: "#FFFFFF", fontSize: 32, fontWeight: "800", letterSpacing: -0.5, lineHeight: 38 },
  window: { backgroundColor: "#D9B873", borderColor: "#223F4B", borderRadius: 6, borderWidth: 4, bottom: 8, left: 12, overflow: "hidden", position: "absolute", right: 90, top: 112 },
  windowFrame: { borderColor: "rgba(0,0,0,0.25)", borderRadius: 2, borderWidth: 1, ...StyleSheet.absoluteFill },
});
