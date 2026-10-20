import { useRouter, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, useToast } from "@/components";
import { rand } from "@/courier/pay";
import { activeNow, offeredJobs, todayStats } from "@/courier/selectors";
import { getCampusName } from "@/data/repository";
import { haptic } from "@/lib/haptics";

import { firstWord, useCourier } from "./hooks";
import { JobCard } from "./JobParts";
import { Button, Card, CourierPage, COURIER, Empty, Rise, Stat, Toggle, type } from "./ui";

/** Home: whether you are online, today's numbers, the hours you work and the offer that is waiting. */
export function CourierHomeScreen() {
  const router = useRouter();
  const toast = useToast();
  const { courier, dispatch } = useCourier();
  const stats = todayStats(courier);
  const offers = offeredJobs(courier);
  const active = activeNow(courier)[0];
  const online = courier.online;

  const accept = (id: string) => {
    haptic.success();
    dispatch({ id, type: "courierAcceptJob" });
    router.push(`/courier/active/${id}` as Href);
  };

  return (
    <CourierPage subtitle={`${getCampusName(courier.profile.campusId)} campus`} testID="courier-home" title={`Hi, ${firstWord(courier.profile.fullName)}`}>
      <Rise>
        <Card style={[styles.online, !online && styles.offline]} tone={online ? "dark" : "soft"} testID="online-card">
          <View style={styles.flex}>
            <Text style={[styles.onlineTitle, !online && { color: COURIER.ink }]}>{online ? "You are online" : "You are offline"}</Text>
            <Text style={[styles.onlineSub, !online && { color: COURIER.inkSoft }]}>{online ? "Receiving delivery offers" : "Go online to receive offers"}</Text>
          </View>
          <Toggle
            label={online ? "Go offline" : "Go online"}
            on={online}
            onDark={online}
            onChange={(on) => {
              dispatch({ online: on, type: "courierSetOnline" });
              toast.show(on ? "You are online. Offers will appear here." : "You are offline");
            }}
            testID="online-toggle"
          />
        </Card>
      </Rise>

      <Rise index={1} style={styles.hours}>
        <Pressable accessibilityLabel={`Working hours ${courier.hours.from} to ${courier.hours.to}. Change`} accessibilityRole="button" onPress={() => router.push("/courier/account/availability" as Href)} style={styles.hoursRow} testID="hours-card">
          <View style={styles.flex}>
            <Text style={type.caption}>From</Text>
            <Text style={styles.time}>{courier.hours.from}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={type.caption}>To</Text>
            <Text style={styles.time}>{courier.hours.to}</Text>
          </View>
          <Icon color={COURIER.muted} name="edit-2" size={16} />
        </Pressable>
      </Rise>

      <Rise index={2} style={styles.stats}>
        <Stat label="Today" testID="stat-today" value={rand(stats.cents)} />
        <Stat label="Done" testID="stat-done" value={String(stats.done)} />
        <Stat label="Rating" testID="stat-rating" value={stats.rating === null ? "New" : stats.rating.toFixed(1)} />
      </Rise>

      {active ? (
        <Rise index={3}>
          <Card onPress={() => router.push(`/courier/active/${active.id}` as Href)} style={styles.activeCard} testID="home-active">
            <Icon color={COURIER.solid} name="truck" size={20} />
            <View style={styles.flex}>
              <Text style={type.card}>{active.number} in progress</Text>
              <Text style={type.caption}>
                {active.status === "accepted" ? `Collect from ${active.pickup.name}` : active.status === "returning" ? `Take it back to ${active.pickup.name}` : `Deliver to ${active.dropoff.name}`}
              </Text>
            </View>
            <Icon color={COURIER.muted} name="chevron-right" size={18} />
          </Card>
        </Rise>
      ) : null}

      <View style={styles.sectionRow}>
        <Text style={type.section}>New delivery offer</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push("/courier/jobs" as Href)} testID="see-all">
          <Text style={styles.link}>See all</Text>
        </Pressable>
      </View>
      {!online ? (
        <Empty detail="Turn on Online above and offers near you will show up here." icon="power" title="You are offline" />
      ) : offers[0] ? (
        <Rise index={4}>
          <JobCard job={offers[0]} onAccept={() => accept(offers[0]!.id)} onOpen={() => router.push(`/courier/jobs/${offers[0]!.id}` as Href)} />
        </Rise>
      ) : (
        <Empty detail="New offers appear here as soon as a student orders delivery near you." icon="inbox" title="No offers right now" />
      )}
      {online && offers.length > 1 ? <Button label={`See all ${offers.length} offers`} onPress={() => router.push("/courier/jobs" as Href)} tone="outline" /> : null}
    </CourierPage>
  );
}

const styles = StyleSheet.create({
  activeCard: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: 4 },
  flex: { flex: 1 },
  hours: { marginTop: 12 },
  hoursRow: { alignItems: "center", backgroundColor: COURIER.card, borderRadius: 18, flexDirection: "row", gap: 12, padding: 14 },
  link: { color: COURIER.solid, fontSize: 13, fontWeight: "700" },
  offline: { borderColor: COURIER.border, borderWidth: 1 },
  online: { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 18 },
  onlineSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2 },
  onlineTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  sectionRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10, marginTop: 18 },
  stats: { flexDirection: "row", gap: 10, marginTop: 12 },
  time: { color: COURIER.ink, fontSize: 18, fontWeight: "700", marginTop: 2 },
});
