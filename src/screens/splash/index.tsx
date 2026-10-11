import { Image } from "expo-image";
import { router } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { motion, spacing } from "@/theme";

const WORDMARK = require("../../../assets/branding/vossie-wordmark.png");
const LOGO_BLUE = "#2F667A";

export function SplashScreen() {
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const firstOpacity = useSharedValue(0);
  const fullOpacity = useSharedValue(0);
  const fullScale = useSharedValue(0.96);

  useEffect(() => {
    const nextScreenTimer = setTimeout(() => router.replace("/welcome"), motion.splashHold);
    const revealDelay = reducedMotion ? 0 : 820;
    const revealDuration = reducedMotion ? 0 : 760;
    const fullDuration = reducedMotion ? 0 : 900;
    const firstFadeDuration = reducedMotion ? 0 : 380;
    const transitionGap = reducedMotion ? 0 : 320;
    const animationTimer = setTimeout(() => {
      firstOpacity.set(withTiming(1, {
        duration: revealDuration,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
      }));
    }, revealDelay);
    const fullRevealTimer = setTimeout(() => {
      fullOpacity.set(withTiming(1, {
        duration: fullDuration,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
      }));
      fullScale.set(withTiming(1, {
        duration: fullDuration,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
      }));
      firstOpacity.set(withTiming(0, {
        duration: firstFadeDuration,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
      }));
    }, revealDelay + revealDuration + transitionGap);

    return () => {
      clearTimeout(nextScreenTimer);
      clearTimeout(animationTimer);
      clearTimeout(fullRevealTimer);
    };
  }, [firstOpacity, fullOpacity, fullScale, reducedMotion]);

  const firstLetterStyle = useAnimatedStyle(() => ({ opacity: firstOpacity.get() }));
  const fullWordmarkStyle = useAnimatedStyle(() => ({
    opacity: fullOpacity.get(),
    transform: [{ scale: fullScale.get() }],
  }));
  const logoWidth = Math.min(width * 0.62, 218);

  return (
    <View style={styles.container}>
      <View style={styles.frame}>
        <View style={[styles.brandLockup, { width: logoWidth }]} accessible accessibilityLabel="Vossie Marketplace">
          <Animated.View style={[styles.firstLetterCrop, { width: logoWidth * 0.25 }, firstLetterStyle]}>
            <Image contentFit="contain" source={WORDMARK} style={[styles.wordmark, { width: logoWidth }]} tintColor={LOGO_BLUE} />
          </Animated.View>
          <Animated.View style={[styles.fullWordmark, { width: logoWidth }, fullWordmarkStyle]}>
            <Image contentFit="contain" source={WORDMARK} style={[styles.wordmark, { width: logoWidth }]} tintColor={LOGO_BLUE} />
          </Animated.View>
        </View>
        <Text style={styles.footer}>Powered by Vossie Pty Ltd</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    flex: 1,
    justifyContent: "center",
    padding: spacing.md,
  },
  frame: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    maxWidth: 420,
    position: "relative",
    width: "100%",
  },
  brandLockup: {
    alignItems: "center",
    height: 78,
    justifyContent: "center",
    position: "relative",
  },
  firstLetterCrop: {
    height: 58,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    top: 0,
  },
  fullWordmark: {
    alignItems: "center",
    height: 78,
    justifyContent: "center",
    width: "100%",
  },
  wordmark: {
    aspectRatio: 3,
    height: undefined,
  },
  footer: {
    bottom: 10,
    color: "#111111",
    fontFamily: "monospace",
    fontSize: 7,
    letterSpacing: 0.1,
    position: "absolute",
  },
});
