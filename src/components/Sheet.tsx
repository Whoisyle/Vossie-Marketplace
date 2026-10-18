import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { haptic } from "@/lib/haptics";
import { duration, ease, spring } from "@/theme/motion";
import { color, corner, space, text } from "@/theme/tokens";

import { Icon } from "./Icon";

/**
 * Bottom sheet for pickers, confirmations and comments. It springs up, the backdrop fades with it, and
 * you can drag the handle down to dismiss. Reduce Motion swaps the movement for a quick fade.
 */
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
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();
  // keep the modal mounted while the closing animation plays
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);

  const unmount = useCallback(() => setMounted(false), []);
  // opening mounts immediately (adjusting state while rendering, not in an effect)
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      drag.set(0);
      progress.set(reduced ? withTiming(1, { duration: duration.fast }) : withSpring(1, spring.soft));
    } else if (mounted) {
      progress.set(withTiming(0, { duration: reduced ? duration.fast : 240, easing: ease.out }, (finished) => {
        "worklet";
        if (finished) scheduleOnRN(unmount);
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => drag.set(Math.max(0, g.dy)),
        onPanResponderRelease: (_e, g) => {
          if (g.dy > 110 || g.vy > 0.9) {
            haptic.tap();
            onClose();
          } else {
            drag.set(withSpring(0, spring.snappy));
          }
        },
      }),
    [drag, onClose],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [0, 1]) * (1 - Math.min(1, drag.get() / 400)),
  }));
  const sheetStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: progress.get() };
    return { transform: [{ translateY: (1 - progress.get()) * (height * 0.55) + drag.get() }], opacity: Math.min(1, progress.get() * 2) };
  });

  if (!mounted) return null;
  return (
    <Modal animationType="none" onRequestClose={onClose} statusBarTranslucent transparent visible>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onClose} style={styles.flex} />
        </Animated.View>
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }, sheetStyle]}>
          <View {...pan.panHandlers} style={styles.grab}>
            <View style={styles.handle} />
          </View>
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
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(30, 42, 56, 0.45)" },
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
  grab: { alignItems: "center", marginHorizontal: -space.lg, paddingBottom: space.xs, paddingTop: space.xxs },
  handle: {
    backgroundColor: color.mist,
    borderRadius: 3,
    height: 5,
    width: 44,
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
    boxShadow: "0 -10px 30px rgba(30, 42, 56, 0.16)",
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
});
