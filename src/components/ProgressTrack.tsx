import { StyleSheet, View } from "react-native";

import { color } from "@/theme/tokens";

/** Order progress: a line with one dot per step; the current step is larger. */
export function ProgressTrack({
  current,
  label,
  steps,
}: {
  steps: number;
  current: number;
  label: string;
}) {
  const fraction = steps <= 1 ? 1 : Math.min(current, steps - 1) / (steps - 1);
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: steps - 1, min: 0, now: Math.min(current, steps - 1) }}
      style={styles.track}
    >
      <View style={styles.line} />
      <View style={[styles.line, styles.filled, { width: `${fraction * 100}%` }]} />
      <View style={styles.dots}>
        {Array.from({ length: steps }, (_, index) => {
          const done = index <= current;
          const isCurrent = index === current;
          return (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: done ? color.accent : color.borderStrong,
                  height: isCurrent ? 16 : 9,
                  width: isCurrent ? 16 : 9,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { borderRadius: 8 },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    height: 18,
    justifyContent: "space-between",
  },
  filled: { backgroundColor: color.accent },
  line: {
    backgroundColor: color.border,
    height: 3,
    left: 0,
    position: "absolute",
    right: 0,
    top: 7.5,
  },
  track: { height: 18, justifyContent: "center" },
});
