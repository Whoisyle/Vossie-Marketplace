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
export const STORY = { awning: 250, sign: 1050, products: [1500, 1950, 2400], earnings: 3000, headline: 3400, button: 4300 } as const;

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

const STRIPES = 7;

/** The awning: stripes that unroll one after another from the top of the shop front. */
function Awning({ width }: { width: number }) {
  return (
    <View style={[styles.awning, { width }]}>
      {Array.from({ length: STRIPES }, (_, i) => (
        <Stripe delay={STORY.awning + i * 70} index={i} key={i} />
      ))}
    </View>
  );
}

function Stripe({ delay, index }: { delay: number; index: number }) {
  const t = useBeat(delay, "spring");
  const style = useAnimatedStyle(() => ({ opacity: t.get(), transform: [{ translateY: (1 - t.get()) * -26 }, { scaleY: 0.4 + t.get() * 0.6 }] }));
  return <Animated.View style={[styles.stripe, index % 2 === 0 ? styles.stripeDark : styles.stripeLight, style]} />;
}

/** The sign over the door. It lights up, glows once, and stays lit. */
function Sign() {
  const t = useBeat(STORY.sign, "ease", 520);
  const glow = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    glow.set(withDelay(STORY.sign + 300, withSequence(withTiming(1, { duration: 500 }), withTiming(0.35, { duration: 900 }))));
  }, [glow, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: 0.25 + t.get() * 0.75, transform: [{ scale: 0.9 + t.get() * 0.1 }] }));
  const halo = useAnimatedStyle(() => ({ opacity: glow.get() * 0.7, transform: [{ scale: 1 + glow.get() * 0.25 }] }));
  return (
    <View style={styles.signWrap}>
      <Animated.View pointerEvents="none" style={[styles.halo, halo]} />
      <Animated.View style={[styles.sign, style]}>
        <Icon color="#38606F" name="shopping-bag" size={14} />
        <Text style={styles.signText}>Your shop</Text>
      </Animated.View>
    </View>
  );
}

/** A product dropping onto the shelf, with a small "+R" that floats up when it lands. */
function Shelved({ art, delay, left, price }: { art: string; delay: number; left: number; price: number }) {
  const reduced = useReducedMotion();
  const drop = useBeat(delay, "spring");
  const pop = useSharedValue(reduced ? 0 : 0);
  useEffect(() => {
    if (reduced) return;
    pop.set(withDelay(delay + 250, withSequence(withTiming(1, { duration: 260 }), withDelay(500, withTiming(0, { duration: 420 })))));
    const timer = setTimeout(() => haptic.select(), delay + 180);
    return () => clearTimeout(timer);
  }, [delay, pop, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, drop.get() * 3), transform: [{ translateY: (1 - drop.get()) * -150 }, { rotate: `${(1 - drop.get()) * -14}deg` }] }));
  const plus = useAnimatedStyle(() => ({ opacity: pop.get(), transform: [{ translateY: -pop.get() * 22 }] }));
  return (
    <View style={[styles.slot, { left }]}>
      <Animated.View style={[styles.product, style]}>
        <ArtTile id={art} inset={0.06} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.plus, plus]}>
        <Text style={styles.plusText}>+{formatRand(price)}</Text>
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
      <View style={styles.coin}>
        <Icon color="#8A5A0B" name="dollar-sign" size={14} />
      </View>
      <View>
        <Text style={styles.earnLabel}>This week</Text>
        <Text style={styles.earnValue}>R {String(shown).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}</Text>
      </View>
    </Animated.View>
  );
}

/** The whole shop front, building itself: awning, sign, three products on the shelf, then the earnings chip. */
function ShopStory() {
  const body = useBeat(0, "ease", 500);
  const style = useAnimatedStyle(() => ({ opacity: body.get(), transform: [{ translateY: (1 - body.get()) * 24 }] }));
  const width = 296;
  return (
    <View style={styles.scene} testID="welcome-story">
      <Earnings />
      <Animated.View style={[styles.shop, { width }, style]}>
        <Sign />
        <Awning width={width} />
        <View style={styles.window}>
          <View style={styles.shelf} />
          <Shelved art="casio-calculator" delay={STORY.products[0]} left={10} price={220} />
          <Shelved art="headphones" delay={STORY.products[1]} left={80} price={320} />
          <Shelved art="eng-maths" delay={STORY.products[2]} left={150} price={240} />
        </View>
        <View style={styles.door}>
          <View style={styles.knob} />
        </View>
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
  awning: { flexDirection: "row", height: 34, marginTop: 6 },
  benefit: { alignItems: "center", flexDirection: "row", gap: 12 },
  benefitIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  benefitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  benefits: { gap: 10, marginTop: 18 },
  body: { flex: 1, justifyContent: "center", paddingTop: 8 },
  coin: { alignItems: "center", backgroundColor: "#FFD76A", borderRadius: 15, height: 30, justifyContent: "center", width: 30 },
  door: { alignItems: "flex-end", backgroundColor: "#2C4E5B", borderRadius: 8, bottom: 0, height: 74, justifyContent: "center", paddingRight: 6, position: "absolute", right: 22, width: 46 },
  earnLabel: { color: "#5F6E76", fontSize: 11, fontWeight: "600" },
  earnValue: { color: "#1E2B33", fontSize: 17, fontWeight: "800" },
  earnings: { alignItems: "center", alignSelf: "flex-end", backgroundColor: "#EEF3F6", borderRadius: 18, boxShadow: "-4px -4px 10px rgba(255,255,255,0.18), 6px 6px 14px rgba(10,26,34,0.4)", flexDirection: "row", gap: 8, marginBottom: 8, marginRight: 14, paddingHorizontal: 12, paddingVertical: 8 },
  footer: { gap: 10, paddingBottom: 24, paddingTop: 20 },
  halo: { backgroundColor: "#FFFFFF", borderRadius: 30, height: 44, position: "absolute", width: 150 },
  knob: { backgroundColor: "#FFD76A", borderRadius: 3, height: 6, width: 6 },
  later: { alignSelf: "center" },
  plus: { alignItems: "center", left: 0, position: "absolute", right: 0, top: -6 },
  plusText: { color: "#1E7A4A", fontSize: 12, fontWeight: "800" },
  product: { borderRadius: 14, height: 62, overflow: "hidden", width: 62 },
  scene: { alignItems: "center", marginBottom: 22 },
  shelf: { backgroundColor: "#2C4E5B", borderRadius: 3, bottom: 14, height: 5, left: 6, position: "absolute", right: 6 },
  shop: { backgroundColor: "#EEF3F6", borderRadius: 18, boxShadow: "-4px -4px 10px rgba(255,255,255,0.16), 8px 8px 18px rgba(10,26,34,0.42)", height: 188, overflow: "hidden" },
  sign: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingVertical: 6 },
  signText: { color: "#1E2B33", fontSize: 14, fontWeight: "800" },
  signWrap: { alignItems: "center", justifyContent: "center", marginTop: 8 },
  slot: { bottom: 19, height: 62, position: "absolute", width: 62 },
  stripe: { flex: 1, height: 34 },
  stripeDark: { backgroundColor: "#38606F" },
  stripeLight: { backgroundColor: "#FFFFFF" },
  title: { color: "#FFFFFF", fontSize: 32, fontWeight: "800", letterSpacing: -0.5, lineHeight: 38 },
  window: { backgroundColor: "#D5E3E8", borderRadius: 10, bottom: 10, left: 10, position: "absolute", right: 82, top: 82 },
});
