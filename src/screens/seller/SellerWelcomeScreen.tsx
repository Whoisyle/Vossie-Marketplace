import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Text as RNText, StyleSheet, View } from "react-native";
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
const PHOTO_H = 236;

/** A real shop front, lit up for opening: the photo comes in dim, the light comes on, the OPEN sign glows, and three products land on the step. */
function ShopStory() {
  const reduced = useReducedMotion();
  const body = useBeat(0, "ease", 600);
  const light = useBeat(STORY.awning, "ease", 900);
  const open = useBeat(STORY.sign, "ease", 500);
  const zoom = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    zoom.set(withTiming(1.08, { duration: 5200, easing: Easing.out(Easing.cubic) }));
  }, [reduced, zoom]);
  const style = useAnimatedStyle(() => ({ opacity: body.get(), transform: [{ translateY: (1 - body.get()) * 26 }, { scale: 0.96 + body.get() * 0.04 }] }));
  const photo = useAnimatedStyle(() => ({ transform: [{ scale: zoom.get() }] }));
  const dim = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - light.get()) }));
  const glow = useAnimatedStyle(() => ({ opacity: light.get() * 0.5 }));
  const sign = useAnimatedStyle(() => ({ opacity: open.get(), transform: [{ scale: 0.85 + open.get() * 0.15 }] }));
  return (
    <View style={styles.scene} testID="welcome-story">
      <Earnings />
      <Animated.View style={[styles.stage, style]}>
        <View style={styles.shop}>
          <Animated.View style={[StyleSheet.absoluteFill, photo]}>
            <Image accessibilityLabel="A shop front" contentFit="cover" source={require("../../../assets/welcome/shop.jpg")} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim, dim]} />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glow]}>
            <LinearGradient colors={["rgba(255,214,140,0.0)", "rgba(255,206,120,0.45)"]} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <LinearGradient colors={["rgba(8,18,24,0)", "rgba(8,18,24,0.55)"]} locations={[0.55, 1]} pointerEvents="none" style={StyleSheet.absoluteFill} />
          <Animated.View style={[styles.neon, sign]}>
            <Text style={styles.neonText}>OPEN</Text>
          </Animated.View>
        </View>
        <View style={styles.row}>
          {SHELF.map((item, index) => (
            <Product delay={STORY.products[index]!} id={item.id} key={item.id} price={item.price} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const SHELF = [
  { id: "casio-calculator", price: 280 },
  { id: "textbook-prog", price: 340 },
  { id: "headphones", price: 450 },
] as const;

/** A product photo that drops onto the step with a small price tag. */
function Product({ delay, id, price }: { delay: number; id: string; price: number }) {
  const t = useBeat(delay, "spring");
  const style = useAnimatedStyle(() => ({ opacity: t.get(), transform: [{ translateY: (1 - t.get()) * -34 }, { scale: 0.7 + t.get() * 0.3 }] }));
  return (
    <Animated.View style={[styles.product, style]}>
      <ArtTile id={id} />
      <View style={styles.tag}>
        <RNText style={styles.tagText}>{formatRand(price * 100)}</RNText>
      </View>
    </Animated.View>
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
  dim: { backgroundColor: "#0A141A" },
  neon: { alignItems: "center", borderColor: "#FFD9A0", borderRadius: 7, borderWidth: 2, boxShadow: "0 0 14px rgba(255,170,90,0.9)", left: 18, paddingHorizontal: 10, paddingVertical: 2, position: "absolute", top: 18 },
  neonText: { color: "#FFE7C2", fontSize: 14, fontWeight: "900", letterSpacing: 3, textShadowColor: "rgba(255,160,80,1)", textShadowOffset: { height: 0, width: 0 }, textShadowRadius: 8 },
  product: { borderRadius: 14, boxShadow: "0 8px 14px rgba(8,18,24,0.4)", height: 70, overflow: "hidden", width: 86 },
  row: { flexDirection: "row", gap: 12, justifyContent: "center", marginTop: -26 },
  shop: { borderRadius: 18, boxShadow: "0 18px 30px rgba(8,18,24,0.45)", height: PHOTO_H, overflow: "hidden", width: WIDTH },
  stage: { width: WIDTH },
  tag: { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 8, bottom: 4, left: 4, paddingHorizontal: 5, paddingVertical: 1, position: "absolute" },
  tagText: { color: "#1E2B33", fontSize: 10, fontWeight: "800" },
  benefit: { alignItems: "center", flexDirection: "row", gap: 12 },
  benefitIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  benefitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  benefits: { gap: 10, marginTop: 18 },
  body: { flex: 1, justifyContent: "center", paddingTop: 8 },
  coin: { alignItems: "center", borderRadius: 15, height: 30, justifyContent: "center", width: 30 },
  earnLabel: { color: "#5F6E76", fontSize: 11, fontWeight: "600" },
  earnValue: { color: "#1E2B33", fontSize: 17, fontWeight: "800" },
  earnings: { alignItems: "center", alignSelf: "flex-end", backgroundColor: "#EEF3F6", borderRadius: 18, boxShadow: "-4px -4px 10px rgba(255,255,255,0.18), 6px 6px 14px rgba(10,26,34,0.4)", flexDirection: "row", gap: 8, marginBottom: 8, marginRight: 14, paddingHorizontal: 12, paddingVertical: 8 },
  footer: { gap: 10, paddingBottom: 24, paddingTop: 20 },
  later: { alignSelf: "center" },
  scene: { alignItems: "center", marginBottom: 30 },
  title: { color: "#FFFFFF", fontSize: 32, fontWeight: "800", letterSpacing: -0.5, lineHeight: 38 },
});
