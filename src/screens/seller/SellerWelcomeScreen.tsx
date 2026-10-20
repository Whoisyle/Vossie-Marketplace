import { useRouter, type Href } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInLeft, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { Icon, type IconName } from "@/components";
import { ease } from "@/theme/motion";
import { useDemoStore } from "@/state/DemoStore";

import { SellerButton, SellerHeader, SellerScreen } from "./ui";

const BENEFITS: { icon: IconName; text: string }[] = [
  { icon: "plus", text: "List what you sell" },
  { icon: "clipboard", text: "Get orders from your campus" },
  { icon: "credit-card", text: "Withdraw your earnings" },
];

/** The first seller page: "Welcome. Let's set up your shop." with what a seller gets, and the button that starts the setup. */
export function SellerWelcomeScreen() {
  const router = useRouter();
  const { dispatch } = useDemoStore();
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    glow.set(withRepeat(withSequence(withTiming(1, { duration: 1500, easing: ease.sine }), withTiming(0, { duration: 1500, easing: ease.sine })), -1));
  }, [glow, reduced]);
  const breathe = useAnimatedStyle(() => ({ transform: [{ scale: 1 + glow.get() * 0.025 }] }));

  return (
    <SellerScreen tabs={false} testID="seller-welcome">
      <SellerHeader />
      <View style={styles.body}>
        <Animated.Text entering={FadeInDown.duration(460)} style={styles.title}>
          Welcome.
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(120).duration(460)} style={styles.title}>
          Let&apos;s set up your shop.
        </Animated.Text>
        <View style={styles.benefits}>
          {BENEFITS.map((item, index) => (
            <Animated.View entering={FadeInLeft.delay(360 + index * 140).duration(420)} key={item.text} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Icon color="#38606F" name={item.icon} size={20} />
              </View>
              <Text style={styles.benefitText}>{item.text}</Text>
            </Animated.View>
          ))}
        </View>
      </View>
      <Animated.View entering={FadeInDown.delay(900).duration(420)} style={[styles.footer, breathe]}>
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
  benefit: { alignItems: "center", flexDirection: "row", gap: 14 },
  benefitIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  benefitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  benefits: { gap: 14, marginTop: 36 },
  body: { flex: 1, justifyContent: "center", paddingTop: 60 },
  footer: { gap: 10, paddingBottom: 24, paddingTop: 40 },
  later: { alignSelf: "center" },
  title: { color: "#FFFFFF", fontSize: 38, fontWeight: "800", letterSpacing: -0.6, lineHeight: 44 },
});
