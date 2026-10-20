import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Button,
  Card,
  EmptyState,
  FilterChips,
  Icon,
  ProgressTrack,
  Screen,
  StatusBadge,
  useToast,
  type FilterOption,
  PageHero,
} from "@/components";
import { dateAndTime, formatRand } from "@/data/format";
import { getSeller } from "@/data/repository";
import type { Booking, Order } from "@/data/types";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

import { isActive, ORDER_STEPS, orderSummary, progressStep, statusInfo } from "./orderStatus";

type Tab = "active" | "upcoming" | "complete" | "cancelled";

/** My Orders: active order with progress, then lists by status. */
export function MyOrdersScreen() {
  const router = useRouter();
  const toast = useToast();
  const { state } = useDemoStore();
  const [tab, setTab] = useState<Tab>("active");

  const groups = useMemo(
    () => ({
      active: state.orders.filter(isActive),
      cancelled: state.orders.filter((order) => order.status === "cancelled"),
      complete: state.orders.filter((order) => order.status === "delivered"),
      upcoming: state.bookings.filter((booking) => booking.status === "upcoming"),
    }),
    [state.bookings, state.orders],
  );

  const options: FilterOption<Tab>[] = [
    { count: groups.active.length, key: "active", label: "Active" },
    { count: groups.upcoming.length, key: "upcoming", label: "Upcoming" },
    { count: groups.complete.length, key: "complete", label: "Complete" },
    { count: groups.cancelled.length, key: "cancelled", label: "Cancelled" },
  ];

  const shareEta = async (order: Order) => {
    try {
      await Share.share({
        message: `My Vossie order ${order.number} arrives in about ${order.etaMinutes ?? 30} minutes.`,
      });
    } catch {
      toast.show("Sharing isn't available here");
    }
  };

  const featured = tab === "active" ? groups.active[0] : undefined;
  const recent = state.orders.filter((order) => order !== featured).slice(0, 6);

  return (
    <Screen>
      <AppHeader back subtitle="Track, manage and review your purchases." title="My Orders" />
      <PageHero
        chips={[
          { icon: "check-circle", label: `${groups.complete.length} complete` },
          { icon: "calendar", label: `${groups.upcoming.length} upcoming` },
        ]}
        icon="package"
        subtitle={groups.active[0]?.etaMinutes ? `Next one arrives in about ${groups.active[0].etaMinutes} min` : "Everything you have bought, in one place."}
        testID="orders-hero"
        title={groups.active.length ? `${groups.active.length} open ${groups.active.length === 1 ? "order" : "orders"}` : "No open orders"}
        tone="warm"
      />
      <FilterChips onChange={setTab} options={options} value={tab} />

      {tab === "upcoming" ? (
        groups.upcoming.length === 0 ? (
          <EmptyState icon="calendar" message="Bookings you make will appear here." title="No upcoming bookings" />
        ) : (
          groups.upcoming.map((booking) => <BookingRow booking={booking} key={booking.id} />)
        )
      ) : tab === "active" && featured ? (
        <Card style={styles.featured} variant="soft">
          <View style={styles.headRow}>
            <View style={styles.flex}>
              <Text style={text.cardTitle}>{getSeller(featured.sellerId)?.name}</Text>
              <Text style={text.caption}>{orderSummary(featured)}</Text>
            </View>
            <Text style={styles.price}>{formatRand(featured.totalCents)}</Text>
          </View>
          <ProgressTrack
            current={progressStep(featured)}
            label={`${featured.number} progress`}
            steps={ORDER_STEPS + 1}
          />
          <View style={styles.statusRow}>
            <StatusBadge label={statusInfo(featured.status).label} tone={statusInfo(featured.status).tone} />
            {featured.etaMinutes ? <Text style={text.bodySmall}>ETA {featured.etaMinutes} min</Text> : null}
          </View>
          {featured.courier ? (
            <View style={styles.courier}>
              <Icon name="truck" size={16} />
              <Text style={text.bodySmall}>
                {featured.courier.name} · {featured.courier.vehicle}
              </Text>
            </View>
          ) : null}
          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button
                fullWidth
                label="View Details"
                onPress={() => router.push(`/activity/order/${featured.id}` as Href)}
                size="sm"
                variant="light"
              />
            </View>
            <View style={styles.flex}>
              <Button fullWidth label="Share ETA" onPress={() => void shareEta(featured)} size="sm" />
            </View>
          </View>
        </Card>
      ) : tab !== "active" ? null : (
        <EmptyState
          actionLabel="Start Shopping"
          icon="clipboard"
          message="When you place an order it will be tracked here."
          onAction={() => router.navigate("/home")}
          title="No active orders"
        />
      )}

      {tab === "complete" || tab === "cancelled"
        ? (tab === "complete" ? groups.complete : groups.cancelled).length === 0
          ? <EmptyState icon="inbox" title={`No ${tab} orders`} />
          : (tab === "complete" ? groups.complete : groups.cancelled).map((order) => (
              <OrderRow key={order.id} onPress={() => router.push(`/activity/order/${order.id}` as Href)} onReceipt={() => router.push(`/activity/receipt/${order.id}` as Href)} order={order} />
            ))
        : null}

      {tab === "active" && recent.length > 0 ? (
        <>
          <Text style={styles.heading}>Recent Orders</Text>
          {recent.map((order) => (
            <OrderRow key={order.id} onPress={() => router.push(`/activity/order/${order.id}` as Href)} onReceipt={() => router.push(`/activity/receipt/${order.id}` as Href)} order={order} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function OrderRow({ onPress, onReceipt, order }: { order: Order; onPress: () => void; onReceipt: () => void }) {
  const info = statusInfo(order.status);
  return (
    <Card
      accessibilityLabel={`${orderSummary(order)}, ${info.label}, ${formatRand(order.totalCents)}`}
      onPress={onPress}
      style={styles.orderRow}
      variant="row"
    >
      <View style={styles.flex}>
        <Text numberOfLines={1} style={text.cardTitle}>
          {getSeller(order.sellerId)?.name ?? "Order"}
        </Text>
        <Text numberOfLines={1} style={text.caption}>
          {orderSummary(order)}
        </Text>
        <Text style={text.caption}>{dateAndTime(order.placedAt)}</Text>
      </View>
      <View style={styles.rowEnd}>
        <Text style={styles.price}>{formatRand(order.totalCents)}</Text>
        <StatusBadge label={info.label} tone={info.tone} />
        {order.status !== "cancelled" ? (
          <Pressable accessibilityLabel={`View receipt for order ${order.number}`} accessibilityRole="button" hitSlop={8} onPress={onReceipt} style={styles.receiptLink} testID={`receipt-${order.id}`}>
            <Icon color={color.link} name="file-text" size={13} />
            <Text style={styles.receiptText}>Receipt</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

function BookingRow({ booking }: { booking: Booking }) {
  const router = useRouter();
  return (
    <Card
      onPress={() => router.push(`/activity/booking/${booking.id}` as Href)}
      style={styles.orderRow}
      variant="row"
    >
      <View style={styles.flex}>
        <Text numberOfLines={1} style={text.cardTitle}>
          {booking.title}
        </Text>
        <Text numberOfLines={1} style={text.caption}>
          {booking.provider}
        </Text>
        <Text style={text.caption}>{dateAndTime(booking.startsAt)}</Text>
      </View>
      <Text style={styles.price}>{formatRand(booking.priceCents)}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  receiptLink: { alignItems: "center", flexDirection: "row", gap: 4, minHeight: 28 },
  receiptText: { color: color.link, fontSize: 12, fontWeight: "700" },
  actions: { flexDirection: "row", gap: space.sm },
  courier: { alignItems: "center", flexDirection: "row", gap: space.xs },
  featured: { gap: space.sm, marginTop: space.sm },
  flex: { flex: 1 },
  headRow: { alignItems: "center", flexDirection: "row", gap: space.sm },
  heading: { ...text.sectionTitle, marginBottom: space.xs, marginTop: space.md },
  orderRow: { alignItems: "center", flexDirection: "row", gap: space.sm, marginTop: space.xs },
  price: { color: color.text, fontSize: 14, fontWeight: "700" },
  rowEnd: { alignItems: "flex-end", gap: 4 },
  statusRow: { alignItems: "center", flexDirection: "row", gap: space.sm },
});
