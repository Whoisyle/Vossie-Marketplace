import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { duration } from "@/theme/motion";
import { color, corner, space } from "@/theme/tokens";

import { Icon } from "./Icon";

type SearchBarProps = {
  placeholder?: string;
  /** When set, the idle hint cycles through these (only in the tappable, non-typing bar). */
  placeholders?: string[];
  value?: string;
  onChangeText?: (value: string) => void;
  onSubmit?: () => void;
  /** When set, the bar is a button that opens a search screen. */
  onPress?: () => void;
  autoFocus?: boolean;
  /** Changing this value puts the cursor in the field (used when another screen sends the student to search). */
  focusSignal?: string;
  compact?: boolean;
};

export function SearchBar({
  autoFocus,
  compact = false,
  focusSignal,
  onChangeText,
  onPress,
  onSubmit,
  placeholder = "Search products, service and sellers",
  placeholders,
  value,
}: SearchBarProps) {
  const height = compact ? 44 : 52;
  const lift = useSharedValue(0);
  const input = useRef<TextInput>(null);
  const [hint, setHint] = useState(0);
  useEffect(() => {
    if (focusSignal) input.current?.focus();
  }, [focusSignal]);
  const cycling = Boolean(onPress && placeholders && placeholders.length > 1);

  useEffect(() => {
    if (!cycling) return;
    const timer = setInterval(() => setHint((current) => (current + 1) % placeholders!.length), 3_200);
    return () => clearInterval(timer);
  }, [cycling, placeholders]);

  const barStyle = useAnimatedStyle(() => ({
    boxShadow: `0 ${2 + lift.get() * 6}px ${8 + lift.get() * 10}px rgba(30, 42, 56, ${0.05 + lift.get() * 0.08})`,
    transform: [{ scale: 1 - lift.get() * 0.015 }],
  }));

  if (onPress) {
    const label = cycling ? placeholders![hint]! : placeholder;
    return (
      <Pressable
        accessibilityHint="Opens search"
        accessibilityLabel={placeholder}
        accessibilityRole="search"
        onPress={onPress}
        onPressIn={() => lift.set(withTiming(1, { duration: 100 }))}
        onPressOut={() => lift.set(withTiming(0, { duration: duration.base }))}
      >
        <Animated.View style={[styles.bar, { height }, barStyle]}>
          <Icon name="search" size={compact ? 16 : 22} color={color.textSecondary} />
          <View style={styles.hintBox}>
            <Animated.Text
              entering={FadeInDown.duration(320)}
              exiting={FadeOutUp.duration(240)}
              key={label}
              numberOfLines={1}
              style={styles.placeholder}
            >
              {label}
            </Animated.Text>
          </View>
        </Animated.View>
      </Pressable>
    );
  }
  return (
    <View style={[styles.bar, { height }]}>
      <Icon name="search" size={compact ? 16 : 22} color={color.textSecondary} />
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        onChangeText={onChangeText}
        ref={input}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={color.textMuted}
        returnKeyType="search"
        style={styles.input}
        value={value}
      />
      {value ? (
        <Pressable
          accessibilityLabel="Clear search"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => onChangeText?.("")}
        >
          <Icon name="x-circle" size={18} color={color.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: "center",
    backgroundColor: color.searchField,
    borderRadius: corner.lg,
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.md,
  },
  hintBox: { flex: 1, height: 22, justifyContent: "center", overflow: "hidden" },
  input: { color: color.text, flex: 1, fontSize: 14, height: "100%", outlineWidth: 0 },
  placeholder: { color: color.textMuted, fontSize: 14 },
});

