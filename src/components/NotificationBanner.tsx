import { useRouter, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { allowedBySettings, newSince, kindIcon, notificationKind } from "@/data/notificationKinds";
import type { NotificationItem } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { presentLocalNotification, setBadgeCount } from "@/lib/notifications";
import { useDemoStore } from "@/state/DemoStore";
import { spring } from "@/theme/motion";
import { color, corner, space } from "@/theme/tokens";

import { Icon } from "./Icon";

export const BANNER_MS = 4500;

/**
 * Watches for new notifications. While the app is on screen it slides a banner down from the top (tap to open,
 * it goes away by itself); when the app is away it raises a notification on the phone instead. Respects the
 * notification settings and keeps the app icon's number in step.
 */
export function NotificationBanner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { dispatch, state } = useDemoStore();
  const [shown, setShown] = useState<NotificationItem | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slide = useSharedValue(0);

  // the first render only learns what is already there, so old notifications do not pop up
  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(state.notifications.map((item) => item.id));
      return;
    }
    const fresh = newSince(seen.current, state.notifications);
    for (const item of state.notifications) seen.current.add(item.id);
    const item = fresh.find((candidate) => allowedBySettings(notificationKind(candidate), candidate.title, state.settings));
    if (!item) return;
    if (AppState.currentState === "active") {
      setShown(item);
      haptic.tap();
      slide.set(reduced ? withTiming(1, { duration: 120 }) : withSpring(1, spring.soft));
      if (hide.current) clearTimeout(hide.current);
      hide.current = setTimeout(() => {
        slide.set(withTiming(0, { duration: 220 }));
        setTimeout(() => setShown(null), 240);
      }, BANNER_MS);
    } else {
      void presentLocalNotification({ body: item.body, href: item.href, title: item.title });
    }
  }, [reduced, slide, state.notifications, state.settings]);

  useEffect(() => {
    void setBadgeCount(state.notifications.filter((item) => !item.read).length);
  }, [state.notifications]);

  useEffect(
    () => () => {
      if (hide.current) clearTimeout(hide.current);
    },
    [],
  );

  const style = useAnimatedStyle(() => ({ opacity: slide.get(), transform: [{ translateY: (1 - slide.get()) * -120 }] }));
  if (!shown) return null;

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + space.xs }, style]}>
      <Pressable
        accessibilityLabel={`${shown.title}. ${shown.body}`}
        accessibilityLiveRegion="polite"
        accessibilityRole="button"
        onPress={() => {
          dispatch({ notificationId: shown.id, type: "markNotificationRead" });
          setShown(null);
          if (shown.href) router.push(shown.href as Href);
        }}
        style={styles.card}
        testID="notification-banner"
      >
        <View style={styles.icon}>
          <Icon color={color.onPrimary} name={kindIcon[notificationKind(shown)]} size={16} />
        </View>
        <View style={styles.flex}>
          <Text numberOfLines={1} style={styles.title}>
            {shown.title}
          </Text>
          <Text numberOfLines={2} style={styles.body}>
            {shown.body}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  body: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  card: {
    alignItems: "center",
    backgroundColor: color.ink,
    borderCurve: "continuous",
    borderRadius: corner.lg,
    boxShadow: "0 10px 24px rgba(11, 22, 38, 0.35)",
    flexDirection: "row",
    gap: space.sm,
    padding: space.sm,
  },
  flex: { flex: 1, gap: 1 },
  icon: { alignItems: "center", backgroundColor: color.primary, borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  title: { color: color.onPrimary, fontSize: 14, fontWeight: "800" },
  wrap: { left: space.md, position: "absolute", right: space.md, zIndex: 100 },
});
