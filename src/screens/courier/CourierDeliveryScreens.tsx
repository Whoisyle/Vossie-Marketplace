import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, useToast } from "@/components";
import { ArtTile, hasArt } from "@/components/art/ProductArt";
import { rand } from "@/courier/pay";
import { activeNow, cancelledJobs, doneJobs, upcoming } from "@/courier/selectors";
import { MAX_ATTEMPTS } from "@/courier/state";
import type { CourierJob } from "@/courier/types";
import { haptic } from "@/lib/haptics";
import { AttachSheet } from "@/screens/seller/attach";
import { SlidePill } from "@/screens/seller/SlidePill";

import { CourierMap } from "./CourierMap";
import { clock, shortDate, useCourier, useJob } from "./hooks";
import { Button, Card, Chips, CourierPage, COURIER, Empty, Pill, RoundButton, Rise, RouteLine, type PillTone, type, useHideTabBar } from "./ui";
import { CodeBoxes } from "./Proof";

type ListTab = "active" | "upcoming" | "done" | "cancelled";

/** What a job is doing right now, in words and a colour, for the pill on its card. */
export function statusPill(job: CourierJob): { label: string; tone: PillTone } {
  switch (job.status) {
    case "accepted":
      return { label: "Heading to pickup", tone: "blue" };
    case "on-the-way":
      return { label: "In transit", tone: "blue" };
    case "arrived":
      return { label: "At the door", tone: "amber" };
    case "returning":
      return { label: "Returning", tone: "amber" };
    case "delivered":
      return { label: "Delivered", tone: "green" };
    case "returned":
      return { label: "Returned", tone: "grey" };
    case "cancelled":
      return { label: "Cancelled", tone: "red" };
    default:
      return { label: job.status, tone: "grey" };
  }
}

/** Minutes and kilometres still to go, from how far along the road the courier is. */
export function remaining(job: CourierJob): { km: number; minutes: number } {
  if (job.status === "accepted") return { km: Math.round(job.distanceKm * 0.5 * 10) / 10, minutes: Math.max(1, Math.round(job.minutes / 2)) };
  const left = 1 - job.progress;
  return { km: Math.round(job.distanceKm * left * 10) / 10, minutes: Math.max(left > 0 ? 1 : 0, Math.round(job.minutes * left)) };
}

function initials(name: string): string {
  return name.split(/\s+/).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}

/** A finished delivery on a list: a tick or a cross, the order, the date and distance, and what it paid. */
export function JobRow({ job, onPress }: { job: CourierJob; onPress: () => void }) {
  const ok = job.status === "delivered" || job.status === "returned";
  const sub = job.status === "cancelled" ? `${shortDate(job.acceptedAt ?? job.offeredAt)} · Cancelled by buyer` : `${shortDate(job.deliveredAt ?? job.acceptedAt ?? job.offeredAt)} · ${job.distanceKm.toFixed(1)} km`;
  const right = job.status === "cancelled" ? "No penalty" : job.status === "returned" ? "Trip paid" : job.rating ? `Rated ${job.rating} stars` : job.tipCents ? `Tip ${rand(job.tipCents)}` : "Not rated yet";
  return (
    <Card onPress={onPress} style={styles.row} testID={`row-${job.id}`}>
      <View style={[styles.rowIcon, { backgroundColor: ok ? COURIER.greenSoft : COURIER.redSoft }]}>
        <Icon color={ok ? COURIER.green : COURIER.red} name={ok ? "check" : "x"} size={22} />
      </View>
      <View style={styles.flex}>
        <Text style={type.card}>Order {job.number}</Text>
        <Text style={type.caption}>{sub}</Text>
      </View>
      <View style={styles.rowEnd}>
        <Text style={styles.rowPay}>{job.status === "cancelled" ? "R 0" : rand(job.payoutCents)}</Text>
        <Text style={type.caption}>{right}</Text>
      </View>
    </Card>
  );
}

/** Active: the delivery you are on, the ones planned for later, and the ones you finished or lost. */
export function CourierActiveListScreen() {
  const router = useRouter();
  const { courier } = useCourier();
  const [tab, setTab] = useState<ListTab>("active");
  const act = activeNow(courier);
  const soon = upcoming(courier);
  const done = doneJobs(courier);
  const lost = cancelledJobs(courier);
  const open = (job: CourierJob) => router.push((job.status === "delivered" || job.status === "returned" || job.status === "cancelled" ? `/courier/active/detail/${job.id}` : `/courier/active/${job.id}`) as Href);

  return (
    <CourierPage subtitle={`${act.length} active · ${soon.length} upcoming`} testID="courier-active" title="My deliveries">
      <Chips
        chips={[
          { count: act.length, key: "active", label: "Active" },
          { count: soon.length, key: "upcoming", label: "Upcoming" },
          { key: "done", label: "Done" },
          { key: "cancelled", label: "Cancelled" },
        ]}
        onChange={setTab}
        value={tab}
      />
      {tab === "active" ? (
        act.length === 0 ? (
          <Empty detail="Accept an offer from Home or Jobs and it shows up here." icon="truck" title="Nothing in progress" />
        ) : (
          act.map((job, index) => {
            const pill = statusPill(job);
            const left = remaining(job);
            return (
              <Rise index={index} key={job.id}>
                <Card onPress={() => open(job)} style={styles.activeCard} testID={`active-${job.id}`} tone="selected">
                  <View style={styles.cardTop}>
                    <Text style={type.card}>{job.number}</Text>
                    <Pill label={pill.label} tone={pill.tone} />
                  </View>
                  <RouteLine
                    dropoff={{ sub: `Drop-off · ${job.dropoff.detail}`, title: job.dropoff.name }}
                    pickup={{ sub: job.pickedUpAt ? `Collected ${clock(job.pickedUpAt)}` : `Pickup · ${job.pickup.detail}`, title: job.pickup.name }}
                  />
                  <View style={styles.cardBottom}>
                    <Text style={type.caption}>
                      ETA {left.minutes} min · {left.km.toFixed(1)} km
                    </Text>
                    <View style={styles.continue}>
                      <Button icon="send" label="Continue" onPress={() => open(job)} testID={`continue-${job.id}`} />
                    </View>
                  </View>
                </Card>
              </Rise>
            );
          })
        )
      ) : null}
      {tab === "active" && soon.length > 0 ? <Text style={styles.section}>Upcoming</Text> : null}
      {tab === "active" || tab === "upcoming"
        ? soon.map((job) => (
            <Card key={job.id} onPress={() => open(job)} style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: COURIER.card }]}>
                <Icon color={COURIER.solid} name="clock" size={22} />
              </View>
              <View style={styles.flex}>
                <Text style={type.card}>
                  {job.number} · {job.pickup.detail} to {job.dropoff.detail}
                </Text>
                <Text style={type.caption}>Scheduled {job.scheduledFor ? clock(job.scheduledFor) : ""}</Text>
              </View>
              <View style={styles.rowEnd}>
                <Text style={styles.rowPay}>{rand(job.payoutCents)}</Text>
                <Text style={type.caption}>Accepted</Text>
              </View>
            </Card>
          ))
        : null}
      {tab === "upcoming" && soon.length === 0 ? <Empty detail="Deliveries a student booked for later show up here once you accept them." icon="clock" title="Nothing planned" /> : null}
      {tab === "done" ? (done.length === 0 ? <Empty detail="Finished deliveries are listed here." icon="check-circle" title="No deliveries yet" /> : done.map((job) => <JobRow job={job} key={job.id} onPress={() => open(job)} />)) : null}
      {tab === "cancelled" ? (lost.length === 0 ? <Empty detail="Deliveries a student cancelled show up here, with no penalty to you." icon="x-circle" title="Nothing cancelled" /> : lost.map((job) => <JobRow job={job} key={job.id} onPress={() => open(job)} />)) : null}
    </CourierPage>
  );
}

/** Opens a phone call to a number, or says there is none yet. */
function useCall() {
  const toast = useToast();
  return (name: string, phone?: string) => {
    const number = phone?.replace(/[^\d+]/g, "");
    if (!number) {
      toast.show(`${name}'s phone number isn't available yet`);
      return;
    }
    void Linking.openURL(`tel:${number}`).catch(() => toast.show("Couldn't open the phone app"));
  };
}

/** A delivery after the fact, from the Done and Cancelled lists. */
export function CourierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = useJob(id);
  if (!job) {
    return (
      <CourierPage back testID="courier-job-missing" title="Delivery">
        <Empty detail="This delivery is no longer on your list." icon="alert-circle" title="Delivery not found" />
      </CourierPage>
    );
  }
  return <DetailView job={job} />;
}

/** The page for a job that is in progress: it shows the step the job is at, and moves on by itself when the step is done. */
export function CourierActiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = useJob(id);
  if (!job) {
    return (
      <CourierPage back testID="courier-job-missing" title="Delivery">
        <Empty detail="This delivery is no longer on your list." icon="alert-circle" title="Delivery not found" />
      </CourierPage>
    );
  }
  if (job.status === "accepted") return <PickupView job={job} />;
  if (job.status === "on-the-way") return <OnTheWayView job={job} />;
  if (job.status === "arrived") return <ArrivedRedirect job={job} />;
  if (job.status === "returning") return <ReturningView job={job} />;
  return <DetailView job={job} />;
}

function ArrivedRedirect({ job }: { job: CourierJob }) {
  const router = useRouter();
  return (
    <CourierPage back testID="courier-arrived" title="You have arrived">
      <Empty detail="Ask the buyer for their delivery code to hand over the parcel." icon="map-pin" title={`At ${job.dropoff.name}'s door`} />
      <Button label="Confirm delivery" onPress={() => router.replace(`/courier/active/confirm/${job.id}` as Href)} testID="to-confirm" />
    </CourierPage>
  );
}

/** Collect the parcel: the seller's code, a photo of it sealed, and a short check. */
function PickupView({ job }: { job: CourierJob }) {
  const { dispatch } = useCourier();
  const call = useCall();
  const toast = useToast();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [labelOk, setLabelOk] = useState(false);
  const [sealedOk, setSealedOk] = useState(false);
  useHideTabBar(true);
  const full = code.length === 4;
  const match = full && code === job.pickupCode;
  const ready = match && photo !== null && labelOk && sealedOk;

  const confirm = () => {
    haptic.success();
    dispatch({ code, id: job.id, photoUri: photo ?? undefined, type: "courierConfirmPickup" });
    toast.show("Collected. Now take it to the buyer.");
    router.replace(`/courier/active/${job.id}` as Href);
  };

  return (
    <CourierPage back bar={false} footer={<Button disabled={!ready} icon="check" label="Confirm collection" onPress={confirm} testID="confirm-collection" />} subtitle={`${job.pickup.name} · ${job.pickup.detail}`} testID="courier-pickup" title="Pickup">
      <View>
        <CourierMap job={job} phase="to-pickup" />
        <View style={styles.eta}>
          <Icon color={COURIER.ink} name="navigation" size={13} />
          <Text style={styles.etaText}>{remaining(job).minutes} min away</Text>
        </View>
      </View>
      <Card style={styles.person} tone="soft">
        <View style={styles.personIcon}>
          <Icon color={COURIER.solid} name="shopping-bag" size={20} />
        </View>
        <View style={styles.flex}>
          <Text style={type.card}>{job.storeName}</Text>
          <Text style={type.caption}>
            Order {job.number} · {job.parcel.split(" · ")[0]} parcel
          </Text>
        </View>
        <RoundButton icon="phone" label={`Call ${job.storeName}`} onPress={() => call(job.storeName, job.pickup.phone)} testID="call-seller" />
      </Card>
      <View style={styles.codeHead}>
        <Text style={type.section}>Handover code from seller</Text>
        {match ? <Pill label="Code matches" testID="code-matches" tone="green" /> : null}
      </View>
      <CodeBoxes onChange={setCode} state={full ? (match ? "ok" : "bad") : "idle"} testID="pickup-code" value={code} />
      {full && !match ? <Text style={styles.error}>That is not the code the seller has. Ask them to read it from the order.</Text> : null}
      {job.demoCodes ? (
        <Card style={styles.demo} tone="soft">
          <Text style={type.caption}>Demo job: no seller app is behind this one, so its code is {job.pickupCode}. On a real job only the seller can read it to you.</Text>
        </Card>
      ) : null}
      <Pressable accessibilityLabel={photo ? "Retake the parcel photo" : "Take a photo of the parcel"} accessibilityRole="button" onPress={() => setPhotoOpen(true)} style={styles.photo} testID="parcel-photo">
        {photo ? <Image source={{ uri: photo }} style={styles.photoThumb} /> : <Icon color={COURIER.solid} name="camera" size={22} />}
        <View style={styles.flex}>
          <Text style={type.card}>{photo ? "Photo added" : "Take a photo of the parcel"}</Text>
          <Text style={type.caption}>{photo ? "Tap to retake it" : "Proof it was sealed at pickup"}</Text>
        </View>
      </Pressable>
      <Check checked={labelOk} label={`Order label matches ${job.number}`} onChange={setLabelOk} testID="check-label" />
      <Check checked={sealedOk} label="Parcel sealed, no visible damage" onChange={setSealedOk} testID="check-sealed" />
      <AttachSheet
        onClose={() => setPhotoOpen(false)}
        onPicked={(file) => {
          setPhoto(file.uri);
          setPhotoOpen(false);
        }}
        sources={["camera", "library"]}
        title="Photo of the parcel"
        visible={photoOpen}
      />
    </CourierPage>
  );
}

function Check({ checked, label, onChange, testID }: { checked: boolean; label: string; onChange: (value: boolean) => void; testID: string }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => { haptic.tap(); onChange(!checked); }} style={styles.check} testID={testID}>
      <View style={[styles.box, checked && styles.boxOn]}>{checked ? <Icon color="#FFFFFF" name="check" size={14} /> : null}</View>
      <Text style={type.body}>{label}</Text>
    </Pressable>
  );
}

/** Take it to the buyer: the road, who they are, what to know at the door, and a slide to say you are there. */
function OnTheWayView({ job }: { job: CourierJob }) {
  const router = useRouter();
  const { dispatch } = useCourier();
  const call = useCall();
  const left = remaining(job);
  const near = job.progress >= 0.9;
  const attempt = job.attempts.length + 1;
  const arriveBy = job.pickedUpAt ? clock(new Date(new Date(job.pickedUpAt).getTime() + job.minutes * 60_000).toISOString()) : "";

  return (
    <CourierPage subtitle={`Order ${job.number}${attempt > 1 ? ` · Attempt ${attempt} of ${MAX_ATTEMPTS}` : ""}`} testID="courier-on-the-way" title="On the way">
      <View>
        <CourierMap height={190} job={job} phase="to-buyer" />
        <View style={styles.eta}>
          <Icon color={COURIER.ink} name="navigation" size={13} />
          <Text style={styles.etaText} testID="eta">
            ETA {left.minutes} min · {left.km.toFixed(1)} km
          </Text>
        </View>
      </View>
      <Card style={styles.person} tone="soft">
        <View style={[styles.personIcon, { backgroundColor: COURIER.solid }]}>
          <Text style={styles.initials}>{initials(job.buyerName)}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={type.card}>{job.buyerName}</Text>
          <Text numberOfLines={1} style={type.caption}>
            {job.dropoff.detail}
          </Text>
        </View>
        <RoundButton icon="phone" label={`Call ${job.buyerName}`} onPress={() => call(job.buyerName, job.buyerPhone)} testID="call-buyer" />
        <RoundButton icon="message-circle" label={`Message ${job.buyerName}`} onPress={() => router.push(`/courier/active/chat/${job.id}` as Href)} testID="chat-buyer" />
      </Card>
      {job.instructions || job.handling !== "Standard" ? (
        <Card style={styles.gap} tone="warn">
          <View style={styles.warnRow}>
            <Icon color={COURIER.amber} name="alert-triangle" size={16} />
            <Text style={styles.warnTitle}>Delivery instructions</Text>
          </View>
          <Text style={type.body}>{[job.instructions, job.handling !== "Standard" ? job.handling : ""].filter(Boolean).join(" · ")}</Text>
        </Card>
      ) : null}
      <Card style={styles.timeline} tone="soft">
        <View style={styles.timeRow}>
          <View style={styles.dotDone} />
          <View style={styles.flex}>
            <Text style={type.card}>Collected from seller</Text>
            <Text style={type.caption}>{job.pickedUpAt ? clock(job.pickedUpAt) : ""}</Text>
          </View>
        </View>
        <View style={styles.timeRow}>
          <View style={styles.dotNext} />
          <View style={styles.flex}>
            <Text style={type.card}>Delivering to buyer</Text>
            <Text style={type.caption}>Arrive by {arriveBy}</Text>
          </View>
        </View>
      </Card>
      <View style={styles.slide}>
        <SlidePill
          dark
          disabled={!near}
          label="Slide to confirm arrival"
          onComplete={() => {
            dispatch({ id: job.id, type: "courierArrive" });
            router.replace(`/courier/active/confirm/${job.id}` as Href);
          }}
          testID="slide-arrive"
        />
        {!near ? <Text style={[type.caption, styles.center]}>Keep going: {left.km.toFixed(1)} km to the buyer. The slide unlocks when you are close.</Text> : null}
      </View>
    </CourierPage>
  );
}

/** Both tries failed: take it back. The code on this screen is what the seller types to take the parcel. */
function ReturningView({ job }: { job: CourierJob }) {
  const { dispatch } = useCourier();
  const call = useCall();
  const left = remaining(job);
  const back = job.progress >= 1;
  return (
    <CourierPage subtitle={`${job.number} · back to ${job.pickup.name}`} testID="courier-returning" title="Bring it back">
      <CourierMap height={170} job={job} phase="returning" />
      <Card style={styles.person} tone="soft">
        <View style={styles.personIcon}>
          <Icon color={COURIER.solid} name="shopping-bag" size={20} />
        </View>
        <View style={styles.flex}>
          <Text style={type.card}>{job.storeName}</Text>
          <Text style={type.caption}>{back ? "You are at the seller" : `${left.km.toFixed(1)} km to go`}</Text>
        </View>
        <RoundButton icon="phone" label={`Call ${job.storeName}`} onPress={() => call(job.storeName, job.pickup.phone)} />
      </Card>
      <Text style={[type.section, styles.gap]}>Return code</Text>
      <CodeBoxes onChange={() => undefined} state="idle" testID="return-code" value={job.returnCode} />
      <Text style={[type.caption, styles.gap]}>Show this code to the seller. They type it in their app to take the parcel back, and your trip is paid.</Text>
      {job.demoCodes ? (
        <View style={styles.gap}>
          <Button label="Demo: the seller confirms the return" onPress={() => dispatch({ code: job.returnCode, id: job.id, type: "courierConfirmReturn" })} testID="demo-return" tone="outline" />
        </View>
      ) : null}
    </CourierPage>
  );
}

/** A delivery after the fact: where it went, what was in it, what it paid and how it ended. */
function DetailView({ job }: { job: CourierJob }) {
  const pill = statusPill(job);
  return (
    <CourierPage back right={<Pill label={pill.label} tone={pill.tone} />} subtitle={`${job.number} · ${job.storeName} to ${job.dropoff.name}`} testID="courier-detail" title="Delivery">
      <CourierMap job={job} phase="preview" />
      <Text style={styles.section}>Items ({job.items.length})</Text>
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
      <Card style={styles.gap} tone="soft">
        <Text style={styles.addressLabel}>Delivery address</Text>
        <View style={styles.addressRow}>
          <Icon color={COURIER.solid} name="map-pin" size={18} />
          <Text style={type.card}>{job.dropoff.detail}</Text>
        </View>
      </Card>
      {job.status === "delivered" || job.status === "returned" ? (
        <Card style={styles.gap} tone="dark">
          <Text style={styles.darkLabel}>{job.status === "delivered" ? "You earned" : "Trip paid"}</Text>
          <Text style={styles.darkValue}>{rand(job.payoutCents + (job.tipCents ?? 0))}</Text>
          {job.tipCents ? <Text style={styles.darkLabel}>including a {rand(job.tipCents)} tip</Text> : null}
        </Card>
      ) : null}
      {job.rating ? <Text style={[type.body, styles.gap]}>The student rated this delivery {job.rating} out of 5.</Text> : null}
      {job.proof ? <Text style={[type.caption, styles.gap]}>Handed over with {job.proof === "otp" ? "the buyer's code" : job.proof === "signature" ? "a signature" : "a photo at the door"}.</Text> : null}
      {job.attempts.length > 0 ? <Text style={[type.caption, styles.gap]}>{job.attempts.length} failed {job.attempts.length === 1 ? "attempt" : "attempts"} before this.</Text> : null}
    </CourierPage>
  );
}

const styles = StyleSheet.create({
  activeCard: { gap: 10, marginBottom: 12 },
  addressLabel: { color: COURIER.inkSoft, fontSize: 12, marginBottom: 6 },
  addressRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  box: { alignItems: "center", borderColor: COURIER.solid, borderRadius: 6, borderWidth: 2, height: 22, justifyContent: "center", width: 22 },
  boxOn: { backgroundColor: COURIER.solid },
  cardBottom: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  cardTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  center: { textAlign: "center" },
  check: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 12 },
  codeHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10, marginTop: 16 },
  continue: { minWidth: 140 },
  darkLabel: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  darkValue: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginVertical: 2 },
  demo: { marginTop: 10 },
  dotDone: { backgroundColor: "#FFFFFF", borderColor: COURIER.solid, borderRadius: 7, borderWidth: 3, height: 14, width: 14 },
  dotNext: { backgroundColor: COURIER.solid, borderRadius: 7, height: 14, width: 14 },
  error: { color: COURIER.red, fontSize: 12, marginTop: 8 },
  eta: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 2px 6px rgba(0,0,0,0.15)", flexDirection: "row", gap: 6, left: 10, paddingHorizontal: 10, paddingVertical: 6, position: "absolute", top: 10 },
  etaText: { color: COURIER.ink, fontSize: 12, fontWeight: "700" },
  flex: { flex: 1 },
  gap: { marginTop: 14 },
  initials: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  item: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 8 },
  person: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 14 },
  personIcon: { alignItems: "center", backgroundColor: "#E3EDF0", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  photo: { alignItems: "center", borderColor: COURIER.solid, borderRadius: 18, borderStyle: "dashed", borderWidth: 1.5, flexDirection: "row", gap: 12, marginTop: 14, padding: 14 },
  photoThumb: { borderRadius: 10, height: 44, width: 44 },
  row: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 10 },
  rowEnd: { alignItems: "flex-end" },
  rowIcon: { alignItems: "center", borderRadius: 14, height: 46, justifyContent: "center", width: 46 },
  rowPay: { color: COURIER.ink, fontSize: 16, fontWeight: "800" },
  section: { color: COURIER.ink, fontSize: 16, fontWeight: "700", marginBottom: 8, marginTop: 16 },
  slide: { gap: 8, marginTop: 14 },
  thumb: { backgroundColor: COURIER.card, borderRadius: 12, height: 48, overflow: "hidden", width: 48 },
  timeline: { gap: 14, marginTop: 14 },
  timeRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  warnRow: { alignItems: "center", flexDirection: "row", gap: 6, marginBottom: 2 },
  warnTitle: { color: COURIER.amber, fontSize: 13, fontWeight: "800" },
});
