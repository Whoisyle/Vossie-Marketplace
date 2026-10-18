import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { initials } from "@/data/format";
import { color } from "@/theme/tokens";

export function Avatar({
  name,
  size = 44,
  tone = "primary",
  uri,
}: {
  name: string;
  uri?: string;
  size?: number;
  tone?: "primary" | "soft";
}) {
  const label = initials(name || "Vossie");
  return (
    <View
      accessibilityLabel={`${name || "Profile"} photo`}
      accessibilityRole="image"
      style={[
        styles.circle,
        {
          backgroundColor: tone === "primary" ? color.primary : color.surfaceIcon,
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}
    >
      {uri ? (
        <Image contentFit="cover" source={{ uri }} style={StyleSheet.absoluteFill} />
      ) : (
        <Text
          style={{
            color: tone === "primary" ? color.onPrimary : color.heading,
            fontSize: size * (label.length > 1 ? 0.36 : 0.44),
            fontWeight: "700",
          }}
        >
          {label.length > 1 && size >= 60 ? label[0] : label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
