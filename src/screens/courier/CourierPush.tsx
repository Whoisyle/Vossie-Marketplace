import { useRouter, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, FadeIn, FadeOut, runOnJS, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { Icon, type IconName } from "@/components";
import { rand } from "@/courier/pay";
import { visibleOffers } from "@/courier/selectors";
import type { CourierAlert, CourierAlertKind, CourierJob } from "@/courier/types";
import { haptic } from "@/lib/haptics";
import { playSound } from "@/lib/sounds";
import { SlidePill } from "@/screens/seller/SlidePill";
import { ToneContext } from "@/screens/seller/ui";
import { useDemoStore } from "@/state/DemoStore";
import { spring } from "@/theme/motion";

import { CourierMap } from "./CourierMap";
import { Card, COURIER, Pill, RouteLine } from "./ui";

/** How long the ring takes to run round before the card steps aside. The offer stays on the Jobs list; nothing is declined by the timer. */
export const OFFER_SECONDS = 30;
/** How long a heads-up card stays on screen when nobody touches it. */
export const PUSH_MS = 6500;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING = 58;
const RADIUS = 25;
const LENGTH = 2 * Math.PI * RADIUS;

/**
 * A delivery offered from the bottom of the screen like a ride request: a dark card with what you would earn and a ring that runs
 * down, the route on the map, the two ends of the trip and what is in the parcel, a slide to accept and a Decline. It buzzes while
 * it is up, unless job alerts are off. The ring running out only puts the card away; the offer waits on the Jobs list with its own
 * countdown.
 */
export function CourierOfferSheet({ job, loud, onAccept, onClose, onDecline, onOpen }: { job: CourierJob; loud: boolean; onAccept: () => void; onClose: () => void; onDecline: () => void; onOpen: () => void }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const up = useSharedValue(0);
  const ring = useSharedValue(0);
  const pulse = useSharedValue(0);
  const [left, setLeft] = useState(OFFER_SECONDS);

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

  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - up.get()) * 640 }] }));
  const dot = useAnimatedStyle(() => ({ opacity: 0.5 + pulse.get() * 0.5, transform: [{ scale: 0.9 + pulse.get() * 0.35 }] }));
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: LENGTH * ring.get() }));
  const fragile = job.handling !== "Standard";

  return (
    <ToneContext.Provider value="white">
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill} testID="courier-offer">
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)} pointerEvents="none" style={offer.dim} />
        <Animated.View style={[offer.sheet, { paddingBottom: insets.bottom + 14 }, sheet]}>
          <View style={offer.handle} />
          <Card style={offer.hero} tone="dark">
            <View style={offer.heroTop}>
              <View style={offer.label}>
                <Animated.View style={[offer.liveDot, dot]} />
                <Text style={offer.labelText}>NEW DELIVERY · {job.number}</Text>
              </View>
              <View style={offer.ringBox} testID="courier-offer-timer">
                <Svg height={RING} width={RING}>
                  <Circle cx={RING / 2} cy={RING / 2} fill="none" r={RADIUS} stroke="#5C8695" strokeWidth={5} />
                  <AnimatedCircle animatedProps={ringProps} cx={RING / 2} cy={RING / 2} fill="none" originX={RING / 2} originY={RING / 2} r={RADIUS} rotation={-90} stroke="#FFFFFF" strokeDasharray={LENGTH} strokeLinecap="round" strokeWidth={5} />
                </Svg>
                <Text style={offer.ringText}>{left}</Text>
              </View>
            </View>
            <Text style={offer.earnLabel}>You earn</Text>
            <Text style={offer.earn}>{rand(job.payoutCents)}</Text>
            <View style={offer.chips}>
              <View style={offer.chip}>
                <Icon color={COURIER.solid} name="navigation" size={13} />
                <Text style={offer.chipText}>
                  {job.distanceKm.toFixed(1)} km · {job.minutes} min
                </Text>
              </View>
              {job.boostCents ? (
                <View style={[offer.chip, { backgroundColor: COURIER.greenSoft }]}>
                  <Icon color={COURIER.green} name="zap" size={13} />
                  <Text style={[offer.chipText, { color: COURIER.green }]}>+{rand(job.boostCents)} bonus</Text>
                </View>
              ) : job.bonusCents > 0 ? (
                <View style={[offer.chip, { backgroundColor: COURIER.greenSoft }]}>
                  <Text style={[offer.chipText, { color: COURIER.green }]}>+{rand(job.bonusCents)} distance</Text>
                </View>
              ) : null}
            </View>
          </Card>

          <Pressable accessibilityRole="button" onPress={onOpen} testID="courier-offer-open">
            <View style={offer.mapWrap}>
              <CourierMap height={118} job={job} phase="preview" />
            </View>
            <Card style={offer.trip}>
              <RouteLine dropoff={{ sub: job.dropoff.detail, title: job.dropoff.name }} pickup={{ sub: job.pickup.detail, title: job.pickup.name }} />
              <View style={offer.parcel}>
                <Icon color={COURIER.inkSoft} name="package" size={14} />
                <Text style={offer.parcelText}>{job.parcel}</Text>
                {fragile ? <Pill label={job.handling} tone="amber" /> : null}
              </View>
            </Card>
          </Pressable>

          <View style={offer.slide}>
            <SlidePill dark label="Slide to accept" onComplete={() => setTimeout(onAccept, 260)} testID="courier-offer-accept" />
          </View>
          <Pressable accessibilityRole="button" onPress={onDecline} style={offer.decline} testID="courier-offer-decline">
            <Text style={offer.declineText}>Decline</Text>
          </Pressable>
        </Animated.View>
      </View>
    </ToneContext.Provider>
  );
}

const KIND_ICON: Record<CourierAlertKind, IconName> = { document: "alert-triangle", money: "dollar-sign", offer: "truck", order: "package", rating: "star", system: "info" };
const KIND_TINT: Record<CourierAlertKind, string> = { document: "#C2603E", money: "#2F8A57", offer: "#38606F", order: "#4C7DB8", rating: "#E5A92B", system: "#5E8696" };

/**
 * Watches the courier's offers and alerts. A new offer in their zones comes down from the top like a ride request; any other new
 * alert slides a card down from the top, in the same push card the buyer and the seller get. Both buzz and chime unless job alerts
 * are off. Swipe a card up to dismiss it; it also goes by itself.
 */
export function CourierPushBanner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { dispatch, state } = useDemoStore();
  const courier = state.courier;
  const [shown, setShown] = useState<CourierAlert | null>(null);
  const [offer, setOffer] = useState<CourierJob | null>(null);
  const seenAlerts = useRef<Set<string> | null>(null);
  const seenOffers = useRef<Set<string> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slide = useSharedValue(0);
  const drag = useSharedValue(0);
  const visible = visibleOffers(courier);
  const visibleIds = visible.map((job) => job.id).join(",");
  const alerts = courier.alerts;

  const close = () => {
    slide.set(withTiming(0, { duration: 220 }));
    setTimeout(() => setShown(null), 240);
  };

  // a new offer in the courier's zones comes down from the top; the first look only learns what is already there
  useEffect(() => {
    if (seenOffers.current === null) {
      seenOffers.current = new Set(visibleIds ? visibleIds.split(",") : []);
      return;
    }
    const fresh = (visibleIds ? visibleIds.split(",") : []).filter((id) => !seenOffers.current!.has(id));
    for (const id of visibleIds ? visibleIds.split(",") : []) seenOffers.current.add(id);
    if (fresh.length === 0 || AppState.currentState !== "active") return;
    const job = courier.jobs.find((item) => item.id === fresh[0]);
    if (!job) return;
    // a one-off state change in answer to an offer arriving, not a loop
    setOffer(job);
    if (courier.jobAlerts) {
      haptic.success();
      playSound("success");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds]);

  useEffect(() => {
    if (seenAlerts.current === null) {
      seenAlerts.current = new Set(alerts.map((item) => item.id));
      return;
    }
    const fresh = alerts.filter((item) => !seenAlerts.current!.has(item.id));
    for (const item of alerts) seenAlerts.current.add(item.id);
    const item = fresh.find((candidate) => candidate.kind !== "offer");
    if (!item || AppState.currentState !== "active") return;
    setShown(item);
    drag.set(0);
    if (courier.jobAlerts) {
      haptic.success();
      playSound("success");
    }
    slide.set(reduced ? withTiming(1, { duration: 120 }) : withSpring(1, spring.soft));
    if (hide.current) clearTimeout(hide.current);
    hide.current = setTimeout(close, PUSH_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts]);

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

  if (offer) {
    const fresh = courier.jobs.find((item) => item.id === offer.id) ?? offer;
    if (fresh.status !== "offered") return null;
    return (
      <CourierOfferSheet
        job={fresh}
        loud={courier.jobAlerts}
        onAccept={() => {
          haptic.success();
          dispatch({ id: fresh.id, type: "courierAcceptJob" });
          setOffer(null);
          router.push(`/courier/active/${fresh.id}` as Href);
        }}
        onClose={() => setOffer(null)}
        onDecline={() => {
          dispatch({ id: fresh.id, type: "courierDeclineJob" });
          setOffer(null);
        }}
        onOpen={() => {
          setOffer(null);
          router.push(`/courier/jobs/${fresh.id}` as Href);
        }}
      />
    );
  }
  if (!shown) return null;

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 6 }, style]} testID="courier-push">
        <Pressable
          accessibilityLabel={`${shown.title}. ${shown.body}`}
          accessibilityRole="button"
          onPress={() => {
            dispatch({ ids: [shown.id], type: "courierReadAlerts" });
            close();
            if (shown.href) router.push(shown.href as Href);
          }}
          style={styles.push}
          testID="push-card"
        >
          <View style={[styles.pushIcon, { backgroundColor: KIND_TINT[shown.kind] }]}>
            <Icon color="#FFFFFF" name={KIND_ICON[shown.kind]} size={18} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.pushApp}>VOSSIE COURIER · now</Text>
            <Text numberOfLines={1} style={styles.pushTitle}>
              {shown.title}
            </Text>
            <Text numberOfLines={2} style={styles.pushBody}>
              {shown.body}
            </Text>
          </View>
          <Icon color={COURIER.muted} name="chevron-right" size={16} />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  push: { alignItems: "center", backgroundColor: "#E9EFF3", borderCurve: "continuous", borderRadius: 24, boxShadow: "-5px -5px 12px rgba(255,255,255,0.95), 8px 8px 18px rgba(80,96,110,0.45)", flexDirection: "row", gap: 12, padding: 14 },
  pushApp: { color: COURIER.inkSoft, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  pushBody: { color: COURIER.ink, fontSize: 13, lineHeight: 18 },
  pushIcon: { alignItems: "center", borderRadius: 18, height: 40, justifyContent: "center", width: 40 },
  pushTitle: { color: COURIER.ink, fontSize: 15, fontWeight: "800" },
  wrap: { left: 12, position: "absolute", right: 12, zIndex: 100 },
});

const offer = StyleSheet.create({
  chip: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { color: COURIER.ink, fontSize: 13, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  decline: { alignItems: "center", height: 44, justifyContent: "center" },
  declineText: { color: COURIER.inkSoft, fontSize: 15, fontWeight: "800" },
  dim: { backgroundColor: "rgba(10,20,26,0.5)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  earn: { color: "#FFFFFF", fontSize: 50, fontWeight: "800", letterSpacing: -1.5 },
  earnLabel: { color: "#DCE8EC", fontSize: 13, fontWeight: "700", marginTop: 6 },
  handle: { alignSelf: "center", backgroundColor: "#C3CED3", borderRadius: 3, height: 5, marginBottom: 12, width: 44 },
  hero: { paddingBottom: 14 },
  heroTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  label: { alignItems: "center", flexDirection: "row", gap: 8 },
  labelText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900", letterSpacing: 1.4 },
  liveDot: { backgroundColor: "#7BE3A4", borderRadius: 5, height: 10, width: 10 },
  mapWrap: { borderRadius: 20, marginTop: 12, overflow: "hidden" },
  parcel: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 4 },
  parcelText: { color: COURIER.inkSoft, fontSize: 12, fontWeight: "700" },
  ringBox: { alignItems: "center", height: RING, justifyContent: "center", width: RING },
  ringText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", position: "absolute" },
  sheet: { backgroundColor: "#E9EFF3", borderTopLeftRadius: 32, borderTopRightRadius: 32, bottom: 0, boxShadow: "0 -14px 34px rgba(8,18,24,0.4)", left: 0, paddingHorizontal: 18, paddingTop: 10, position: "absolute", right: 0 },
  slide: { marginTop: 14 },
  trip: { gap: 6, marginTop: 12 },
});
