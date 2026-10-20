import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, Card, EmptyState, Icon, Screen, StatusBadge, PageHero } from "@/components";
import { dateAndTime, formatRand } from "@/data/format";
import { useDemoStore } from "@/state/DemoStore";
import { space, text } from "@/theme/tokens";

const tones = { cancelled: "danger", completed: "success", upcoming: "info" } as const;

/** One service booking: when, where, who and how much. */
export function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state } = useDemoStore();
  const booking = state.bookings.find((item) => item.id === id);

  if (!booking) {
    return (
      <Screen>
        <AppHeader back />
        <EmptyState
          actionLabel="My Orders"
          icon="alert-circle"
          onAction={() => router.replace("/activity/orders" as Href)}
          title="Booking not found"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader back title={booking.title} />
      <PageHero
        chips={[{ icon: "clock", label: `${booking.durationMinutes} min` }, { icon: "map-pin", label: booking.location }]}
        icon="calendar"
        subtitle={booking.provider}
        testID="booking-hero"
        title={`Booked for ${dateAndTime(booking.startsAt)}`}
        tone="mist"
      />
      <Card style={styles.card} variant="soft">
        <StatusBadge label={booking.status[0]!.toUpperCase() + booking.status.slice(1)} tone={tones[booking.status]} />
        <Detail icon="calendar" label={dateAndTime(booking.startsAt)} />
        <Detail icon="clock" label={`${booking.durationMinutes} minutes`} />
        <Detail icon="map-pin" label={booking.location} />
        <Detail icon="user" label={booking.provider} />
        <Text style={styles.price}>{formatRand(booking.priceCents)}</Text>
      </Card>
    </Screen>
  );
}

function Detail({ icon, label }: { icon: "calendar" | "clock" | "map-pin" | "user"; label: string }) {
  return (
    <View style={styles.detail}>
      <Icon name={icon} size={16} />
      <Text style={text.body}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm, marginTop: space.sm },
  detail: { alignItems: "center", flexDirection: "row", gap: space.sm },
  price: { ...text.price, marginTop: space.xs },
});
