import { useRouter, type Href } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text as RNText, View } from "react-native";
import Animated, { Easing, FadeInDown, FadeInLeft, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";

import { Icon, type IconName } from "@/components";
import { haptic } from "@/lib/haptics";
import { spring } from "@/theme/motion";

import { useCourier } from "./hooks";
import { CountUpRand } from "../seller/motion";
import { SellerButton, SellerCard, SellerHeader, SellerScreen } from "../seller/ui";

/** The story, in milliseconds from the moment the page opens. It plays once and then rests, like the seller's. */
export const STORY = { bars: 600, button: 4300, counter: 400, headline: 2600, words: 0 } as const;

const WORDS = ["Deliver.", "Earn.", "Repeat."] as const;
const WEEK = [180, 260, 120, 340, 290, 480, 380];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const BENEFITS: { icon: IconName; title: string; text: string }[] = [
  { icon: "dollar-sign", text: "A fee on every delivery, and every tip is yours", title: "Earn" },
  { icon: "clock", text: "Work the hours that fit around your lectures", title: "Your hours" },
  { icon: "credit-card", text: "Paid out every Friday, or withdraw sooner", title: "Get paid" },
];

/** One word of the headline that slides up after the one before it. The last one is in white and the rest a little softer. */
function Word({ delay, last, text }: { text: string; delay: number; last: boolean }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    t.set(withDelay(delay, withSpring(1, spring.soft)));
  }, [delay, reduced, t]);
  const style = useAnimatedStyle(() => ({ opacity: t.get(), transform: [{ translateY: (1 - t.get()) * 34 }] }));
  return (
    <Animated.View style={style}>
      <RNText style={[styles.word, !last && styles.wordSoft]}>{text}</RNText>
    </Animated.View>
  );
}

/** One bar of the example week that grows from nothing. */
function Bar({ delay, height, label }: { delay: number; height: number; label: string }) {
  const reduced = useReducedMotion();
  const grow = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    grow.set(withDelay(delay, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) })));
  }, [delay, grow, reduced]);
  const style = useAnimatedStyle(() => ({ height: Math.max(8, height * grow.get()) }));
  return (
    <View style={styles.barCol}>
      <Animated.View style={[styles.bar, style]} />
      <RNText style={styles.barLabel}>{label}</RNText>
    </View>
  );
}

/**
 * The first courier page: big bold words, an example week's earnings counting up with the days growing underneath, three things a
 * courier gets, and the button that starts the setup. A blue page like the seller's welcome, with solid raised cards and no glass.
 */
export function CourierWelcomeScreen() {
  const router = useRouter();
  const { dispatch } = useCourier();
  const reduced = useReducedMotion();

  return (
    <SellerScreen tabs={false} testID="courier-welcome">
      <SellerHeader mode="Courier mode" />
      <View style={styles.words}>
        {WORDS.map((word, index) => (
          <Word delay={STORY.words + index * 220} key={word} last={index === WORDS.length - 1} text={word} />
        ))}
      </View>

      <Animated.View entering={reduced ? undefined : FadeInDown.delay(STORY.counter).duration(520)}>
        <SellerCard style={styles.week} testID="welcome-week">
          <RNText style={styles.weekLabel}>An example week</RNText>
          <CountUpRand cents={124000} style={styles.money} />
          <RNText style={styles.weekHint}>32 deliveries and R 95 in tips</RNText>
          <View style={styles.bars} testID="welcome-bars">
            {WEEK.map((value, index) => (
              <Bar delay={STORY.bars + index * 90} height={(value / 480) * 70} key={index} label={DAYS[index]!} />
            ))}
          </View>
          <RNText style={styles.demo}>Example numbers. What you earn depends on the deliveries you do.</RNText>
        </SellerCard>
      </Animated.View>

      <View style={styles.benefits}>
        {BENEFITS.map((item, index) => (
          <Animated.View entering={reduced ? undefined : FadeInLeft.delay(STORY.headline + index * 160).duration(420)} key={item.title}>
            <SellerCard style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Icon color="#38606F" name={item.icon} size={18} />
              </View>
              <View style={styles.flex}>
                <RNText style={styles.benefitTitle}>{item.title}</RNText>
                <RNText style={styles.benefitText}>{item.text}</RNText>
              </View>
            </SellerCard>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={reduced ? undefined : FadeInDown.delay(STORY.button).duration(420)} style={styles.footer}>
        <SellerButton
          label="Become a courier"
          onPress={() => {
            haptic.press();
            dispatch({ type: "courierStart" });
            router.push("/courier-setup/details" as Href);
          }}
          size="lg"
          testID="courier-start"
          variant="light"
        />
        <SellerButton
          label="Not now, back to buying"
          onPress={() => {
            dispatch({ role: "buyer", type: "switchRole" });
            router.replace("/home" as Href);
          }}
          size="sm"
          style={styles.later}
          variant="solid"
        />
      </Animated.View>
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: "#38606F", borderRadius: 8, width: 26 },
  barCol: { alignItems: "center", flex: 1, gap: 4, justifyContent: "flex-end" },
  barLabel: { color: "#5F6E76", fontSize: 11, fontWeight: "700" },
  bars: { alignItems: "flex-end", flexDirection: "row", height: 94, marginTop: 8 },
  benefit: { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 12 },
  benefitIcon: { alignItems: "center", backgroundColor: "#DDE8EC", borderRadius: 16, height: 40, justifyContent: "center", width: 40 },
  benefitText: { color: "#5F6E76", fontSize: 12 },
  benefitTitle: { color: "#1E2B33", fontSize: 15, fontWeight: "800" },
  benefits: { gap: 10, marginTop: 14 },
  demo: { color: "#8A9AA2", fontSize: 11 },
  flex: { flex: 1 },
  footer: { gap: 10, paddingBottom: 24, paddingTop: 18 },
  later: { alignSelf: "center" },
  money: { color: "#1E2B33", fontSize: 52, fontWeight: "800", letterSpacing: -1.5 },
  week: { gap: 2, marginTop: 14 },
  weekHint: { color: "#5F6E76", fontSize: 13, marginBottom: 6 },
  weekLabel: { color: "#5F6E76", fontSize: 13, fontWeight: "700" },
  word: { color: "#FFFFFF", fontSize: 54, fontWeight: "900", letterSpacing: -2, lineHeight: 58 },
  wordSoft: { color: "#C6D8DE" },
  words: { marginTop: 18 },
});
