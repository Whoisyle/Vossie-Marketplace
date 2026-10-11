import { ScrollView, View, useWindowDimensions } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { foundationCapabilities } from "@/config/foundation";
import { colors, radius, spacing } from "@/theme";

export function FoundationScreen() {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - spacing.xl, 720);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ alignItems: "center", padding: spacing.md, paddingTop: spacing.xl }}
      style={{ backgroundColor: colors.background }}
    >
      <View style={{ gap: spacing.md, maxWidth: contentWidth, width: "100%" }}>
        <ThemedText variant="body" style={{ color: colors.secondaryLabel }}>
          These are engineering capabilities, not marketplace product requirements.
        </ThemedText>
        {foundationCapabilities.map((capability) => (
          <View
            key={capability}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.separator,
              borderCurve: "continuous",
              borderRadius: radius.md,
              borderWidth: 1,
              flexDirection: "row",
              gap: spacing.md,
              padding: spacing.md,
            }}
          >
            <ThemedText variant="headline" style={{ color: colors.success }}>
              ✓
            </ThemedText>
            <ThemedText variant="body" style={{ flex: 1 }}>
              {capability}
            </ThemedText>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
