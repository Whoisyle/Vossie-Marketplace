import { StyleSheet, Text, View } from "react-native";

import { rand } from "@/courier/pay";
import type { CourierJob } from "@/courier/types";

import { mmss, useNow } from "./hooks";
import { Button, COURIER, Card, Pill, RouteLine, type } from "./ui";

/** "Expires 0:42": amber while there is under a minute left, grey above that. Nothing when the countdown has not started. */
export function ExpiryPill({ job }: { job: CourierJob }) {
  const now = useNow(1000);
  if (!job.expiresAt) return null;
  const left = new Date(job.expiresAt).getTime() - now;
  return <Pill label={`Expires ${mmss(left)}`} testID={`expires-${job.id}`} tone={left < 60_000 ? "amber" : "grey"} />;
}

/** A job on a list: the pay, the countdown, the two ends, the distance and an Accept button. Tap the card to see it all. */
export function JobCard({ job, onAccept, onOpen }: { job: CourierJob; onOpen: () => void; onAccept: () => void }) {
  return (
    <Card onPress={onOpen} style={styles.card} testID={`job-${job.id}`}>
      <View style={styles.top}>
        <Text style={styles.pay}>{rand(job.payoutCents)}</Text>
        <View style={styles.pills}>
          {job.boostCents ? <Pill label={`+${rand(job.boostCents)} bonus`} tone="green" /> : null}
          {job.source === "demo" ? <Pill label="Demo job" tone="blue" /> : null}
          <ExpiryPill job={job} />
        </View>
      </View>
      <RouteLine dropoff={{ sub: `Drop-off · ${job.dropoff.detail}`, title: job.dropoff.name }} pickup={{ sub: `Pickup · ${job.pickup.detail}`, title: job.pickup.name }} />
      <View style={styles.bottom}>
        <Text style={type.caption}>
          {job.distanceKm.toFixed(1)} km · about {job.minutes} min
        </Text>
        <View style={styles.accept}>
          <Button label="Accept" onPress={onAccept} testID={`accept-${job.id}`} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  accept: { minWidth: 110 },
  bottom: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  card: { marginBottom: 12 },
  pay: { color: COURIER.ink, fontSize: 24, fontWeight: "800" },
  pills: { alignItems: "center", flexDirection: "row", gap: 6 },
  top: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
});
