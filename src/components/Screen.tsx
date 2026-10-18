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
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { color, size, space } from "@/theme/tokens";

type ScreenProps = {
  children: ReactNode;
  /** Fixed content under the scroll area, e.g. a primary action. */
  footer?: ReactNode;
  scroll?: boolean;
  /** Screens inside the tab navigator leave the bottom inset to the tab bar. */
  inTabs?: boolean;
  background?: string;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Screen({
  background = color.background,
  children,
  contentStyle,
  footer,
  inTabs = true,
  scroll = true,
  testID,
}: ScreenProps) {
  const edges: Edge[] = inTabs ? ["top", "left", "right"] : ["top", "left", "right", "bottom"];
  const body = (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, { backgroundColor: background }]} testID={testID}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        ) : (
          body
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
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
