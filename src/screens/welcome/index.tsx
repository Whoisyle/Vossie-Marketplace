import { Image } from "expo-image";
import { router } from "expo-router";
import Animated, { Easing, FadeIn, FadeInDown, FadeInUp, useReducedMotion } from "react-native-reanimated";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IosPressable } from "@/components/IosPressable";
import { brand, radius, spacing } from "@/theme";

const HERO_COLLAGE = require("./assets/hero-collage/hero-collage.png");
const WORDMARK = require("../../../assets/branding/vossie-wordmark.png");

export function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const heroHeight = Math.min(width * 0.78, 320);
  const contentWidth = Math.min(width - spacing.lg * 2, 440);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.duration(520).easing(Easing.out(Easing.cubic))}
          style={[styles.hero, { height: heroHeight }]}
        >
          <Image
            accessibilityLabel="Vossie student marketplace collage"
            contentFit="cover"
            contentPosition="top"
            source={HERO_COLLAGE}
            style={styles.heroImage}
          />
        </Animated.View>

        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.delay(120).duration(520).easing(Easing.out(Easing.cubic))}
          style={[styles.content, { maxWidth: contentWidth }]}
        >
          <Image
            accessibilityLabel="Vossie Marketplace"
            contentFit="contain"
            source={WORDMARK}
            style={styles.wordmark}
            tintColor={brand.teal}
          />
          <Text style={styles.title}>Welcome to Vossie</Text>
          <Text style={styles.subtitle}>Your campus marketplace, made for students.</Text>
          <Text style={styles.tagline}>Discover  •  Buy  •  Sell  •  Deliver</Text>

          <View style={styles.actions}>
            <IosPressable
              accessibilityRole="button"
              accessibilityLabel="Sign in with Eduvos"
              onPress={() => router.push("/eduvos-sign-in")}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Sign in with Eduvos</Text>
            </IosPressable>
            <IosPressable
              accessibilityRole="button"
              accessibilityLabel="Scan to sign in"
              onPress={() => router.push("/qr-sign-in")}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Scan to sign in</Text>
            </IosPressable>
          </View>
        </Animated.View>

        <Animated.View
          entering={reducedMotion ? undefined : FadeInUp.delay(260).duration(520).easing(Easing.out(Easing.cubic))}
          style={styles.footer}
        >
          <Text style={styles.business}>Vossie Business  →</Text>
          <Text style={styles.legal}>Terms  |  Privacy</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: brand.cream,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    overflow: "hidden",
    width: "100%",
  },
  heroImage: {
    height: "100%",
    width: "100%",
  },
  content: {
    alignItems: "center",
    alignSelf: "center",
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    width: "100%",
  },
  wordmark: {
    aspectRatio: 3,
    height: 48,
    marginBottom: spacing.xs,
    width: 126,
  },
  title: {
    color: brand.navy,
    fontFamily: "serif",
    fontSize: 31,
    letterSpacing: -0.6,
    lineHeight: 38,
    textAlign: "center",
  },
  subtitle: {
    color: brand.ink,
    fontSize: 16,
    lineHeight: 22,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  tagline: {
    color: brand.teal,
    fontSize: 15,
    letterSpacing: 1.8,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    width: "100%",
  },
  button: {
    alignItems: "center",
    backgroundColor: brand.teal,
    borderRadius: radius.full,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    width: "100%",
  },
  buttonText: {
    color: brand.white,
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
    padding: spacing.lg,
    width: "100%",
  },
  business: {
    color: brand.teal,
    fontSize: 13,
    fontStyle: "italic",
  },
  legal: {
    color: brand.ink,
    fontSize: 13,
  },
});
