import type { ReactNode } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { color, corner, space } from "@/theme/tokens";

type TextFieldProps = Omit<TextInputProps, "style"> & {
  label: string;
  error?: string;
  right?: ReactNode;
  locked?: boolean;
};

/** Boxed field with a small label on top, as in Edit Profile. */
export function TextField({ error, label, locked = false, right, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.box, error ? styles.boxError : null, locked && styles.boxLocked]}>
        <View style={styles.inner}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            accessibilityLabel={label}
            editable={!locked}
            placeholderTextColor={color.textMuted}
            style={[styles.input, locked && styles.inputLocked]}
            {...inputProps}
          />
        </View>
        {right}
      </View>
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
  wrapper: { gap: space.xxs },
});
