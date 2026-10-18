import { StyleSheet, Text, View } from "react-native";

import { color, space } from "@/theme/tokens";

import { Icon } from "../Icon";
import type { VossieMapProps } from "./mapTypes";

/** Web stand-in: the native map does not run in the browser build, so list what the map would show. */
export function VossieMap({ accessibilityLabel = "Map", markers = [], style, testID }: VossieMapProps) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={[styles.box, style]} testID={testID}>
      <Icon color={color.textSecondary} name="map" size={28} />
      <Text style={styles.title}>Map preview</Text>
      <Text style={styles.body}>The live map shows on the phone (Expo Go or a development build).</Text>
      {markers
        .filter((marker) => marker.title)
        .map((marker) => (
          <Text key={marker.id} style={styles.body}>
            • {marker.title}
          </Text>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { color: color.textSecondary, fontSize: 12, textAlign: "center" },
  box: { alignItems: "center", backgroundColor: color.surfaceSoft, gap: 4, justifyContent: "center", padding: space.md },
  title: { color: color.heading, fontSize: 15, fontWeight: "700" },
});
