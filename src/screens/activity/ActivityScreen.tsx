import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Avatar,
  Card,
  EmptyState,
  FilterChips,
  Icon,
  ProgressTrack,
  Screen,
  SectionHeader,
  type FilterOption,
} from "@/components";
import { dateAndTime, relativeTime } from "@/data/format";
import { getSeller } from "@/data/repository";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

import { isActive, ORDER_STEPS, orderSummary, progressStep, statusInfo } from "./orderStatus";

type Section = "all" | "messages" | "orders" | "bookings";

const options: FilterOption<Section>[] = [
  { key: "all", label: "All" },
  { key: "messages", label: "Messages" },
  { key: "orders", label: "Orders" },
  { key: "bookings", label: "Bookings" },
];

/** Activity tab: messages, order updates, upcoming bookings and recent activity. */
export function ActivityScreen() {
  const router = useRouter();
  const { state } = useDemoStore();
  const [section, setSection] = useState<Section>("all");

  const activeOrders = useMemo(() => state.orders.filter(isActive), [state.orders]);
  const upcoming = useMemo(() => state.bookings.filter((item) => item.status === "upcoming"), [state.bookings]);
  const messages = state.conversations.slice(0, 3);
  const show = (key: Exclude<Section, "all">) => section === "all" || section === key;

  if (state.orders.length === 0 && state.bookings.length === 0) {
    return (
      <Screen testID="activity-screen">
        <AppHeader title="Your activity" />
        <EmptyState
          actionLabel="Start Shopping"
          icon="clipboard"
          message="Once you request an item, it will show up here."
          onAction={() => router.navigate("/home")}
          title="No orders yet"
        />
      </Screen>
    );
  }

  return (
    <Screen testID="activity-screen">
      <AppHeader title="Activity" />
      <FilterChips onChange={setSection} options={options} value={section} />

      <View style={styles.summary}>
        <Card onPress={() => router.push("/activity/orders" as Href)} style={styles.summaryCard} variant="peach">
          <Text style={text.caption}>Open Orders</Text>
          <Text style={styles.count}>{activeOrders.length}</Text>
        </Card>
        <Card onPress={() => router.push("/activity/orders" as Href)} style={styles.summaryCard} variant="soft">
          <Text style={text.caption}>Upcoming Bookings</Text>
          <Text style={styles.count}>{upcoming.length}</Text>
        </Card>
      </View>

      {show("messages") ? (
        <View style={styles.section}>
          <SectionHeader onAction={() => router.push("/account/inbox" as Href)} title="Messages" />
          <Card padded={false}>
            {messages.length === 0 ? (
              <Text style={styles.empty}>No messages yet.</Text>
            ) : (
              messages.map((conversation) => {
                const last = conversation.messages[conversation.messages.length - 1];
                return (
                  <Pressable
                    accessibilityLabel={`${conversation.name}. ${last?.body ?? ""}`}
                    accessibilityRole="button"
                    key={conversation.id}
                    onPress={() => router.push(`/account/inbox/${conversation.id}` as Href)}
                    style={styles.messageRow}
                  >
                    <Avatar name={conversation.name} size={40} tone="soft" />
                    <View style={styles.flex}>
                      <Text numberOfLines={1} style={text.cardTitle}>
                        {conversation.name}
                      </Text>
                      <Text numberOfLines={1} style={text.caption}>
                        {last?.body ?? "No messages yet"}
                      </Text>
                    </View>
                    {conversation.unread ? <View style={styles.unread} /> : null}
                  </Pressable>
                );
              })
            )}
          </Card>
        </View>
      ) : null}

      {show("orders") ? (
        <View style={styles.section}>
          <SectionHeader onAction={() => router.push("/activity/orders" as Href)} title="Order Updates" />
          {activeOrders.length === 0 ? (
            <Card>
              <Text style={styles.empty}>No open orders right now.</Text>
            </Card>
          ) : (
            activeOrders.map((order) => (
              <Card
                accessibilityLabel={`${orderSummary(order)}, ${statusInfo(order.status).label}`}
                key={order.id}
                onPress={() => router.push(`/activity/order/${order.id}` as Href)}
                style={styles.updateCard}
                variant="row"
              >
                <View style={styles.updateHead}>
                  <View style={styles.flex}>
                    <Text numberOfLines={1} style={text.cardTitle}>
                      {getSeller(order.sellerId)?.name ?? "Order"}
                    </Text>
                    <Text numberOfLines={1} style={text.caption}>
                      {orderSummary(order)} · {statusInfo(order.status).label}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={18} />
                </View>
                <ProgressTrack
                  current={progressStep(order)}
                  label={`${order.number} progress`}
                  steps={ORDER_STEPS + 1}
                />
              </Card>
            ))
          )}
        </View>
      ) : null}

      {show("bookings") ? (
        <View style={styles.section}>
          <SectionHeader onAction={() => router.push("/activity/orders" as Href)} title="Upcoming Bookings" />
          {upcoming.length === 0 ? (
            <Card>
              <Text style={styles.empty}>No upcoming bookings.</Text>
            </Card>
          ) : (
            upcoming.map((booking) => (
              <Card
                key={booking.id}
                onPress={() => router.push(`/activity/booking/${booking.id}` as Href)}
                style={styles.bookingCard}
                variant="row"
              >
                <View style={styles.flex}>
                  <Text numberOfLines={1} style={text.cardTitle}>
                    {booking.title}
                  </Text>
                  <Text numberOfLines={1} style={text.caption}>
                    {dateAndTime(booking.startsAt)} · {booking.location}
                  </Text>
                </View>
                <Icon name="chevron-right" size={18} />
              </Card>
            ))
          )}
        </View>
      ) : null}

      {section === "all" ? (
        <View style={styles.section}>
          <SectionHeader title="Recent Activity" />
          <Card padded={false}>
            {state.activity.map((item) => (
              <View key={item.id} style={styles.messageRow}>
                <Avatar name={item.actor.replace("@", "")} size={36} tone="soft" />
                <View style={styles.flex}>
                  <Text numberOfLines={2} style={text.bodySmall}>
                    <Text style={styles.actor}>{item.actor}</Text> {item.text}
                  </Text>
                  <Text style={text.caption}>{relativeTime(item.createdAt)}</Text>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actor: { color: color.heading, fontWeight: "700" },
  bookingCard: { alignItems: "center", flexDirection: "row", marginTop: space.xs },
  count: { color: color.heading, fontSize: 28, fontWeight: "700" },
  empty: { ...text.bodySmall, padding: space.md },
  flex: { flex: 1 },
  messageRow: { alignItems: "center", flexDirection: "row", gap: space.sm, minHeight: 56, padding: space.sm },
  section: { marginTop: space.md },
  summary: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  summaryCard: { flex: 1, gap: 2 },
  unread: { backgroundColor: color.accent, borderRadius: 5, height: 10, width: 10 },
  updateCard: { gap: space.sm, marginTop: space.xs },
  updateHead: { alignItems: "center", flexDirection: "row", gap: space.sm },
});
