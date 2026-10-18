import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { color, corner, space, text } from "@/theme/tokens";

import { Icon } from "./Icon";

/** Bottom sheet for pickers, confirmations and comments. */
export function Sheet({
  children,
  onClose,
  scroll = true,
  title,
  visible,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text accessibilityRole="header" style={text.sectionTitle}>
              {title}
            </Text>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              hitSlop={10}
              onPress={onClose}
              style={styles.close}
            >
              <Icon name="x" size={20} color={color.heading} />
            </Pressable>
          </View>
          {scroll ? (
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.body}>
              {children}
            </ScrollView>
          ) : (
            <View style={styles.bodyStatic}>{children}</View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(16, 24, 30, 0.4)", flex: 1 },
  body: { maxHeight: 460 },
  bodyStatic: {},
  close: {
    alignItems: "center",
    backgroundColor: color.surfaceIcon,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  flex: { flex: 1, justifyContent: "flex-end" },
  handle: {
    alignSelf: "center",
    backgroundColor: color.borderStrong,
    borderRadius: 3,
    height: 5,
    marginBottom: space.sm,
    width: 40,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: space.md,
  },
  sheet: {
    backgroundColor: color.background,
    borderTopLeftRadius: corner.xl,
    borderTopRightRadius: corner.xl,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
});
