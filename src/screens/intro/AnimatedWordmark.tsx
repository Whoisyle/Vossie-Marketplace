import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

import {
  BRAND_BLUE,
  type FrameMetrics,
  introTimeline,
  rangeProgress,
  welcomeReference,
} from "./VossieIntroTransition";
import { useIntroRevealAccessibility } from "./useIntroRevealAccessibility";

const WHITE_WORDMARK = require("./assets/vossie-wordmark-white.svg");
const BLUE_WORDMARK = require("../../../assets/branding/vossie-wordmark.svg");
const WORDMARK_ASPECT = 1647 / 569;
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1).factory();
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1).factory();

type AnimatedWordmarkProps = {
  clock: SharedValue<number>;
  reducedMotion: boolean;
  viewportHeight: number;
  viewportWidth: number;
  welcomeFrame: FrameMetrics;
};

export function AnimatedWordmark({
  clock,
  reducedMotion,
  viewportHeight,
  viewportWidth,
  welcomeFrame,
}: AnimatedWordmarkProps) {
  const accessibilityRevealed = useIntroRevealAccessibility(
    clock,
    introTimeline.whiteWordmarkReveal,
    reducedMotion,
  );
  const middleWidth = Math.min(viewportWidth * 0.74, 560);
  const middleHeight = middleWidth / WORDMARK_ASPECT;
  const middleLeft = (viewportWidth - middleWidth) / 2;
  const middleTop = (viewportHeight - middleHeight) / 2;
  const destination = {
    height: welcomeReference.logo.height * welcomeFrame.scale,
    left: welcomeFrame.left + welcomeReference.logo.left * welcomeFrame.scale,
    top: welcomeFrame.top + welcomeReference.logo.top * welcomeFrame.scale,
    width: welcomeReference.logo.width * welcomeFrame.scale,
  };
  const translateX =
    destination.left +
    destination.width / 2 -
    (middleLeft + middleWidth / 2);
  const translateY =
    destination.top +
    destination.height / 2 -
    (middleTop + middleHeight / 2);
  const destinationScale = destination.width / middleWidth;

  const containerStyle = useAnimatedStyle(() => {
    if (reducedMotion) {
      const fade = EASE_OUT(
        rangeProgress(clock.get(), [0, introTimeline.totalDurationMs]),
      );
      return {
        opacity: fade,
        transform: [
          { translateX },
          { translateY },
          { scale: destinationScale },
        ],
      };
    }

    const visible = rangeProgress(clock.get(), [3_400, 3_460]);
    const travel = EASE_IN_OUT(
      rangeProgress(clock.get(), introTimeline.sharedLogoTransition),
    );
    return {
      opacity: visible,
      transform: [
        { translateX: translateX * travel },
        { translateY: translateY * travel },
        { scale: 1 + (destinationScale - 1) * travel },
      ],
    };
  });
  const whiteStyle = useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: 0 };
    const travel = EASE_IN_OUT(
      rangeProgress(clock.get(), introTimeline.sharedLogoTransition),
    );
    return { opacity: 1 - travel };
  });
  const blueStyle = useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: 1 };
    const travel = EASE_IN_OUT(
      rangeProgress(clock.get(), introTimeline.sharedLogoTransition),
    );
    return { opacity: travel };
  });
  const leftCoverStyle = useAnimatedStyle(() => {
    const reveal = EASE_OUT(
      rangeProgress(clock.get(), introTimeline.whiteWordmarkReveal),
    );
    // Hide the cover once fully open so no sub-pixel sliver remains after scaling.
    return {
      opacity: reveal >= 1 ? 0 : 1,
      transform: [{ translateX: -middleWidth * 0.5 * reveal }],
    };
  });
  const rightCoverStyle = useAnimatedStyle(() => {
    const reveal = EASE_OUT(
      rangeProgress(clock.get(), introTimeline.whiteWordmarkReveal),
    );
    return {
      opacity: reveal >= 1 ? 0 : 1,
      transform: [{ translateX: middleWidth * 0.5 * reveal }],
    };
  });

  return (
    <Animated.View
      accessibilityLabel="Vossie Marketplace"
      accessible
      accessibilityElementsHidden={!accessibilityRevealed}
      importantForAccessibility={
        accessibilityRevealed ? "auto" : "no-hide-descendants"
      }
      pointerEvents="none"
      style={[
        styles.container,
        {
          height: middleHeight,
          left: middleLeft,
          top: middleTop,
          width: middleWidth,
        },
        containerStyle,
      ]}
    >
      <Animated.View style={[styles.imageLayer, whiteStyle]}>
        <Image contentFit="fill" source={WHITE_WORDMARK} style={styles.fill} />
      </Animated.View>
      <Animated.View style={[styles.imageLayer, blueStyle]}>
        <Image contentFit="fill" source={BLUE_WORDMARK} style={styles.fill} />
      </Animated.View>
      {!reducedMotion && (
        <>
          <Animated.View style={[styles.leftCover, leftCoverStyle]} />
          <Animated.View style={[styles.rightCover, rightCoverStyle]} />
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: "hidden", position: "absolute" },
  fill: { flex: 1 },
  imageLayer: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  leftCover: {
    backgroundColor: BRAND_BLUE,
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: "50%",
  },
  rightCover: {
    backgroundColor: BRAND_BLUE,
    bottom: 0,
    position: "absolute",
    right: 0,
    top: 0,
    width: "50%",
  },
});
