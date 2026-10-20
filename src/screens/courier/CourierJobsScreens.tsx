import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { RadioRow, Sheet, useToast } from "@/components";
import { ArtTile, hasArt } from "@/components/art/ProductArt";
import { rand } from "@/courier/pay";
import { offeredJobs, sortOffers, type JobSort } from "@/courier/selectors";
import { haptic } from "@/lib/haptics";

import { CourierMap } from "./CourierMap";
import { useCourier, useJob } from "./hooks";
import { ExpiryPill, JobCard } from "./JobParts";
import { Button, Card, Chips, CourierPage, COURIER, Empty, Fact, Pill, RoundButton, Rise, RouteLine, type, useHideTabBar } from "./ui";

const MAX_KM = [{ key: 0, label: "Any distance" }, { key: 2, label: "Within 2 km" }, { key: 5, label: "Within 5 km" }] as const;

/** Jobs: the offers near you, in the order you pick, each with a countdown. */
export function CourierJobsScreen() {
  const router = useRouter();
  const { courier, dispatch } = useCourier();
  const [sort, setSort] = useState<JobSort>("nearby");
  const [filterOpen, setFilterOpen] = useState(false);
  const [maxKm, setMaxKm] = useState<number>(0);
  const all = offeredJobs(courier);
  const shown = sortOffers(all, sort).filter((job) => maxKm === 0 || job.distanceKm <= maxKm);

  const accept = (id: string) => {
    haptic.success();
    dispatch({ id, type: "courierAcceptJob" });
    router.push(`/courier/active/${id}` as Href);
  };

  return (
    <CourierPage
      right={<RoundButton dark icon="sliders" label="Filter jobs" onPress={() => setFilterOpen(true)} testID="jobs-filter" />}
      subtitle={courier.online ? `${shown.length} ${shown.length === 1 ? "job" : "jobs"} near you` : "You are offline"}
      testID="courier-jobs"
      title="Deliveries"
    >
      <Chips
        chips={[
          { key: "nearby", label: "Nearby" },
          { key: "pay", label: "Highest pay" },
          { key: "quick", label: "Quickest" },
        ]}
        onChange={setSort}
        value={sort}
      />
      {!courier.online ? (
        <Empty detail="Go online from Home to see delivery offers near you." icon="power" title="You are offline" />
      ) : shown.length === 0 ? (
        <Empty detail={all.length > 0 ? "No offers match this filter. Try a longer distance." : "New offers appear here as soon as a student orders delivery near you."} icon="inbox" title="No offers right now" />
      ) : (
        shown.map((job, index) => (
          <Rise index={index} key={job.id}>
            <JobCard job={job} onAccept={() => accept(job.id)} onOpen={() => router.push(`/courier/jobs/${job.id}` as Href)} />
          </Rise>
        ))
      )}
      <Sheet onClose={() => setFilterOpen(false)} title="Show jobs" visible={filterOpen}>
        {MAX_KM.map((option) => (
          <RadioRow key={option.key} onPress={() => { setMaxKm(option.key); setFilterOpen(false); }} selected={option.key === maxKm} title={option.label} />
        ))}
      </Sheet>
    </CourierPage>
  );
}

/** A delivery request: the route, what is in the parcel, what it pays, and a choice to accept or decline. */
export function CourierRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { dispatch } = useCourier();
  const job = useJob(id);
  useHideTabBar(true);

  if (!job) {
    return (
      <CourierPage back bar={false} testID="courier-request" title="Delivery request">
        <Empty detail="This job may have been taken by someone else." icon="alert-circle" title="Job not found" />
      </CourierPage>
    );
  }
  const open = job.status === "offered";
  const taken = !open && job.status !== "declined" && job.status !== "expired";

  const accept = () => {
    haptic.success();
    dispatch({ id: job.id, type: "courierAcceptJob" });
    router.replace(`/courier/active/${job.id}` as Href);
  };
  const decline = () => {
    dispatch({ id: job.id, type: "courierDeclineJob" });
    toast.show("Offer declined");
    router.back();
  };

  return (
    <CourierPage
      back
      bar={false}
      footer={
        open ? (
          <View style={styles.buttons}>
            <View style={styles.flex}>
              <Button label="Decline" onPress={decline} testID="decline" tone="outline" />
            </View>
            <View style={styles.flex2}>
              <Button icon="check" label="Accept delivery" onPress={accept} testID="accept-delivery" />
            </View>
          </View>
        ) : taken ? (
          <Button label="Open this delivery" onPress={() => router.replace(`/courier/active/${job.id}` as Href)} />
        ) : (
          <Button label="Back to deliveries" onPress={() => router.back()} tone="outline" />
        )
      }
      subtitle={`${job.number} · ${rand(job.payoutCents)}`}
      testID="courier-request"
      title="Delivery request"
    >
      <CourierMap job={job} phase="preview" />
      <View style={styles.gap} />
      {open && job.expiresAt ? (
        <View style={styles.expiry}>
          <ExpiryPill job={job} />
          {job.source === "demo" ? <Pill label="Demo job" tone="blue" /> : null}
        </View>
      ) : null}
      <RouteLine dropoff={{ sub: `Drop-off · ${job.dropoff.detail}`, title: job.dropoff.name }} pickup={{ sub: `Pickup · ${job.pickup.detail}`, title: job.pickup.name }} />
      <Card style={styles.facts} tone="soft">
        <Fact label="Parcel" value={job.parcel} />
        <Fact label="Handling" value={job.handling} />
        <Fact label="Payment" value={job.payment} />
        <Fact label="Distance" value={`${job.distanceKm.toFixed(1)} km · about ${job.minutes} min`} />
      </Card>
      <Text style={styles.section}>In the parcel</Text>
      {job.items.map((item) => (
        <Card key={item.title} style={styles.item}>
          <View style={styles.thumb}>{item.artId && hasArt(item.artId) ? <ArtTile id={item.artId} /> : null}</View>
          <View style={styles.flex}>
            <Text style={type.card}>{item.title}</Text>
            <Text style={type.caption}>Quantity {item.quantity}</Text>
          </View>
          {item.fragile ? <Pill label="Fragile" tone="amber" /> : null}
        </Card>
      ))}
      {job.instructions ? (
        <Card style={styles.gap} tone="warn">
          <Text style={styles.warnTitle}>Delivery instructions</Text>
          <Text style={type.body}>{job.instructions}</Text>
        </Card>
      ) : null}
      <Card style={styles.payout} tone="dark">
        <Text style={styles.payLabel}>Estimated payout</Text>
        <View style={styles.payRow}>
          <Text style={styles.payValue}>{`R ${(job.payoutCents / 100).toFixed(2)}`}</Text>
          {job.bonusCents > 0 ? <Pill label={`Incl. ${rand(job.bonusCents)} distance bonus`} tone="green" /> : null}
        </View>
      </Card>
    </CourierPage>
  );
}

const styles = StyleSheet.create({
  buttons: { flexDirection: "row", gap: 10 },
  expiry: { alignItems: "center", flexDirection: "row", gap: 6, marginBottom: 10 },
  facts: { gap: 2, marginTop: 14 },
  flex: { flex: 1 },
  flex2: { flex: 1.6 },
  gap: { height: 12 },
  item: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 8 },
  payLabel: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  payRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  payValue: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  payout: { marginTop: 14 },
  section: { color: COURIER.ink, fontSize: 16, fontWeight: "700", marginBottom: 8, marginTop: 16 },
  thumb: { backgroundColor: COURIER.card, borderRadius: 12, height: 48, overflow: "hidden", width: 48 },
  warnTitle: { color: COURIER.amber, fontSize: 13, fontWeight: "800", marginBottom: 2 },
});
