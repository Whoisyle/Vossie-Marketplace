import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

import {
  introTimeline,
  type MotionRange,
  rangeProgress,
} from "./VossieIntroTransition";
import { gradient } from "@/theme/tokens";

import { useIntroRevealAccessibility } from "./useIntroRevealAccessibility";

type AnimatedWelcomeContentProps = {
  clock: SharedValue<number>;
  interactive: boolean;
  reducedMotion: boolean;
  scale: number;
};

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1).factory();
const ACTION_COLOR = "#35505C";
const ACTION_PRESSED_COLOR = "#2A4250";

// Sign-in pill frame on the 852x1846 Welcome canvas.
const SIGN_IN_FRAME = { height: 116, width: 732, x: 60, y: 1594 } as const;

function useRevealStyle(
  clock: SharedValue<number>,
  range: MotionRange,
  scale: number,
  reducedMotion: boolean,
) {
  return useAnimatedStyle(() => {
    const linear = reducedMotion
      ? rangeProgress(clock.get(), [0, introTimeline.totalDurationMs])
      : rangeProgress(clock.get(), range);
    const reveal = EASE_OUT(linear);
    return {
      opacity: reveal,
      transform: [
        { translateY: reducedMotion ? 0 : (1 - reveal) * 14 * scale },
        { scale: reducedMotion ? 1 : 0.985 + reveal * 0.015 },
      ],
    };
  });
}

function AnimatedCopy({
  accessibilityLabel,
  align = "center",
  clock,
  fontFamily,
  fontSize,
  fontWeight = "400",
  height,
  lineHeight,
  range,
  reducedMotion,
  scale,
  text,
  width,
  x,
  y,
}: {
  accessibilityLabel: string;
  align?: "left" | "center" | "right";
  clock: SharedValue<number>;
  fontFamily?: string;
  fontSize: number;
  fontWeight?: "400" | "500" | "600";
  height: number;
  lineHeight: number;
  range: MotionRange;
  reducedMotion: boolean;
  scale: number;
  text: string;
  width: number;
  x: number;
  y: number;
}) {
  const revealStyle = useRevealStyle(clock, range, scale, reducedMotion);
  const accessibilityRevealed = useIntroRevealAccessibility(
    clock,
    range,
    reducedMotion,
  );

  return (
    <Animated.View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityRevealed}
      importantForAccessibility={
        accessibilityRevealed ? "auto" : "no-hide-descendants"
      }
      style={[
        styles.positioned,
        {
          height: height * scale,
          left: x * scale,
          top: y * scale,
          width: width * scale,
        },
        revealStyle,
      ]}
    >
      <Text
        adjustsFontSizeToFit
        allowFontScaling
        maxFontSizeMultiplier={1.35}
        numberOfLines={1}
        style={{
          color: "#101114",
          fontFamily,
          fontSize: fontSize * scale,
          fontWeight,
          includeFontPadding: false,
          lineHeight: lineHeight * scale,
          textAlign: align,
        }}
      >
        {text}
      </Text>
    </Animated.View>
  );
}

const DESCRIPTOR_WORDS = ["Discover", "Buy", "Sell", "Deliver"] as const;

// Separate words keep the reference's wide spacing on web, where repeated
// spaces collapse.
function AnimatedDescriptor({
  clock,
  reducedMotion,
  scale,
}: {
  clock: SharedValue<number>;
  reducedMotion: boolean;
  scale: number;
}) {
  const range = introTimeline.descriptor;
  const revealStyle = useRevealStyle(clock, range, scale, reducedMotion);
  const accessibilityRevealed = useIntroRevealAccessibility(
    clock,
    range,
    reducedMotion,
  );

  return (
    <Animated.View
      accessible
      accessibilityLabel="Discover, Buy, Sell, Deliver"
      accessibilityElementsHidden={!accessibilityRevealed}
      importantForAccessibility={
        accessibilityRevealed ? "auto" : "no-hide-descendants"
      }
      style={[
        styles.positioned,
        styles.descriptorRow,
        {
          columnGap: 40 * scale,
          height: 34 * scale,
          left: 76 * scale,
          top: 1075 * scale,
          width: 700 * scale,
        },
        revealStyle,
      ]}
    >
      {DESCRIPTOR_WORDS.map((word) => (
        <Text
          allowFontScaling
          key={word}
          maxFontSizeMultiplier={1.35}
          style={[
            styles.descriptorWord,
            { fontSize: 20 * scale, lineHeight: 30 * scale },
          ]}
        >
          {word}
        </Text>
      ))}
    </Animated.View>
  );
}

function SignInAction({
  clock,
  interactive,
  onPress,
  reducedMotion,
  scale,
}: {
  clock: SharedValue<number>;
  interactive: boolean;
  onPress: () => void;
  reducedMotion: boolean;
  scale: number;
}) {
  const range = introTimeline.signInAction;
  const revealStyle = useRevealStyle(clock, range, scale, reducedMotion);
  const accessibilityRevealed = useIntroRevealAccessibility(
    clock,
    range,
    reducedMotion,
  );
  const height = Math.max(SIGN_IN_FRAME.height * scale, 44);
  const touchExpansion = (height - SIGN_IN_FRAME.height * scale) / 2;

  return (
    <Animated.View
      accessibilityElementsHidden={!accessibilityRevealed}
      importantForAccessibility={
        accessibilityRevealed ? "auto" : "no-hide-descendants"
      }
      testID="welcome-sign-in-host"
      style={[
        styles.positioned,
        {
          height,
          left: SIGN_IN_FRAME.x * scale,
          top: SIGN_IN_FRAME.y * scale - touchExpansion,
          width: SIGN_IN_FRAME.width * scale,
        },
        revealStyle,
      ]}
    >
      <Pressable
        accessibilityHint="Opens the Vossie sign-in screen."
        accessibilityLabel="Sign In with Eduvos"
        accessibilityRole="button"
        accessibilityState={{ disabled: !interactive }}
        disabled={!interactive}
        onPress={onPress}
        style={({ pressed }) => [
          styles.signInButton,
          {
            backgroundColor: pressed ? ACTION_PRESSED_COLOR : ACTION_COLOR,
            borderRadius: height / 2,
            height,
            overflow: "hidden",
            transform: [{ scale: pressed ? 0.985 : 1 }],
          },
        ]}
      >
        <LinearGradient
          colors={gradient.primary}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <Text
          allowFontScaling
          maxFontSizeMultiplier={1.35}
          numberOfLines={1}
          style={[styles.signInLabel, { fontSize: 34 * scale }]}
        >
          Sign In with Eduvos
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function FooterLink({
  accessibilityLabel,
  align = "center",
  height,
  interactive,
  onPress,
  revealed,
  scale,
  text,
  width,
  x,
  y,
}: {
  accessibilityLabel: string;
  align?: "left" | "center" | "right";
  height: number;
  interactive: boolean;
  onPress?: () => void;
  revealed: boolean;
  scale: number;
  text: string;
  width: number;
  x: number;
  y: number;
}) {
  return (
    <Pressable
      accessibilityElementsHidden={!revealed}
      accessibilityHint={onPress ? undefined : "The destination will be connected when its approved screen or URL is supplied."}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="link"
      disabled={!interactive}
      importantForAccessibility={revealed ? "auto" : "no-hide-descendants"}
      onPress={onPress}
      style={({ pressed }) => [
        styles.positioned,
        {
          height: Math.max(height * scale, 44),
          left: x * scale,
          opacity: pressed ? 0.58 : 1,
          top: y * scale - Math.max((44 - height * scale) / 2, 0),
          width: width * scale,
        },
      ]}
    >
      <Text
        adjustsFontSizeToFit
        allowFontScaling
        maxFontSizeMultiplier={1.35}
        numberOfLines={1}
        style={{
          color: "#101114",
          fontSize: 26 * scale,
          includeFontPadding: false,
          lineHeight: height * scale,
          textAlign: align,
        }}
      >
        {text}
      </Text>
    </Pressable>
  );
}

export function AnimatedWelcomeContent({
  clock,
  interactive,
  reducedMotion,
  scale,
}: AnimatedWelcomeContentProps) {
  const router = useRouter();
  const footerStyle = useRevealStyle(
    clock,
    introTimeline.footer,
    scale,
    reducedMotion,
  );
  const footerAccessibilityRevealed = useIntroRevealAccessibility(
    clock,
    introTimeline.footer,
    reducedMotion,
  );

  return (
    <>
      <AnimatedCopy
        accessibilityLabel="Welcome to Vossie"
        clock={clock}
        fontFamily="Georgia"
        fontSize={82}
        height={112}
        lineHeight={108}
        range={introTimeline.heading}
        reducedMotion={reducedMotion}
        scale={scale}
        text="Welcome to Vossie"
        width={792}
        x={30}
        y={958}
      />
      <AnimatedDescriptor
        clock={clock}
        reducedMotion={reducedMotion}
        scale={scale}
      />
      <SignInAction
        clock={clock}
        interactive={interactive}
        onPress={() => router.push("/sign-in")}
        reducedMotion={reducedMotion}
        scale={scale}
      />
      <Animated.View
        style={[
          styles.footer,
          {
            height: 62 * scale,
            left: 18 * scale,
            top: 1740 * scale,
            width: 806 * scale,
          },
          footerStyle,
        ]}
      >
        <View style={styles.fill}>
          <FooterLink accessibilityLabel="Vossie Business" align="left" height={55} interactive={interactive} onPress={() => router.push("/seller-setup/welcome")} revealed={footerAccessibilityRevealed} scale={scale} text="Vossie Business" width={260} x={0} y={6} />
          <FooterLink accessibilityLabel="Terms" align="right" height={55} interactive={interactive} onPress={() => router.push("/legal/terms")} revealed={footerAccessibilityRevealed} scale={scale} text="Terms" width={86} x={620} y={6} />
          <FooterLink accessibilityLabel="Privacy" align="right" height={55} interactive={interactive} revealed={footerAccessibilityRevealed} scale={scale} text="Privacy" width={94} x={712} y={6} />
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  descriptorRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  descriptorWord: { color: "#101114", includeFontPadding: false },
  fill: { flex: 1 },
  footer: { position: "absolute" },
  positioned: { position: "absolute" },
  signInButton: {
    alignItems: "center",
    borderCurve: "continuous",
    justifyContent: "center",
    width: "100%",
  },
  signInLabel: {
    color: "#FFFFFF",
    fontWeight: "400",
    includeFontPadding: false,
  },
});
