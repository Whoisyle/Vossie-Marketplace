import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { Icon } from "@/components";
import { formatRand } from "@/data/format";
import { haptic } from "@/lib/haptics";
import type { SellerOrder } from "@/seller/types";
import { spring } from "@/theme/motion";

import { SELLER } from "./ui";

/** How long the ring takes to run round before the card steps aside. The order stays in New; nothing is declined by the timer. */
export const OFFER_SECONDS = 30;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING = 56;
const RADIUS = 24;
const LENGTH = 2 * Math.PI * RADIUS;

const REASONS = ["Sold out", "Too busy right now", "Can't meet that time"];

/**
 * A new order, offered from the bottom of the screen like a ride request: what you would earn, what is in it, who for and where,
 * a ring that runs down, and a big Accept. Decline asks for a reason. The ring running out only puts the card away; the order
 * waits in New. It buzzes while it is up, unless it is quiet hours or sound is off.
 */
export function SellerOrderOffer({ earnCents, loud, onAccept, onClose, onDecline, onOpen, order }: { order: SellerOrder; earnCents: number; loud: boolean; onAccept: () => void; onDecline: (reason: string) => void; onClose: () => void; onOpen: () => void }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const up = useSharedValue(0);
  const ring = useSharedValue(0);
  const pulse = useSharedValue(0);
  const [left, setLeft] = useState(OFFER_SECONDS);
  const [declining, setDeclining] = useState(false);

  useEffect(() => {
    up.set(reduced ? withTiming(1, { duration: 120 }) : withSpring(1, spring.soft));
    ring.set(withTiming(1, { duration: OFFER_SECONDS * 1000, easing: Easing.linear }));
    pulse.set(reduced ? 0 : withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })), -1));
    const tick = setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1000);
    const buzz = loud ? setInterval(() => haptic.tap(), 2000) : null;
    const done = setTimeout(onClose, OFFER_SECONDS * 1000);
    return () => {
      clearInterval(tick);
      if (buzz) clearInterval(buzz);
      clearTimeout(done);
    };
    // the timers belong to this card for as long as it is on screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - up.get()) * 420 }] }));
  const dot = useAnimatedStyle(() => ({ opacity: 0.5 + pulse.get() * 0.5, transform: [{ scale: 0.9 + pulse.get() * 0.3 }] }));
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: LENGTH * ring.get() }));
  const more = order.lines.length > 1 ? ` +${order.lines.length - 1}` : "";

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} testID="order-offer">
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)} pointerEvents="none" style={styles.dim} />
      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 14 }, sheet]}>
        <View style={styles.handle} />
        <View style={styles.top}>
          <View style={styles.label}>
            <Animated.View style={[styles.liveDot, dot]} />
            <Text style={styles.labelText}>NEW ORDER · {order.number}</Text>
          </View>
          <View style={styles.ringBox} testID="offer-timer">
            <Svg height={RING} width={RING}>
              <Circle cx={RING / 2} cy={RING / 2} fill="none" r={RADIUS} stroke="#E3ECEF" strokeWidth={5} />
              <AnimatedCircle animatedProps={ringProps} cx={RING / 2} cy={RING / 2} fill="none" originX={RING / 2} originY={RING / 2} r={RADIUS} rotation={-90} stroke={SELLER.solid} strokeDasharray={LENGTH} strokeLinecap="round" strokeWidth={5} />
            </Svg>
            <Text style={styles.ringText}>{left}</Text>
          </View>
        </View>

        <Pressable accessibilityRole="button" onPress={onOpen} style={styles.body} testID="offer-open">
          <Text style={styles.earnLabel}>You earn</Text>
          <Text style={styles.earn}>{formatRand(earnCents, { fixed: true })}</Text>
          <Text numberOfLines={1} style={styles.items}>
            {order.lines[0]?.title}
            {more}
          </Text>
          <View style={styles.meta}>
            <View style={styles.chip}>
              <Icon color={SELLER.solid} name={order.fulfilment === "delivery" ? "truck" : "map-pin"} size={14} />
              <Text style={styles.chipText}>{order.fulfilmentLabel}</Text>
            </View>
            <View style={styles.chip}>
              <Icon color={SELLER.solid} name="user" size={14} />
              <Text numberOfLines={1} style={styles.chipText}>
                {order.buyerName}
              </Text>
            </View>
          </View>
          {order.place ? (
            <Text numberOfLines={1} style={styles.place}>
              {order.fulfilment === "delivery" ? "Deliver to" : "Collect at"} {order.place}
              {order.by ? ` by ${order.by}` : ""}
            </Text>
          ) : null}
        </Pressable>

        {declining ? (
          <View style={styles.reasons} testID="offer-reasons">
            <Text style={styles.why}>Why can&apos;t you take it?</Text>
            {REASONS.map((reason) => (
              <Pressable accessibilityRole="button" key={reason} onPress={() => onDecline(reason)} style={styles.reason} testID={`offer-reason-${reason}`}>
                <Text style={styles.reasonText}>{reason}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.buttons}>
            <Pressable accessibilityRole="button" onPress={() => setDeclining(true)} style={[styles.button, styles.decline]} testID="offer-decline">
              <Text style={styles.declineText}>Decline</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onAccept} style={[styles.button, styles.accept]} testID="offer-accept">
              <Icon color="#FFFFFF" name="check" size={20} />
              <Text style={styles.acceptText}>Accept</Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  accept: { backgroundColor: SELLER.solid, flex: 2, flexDirection: "row", gap: 8 },
  acceptText: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  body: { gap: 4, marginTop: 4 },
  button: { alignItems: "center", borderRadius: 30, height: 60, justifyContent: "center" },
  buttons: { flexDirection: "row", gap: 12, marginTop: 16 },
  chip: { alignItems: "center", backgroundColor: "#E3ECEF", borderRadius: 16, flexDirection: "row", gap: 6, maxWidth: "62%", paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { color: SELLER.ink, fontSize: 13, fontWeight: "700" },
  decline: { backgroundColor: "#FFFFFF", borderColor: "#C3CED3", borderWidth: 1.5, flex: 1 },
  declineText: { color: SELLER.inkSoft, fontSize: 16, fontWeight: "800" },
  dim: { backgroundColor: "rgba(10,20,26,0.45)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  earn: { color: SELLER.ink, fontSize: 44, fontWeight: "800", letterSpacing: -1 },
  earnLabel: { color: SELLER.inkSoft, fontSize: 13, fontWeight: "700" },
  handle: { alignSelf: "center", backgroundColor: "#C3CED3", borderRadius: 3, height: 5, width: 44 },
  items: { color: SELLER.ink, fontSize: 17, fontWeight: "700" },
  label: { alignItems: "center", flexDirection: "row", gap: 8 },
  labelText: { color: SELLER.solid, fontSize: 12, fontWeight: "900", letterSpacing: 1.5 },
  liveDot: { backgroundColor: "#2F8A57", borderRadius: 5, height: 10, width: 10 },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  place: { color: SELLER.inkSoft, fontSize: 13, marginTop: 4 },
  reason: { alignItems: "center", backgroundColor: "#F1F5F7", borderRadius: 18, height: 48, justifyContent: "center" },
  reasonText: { color: SELLER.ink, fontSize: 15, fontWeight: "700" },
  reasons: { gap: 8, marginTop: 14 },
  ringBox: { alignItems: "center", height: RING, justifyContent: "center", width: RING },
  ringText: { color: SELLER.ink, fontSize: 16, fontWeight: "800", position: "absolute" },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 32, borderTopRightRadius: 32, bottom: 0, boxShadow: "0 -14px 34px rgba(8,18,24,0.35)", left: 0, paddingHorizontal: 22, paddingTop: 10, position: "absolute", right: 0 },
  top: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  why: { color: SELLER.inkSoft, fontSize: 13, fontWeight: "700" },
});
