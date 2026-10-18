import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, EmptyState, Icon, ProgressTrack, Screen, AppHeader, StatusBadge, useToast } from "@/components";
import { VossieMap } from "@/components/map/VossieMap";
import { BottomEdgeReveal } from "@/components/nav/BottomEdgeReveal";
import { campusPlaces, distanceKm, etaMinutes, pointAlong, regionFor, routeBetween, storeLocation, travelled } from "@/data/geo";
import { getSeller } from "@/data/repository";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

import { ORDER_STEPS, progressStep, statusInfo } from "./orderStatus";

/** How long the demo courier takes to ride the whole route. Real positions will come from the courier's phone. */
export const DEMO_RIDE_MS = 90_000;
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
  const riding = order?.status === "on-the-way";

  useEffect(() => {
    if (!riding) return;
    const timer = setInterval(() => setElapsed((value) => value + TICK_MS), TICK_MS);
    return () => clearInterval(timer);
  }, [riding]);

  const geometry = useMemo(() => {
    if (!order || !seller) return null;
    const from = storeLocation(seller.id, seller.campusId);
    const to = order.destination ?? campusPlaces(seller.campusId)[1]!.coordinate;
    return { from, route: routeBetween(from, to), to };
  }, [order, seller]);

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
  const fraction = riding ? rideFraction(elapsed) : delivered ? 1 : 0;
  const courier = pointAlong(geometry.route, fraction);
  const remainingKm = distanceKm(courier, geometry.to);
  const minutes = delivered ? 0 : riding ? Math.min(order.etaMinutes ?? 99, etaMinutes(remainingKm) + Math.round((1 - fraction) * 4)) : (order.etaMinutes ?? 0);
  const arrived = riding && fraction >= 1;
  const headline = delivered
    ? "Delivered"
    : arrived
      ? "Your courier has arrived"
      : riding
        ? `${minutes} min away`
        : order.status === "ready"
          ? "Ready for pickup"
          : "Waiting for the seller";

  const chat = () => {
    dispatch({ conversationId: `courier-${order.id}`, name: order.courier?.name ?? "Courier", type: "openConversation" });
    router.push(`/account/inbox/courier-${order.id}` as Href);
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
            <Button icon="phone" label="Call" onPress={() => toast.show("Calling couriers isn't available in the demo")} size="sm" variant="soft" />
            <Button icon="message-circle" label="Chat" onPress={chat} size="sm" />
          </View>
        ) : (
          <Text style={text.bodySmall}>A courier is assigned once the seller has your order ready.</Text>
        )}
        <Text style={styles.demo}>Demo tracking: the courier position is simulated.</Text>
      </View>

      <BottomEdgeReveal dark />
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
  courier: { alignItems: "center", flexDirection: "row", gap: space.xs },
  courierIcon: { alignItems: "center", backgroundColor: color.primary, borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  demo: { color: color.textMuted, fontSize: 11, textAlign: "center" },
  flex: { flex: 1 },
  headline: { color: color.heading, fontSize: 22, fontWeight: "700" },
  row: { alignItems: "center", flexDirection: "row", gap: space.sm },
  screen: { backgroundColor: color.surfaceSoft, flex: 1 },
});
