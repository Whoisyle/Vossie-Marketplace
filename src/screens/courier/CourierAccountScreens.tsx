import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Icon, RadioRow, Sheet, StarRating, useToast, type IconName } from "@/components";
import { liveBackend } from "@/backend/mode";
import { performance } from "@/courier/selectors";
import type { CourierAlertKind, CourierDocKind } from "@/courier/types";
import { getCampusName } from "@/data/repository";
import { emergencyNumbers } from "@/data/safety";
import type { Role } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { AttachSheet } from "@/screens/seller/attach";

import { AvailabilityForm } from "./CourierSetupScreens";
import { ago, shortDate, useCourier } from "./hooks";
import { Button, Card, Chips, CourierPage, COURIER, Empty, MenuRow, Pill, Rise, Toggle, type PillTone, type } from "./ui";

function initials(name: string): string {
  return name.split(/\s+/).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase() || "C";
}

const VEHICLE_NAME = { bicycle: "Bicycle", car: "Car", scooter: "Scooter", walking: "On foot" } as const;

/** Account: who you are, your documents, alerts, vehicle and zones, and the way back to buying or selling. */
export function CourierAccountScreen() {
  const router = useRouter();
  const { courier, dispatch, state } = useCourier();
  const [roleOpen, setRoleOpen] = useState(false);
  const verified = courier.documents.filter((doc) => doc.kind !== "background").every((doc) => doc.status === "verified" || doc.status === "missing");
  const unread = courier.alerts.filter((alert) => !alert.read).length;
  const to = (path: string) => router.push(path as Href);

  const switchTo = (role: Role) => {
    dispatch({ role, type: "switchRole" });
    setRoleOpen(false);
    if (role === "buyer") router.replace("/home" as Href);
    else if (role === "seller") router.replace((state.seller.setupDone ? "/seller/home" : "/seller-setup/welcome") as Href);
  };

  return (
    <CourierPage subtitle="Courier profile" testID="courier-account" title="Account">
      <Rise>
        <Card style={styles.profile} tone="soft" testID="courier-profile">
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(courier.profile.fullName)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={type.card}>{courier.profile.fullName}</Text>
            <Text style={type.caption}>
              {VEHICLE_NAME[courier.profile.vehicle]} · {getCampusName(courier.profile.campusId).replace(/\s*\(.*\)/, "")}
            </Text>
          </View>
          <Pill label={verified ? "Verified" : "In review"} tone={verified ? "green" : "amber"} />
        </Card>
      </Rise>
      <MenuRow detail={verified ? "ID and selfie verified" : "Checks in progress"} icon="file-text" label="Documents" onPress={() => to("/courier/account/documents")} testID="row-documents" />
      <MenuRow detail="Sound and vibration" icon="bell" label="Job alerts" right={<Toggle label="Job alerts" on={courier.jobAlerts} onChange={(on) => dispatch({ on, type: "courierSetJobAlerts" })} testID="alerts-toggle" />} testID="row-alerts" />
      <MenuRow detail="Hours, days and where you deliver" icon="map-pin" label="Vehicle & delivery zones" onPress={() => to("/courier/account/availability")} testID="row-zones" />
      <MenuRow detail="Your score and how buyers rate you" icon="award" label="Performance" onPress={() => to("/courier/account/performance")} testID="row-performance" />
      <MenuRow detail="Every delivery you finished" icon="clock" label="History" onPress={() => to("/courier/account/history")} testID="row-history" />
      <MenuRow detail={unread > 0 ? `${unread} new` : "You are up to date"} icon="inbox" label="Notifications" onPress={() => to("/courier/home/notifications")} testID="row-notifications" />
      <MenuRow detail="SOS, safety and disputes" icon="life-buoy" label="Help & support" onPress={() => to("/courier/account/support")} testID="row-support" />
      <MenuRow detail="Buyer, seller or courier" icon="repeat" label="Switch role" onPress={() => setRoleOpen(true)} testID="row-switch" />
      <MenuRow
        icon="log-out"
        label="Log out"
        onPress={() => {
          dispatch({ type: "signOut" });
          router.replace("/sign-in" as Href);
        }}
        testID="row-logout"
        tone="danger"
      />
      <Sheet onClose={() => setRoleOpen(false)} title="Switch role" visible={roleOpen}>
        {(["buyer", "seller", "courier"] as Role[]).map((role) => (
          <RadioRow key={role} onPress={() => (role === "courier" ? setRoleOpen(false) : switchTo(role))} selected={role === "courier"} subtitle={role === "buyer" ? "Browse and buy on campus" : role === "seller" ? "Sell to students on your campus" : "Deliver orders on your campus"} title={role === "buyer" ? "Buyer" : role === "seller" ? "Seller" : "Courier"} />
        ))}
      </Sheet>
    </CourierPage>
  );
}

const DOC_INFO: Record<CourierDocKind, { icon: IconName; title: string; sub: string }> = {
  background: { icon: "shield", sub: "Run by Vossie Operations", title: "Background check" },
  id: { icon: "file-text", sub: "South African ID or passport", title: "ID document" },
  selfie: { icon: "camera", sub: "Matches your ID photo", title: "Selfie check" },
  vehicle: { icon: "truck", sub: "Licence or vehicle papers", title: "Vehicle or licence" },
};

/** Your documents: what was checked, what is still being checked, and a way to send a new one. */
export function CourierDocumentsScreen() {
  const { courier, dispatch } = useCourier();
  const toast = useToast();
  const [replacing, setReplacing] = useState<CourierDocKind | null>(null);
  const docs = courier.documents.filter((doc) => doc.kind !== "vehicle" || courier.profile.vehicle !== "walking");
  const tone = (status: string): PillTone => (status === "verified" ? "green" : status === "in-review" || status === "uploaded" ? "amber" : status === "rejected" ? "red" : "grey");
  const label = (status: string) => (status === "verified" ? "Verified" : status === "in-review" ? "In review" : status === "uploaded" ? "Added" : status === "rejected" ? "Try again" : "Not added");
  return (
    <CourierPage back subtitle="What Vossie Operations has checked" testID="courier-documents" title="Documents">
      {docs.map((doc, index) => {
        const info = DOC_INFO[doc.kind];
        return (
          <Rise index={index} key={doc.kind}>
            <Card onPress={doc.kind === "background" ? undefined : () => setReplacing(doc.kind)} style={styles.doc} testID={`doc-${doc.kind}`}>
              <View style={styles.docIcon}>
                <Icon color={COURIER.solid} name={info.icon} size={20} />
              </View>
              <View style={styles.flex}>
                <Text style={type.card}>{info.title}</Text>
                <Text style={type.caption}>{doc.fileName ?? info.sub}</Text>
              </View>
              <Pill label={label(doc.status)} tone={tone(doc.status)} />
            </Card>
          </Rise>
        );
      })}
      <Text style={[type.caption, styles.note]}>Tap a document to send a new one, for example when a licence is renewed. A new file is checked again.</Text>
      <AttachSheet
        onClose={() => setReplacing(null)}
        onPicked={(file) => {
          if (replacing) {
            dispatch({ fileName: file.name, kind: replacing, type: "courierUploadDocument", uri: file.uri });
            toast.show("Sent. It will be checked again.");
          }
          setReplacing(null);
        }}
        sources={replacing === "selfie" ? ["camera", "library"] : ["library", "camera", "files"]}
        title="Send a new document"
        visible={replacing !== null}
      />
    </CourierPage>
  );
}

/** Vehicle, working days and hours, and the zones you deliver in. */
export function CourierAvailabilityScreen() {
  return (
    <CourierPage back subtitle="Choose when and where you deliver" testID="courier-availability" title="Availability">
      <AvailabilityForm onVehicle />
    </CourierPage>
  );
}

/** Performance: the score buyers give you and the three rates Vossie looks at. */
export function CourierPerformanceScreen() {
  const { courier } = useCourier();
  const stats = performance(courier);
  const recent = courier.jobs.filter((job) => job.rating !== undefined).sort((a, b) => (b.deliveredAt ?? "").localeCompare(a.deliveredAt ?? "")).slice(0, 5);
  const top = stats.rating !== null && stats.rating >= 4.7 && stats.deliveries >= 10;
  return (
    <CourierPage back subtitle="Your courier score" testID="courier-performance" title="Performance">
      <Card style={styles.score} tone="dark" testID="score-card">
        <View>
          <Text style={styles.scoreValue}>{stats.rating === null ? "New" : stats.rating.toFixed(1)}</Text>
          <StarRating size={16} value={stats.rating ?? 0} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.scoreTitle}>{top ? "Top-rated courier" : stats.deliveries === 0 ? "New courier" : "Building your score"}</Text>
          <Text style={styles.scoreSub}>{stats.deliveries === 0 ? "Finish a delivery to get your first rating" : `Based on ${stats.deliveries} ${stats.deliveries === 1 ? "delivery" : "deliveries"}`}</Text>
        </View>
      </Card>
      <Card style={styles.rates} tone="soft">
        <Rate label="Acceptance rate" value={stats.acceptance} />
        <Rate label="On-time delivery" value={stats.onTime} />
        <Rate label="Completion rate" value={stats.completion} />
      </Card>
      <View style={styles.head}>
        <Text style={type.section}>Recent feedback</Text>
      </View>
      {recent.length === 0 ? <Empty detail="What students say about your deliveries shows up here." icon="star" title="No feedback yet" /> : null}
      {recent.map((job) => (
        <Card key={job.id} style={styles.feedback}>
          <View style={styles.feedbackTop}>
            <Text style={type.card}>{job.buyerName}</Text>
            <StarRating size={13} value={job.rating ?? 0} />
          </View>
          <Text style={type.body}>{job.feedback ?? "Rated this delivery."}</Text>
        </Card>
      ))}
    </CourierPage>
  );
}

function Rate({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.rate}>
      <View style={styles.rateHead}>
        <Text style={type.card}>{label}</Text>
        <Text style={styles.ratePercent}>{value}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${value}%` }]} />
      </View>
    </View>
  );
}

type NoteFilter = "all" | "jobs" | "orders" | "system";

const KIND: Record<CourierAlertKind, { icon: IconName; group: NoteFilter; tone?: "warn" }> = {
  document: { group: "system", icon: "alert-triangle", tone: "warn" },
  money: { group: "system", icon: "credit-card" },
  offer: { group: "jobs", icon: "truck" },
  order: { group: "orders", icon: "package" },
  rating: { group: "system", icon: "star" },
  system: { group: "system", icon: "info" },
};

/** Notifications: offers, parcels, payouts, ratings and documents, with the new ones marked. */
export function CourierNotificationsScreen() {
  const router = useRouter();
  const { courier, dispatch } = useCourier();
  const [filter, setFilter] = useState<NoteFilter>("all");
  const unread = courier.alerts.filter((alert) => !alert.read).length;
  const list = courier.alerts.filter((alert) => filter === "all" || KIND[alert.kind].group === filter);
  return (
    <CourierPage
      back
      right={unread > 0 ? <Pressable accessibilityRole="button" hitSlop={8} onPress={() => dispatch({ type: "courierReadAlerts" })} testID="mark-read"><Text style={styles.link}>Mark all read</Text></Pressable> : null}
      subtitle={unread > 0 ? `${unread} new` : "You are up to date"}
      testID="courier-notifications"
      title="Notifications"
    >
      <Chips
        chips={[
          { key: "all", label: "All" },
          { key: "jobs", label: "Jobs" },
          { key: "orders", label: "Orders" },
          { key: "system", label: "System" },
        ]}
        onChange={setFilter}
        value={filter}
      />
      {list.length === 0 ? <Empty detail="Offers, pickups and payouts show up here as they happen." icon="bell" title="Nothing here yet" /> : null}
      {list.map((alert, index) => {
        const info = KIND[alert.kind];
        return (
          <Rise index={index} key={alert.id}>
            <Card
              onPress={() => {
                dispatch({ ids: [alert.id], type: "courierReadAlerts" });
                if (alert.href) router.push(alert.href as Href);
              }}
              style={styles.note}
              testID={`alert-${alert.id}`}
            >
              <View style={[styles.docIcon, info.tone === "warn" && { backgroundColor: COURIER.amberSoft }]}>
                <Icon color={info.tone === "warn" ? COURIER.amber : COURIER.solid} name={info.icon} size={20} />
              </View>
              <View style={styles.flex}>
                <Text style={type.card}>{alert.title}</Text>
                <Text style={type.caption}>{alert.body}</Text>
              </View>
              <View style={styles.noteEnd}>
                <Text style={styles.time}>{ago(alert.createdAt)}</Text>
                {!alert.read ? <Pill label="New" tone="blue" /> : null}
              </View>
            </Card>
          </Rise>
        );
      })}
    </CourierPage>
  );
}

/** Support: SOS, safety, disputes, a failed delivery, Vossie Operations, and your open cases. */
export function CourierSupportScreen() {
  const router = useRouter();
  const toast = useToast();
  const { courier, dispatch, state } = useCourier();
  const [sosOpen, setSosOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState<{ title: string; hint: string } | null>(null);
  const [detail, setDetail] = useState("");
  const active = courier.jobs.find((job) => job.status === "arrived");
  const security = state.campusContacts.filter((item) => item.campusId === courier.profile.campusId && item.kind === "security");

  const dial = (number: string) => {
    const clean = number.replace(/[^\d+]/g, "");
    void Linking.openURL(`tel:${clean}`).catch(() => toast.show("Couldn't open the phone app"));
  };
  const sendSos = () => {
    haptic.success();
    dispatch({ detail: "SOS from the courier app. Live location shared with Vossie Operations.", sos: true, title: "SOS", type: "courierOpenCase" });
    setSent(true);
  };

  return (
    <CourierPage back subtitle="We are here to help" testID="courier-support" title="Support">
      <Card style={styles.sos} tone="warn" testID="sos-card">
        <View style={[styles.docIcon, { backgroundColor: COURIER.redSoft }]}>
          <Icon color={COURIER.red} name="alert-triangle" size={22} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.sosTitle}>Feeling unsafe?</Text>
          <Text style={type.caption}>Share your live location with Vossie</Text>
        </View>
        <Pressable accessibilityLabel="Send an SOS" accessibilityRole="button" onPress={() => { setSent(false); setSosOpen(true); }} style={styles.sosButton} testID="sos-button">
          <Text style={styles.sosButtonText}>SOS</Text>
        </Pressable>
      </Card>
      <MenuRow detail="Accident, threat or harassment" icon="flag" label="Report a safety issue" onPress={() => setForm({ hint: "What happened?", title: "Safety issue" })} testID="row-safety" />
      <MenuRow detail="Raise a dispute for an order" icon="package" label="Order dispute" onPress={() => setForm({ hint: "Which order, and what is wrong?", title: "Order dispute" })} testID="row-dispute" />
      <MenuRow
        detail="Start failed delivery steps"
        icon="user-x"
        label="Buyer not answering"
        onPress={() => (active ? router.push(`/courier/active/failed/${active.id}` as Href) : toast.show("Open it from a delivery once you have arrived at the door"))}
        testID="row-failed"
      />
      <MenuRow detail="Write to Vossie Operations" icon="message-circle" label="Chat with Vossie Operations" onPress={() => setForm({ hint: "How can we help?", title: "Message to Operations" })} testID="row-ops" />
      {courier.cases.length > 0 ? <Text style={styles.section}>Your cases</Text> : null}
      {courier.cases.map((item, index) => (
        <Card key={item.id} style={styles.case} tone="soft" testID={`case-${item.id}`}>
          <View style={styles.flex}>
            <Text style={type.card}>
              Case #S-{118 + courier.cases.length - index - 1} · {item.title}
            </Text>
            <Text style={type.caption}>{item.detail}</Text>
          </View>
          <Pill label={item.status === "resolved" ? "Resolved" : item.status === "in-review" ? "In review" : "Open"} tone={item.status === "resolved" ? "green" : "amber"} />
        </Card>
      ))}
      {!liveBackend ? <Text style={[type.caption, styles.note]}>Demo: Vossie Operations is not connected yet, so a case waits here until the real team is. In an emergency always call the numbers under SOS.</Text> : null}

      <Sheet onClose={() => setSosOpen(false)} title={sent ? "SOS sent" : "Send an SOS?"} visible={sosOpen}>
        {!sent ? (
          <>
            <Text style={type.body}>This shares your live location with Vossie Operations and opens an urgent case. It does not call anyone for you. If you are in danger, call the police first.</Text>
            <Button label="Send SOS" onPress={sendSos} testID="sos-send" tone="danger" />
          </>
        ) : (
          <Text style={type.body}>Vossie Operations has your SOS and your location. Operations is a demo until the real team is connected, so call for help now if you need it.</Text>
        )}
        <Text style={type.section}>Call for help</Text>
        {emergencyNumbers.map((item) => (
          <Button icon="phone" key={item.number} label={`${item.label} · ${item.number}`} onPress={() => dial(item.number)} testID={`dial-${item.number}`} tone="outline" />
        ))}
        {security.map((item) => (
          <Button icon="shield" key={item.id} label={`${item.label} · ${item.phone}`} onPress={() => dial(item.phone)} tone="outline" />
        ))}
      </Sheet>

      <Sheet onClose={() => { setForm(null); setDetail(""); }} title={form?.title ?? ""} visible={form !== null}>
        <View style={styles.formBox}>
          <TextInput accessibilityLabel={form?.hint} multiline onChangeText={setDetail} placeholder={form?.hint} placeholderTextColor={COURIER.muted} style={styles.formInput} testID="case-text" value={detail} />
        </View>
        <Button
          disabled={detail.trim().length < 5}
          label="Send"
          onPress={() => {
            dispatch({ detail: detail.trim(), title: form?.title ?? "Message", type: "courierOpenCase" });
            toast.show("Sent to Vossie Operations");
            setForm(null);
            setDetail("");
          }}
          testID="case-send"
        />
      </Sheet>
    </CourierPage>
  );
}

export { shortDate };

const styles = StyleSheet.create({
  avatar: { alignItems: "center", backgroundColor: COURIER.solid, borderRadius: 26, height: 52, justifyContent: "center", width: 52 },
  avatarText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  case: { alignItems: "center", flexDirection: "row", gap: 10, marginBottom: 8 },
  doc: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 10 },
  docIcon: { alignItems: "center", backgroundColor: "#E3EDF0", borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  feedback: { gap: 4, marginBottom: 8 },
  feedbackTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  flex: { flex: 1 },
  formBox: { backgroundColor: COURIER.card, borderRadius: 18, minHeight: 110, padding: 12 },
  formInput: { color: COURIER.ink, fontSize: 15, minHeight: 90, textAlignVertical: "top" },
  head: { marginBottom: 10, marginTop: 18 },
  link: { color: COURIER.solid, fontSize: 13, fontWeight: "700" },
  note: { marginTop: 12 },
  noteEnd: { alignItems: "flex-end", gap: 4 },
  profile: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 12 },
  rate: { gap: 6 },
  rateHead: { flexDirection: "row", justifyContent: "space-between" },
  ratePercent: { color: COURIER.ink, fontSize: 14, fontWeight: "800" },
  rates: { gap: 14, marginTop: 14 },
  score: { alignItems: "center", flexDirection: "row", gap: 16 },
  scoreSub: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  scoreTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  scoreValue: { color: "#FFFFFF", fontFamily: "Lora_600SemiBold", fontSize: 40 },
  section: { color: COURIER.ink, fontSize: 15, fontWeight: "700", marginBottom: 8, marginTop: 16 },
  sos: { alignItems: "center", backgroundColor: COURIER.redSoft, flexDirection: "row", gap: 12, marginBottom: 12 },
  sosButton: { backgroundColor: COURIER.red, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8 },
  sosButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  sosTitle: { color: COURIER.red, fontSize: 15, fontWeight: "800" },
  time: { color: COURIER.ink, fontSize: 12, fontWeight: "700" },
  track: { backgroundColor: "#D3DFE4", borderRadius: 5, height: 9, overflow: "hidden" },
  trackFill: { backgroundColor: COURIER.solid, borderRadius: 5, height: 9 },
});
