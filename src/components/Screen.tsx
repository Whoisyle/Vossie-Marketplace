import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { usePathname } from "expo-router";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { SafeAreaView, type Edge, useSafeAreaInsets } from "react-native-safe-area-context";

import { color, size, space } from "@/theme/tokens";

import { Backdrop, type BackdropTone, toneForPath } from "./Decor";
import { TAB_BAR_HEIGHT, useTabChrome } from "./nav/TabChrome";

/** The route the screen is on, or nothing where there is no router (tests, previews). */
function useRoutePath(): string {
  try {
    return usePathname() ?? "";
  } catch {
    return "";
  }
}

type ScreenProps = {
  children: ReactNode;
  /** Fixed content under the scroll area, e.g. a primary action. */
  footer?: ReactNode;
  scroll?: boolean;
  /** Screens inside the tab navigator leave the bottom inset to the tab bar. */
  inTabs?: boolean;
  background?: string;
  /** Soft drifting shapes behind the page. Each area of the app has its own tone; "none" turns them off. */
  backdrop?: BackdropTone | "none";
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Screen({
  background = color.background,
  backdrop,
  children,
  contentStyle,
  footer,
  inTabs = true,
  scroll = true,
  testID,
}: ScreenProps) {
  const path = useRoutePath();
  const tone = backdrop ?? toneForPath(path);
  const edges: Edge[] = inTabs ? ["top", "left", "right"] : ["top", "left", "right", "bottom"];
  const chrome = useTabChrome();
  const insets = useSafeAreaInsets();
  // the floating bar sits over the page, so tab screens leave room for it
  const clearance = TAB_BAR_HEIGHT + Math.max(insets.bottom, space.sm) + space.md;
  const footerStyle = useAnimatedStyle(() => ({
    // when the bar slides away the pinned action settles lower to use the space
    transform: [{ translateY: inTabs && chrome ? chrome.hidden.get() * (TAB_BAR_HEIGHT - 8) : 0 }],
  }));
  const body = (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, { backgroundColor: background }]} testID={testID}>
      {tone === "none" ? null : <Backdrop tone={tone} />}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, inTabs && { paddingBottom: clearance }]}
            onScroll={inTabs ? chrome?.onScroll : undefined}
            scrollEventThrottle={16}
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        ) : (
          body
        )}
        {footer ? (
          <Animated.View style={[styles.footer, inTabs && { paddingBottom: clearance - space.md }, footerStyle]}>
            {footer}
          </Animated.View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    flexGrow: 1,
    maxWidth: size.contentMax,
    paddingHorizontal: size.screenGutter,
    width: "100%",
  },
  flex: { flex: 1 },
  footer: {
    alignSelf: "center",
    maxWidth: size.contentMax,
    paddingBottom: space.sm,
    paddingHorizontal: size.screenGutter,
    paddingTop: space.xs,
    width: "100%",
  },
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: space.xl },
});
