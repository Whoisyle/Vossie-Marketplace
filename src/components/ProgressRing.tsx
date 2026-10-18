import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { ease } from "@/theme/motion";
import { color } from "@/theme/tokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * A ring that fills to `progress` (0 to 1) and animates there when it changes. Children sit in the middle.
 * Used for Vossie Points. With Reduce Motion it jumps straight to the value.
 */
export function ProgressRing({
  accessibilityLabel,
  children,
  progress,
  size = 168,
  stroke = 14,
  tint = color.primary,
  track = color.mist,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  tint?: string;
  track?: string;
  accessibilityLabel: string;
  children?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = useSharedValue(0);
  const clamped = Math.min(1, Math.max(0, progress));

  useEffect(() => {
    value.set(reduced ? clamped : withTiming(clamped, { duration: 900, easing: ease.out }));
  }, [clamped, reduced, value]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - value.get()) }));

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: Math.round(clamped * 100) }}
      style={{ height: size, width: size }}
    >
      <Svg height={size} style={styles.svg} width={size}>
        <Circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke={track} strokeWidth={stroke} />
        <AnimatedCircle
          animatedProps={animatedProps}
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={tint}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeLinecap="round"
          strokeWidth={stroke}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  svg: { position: "absolute" },
});
