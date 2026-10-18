import { StyleSheet, Text } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOnline } from "@/lib/useOnline";
import { color, space } from "@/theme/tokens";

import { Icon } from "./Icon";

/**
 * A slim bar at the top when the phone has no connection. Browsing keeps working with what is already loaded;
 * paying and placing orders need a connection and say so.
 */
export function OfflineBanner({ forceOffline = false }: { forceOffline?: boolean }) {
  const online = useOnline();
  const insets = useSafeAreaInsets();
  if (online && !forceOffline) return null;
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      entering={FadeInDown.duration(220)}
      exiting={FadeOutUp.duration(160)}
      pointerEvents="none"
      style={[styles.bar, { paddingTop: insets.top + 4 }]}
      testID="offline-banner"
    >
      <Icon color={color.onPrimary} name="wifi-off" size={14} />
      <Text style={styles.text}>You&apos;re offline. You can still browse; paying needs a connection.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: "center",
    backgroundColor: color.ink,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    left: 0,
    paddingBottom: 6,
    paddingHorizontal: space.md,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 50,
  },
  text: { color: color.onPrimary, fontSize: 12, fontWeight: "600" },
});
