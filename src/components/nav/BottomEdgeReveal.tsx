import { useFocusEffect } from "expo-router";
import { useCallback, useMemo } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { haptic } from "@/lib/haptics";
import { color } from "@/theme/tokens";

import { useTabChrome } from "./TabChrome";

/**
 * For full-screen screens (Reels, maps): keeps the navbar hidden while this screen is showing, and brings it
 * back for a few seconds when the student swipes up from the bottom edge. Drop it anywhere inside the screen.
 */
export function BottomEdgeReveal({ dark = false }: { dark?: boolean }) {
  const chrome = useTabChrome();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      chrome?.lock(true);
      return () => chrome?.lock(false);
    }, [chrome]),
  );

  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy < -8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy < -24 || gesture.vy < -0.5) {
            haptic.tap();
            chrome?.peek();
          }
        },
      }),
    [chrome],
  );

  return (
    <View
      accessibilityHint="Swipe up to show the navigation bar"
      accessibilityLabel="Navigation bar handle"
      {...swipe.panHandlers}
      style={[styles.edge, { height: 36 + insets.bottom }]}
    >
      <View style={[styles.handle, dark && styles.handleDark]} />
    </View>
  );
}

const styles = StyleSheet.create({
  edge: { alignItems: "center", bottom: 0, justifyContent: "flex-end", left: 0, paddingBottom: 8, position: "absolute", right: 0 },
  handle: { backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 2, height: 4, width: 36 },
  handleDark: { backgroundColor: color.borderStrong },
});
