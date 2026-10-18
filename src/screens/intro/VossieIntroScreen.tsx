import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

import { AnimatedWordmark } from "./AnimatedWordmark";
import { hopLift, hopRun, hopScales, settleWobble } from "./dotMotion";
import { InkReveal } from "./InkReveal";
import {
  type FrameMetrics,
  activeDotHopIndex,
  introTimeline,
  measureReferenceFrame,
  rangeProgress,
  splashReference,
  wordmarkDotHopTargets,
  welcomeReference,
} from "./VossieIntroTransition";
import { VossieWelcomeScreen } from "./VossieWelcomeScreen";
import { useIntroAnimation } from "./useIntroAnimation";

const SPLASH_REFERENCE = require("../splash/assets/reference-screen/vossie-ios-splash.png");
const WORDMARK_WITHOUT_DOT = require("./assets/vossie-wordmark-no-dot.svg");
const DOT = require("./assets/vossie-dot.svg");
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1).factory();
const DOT_HOP_RANGES = [
  introTimeline.dotHopV,
  introTimeline.dotHopO,
  introTimeline.dotHopS1,
  introTimeline.dotHopS2,
  introTimeline.dotHopI,
] as const;
/** Peak height of each hop in dot heights; the hops climb a little and the last one is the highest. */
const HOP_ARCS = [1.5, 1.7, 1.7, 1.9, 2.3] as const;

type OpeningProps = {
  clock: SharedValue<number>;
  frame: FrameMetrics;
};

function OpeningSplash({ clock, frame }: OpeningProps) {
  const logo = {
    height: splashReference.logo.height * frame.scale,
    left: frame.left + splashReference.logo.left * frame.scale,
    top: frame.top + splashReference.logo.top * frame.scale,
    width: splashReference.logo.width * frame.scale,
  };
  const dot = {
    height: 48.886 * frame.scale,
    left: frame.left + 812.8444 * frame.scale,
    top: frame.top + 1298.7625 * frame.scale,
    width: 51.3647 * frame.scale,
  };
  const layerStyle = useAnimatedStyle(() => ({
    opacity: 1 - EASE_OUT(rangeProgress(clock.get(), introTimeline.portalPrepare)),
  }));
  const dotStyle = useAnimatedStyle(() => {
    const value = clock.get();
    const pop = rangeProgress(value, introTimeline.dotPop);
    const preparing = rangeProgress(value, introTimeline.portalPrepare);
    const popProgress = EASE_OUT(pop);
    const logoUnitScale = (splashReference.logo.width / 1647) * frame.scale;
    const vTarget = wordmarkDotHopTargets[0];
    const popTranslateX = vTarget.translateX * logoUnitScale;
    const popTranslateY =
      vTarget.translateY * logoUnitScale - 0.72 * dot.height;

    const hopIndex = activeDotHopIndex(value);

    let translateX = popTranslateX;
    let translateY = popTranslateY;
    let scaleX = interpolate(
      popProgress,
      [0, 0.58, 1],
      [0.95, 1.14, 1],
      Extrapolation.CLAMP,
    );
    let scaleY = interpolate(
      popProgress,
      [0, 0.58, 1],
      [0.95, 0.82, 1],
      Extrapolation.CLAMP,
    );

    if (hopIndex >= 0) {
      const hopProgress = rangeProgress(value, DOT_HOP_RANGES[hopIndex]!);
      const isLast = hopIndex === DOT_HOP_RANGES.length - 1;
      const target = wordmarkDotHopTargets[hopIndex]!;
      const start = hopIndex === 0
        ? { translateX: vTarget.translateX, translateY: vTarget.translateY - 0.72 * 99.3433 }
        : wordmarkDotHopTargets[hopIndex - 1]!;
      const run = hopRun(hopProgress, isLast);
      const arc = dot.height * HOP_ARCS[hopIndex]!;
      translateX = (start.translateX + (target.translateX - start.translateX) * run) * logoUnitScale;
      translateY =
        (start.translateY + (target.translateY - start.translateY) * hopProgress) * logoUnitScale +
        hopLift(hopProgress, arc);
      const squash = hopScales(hopProgress, hopIndex > 0);
      scaleX = squash.x;
      scaleY = squash.y;
    } else if (value >= introTimeline.dotHopI[1]) {
      const settledTarget = wordmarkDotHopTargets[4];
      const settle = rangeProgress(value, introTimeline.portalPrepare);
      translateX = settledTarget.translateX * logoUnitScale;
      translateY = settledTarget.translateY * logoUnitScale + settleWobble(settle, dot.height * 0.34);
      const wobbleSquash = 1 + 0.05 * Math.abs(Math.sin(settle * 13)) * Math.exp(-5.5 * settle);
      scaleX = (1 - preparing * 0.08) / wobbleSquash;
      scaleY = (1 + preparing * 0.08) * wobbleSquash;
    }

    return {
      opacity: popProgress,
      transform: [
        { translateX },
        { translateY },
        { scaleX },
        { scaleY },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.openingLayer, layerStyle]}>
      <View
        style={{
          height: frame.height,
          left: frame.left,
          position: "absolute",
          top: frame.top,
          width: frame.width,
        }}
      >
        <Image contentFit="fill" source={SPLASH_REFERENCE} style={styles.fill} />
        <View
          style={{
            backgroundColor: "#FFFFFF",
            height: 320 * frame.scale,
            left: 210 * frame.scale,
            position: "absolute",
            top: 1265 * frame.scale,
            width: 870 * frame.scale,
          }}
        />
      </View>
      <Image
        contentFit="fill"
        source={WORDMARK_WITHOUT_DOT}
        style={[styles.positioned, logo]}
      />
      <Animated.View style={[styles.positioned, dot, dotStyle]}>
        <Image contentFit="fill" source={DOT} style={styles.fill} />
      </Animated.View>
    </Animated.View>
  );
}

export function VossieIntroScreen() {
  const { height, width } = useWindowDimensions();
  const { canSkip, clock, isComplete, reducedMotion, skip } =
    useIntroAnimation();
  const splashFrame = measureReferenceFrame(
    width,
    height,
    splashReference.width,
    splashReference.height,
  );
  const welcomeFrame = measureReferenceFrame(
    width,
    height,
    welcomeReference.width,
    welcomeReference.height,
  );

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      <VossieWelcomeScreen
        clock={clock}
        frame={welcomeFrame}
        interactive={isComplete}
        reducedMotion={reducedMotion}
      />
      {!reducedMotion && <OpeningSplash clock={clock} frame={splashFrame} />}
      <InkReveal
        clock={clock}
        frame={splashFrame}
        reducedMotion={reducedMotion}
        viewportHeight={height}
        viewportWidth={width}
      />
      <AnimatedWordmark
        clock={clock}
        reducedMotion={reducedMotion}
        viewportHeight={height}
        viewportWidth={width}
        welcomeFrame={welcomeFrame}
      />
      <Pressable
        accessibilityElementsHidden={!canSkip}
        accessibilityHint="Skips the opening animation and shows the Welcome screen."
        accessibilityLabel="Skip intro animation"
        accessibilityRole="button"
        disabled={!canSkip}
        importantForAccessibility={canSkip ? "auto" : "no-hide-descendants"}
        onPress={skip}
        pointerEvents={canSkip ? "auto" : "none"}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  openingLayer: {
    backgroundColor: "#FFFFFF",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  positioned: { position: "absolute" },
  screen: { backgroundColor: "#FFFFFF", flex: 1, overflow: "hidden" },
});
