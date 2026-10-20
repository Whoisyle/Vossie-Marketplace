import { useRouter, type Href } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeInLeft,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Icon, type IconName } from "@/components";
import { ArtTile, hasArt } from "@/components/art/ProductArt";
import { ease } from "@/theme/motion";

import { useSellerDispatch } from "./actions";
import { SellerButton, SellerHeader, SellerScreen, Text } from "./ui";

const BENEFITS: { icon: IconName; text: string }[] = [
  { icon: "plus", text: "List what you sell" },
  { icon: "clipboard", text: "Get orders from your campus" },
  { icon: "credit-card", text: "Withdraw your earnings" },
];

/** Products that float behind the welcome: where on the screen, how big, how far they drift and how fast. */
const FLOATERS: { art: string; top: string; left?: string; right?: string; size: number; drift: number; ms: number; tilt: number }[] = [
  { art: "ti-30xs-calculator", drift: 14, left: "6%", ms: 3200, size: 76, tilt: -8, top: "14%" },
  { art: "headphones", drift: 18, ms: 3800, right: "8%", size: 84, tilt: 7, top: "20%" },
  { art: "desk-lamp", drift: 12, left: "12%", ms: 4200, size: 64, tilt: 6, top: "56%" },
  { art: "calculus-textbook", drift: 16, ms: 3500, right: "6%", size: 72, tilt: -6, top: "62%" },
];

/** One product art tile that bobs up and down and sways, for ever. */
function Floater({ art, delay, drift, left, ms, right, size, tilt, top }: (typeof FLOATERS)[number] & { delay: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }), -1, true)));
  }, [delay, ms, reduced, t]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: (t.get() - 0.5) * drift * 2 }, { rotate: `${(t.get() - 0.5) * tilt * 2}deg` }] }));
  if (!hasArt(art)) return null;
  return (
    <Animated.View
      entering={FadeInDown.delay(300 + delay).duration(600)}
      pointerEvents="none"
      style={[styles.floater, { height: size, left: left as never, right: right as never, top: top as never, width: size }]}
    >
      <Animated.View style={[styles.floaterInner, style]}>
        <ArtTile id={art} inset={0.08} />
      </Animated.View>
    </Animated.View>
  );
}

/** A ring that grows out from behind the heading and fades, again and again. */
function Ring({ delay }: { delay: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 4200, easing: Easing.out(Easing.quad) }), -1, false)));
  }, [delay, reduced, t]);
  const style = useAnimatedStyle(() => ({ opacity: (1 - t.get()) * 0.45, transform: [{ scale: 0.5 + t.get() * 1.6 }] }));
  return <Animated.View pointerEvents="none" style={[styles.ring, style]} />;
}

/** A star that twinkles. */
function Twinkle({ delay, left, top }: { delay: number; left: string; top: string }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0.2);
  useEffect(() => {
    if (reduced) return;
    t.set(withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0.15, { duration: 1100 })), -1)));
  }, [delay, reduced, t]);
  const style = useAnimatedStyle(() => ({ opacity: t.get(), transform: [{ scale: 0.7 + t.get() * 0.6 }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.twinkle, { left: left as never, top: top as never }, style]}>
      <Icon color="#FFFFFF" name="star" size={12} />
    </Animated.View>
  );
}

/** A word in the heading that glows in turn, so the line seems to breathe. */
function Glow({ children, delay }: { children: string; delay: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.set(withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 1400, easing: ease.sine }), withTiming(0, { duration: 1400, easing: ease.sine })), -1)));
  }, [delay, reduced, t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.78 + t.get() * 0.22, transform: [{ translateY: -t.get() * 3 }] }));
  return <Animated.Text style={[styles.title, style]}>{children}</Animated.Text>;
}

/** The first seller page: "Welcome. Let's set up your shop." with what a seller gets, and the button that starts the setup. It never sits still. */
export function SellerWelcomeScreen() {
  const router = useRouter();
  const dispatch = useSellerDispatch();
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);
  const shine = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    glow.set(withRepeat(withSequence(withTiming(1, { duration: 1500, easing: ease.sine }), withTiming(0, { duration: 1500, easing: ease.sine })), -1));
    shine.set(withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1));
  }, [glow, reduced, shine]);
  const breathe = useAnimatedStyle(() => ({ transform: [{ scale: 1 + glow.get() * 0.03 }] }));
  const sweep = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - Math.abs(shine.get() - 0.5) * 2), transform: [{ translateX: -160 + shine.get() * 520 }, { rotate: "18deg" }] }));

  return (
    <SellerScreen tabs={false} testID="seller-welcome">
      <View pointerEvents="none" style={styles.stage}>
        <Ring delay={0} />
        <Ring delay={1400} />
        <Ring delay={2800} />
      </View>
      {FLOATERS.map((item, index) => (
        <Floater key={item.art} {...item} delay={index * 350} />
      ))}
      <Twinkle delay={0} left="20%" top="8%" />
      <Twinkle delay={500} left="78%" top="12%" />
      <Twinkle delay={900} left="48%" top="44%" />
      <Twinkle delay={1300} left="88%" top="50%" />
      <Twinkle delay={1700} left="10%" top="40%" />

      <SellerHeader />
      <View style={styles.body}>
        <Animated.View entering={FadeInDown.duration(460)}>
          <Glow delay={0}>Welcome.</Glow>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(120).duration(460)}>
          <Glow delay={700}>Let&apos;s set up your shop.</Glow>
        </Animated.View>
        <View style={styles.benefits}>
          {BENEFITS.map((item, index) => (
            <Animated.View entering={FadeInLeft.delay(360 + index * 140).duration(420)} key={item.text} style={styles.benefit}>
              <BenefitIcon delay={index * 600} icon={item.icon} />
              <Text style={styles.benefitText}>{item.text}</Text>
            </Animated.View>
          ))}
        </View>
      </View>
      <Animated.View entering={FadeInDown.delay(900).duration(420)} style={[styles.footer, breathe]}>
        <View style={styles.cta}>
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
          <Animated.View pointerEvents="none" style={[styles.sweep, sweep]} />
        </View>
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

/** The round icon beside each benefit: it pops a little in turn. */
function BenefitIcon({ delay, icon }: { delay: number; icon: IconName }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.set(withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 700, easing: ease.sine }), withTiming(0, { duration: 700, easing: ease.sine }), withTiming(0, { duration: 1800 })), -1)));
  }, [delay, reduced, t]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + t.get() * 0.14 }] }));
  return (
    <Animated.View style={[styles.benefitIcon, style]}>
      <Icon color="#38606F" name={icon} size={20} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  benefit: { alignItems: "center", flexDirection: "row", gap: 14 },
  benefitIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  benefitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  benefits: { gap: 14, marginTop: 36 },
  body: { flex: 1, justifyContent: "center", paddingTop: 60 },
  cta: { borderRadius: 28, overflow: "hidden" },
  floater: { position: "absolute" },
  floaterInner: { borderRadius: 18, boxShadow: "0 10px 22px rgba(10, 26, 34, 0.35)", flex: 1, overflow: "hidden" },
  footer: { gap: 10, paddingBottom: 24, paddingTop: 40 },
  later: { alignSelf: "center" },
  ring: { borderColor: "#FFFFFF", borderRadius: 160, borderWidth: 2, height: 320, left: "50%", marginLeft: -160, position: "absolute", top: 80, width: 320 },
  stage: { ...StyleSheet.absoluteFill, overflow: "hidden" },
  sweep: { backgroundColor: "rgba(255,255,255,0.5)", bottom: -20, left: 0, position: "absolute", top: -20, width: 36 },
  title: { color: "#FFFFFF", fontSize: 38, fontWeight: "800", letterSpacing: -0.6, lineHeight: 44 },
  twinkle: { position: "absolute" },
});
