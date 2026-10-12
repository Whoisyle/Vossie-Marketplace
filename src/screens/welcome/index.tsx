import { Image } from "expo-image";
import { router } from "expo-router";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { IosPressable } from "@/components/IosPressable";
import { radius, spacing } from "@/theme";

const HERO_COLLAGE = require("./assets/hero-collage/hero-collage.png");
const WORDMARK = require("../../../assets/branding/vossie-wordmark.png");
const TEAL = "#2F6670";
const INK = "#112B3E";
const CREAM = "#FCFAF5";

export function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const heroHeight = Math.min(width * 0.86, 360);
  const contentWidth = Math.min(width - spacing.lg * 2, 440);

  return (
    <View style={styles.screen}>
      <View style={[styles.hero, { height: heroHeight }]}>
        <Image
          accessibilityLabel="Vossie student marketplace collage"
          contentFit="cover"
          contentPosition="top"
          source={HERO_COLLAGE}
          style={styles.heroImage}
        />
      </View>

      <View style={[styles.content, { maxWidth: contentWidth }]}>
        <Image
          accessibilityLabel="Vossie Marketplace"
          contentFit="contain"
          source={WORDMARK}
          style={styles.wordmark}
          tintColor={TEAL}
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
            style={styles.button}
          >
            <Text style={styles.buttonText}>Scan to sign in</Text>
          </IosPressable>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.business}>Vossie Business</Text>
        <Text style={styles.legal}>Terms  |  Privacy</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: CREAM,
    flex: 1,
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
    flex: 1,
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
    color: INK,
    fontFamily: "serif",
    fontSize: 31,
    letterSpacing: -0.6,
    lineHeight: 38,
    textAlign: "center",
  },
  subtitle: {
    color: "#4F5D6A",
    fontSize: 16,
    lineHeight: 22,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  tagline: {
    color: TEAL,
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
    backgroundColor: TEAL,
    borderRadius: radius.full,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    width: "100%",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg,
    width: "100%",
  },
  business: {
    color: TEAL,
    fontSize: 13,
    fontStyle: "italic",
  },
  legal: {
    color: "#65717E",
    fontSize: 13,
  },
});
