import { useRouter, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { allowedBySettings, newSince, kindIcon, notificationKind, type NotificationKind } from "@/data/notificationKinds";
import type { NotificationItem } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { presentLocalNotification, setBadgeCount } from "@/lib/notifications";
import { useDemoStore } from "@/state/DemoStore";
import { spring } from "@/theme/motion";
import { space } from "@/theme/tokens";

import { PushCard, type PushButton } from "./PushCard";

export const BANNER_MS = 6000;

/** The colour of the small badge on the app mark, by what the notification is about. */
export const KIND_TINT: Record<NotificationKind, string> = { account: "#5E8696", messages: "#4C7DB8", offers: "#B07A5B", orders: "#2F8A57" };

/** The button under a notification: the one thing most people want to do next. */
export function buyerActions(kind: NotificationKind): PushButton[] {
  switch (kind) {
    case "orders":
      return [{ key: "track", label: "Track order" }];
    case "messages":
      return [{ key: "reply", label: "Reply" }];
    case "offers":
      return [{ key: "deal", label: "See the deal" }];
    default:
      return [{ key: "open", label: "Open" }];
  }
}

/**
 * Watches for new notifications. While the app is on screen it slides a card down from the top, with the Vossie mark, what it
 * is about and a button for the next step; swipe it up to put it away, or it goes by itself. When the app is away it raises a
 * notification on the phone instead. Respects the notification settings and keeps the number on the app icon in step.
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
  const drag = useSharedValue(0);

  const close = () => {
    slide.set(withTiming(0, { duration: 220 }));
    setTimeout(() => setShown(null), 240);
  };

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
      drag.set(0);
      haptic.tap();
      slide.set(reduced ? withTiming(1, { duration: 120 }) : withSpring(1, spring.soft));
      if (hide.current) clearTimeout(hide.current);
      hide.current = setTimeout(close, BANNER_MS);
    } else {
      void presentLocalNotification({ body: item.body, href: item.href, title: item.title });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, reduced, slide, state.notifications, state.settings]);

  useEffect(() => {
    void setBadgeCount(state.notifications.filter((item) => !item.read).length);
  }, [state.notifications]);

  useEffect(
    () => () => {
      if (hide.current) clearTimeout(hide.current);
    },
    [],
  );

  const swipe = Gesture.Pan()
    .onUpdate((event) => {
      drag.set(Math.min(0, event.translationY));
    })
    .onEnd((event) => {
      if (event.translationY < -40) runOnJS(close)();
      else drag.set(withSpring(0, spring.snappy));
    });
  const style = useAnimatedStyle(() => ({ opacity: slide.get(), transform: [{ translateY: (1 - slide.get()) * -160 + drag.get() }] }));
  if (!shown) return null;

  const kind = notificationKind(shown);
  const open = () => {
    dispatch({ notificationId: shown.id, type: "markNotificationRead" });
    setShown(null);
    if (shown.href) router.push(shown.href as Href);
  };

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View accessibilityLiveRegion="polite" pointerEvents="box-none" style={[styles.wrap, { top: insets.top + space.xs }, style]} testID="notification-banner">
        <PushCard actions={buyerActions(kind)} appName="VOSSIE" body={shown.body} icon={kindIcon[kind]} onAction={open} onOpen={open} tint={KIND_TINT[kind]} title={shown.title} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { left: space.md, position: "absolute", right: space.md, zIndex: 100 },
});
