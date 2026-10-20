import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, EmptyState, Icon, ProgressTrack, Screen, AppHeader, StatusBadge, useToast } from "@/components";
import { VossieMap } from "@/components/map/VossieMap";
import { BottomEdgeReveal } from "@/components/nav/BottomEdgeReveal";
import { campusPlaces, distanceKm, etaMinutes, pointAlong, regionFor, routeBetween, storeLocation, travelled } from "@/data/geo";
import { getSeller } from "@/data/repository";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

import { CourierRatingSheet } from "./CourierRatingSheet";
import { ORDER_STEPS, progressStep, statusInfo } from "./orderStatus";

/** How long the demo courier takes to ride the whole route. Real positions will come from the courier's phone. */
export const DEMO_RIDE_MS = 90_000;

/** The link shared to follow an order. It opens in the Vossie app (scheme vossie://) for people who have it. */
export function trackingLink(orderId: string): string {
  return `vossie://track/${orderId}`;
}
const TICK_MS = 1_000;

/** Fraction of the route covered after `elapsedMs`, 0 to 1. */
export function rideFraction(elapsedMs: number, totalMs = DEMO_RIDE_MS): number {
  return Math.min(1, Math.max(0, elapsedMs / totalMs));
}

/**
 * Live order tracking: store, drop-off, the dashed route and the courier moving along it. The courier's
 * position is simulated (demo) until couriers share their location through the backend.
 */
export function TrackOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { dispatch, state } = useDemoStore();
  const order = state.orders.find((item) => item.id === id);
  const seller = order ? getSeller(order.sellerId) : undefined;
  const [elapsed, setElapsed] = useState(0);
  const [rateOpen, setRateOpen] = useState(false);
  // a real courier on this phone has a job for the order: its status and position replace the demo ride
  const job = state.courier.jobs.find((item) => item.buyerOrderId === id);
  const riding = job ? job.status === "on-the-way" || job.status === "arrived" : order?.status === "on-the-way";

  useEffect(() => {
    if (!riding || job) return;
    const timer = setInterval(() => setElapsed((value) => value + TICK_MS), TICK_MS);
    return () => clearInterval(timer);
  }, [job, riding]);

  const geometry = useMemo(() => {
    if (!order || !seller) return null;
    const from = job ? { latitude: job.pickup.latitude, longitude: job.pickup.longitude } : storeLocation(seller.id, seller.campusId);
    const to = job ? { latitude: job.dropoff.latitude, longitude: job.dropoff.longitude } : (order.destination ?? campusPlaces(seller.campusId)[1]!.coordinate);
    return { from, route: routeBetween(from, to), to };
  }, [job, order, seller]);

  if (!order || !seller || !geometry) {
    return (
      <Screen>
        <AppHeader back />
        <EmptyState
          actionLabel="My Orders"
          icon="map"
          onAction={() => router.replace("/activity/orders" as Href)}
          title="Order not found"
        />
      </Screen>
    );
  }

  const info = statusInfo(order.status);
  const delivered = order.status === "delivered";
  const fraction = job ? (job.status === "on-the-way" ? job.progress : job.status === "arrived" || delivered ? 1 : 0) : riding ? rideFraction(elapsed) : delivered ? 1 : 0;
  const courier = pointAlong(geometry.route, fraction);
  const remainingKm = distanceKm(courier, geometry.to);
  const minutes = delivered ? 0 : riding ? Math.min(order.etaMinutes ?? 99, etaMinutes(remainingKm) + Math.round((1 - fraction) * 4)) : (order.etaMinutes ?? 0);
  const arrived = job ? job.status === "arrived" : riding && fraction >= 1;
  const headline = delivered
    ? "Delivered"
    : arrived
      ? job
        ? "Your courier is at the door"
        : "Your courier has arrived"
      : riding
        ? `${minutes} min away`
        : order.status === "ready"
          ? "Ready for pickup"
          : "Waiting for the seller";

  // a link to follow this order, only when the student allows it in Security and Settings; opens in the Vossie app
  const shareTracking = async () => {
    if (!state.settings.shareTracking) {
      toast.show("Turn on sharing in Security and Settings first");
      return;
    }
    try {
      await Share.share({ message: `Follow my Vossie order ${order.number}: ${trackingLink(order.id)}` });
    } catch {
      toast.show("Sharing isn't available here");
    }
  };

  const markDelivered = () => {
    dispatch({ orderId: order.id, type: "deliverOrder" });
    setRateOpen(true);
  };

  const chat = () => {
    dispatch({ conversationId: `courier-${order.id}`, kind: "courier", name: order.courier?.name ?? "Courier", orderId: order.id, type: "openConversation" });
    router.push(`/account/inbox/courier-${order.id}` as Href);
  };

  // dials the courier's real number once couriers are set up with one; until then say so
  const call = () => {
    const phone = order.courier?.phone?.replace(/[^\d+]/g, "");
    if (!phone) {
      toast.show("This courier's phone number isn't set up yet");
      return;
    }
    void Linking.openURL(`tel:${phone}`).catch(() => toast.show("Couldn't open the phone app"));
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <VossieMap
        accessibilityLabel={`Map showing ${seller.name} and your delivery address`}
        initialRegion={regionFor([geometry.from, geometry.to])}
        markers={[
          { coordinate: geometry.from, id: "store", kind: "store", title: seller.name },
          { coordinate: geometry.to, id: "home", kind: "home", title: "Delivery address" },
          ...(riding || delivered ? [{ coordinate: courier, id: "courier", kind: "courier" as const, title: order.courier?.name }] : []),
        ]}
        route={geometry.route}
        style={StyleSheet.absoluteFill}
        testID="track-map"
        travelled={riding ? travelled(geometry.route, fraction) : undefined}
      />

      <Pressable
        accessibilityLabel="Back"
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => router.back()}
        style={styles.back}
      >
        <Icon name="chevron-left" size={22} />
      </Pressable>

      <View style={[styles.card, { bottom: 36 + insets.bottom }]}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text accessibilityLiveRegion="polite" style={styles.headline}>
              {headline}
            </Text>
            <Text style={text.caption}>
              Order {order.number} · {seller.name}
            </Text>
          </View>
          <StatusBadge label={info.label} tone={info.tone} />
        </View>

        {order.status !== "cancelled" ? (
          <ProgressTrack current={progressStep(order)} label="Order progress" steps={ORDER_STEPS + 1} />
        ) : null}

        {order.courier ? (
          <View style={styles.courier}>
            <View style={styles.courierIcon}>
              <Icon color={color.onPrimary} name="user" size={18} />
            </View>
            <View style={styles.flex}>
              <Text style={text.cardTitle}>{order.courier.name}</Text>
              <Text style={text.caption}>
                {order.courier.vehicle} · {order.courier.rating.toFixed(1)}★
              </Text>
            </View>
            <Button icon="phone" label="Call" onPress={call} size="sm" variant="soft" />
            <Button icon="message-circle" label="Chat" onPress={chat} size="sm" />
          </View>
        ) : (
          <Text style={text.bodySmall}>A courier is assigned once the seller has your order ready.</Text>
        )}
        {job && !delivered && order.status !== "cancelled" && (job.status === "on-the-way" || job.status === "arrived") ? (
          <View style={styles.codeCard} testID="delivery-code-card">
            <Text style={text.caption}>Your delivery code</Text>
            <Text accessibilityLabel={`Your delivery code is ${job.deliveryCode.split("").join(" ")}`} style={styles.code} testID="delivery-code">
              {job.deliveryCode.split("").join(" ")}
            </Text>
            <Text style={text.caption}>Read it out to your courier at the door. Only share it with them.</Text>
          </View>
        ) : null}
        {job && !delivered && order.status !== "cancelled" ? (
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: order.leaveAtDoor === true }} onPress={() => dispatch({ on: !order.leaveAtDoor, orderId: order.id, type: "setLeaveAtDoor" })} style={styles.leave} testID="leave-at-door">
            <Icon name="package" size={16} />
            <Text style={[text.bodySmall, styles.flex]}>{order.leaveAtDoor ? "Leave at my door is on. The courier may photograph the parcel instead of asking for your code." : "Allow the courier to leave it at my door"}</Text>
            <Icon color={order.leaveAtDoor ? color.success : color.textMuted} name={order.leaveAtDoor ? "check-circle" : "circle"} size={20} />
          </Pressable>
        ) : null}
        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button icon="share-2" label="Share tracking" onPress={() => void shareTracking()} size="sm" testID="share-tracking" variant="outline" />
          </View>
          {arrived && !delivered && !job ? (
            <View style={styles.flex}>
              <Button label="Mark delivered (demo)" onPress={markDelivered} size="sm" testID="mark-delivered" />
            </View>
          ) : null}
          {delivered && !order.courierRating ? (
            <View style={styles.flex}>
              <Button icon="star" label="Rate and tip" onPress={() => setRateOpen(true)} size="sm" testID="rate-courier" />
            </View>
          ) : null}
        </View>
        <Text style={styles.demo}>{job ? "Demo: the courier's position is simulated until phones share it." : "Demo tracking: the courier position is simulated."}</Text>
      </View>

      <BottomEdgeReveal dark />
      <CourierRatingSheet onClose={() => setRateOpen(false)} order={order} visible={rateOpen} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: "center",
    backgroundColor: color.surface,
    borderRadius: 22,
    boxShadow: "0 4px 12px rgba(30, 42, 56, 0.2)",
    height: 44,
    justifyContent: "center",
    left: space.md,
    position: "absolute",
    top: 52,
    width: 44,
  },
  card: {
    backgroundColor: color.surface,
    borderCurve: "continuous",
    borderRadius: corner.xl,
    boxShadow: "0 8px 24px rgba(30, 42, 56, 0.25)",
    gap: space.sm,
    left: space.md,
    padding: space.md,
    position: "absolute",
    right: space.md,
  },
  actions: { flexDirection: "row", gap: space.xs },
  code: { color: color.text, fontSize: 30, fontWeight: "800", letterSpacing: 4 },
  codeCard: { alignItems: "center", backgroundColor: color.surfaceSoft, borderRadius: corner.md, gap: 2, padding: space.sm },
  courier: { alignItems: "center", flexDirection: "row", gap: space.xs },
  leave: { alignItems: "center", backgroundColor: color.surfaceRow, borderRadius: corner.md, flexDirection: "row", gap: space.xs, padding: space.sm },
  courierIcon: { alignItems: "center", backgroundColor: color.primary, borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  demo: { color: color.textMuted, fontSize: 11, textAlign: "center" },
  flex: { flex: 1 },
  headline: { color: color.heading, fontSize: 22, fontWeight: "700" },
  row: { alignItems: "center", flexDirection: "row", gap: space.sm },
  screen: { backgroundColor: color.surfaceSoft, flex: 1 },
});
