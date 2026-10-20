import { useRouter, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type IconName, PushCard as SharedPushCard } from "@/components";
import { haptic } from "@/lib/haptics";
import { playSound } from "@/lib/sounds";
import { actionsFor, planPush, type PushAction } from "@/seller/push";
import type { SellerAlert, SellerOrder } from "@/seller/types";
import { useDemoStore } from "@/state/DemoStore";
import { spring } from "@/theme/motion";

import { useSellerDispatch } from "./actions";
import { SellerOrderOffer } from "./SellerOrderOffer";

const KIND_ICON: Record<SellerAlert["kind"], IconName> = { account: "shield", message: "message-circle", money: "dollar-sign", order: "package", promo: "tag", review: "star", stock: "alert-triangle", summary: "bar-chart-2" };
const KIND_TINT: Record<SellerAlert["kind"], string> = { account: "#5E8696", message: "#4C7DB8", money: "#2F8A57", order: "#38606F", promo: "#B07A5B", review: "#E5A92B", stock: "#C2603E", summary: "#6B5BA8" };

/** How long a heads-up card stays on screen when nobody touches it. */
export const PUSH_MS = 6500;

/** The seller's push notification: the shared push card in seller words and colours. */
export function PushCard({ actions, alert, onAction, onOpen, quiet = false, time = "now" }: { alert: Pick<SellerAlert, "kind" | "title" | "body">; actions: PushAction[]; onAction?: (action: PushAction) => void; onOpen?: () => void; time?: string; quiet?: boolean }) {
  return <SharedPushCard actions={actions} appName="VOSSIE SELLER" body={alert.body} icon={KIND_ICON[alert.kind]} onAction={(action) => onAction?.(action as PushAction)} onOpen={onOpen} quiet={quiet} time={time} tint={KIND_TINT[alert.kind]} title={alert.title} />;
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
  const [offer, setOffer] = useState<{ order: SellerOrder; loud: boolean } | null>(null);
  const [quiet, setQuiet] = useState(false);
  const seen = useRef<Set<string> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slide = useSharedValue(0);
  const drag = useSharedValue(0);
  const alerts = state.seller.alerts;
  const prefs = state.seller.notify;

  const closeOffer = () => setOffer(null);
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
    // a new order that needs an answer is offered from the bottom of the screen, like a ride request
    const waiting = item.kind === "order" ? state.seller.orders.find((candidate) => item.href?.endsWith(`/${candidate.id}`) && candidate.status === "new" && !candidate.queued) : undefined;
    if (waiting) {
      setOffer({ loud: plan.loud, order: waiting });
      if (plan.loud) {
        haptic.success();
        playSound("success");
      }
      return;
    }
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

  const run = (action: PushAction) => {
    if (!shown) return;
    const id = shown.href?.split("/").pop() ?? "";
    if (action.key === "accept") dispatch({ accept: true, id, type: "sellerRespondOrder" });
    else if (action.key === "decline") dispatch({ accept: false, id, reason: "Declined from a notification", type: "sellerRespondOrder" });
    else if (action.key === "restock") dispatch({ id, quantity: 10, type: "sellerRestock" });
    else if (shown.href) router.push(shown.href as Href);
    dispatch({ id: shown.id, type: "sellerMarkAlertRead" });
    close();
  };

  if (offer) {
    const fresh = state.seller.orders.find((item) => item.id === offer.order.id) ?? offer.order;
    return (
      <SellerOrderOffer
        earnCents={fresh.subtotalCents - fresh.feeCents}
        loud={offer.loud}
        onAccept={() => {
          dispatch({ accept: true, id: fresh.id, type: "sellerRespondOrder" });
          haptic.success();
          closeOffer();
        }}
        onClose={closeOffer}
        onDecline={(reason) => {
          dispatch({ accept: false, id: fresh.id, reason, type: "sellerRespondOrder" });
          closeOffer();
        }}
        onOpen={() => {
          closeOffer();
          router.push(`/seller/orders/${fresh.id}` as Href);
        }}
        order={fresh}
      />
    );
  }
  if (!shown) return null;

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 6 }, style]} testID="seller-push">
        <PushCard
          actions={shown.kind === "order" && !state.seller.orders.some((item) => shown.href?.endsWith(`/${item.id}`) && item.status === "new") ? [{ key: "view", label: "View" }] : actionsFor(shown)}
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
  wrap: { left: 12, position: "absolute", right: 12, zIndex: 100 },
});
