import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { ease } from "@/theme/motion";

/**
 * The Reels icon (owner reference): a rounded square with five white bars, short, tall, medium, tall, short.
 * Active, the bars gently rise and fall like a sound meter. Inactive it stays still. Reduce Motion keeps it still.
 */
const BARS = [0.36, 0.78, 0.5, 0.78, 0.36] as const;

export function ReelsGlyph({ active, color, size = 26 }: { active: boolean; color: string; size?: number }) {
  return (
    <View style={[styles.square, { backgroundColor: color, borderRadius: size * 0.3, height: size, width: size }]}>
      <View style={[styles.row, { gap: size * 0.07 }]}>
        {BARS.map((height, index) => (
          <Bar active={active} height={height * size * 0.78} index={index} key={index} width={size * 0.1} />
        ))}
      </View>
    </View>
  );
}

function Bar({ active, height, index, width }: { active: boolean; height: number; index: number; width: number }) {
  const reduced = useReducedMotion();
  const level = useSharedValue(1);

  useEffect(() => {
    if (!active || reduced) {
      cancelAnimation(level);
      level.set(withTiming(1, { duration: 200 }));
      return;
    }
    level.set(
      withDelay(
        index * 90,
        withRepeat(withTiming(0.55, { duration: 520 + index * 70, easing: ease.inOut }), -1, true),
      ),
    );
    return () => cancelAnimation(level);
  }, [active, index, level, reduced]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: level.get() }] }));
  return <Animated.View style={[{ backgroundColor: "#FFFFFF", borderRadius: width / 2, height, width }, style]} />;
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", justifyContent: "center" },
  square: { alignItems: "center", justifyContent: "center" },
});
