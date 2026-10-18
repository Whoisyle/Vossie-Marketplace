import { type ReactNode, useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { duration, ease } from "@/theme/motion";

import { color, corner, space } from "@/theme/tokens";

type TextFieldProps = Omit<TextInputProps, "style"> & {
  label: string;
  error?: string;
  right?: ReactNode;
  locked?: boolean;
};

/** Boxed field with a small label on top, as in Edit Profile. */
export function TextField({ error, label, locked = false, onBlur, onFocus, right, ...inputProps }: TextFieldProps) {
  const focus = useSharedValue(0);
  const [focused, setFocused] = useState(false);
  const ringStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.get(), [0, 1], [color.border, color.accent]),
    boxShadow: `0 0 0 ${focus.get() * 4}px rgba(183, 196, 204, ${0.55 * focus.get()})`,
  }));
  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.box, error ? styles.boxError : null, locked && styles.boxLocked, !error && !locked && ringStyle]}>
        <View style={styles.inner}>
          <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text>
          <TextInput
            accessibilityLabel={label}
            editable={!locked}
            placeholderTextColor={color.textMuted}
            style={[styles.input, locked && styles.inputLocked]}
            {...inputProps}
            onBlur={(event) => {
              setFocused(false);
              focus.set(withTiming(0, { duration: duration.base, easing: ease.out }));
              onBlur?.(event);
            }}
            onFocus={(event) => {
              setFocused(true);
              focus.set(withTiming(1, { duration: duration.base, easing: ease.out }));
              onFocus?.(event);
            }}
          />
        </View>
        {right}
      </Animated.View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    backgroundColor: color.surface,
    borderColor: color.border,
    borderRadius: corner.md,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 60,
    paddingHorizontal: space.md,
  },
  boxError: { borderColor: color.danger },
  boxLocked: { backgroundColor: color.backgroundMuted },
  error: { color: color.danger, fontSize: 12, marginLeft: space.xxs },
  inner: { flex: 1, paddingVertical: space.xs },
  input: { color: color.text, fontSize: 15, minHeight: 26, paddingVertical: 2 },
  inputLocked: { color: color.textSecondary },
  label: { color: color.textMuted, fontSize: 11 },
  labelFocused: { color: color.accent, fontWeight: "600" },
  wrapper: { gap: space.xxs },
});
