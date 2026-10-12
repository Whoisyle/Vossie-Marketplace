import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import type { ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type IosPressableProps = Omit<PressableProps, "style"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** A small, interruptible press-in scale/opacity response aligned with iOS controls. */
export function IosPressable({ children, onPressIn, onPressOut, style, ...props }: IosPressableProps) {
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - pressed.get() * 0.08,
    transform: [{ scale: 1 - pressed.get() * 0.025 }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      <Pressable
        {...props}
        onPressIn={(event) => {
          pressed.set(withTiming(1, { duration: 120 }));
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          pressed.set(withTiming(0, { duration: 180 }));
          onPressOut?.(event);
        }}
        style={styles.pressable}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = {
  pressable: {
    alignItems: "center",
    alignSelf: "stretch",
    flex: 1,
    justifyContent: "center",
  } satisfies ViewStyle,
};
