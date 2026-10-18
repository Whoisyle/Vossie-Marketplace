import { Image } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { color } from "@/theme/tokens";

import { Icon, type IconName } from "./Icon";

/** Listing or avatar artwork. Falls back to the grey placeholder from the designs. */
export function Media({
  accessibilityLabel,
  icon = "image",
  radius = 16,
  source,
  style,
}: {
  source?: number | string;
  radius?: number;
  icon?: IconName;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? "image" : undefined}
      style={[styles.frame, { borderRadius: radius }, style]}
    >
      {source ? (
        <Image
          contentFit="cover"
          source={typeof source === "string" ? { uri: source } : source}
          style={StyleSheet.absoluteFill}
          transition={150}
        />
      ) : (
        <Icon name={icon} size={22} color="#B9BEC1" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    backgroundColor: color.placeholder,
    justifyContent: "center",
    overflow: "hidden",
  },
});
