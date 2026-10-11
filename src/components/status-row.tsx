import { View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { colors, radius, spacing } from "@/theme";

export function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        alignItems: "center",
        flexDirection: "row",
        gap: spacing.md,
        justifyContent: "space-between",
        minHeight: 48,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderColor: colors.separator,
        borderRadius: radius.md,
        borderCurve: "continuous",
        borderWidth: 1,
      }}
    >
      <ThemedText variant="subhead">{label}</ThemedText>
      <ThemedText variant="headline" style={{ color: colors.success }}>
        {value}
      </ThemedText>
    </View>
  );
}
