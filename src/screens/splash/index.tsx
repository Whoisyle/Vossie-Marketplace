import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { colors, motion, spacing } from "@/theme";

export function SplashScreen() {
  useEffect(() => {
    const nextScreenTimer = setTimeout(() => router.replace("/home"), motion.splashHold);

    return () => clearTimeout(nextScreenTimer);
  }, []);

  return (
    <View style={styles.container}>
      <Image
        accessibilityLabel="Vossie Marketplace"
        contentFit="contain"
        source={require("../../../assets/branding/vossie-wordmark.png")}
        style={styles.wordmark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.brandCream,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  wordmark: {
    aspectRatio: 3,
    maxWidth: 360,
    width: "62%",
  },
});
