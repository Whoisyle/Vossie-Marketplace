import { router } from "expo-router";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";

import { StatusRow } from "@/components/status-row";
import { ThemedText } from "@/components/themed-text";
import { architectureStatus } from "@/config/foundation";
import { colors, radius, spacing } from "@/theme";

export function HomeScreen() {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - spacing.xl, 720);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        alignItems: "center",
        flexGrow: 1,
        padding: spacing.md,
        paddingTop: spacing.xl,
      }}
      style={{ backgroundColor: colors.background }}
    >
      <View style={{ gap: spacing.lg, maxWidth: contentWidth, width: "100%" }}>
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="title">Universal app foundation</ThemedText>
          <ThemedText variant="body" style={{ color: colors.secondaryLabel }}>
            Vossie is ready for shared React Native development across web, iOS, and Android.
            Product flows remain intentionally unimplemented until the canonical screen specification is supplied.
          </ThemedText>
        </View>

        <View style={{ gap: spacing.sm }}>
          <StatusRow label="Architecture" value={architectureStatus.foundation} />
          <StatusRow label="Product specification" value={architectureStatus.productSpecification} />
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.separator,
            borderCurve: "continuous",
            borderRadius: radius.lg,
            borderWidth: 1,
            gap: spacing.md,
            padding: spacing.lg,
          }}
        >
          <ThemedText variant="headline">Development loop</ThemedText>
          <ThemedText variant="subhead">
            Save a file, let Metro rebuild it, and verify the result in the connected client.
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/foundation")}
            style={({ pressed }) => ({
              alignItems: "center",
              alignSelf: "flex-start",
              backgroundColor: colors.accent,
              borderCurve: "continuous",
              borderRadius: radius.md,
              minHeight: 44,
              justifyContent: "center",
              opacity: pressed ? 0.72 : 1,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            })}
          >
            <ThemedText variant="headline" style={{ color: colors.onAccent }}>
              View foundation details
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
