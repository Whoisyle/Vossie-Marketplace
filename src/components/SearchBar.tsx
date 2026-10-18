import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { color, corner, space } from "@/theme/tokens";

import { Icon } from "./Icon";

type SearchBarProps = {
  placeholder?: string;
  value?: string;
  onChangeText?: (value: string) => void;
  onSubmit?: () => void;
  /** When set, the bar is a button that opens a search screen. */
  onPress?: () => void;
  autoFocus?: boolean;
  compact?: boolean;
};

export function SearchBar({
  autoFocus,
  compact = false,
  onChangeText,
  onPress,
  onSubmit,
  placeholder = "Search products, service and sellers",
  value,
}: SearchBarProps) {
  const height = compact ? 44 : 56;
  if (onPress) {
    return (
      <Pressable
        accessibilityHint="Opens search"
        accessibilityLabel={placeholder}
        accessibilityRole="search"
        onPress={onPress}
        style={({ pressed }) => [styles.bar, { height }, pressed && styles.pressed]}
      >
        <Icon name="search" size={compact ? 16 : 22} color={color.textSecondary} />
        <Text numberOfLines={1} style={styles.placeholder}>
          {placeholder}
        </Text>
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
  input: { color: color.text, flex: 1, fontSize: 14, height: "100%" },
  placeholder: { color: color.textMuted, flex: 1, fontSize: 14 },
  pressed: { opacity: 0.75 },
});
