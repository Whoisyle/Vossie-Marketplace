import { useRouter, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components";
import { haptic } from "@/lib/haptics";
import { playSound } from "@/lib/sounds";
import { actionsFor, planPush, type PushAction } from "@/seller/push";
import type { SellerAlert } from "@/seller/types";
import { useDemoStore } from "@/state/DemoStore";
import { spring } from "@/theme/motion";

import { useSellerDispatch } from "./actions";
import { SELLER } from "./ui";

const KIND_ICON: Record<SellerAlert["kind"], IconName> = { account: "shield", message: "message-circle", money: "dollar-sign", order: "package", promo: "tag", review: "star", stock: "alert-triangle" };
const KIND_TINT: Record<SellerAlert["kind"], string> = { account: "#5E8696", message: "#4C7DB8", money: "#2F8A57", order: "#38606F", promo: "#B07A5B", review: "#E5A92B", stock: "#C2603E" };

/** How long a heads-up card stays on screen when nobody touches it. */
export const PUSH_MS = 6500;

/**
 * A push notification as it looks on the seller's phone: the Vossie Seller mark and name, when it came, the title and the
 * words, and the buttons that do the usual job without opening the app. The same card is used for the real heads-up that
 * slides down from the top and for the examples in Notification settings.
 */
export function PushCard({ actions, alert, onAction, onOpen, quiet = false, time = "now" }: { alert: Pick<SellerAlert, "kind" | "title" | "body">; actions: PushAction[]; onAction?: (action: PushAction) => void; onOpen?: () => void; time?: string; quiet?: boolean }) {
  return (
    <View style={styles.card} testID="push-card">
      <Pressable accessibilityLabel={`${alert.title}. ${alert.body}`} accessibilityRole="button" disabled={!onOpen} onPress={onOpen} style={styles.top}>
        <View style={styles.appIcon}>
          <Text style={styles.appMark}>V</Text>
          <View style={[styles.kindDot, { backgroundColor: KIND_TINT[alert.kind] }]}>
            <Icon color="#FFFFFF" name={KIND_ICON[alert.kind]} size={9} />
          </View>
        </View>
        <View style={styles.flex}>
          <View style={styles.meta}>
            <Text style={styles.app}>VOSSIE SELLER</Text>
            <Text style={styles.time}>{quiet ? "silent · " : ""}{time}</Text>
          </View>
          <Text numberOfLines={1} style={styles.title}>
            {alert.title}
          </Text>
          <Text numberOfLines={2} style={styles.body}>
            {alert.body}
          </Text>
        </View>
      </Pressable>
      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action, index) => (
            <Pressable accessibilityLabel={action.label} accessibilityRole="button" key={action.key} onPress={() => onAction?.(action)} style={[styles.action, index === 0 && styles.actionMain]} testID={`push-${action.key}`}>
              <Text style={[styles.actionText, index === 0 && styles.actionTextMain]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Watches the seller's alerts. When a new one arrives while the app is open it slides a card down from the top, buzzes and
 * chimes (unless it is quiet hours, sound is off or that kind of push is switched off), and can be answered from the card.
 * Swipe it up to dismiss it; it also goes by itself.
 */
export function SellerPushBanner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const dispatch = useSellerDispatch();
  const { state } = useDemoStore();
  const [shown, setShown] = useState<SellerAlert | null>(null);
  const [quiet, setQuiet] = useState(false);
  const seen = useRef<Set<string> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slide = useSharedValue(0);
  const drag = useSharedValue(0);
  const alerts = state.seller.alerts;
  const prefs = state.seller.notify;

  const close = () => {
    slide.set(withTiming(0, { duration: 220 }));
    setTimeout(() => setShown(null), 240);
  };

  // the first look only learns what is already there, so old alerts do not pop up
  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(alerts.map((item) => item.id));
      return;
    }
    const fresh = alerts.filter((item) => !seen.current!.has(item.id));
    for (const item of alerts) seen.current.add(item.id);
    const item = fresh[0];
    if (!item || AppState.currentState !== "active") return;
    const plan = planPush(prefs, item, new Date());
    if (!plan.show) return;
    // a one-off state change in answer to something arriving, not a loop
    setShown(item);
    setQuiet(!plan.loud);
    drag.set(0);
    if (plan.loud) {
      haptic.success();
      playSound("success");
    }
    slide.set(reduced ? withTiming(1, { duration: 120 }) : withSpring(1, spring.soft));
    if (hide.current) clearTimeout(hide.current);
    hide.current = setTimeout(close, PUSH_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts, drag, prefs, reduced, slide]);

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

  const run = (action: PushAction) => {
    const id = shown.href?.split("/").pop() ?? "";
    if (action.key === "accept") dispatch({ accept: true, id, type: "sellerRespondOrder" });
    else if (action.key === "decline") dispatch({ accept: false, id, reason: "Declined from a notification", type: "sellerRespondOrder" });
    else if (action.key === "restock") dispatch({ id, quantity: 10, type: "sellerRestock" });
    else if (shown.href) router.push(shown.href as Href);
    dispatch({ id: shown.id, type: "sellerMarkAlertRead" });
    close();
  };

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 6 }, style]} testID="seller-push">
        <PushCard
          actions={actionsFor(shown)}
          alert={shown}
          onAction={run}
          onOpen={() => {
            dispatch({ id: shown.id, type: "sellerMarkAlertRead" });
            close();
            if (shown.href) router.push(shown.href as Href);
          }}
          quiet={quiet}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  action: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 14, flex: 1, justifyContent: "center", minHeight: 38 },
  actionMain: { backgroundColor: "#FFFFFF" },
  actionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  actionTextMain: { color: SELLER.solid },
  actions: { flexDirection: "row", gap: 8 },
  app: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  appIcon: { alignItems: "center", backgroundColor: "#38606F", borderColor: "rgba(255,255,255,0.35)", borderRadius: 12, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  appMark: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  body: { color: "rgba(255,255,255,0.88)", fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: "rgba(20,35,44,0.96)", borderCurve: "continuous", borderRadius: 22, boxShadow: "0 12px 28px rgba(5, 14, 20, 0.45)", gap: 10, padding: 12 },
  flex: { flex: 1, gap: 1 },
  kindDot: { alignItems: "center", borderColor: "#14232C", borderRadius: 8, borderWidth: 1.5, bottom: -4, height: 16, justifyContent: "center", position: "absolute", right: -4, width: 16 },
  meta: { flexDirection: "row", justifyContent: "space-between" },
  time: { color: "rgba(255,255,255,0.6)", fontSize: 11 },
  title: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  top: { flexDirection: "row", gap: 12 },
  wrap: { left: 12, position: "absolute", right: 12, zIndex: 100 },
});
