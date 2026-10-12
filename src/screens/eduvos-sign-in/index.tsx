import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import Animated, { Easing, FadeInDown, useReducedMotion } from "react-native-reanimated";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, spacing } from "@/theme";

const WORDMARK = require("../../../assets/branding/vossie-wordmark.png");
const CREAM = "#FCFAF5";
const TEAL = "#2F6670";
const INK = "#112B3E";
const MICROSOFT_BLUE = "#0067B8";

function MicrosoftMark() {
  return (
    <View accessibilityLabel="Microsoft" style={styles.microsoftMark}>
      <View style={[styles.microsoftSquare, styles.microsoftRed]} />
      <View style={[styles.microsoftSquare, styles.microsoftGreen]} />
      <View style={[styles.microsoftSquare, styles.microsoftBlue]} />
      <View style={[styles.microsoftSquare, styles.microsoftYellow]} />
    </View>
  );
}

export function EduvosSignInScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const tealWidth = Math.min(Math.max(width * 0.72, 260), 360);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <StatusBar style="dark" />
      <View pointerEvents="none" style={[styles.tealPanel, { width: tealWidth }]} />

      <Animated.View
        entering={reducedMotion ? undefined : FadeInDown.duration(480).easing(Easing.bezier(0.23, 1, 0.32, 1))}
        style={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
      >
        <View style={styles.brandHeader}>
          <Image
            accessibilityLabel="Vossie Marketplace"
            contentFit="contain"
            source={WORDMARK}
            style={styles.wordmark}
            tintColor="#FFFFFF"
          />
          <Text style={styles.heading}>Sign in with Eduvos</Text>
          <Text style={styles.description}>
            Use your Eduvos Microsoft account to continue to Vossie Marketplace.
          </Text>
        </View>

        <View accessibilityLabel="Microsoft sign in" style={styles.signInCard}>
          <View style={styles.microsoftHeader}>
            <MicrosoftMark />
            <Text style={styles.microsoftText}>Microsoft</Text>
          </View>
          <Text style={styles.signInTitle}>Sign in</Text>
          <Text style={styles.inputLabel}>Email, phone or Skype</Text>
          <View style={styles.inputLine} />
          <Pressable accessibilityRole="link" style={styles.accountLink}>
            <Text style={styles.accountLinkText}>Can&apos;t access your account?</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.nextButton}>
            <Text style={styles.nextButtonText}>Next</Text>
          </Pressable>
        </View>

        <View style={styles.bottomBar}>
          <Pressable accessibilityRole="button" style={styles.bottomAction}>
            <Text style={styles.backChevron}>‹</Text>
            <Text style={styles.bottomActionText}>Back</Text>
          </Pressable>
          <Pressable accessibilityRole="link" style={styles.bottomAction}>
            <Text style={styles.helpText}>Need help?</Text>
          </Pressable>
        </View>
        <View style={styles.homeIndicator} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: CREAM,
    flex: 1,
  },
  tealPanel: {
    backgroundColor: TEAL,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 180,
    height: 204,
    left: spacing.sm,
    position: "absolute",
    top: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  brandHeader: {
    paddingLeft: spacing.sm,
    paddingRight: spacing.xl,
    paddingTop: spacing.xs,
  },
  wordmark: {
    aspectRatio: 3,
    height: 46,
    marginBottom: spacing.md,
    width: 126,
  },
  heading: {
    color: "#FFFFFF",
    fontFamily: "serif",
    fontSize: 29,
    lineHeight: 29,
    maxWidth: 190,
  },
  description: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 16,
    marginTop: spacing.xs,
    maxWidth: 185,
  },
  signInCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    elevation: 3,
    marginHorizontal: spacing.xs,
    marginTop: spacing.md,
    minHeight: 190,
    padding: spacing.md,
    shadowColor: "#213845",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.11,
    shadowRadius: 14,
  },
  microsoftHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  microsoftMark: {
    flexDirection: "row",
    flexWrap: "wrap",
    height: 15,
    width: 15,
  },
  microsoftSquare: {
    height: 7,
    marginBottom: 1,
    marginRight: 1,
    width: 7,
  },
  microsoftRed: { backgroundColor: "#F25022" },
  microsoftGreen: { backgroundColor: "#7FBA00" },
  microsoftBlue: { backgroundColor: "#00A4EF" },
  microsoftYellow: { backgroundColor: "#FFB900" },
  microsoftText: {
    color: "#5F5F5F",
    fontSize: 13,
  },
  signInTitle: {
    color: "#202020",
    fontSize: 22,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  inputLabel: {
    color: "#5F5F5F",
    fontSize: 11,
    marginTop: spacing.md,
  },
  inputLine: {
    backgroundColor: "#0078D4",
    height: 1,
    marginTop: spacing.xs,
    width: "100%",
  },
  accountLink: {
    alignSelf: "flex-start",
    justifyContent: "center",
    marginTop: spacing.xs,
    minHeight: 30,
  },
  accountLinkText: {
    color: MICROSOFT_BLUE,
    fontSize: 10,
  },
  nextButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: MICROSOFT_BLUE,
    borderRadius: 2,
    justifyContent: "center",
    minHeight: 32,
    minWidth: 78,
    paddingHorizontal: spacing.md,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  bottomBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingHorizontal: spacing.xs,
  },
  bottomAction: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 44,
  },
  backChevron: {
    color: TEAL,
    fontSize: 24,
    lineHeight: 24,
    marginRight: spacing.xs,
  },
  bottomActionText: {
    color: INK,
    fontSize: 10,
  },
  helpText: {
    color: INK,
    fontSize: 10,
    textDecorationLine: "underline",
  },
  homeIndicator: {
    alignSelf: "center",
    backgroundColor: "#111111",
    borderRadius: radius.full,
    height: 4,
    marginTop: spacing.xs,
    width: 104,
  },
});
