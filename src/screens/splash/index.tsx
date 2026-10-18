import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View, useWindowDimensions } from "react-native";

const SPLASH_REFERENCE = require("./assets/reference-screen/vossie-ios-splash.png");
const WORDMARK = require("../../../assets/branding/vossie-wordmark.svg");

const REFERENCE_WIDTH = 1290;
const REFERENCE_HEIGHT = 2796;

/**
 * Approved opening screen supplied at the native 3x iPhone size (1290x2796).
 * `contain` preserves the complete lockup and legal line on other aspect ratios,
 * with the white canvas absorbing any remaining space.
 */
export function SplashScreen() {
  const { height, width } = useWindowDimensions();
  const scale = Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT);

  return (
    <View style={styles.canvas}>
      <StatusBar hidden />
      <View
        style={[
          styles.referenceFrame,
          { height: REFERENCE_HEIGHT * scale, width: REFERENCE_WIDTH * scale },
        ]}
      >
        <Image contentFit="fill" source={SPLASH_REFERENCE} style={styles.artwork} />
        <View
          style={[
            styles.wordmarkCover,
            {
              height: 320 * scale,
              left: 210 * scale,
              top: 1265 * scale,
              width: 870 * scale,
            },
          ]}
        />
        <Image
          accessibilityLabel="Vossie Marketplace"
          contentFit="fill"
          source={WORDMARK}
          style={[
            styles.wordmark,
            {
              height: 280 * scale,
              left: 240 * scale,
              top: 1287 * scale,
              width: 810 * scale,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  artwork: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  canvas: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    flex: 1,
    justifyContent: "center",
  },
  referenceFrame: {
    position: "relative",
  },
  wordmark: {
    position: "absolute",
  },
  wordmarkCover: {
    backgroundColor: "#FFFFFF",
    position: "absolute",
  },
});
