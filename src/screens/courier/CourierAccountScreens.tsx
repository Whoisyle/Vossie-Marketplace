import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, Share, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { Icon, RadioRow, Sheet, StarRating, useToast, type IconName } from "@/components";
import { uprightWidth } from "@/components/StudentCard";
import { liveBackend } from "@/backend/mode";
import { balanceCents, daysLeft, needsLicence, vehicleComplete, vehicleLabel } from "@/courier/state";
import { rand } from "@/courier/pay";
import { normalisePlate, validLicenceNumber } from "@/courier/validate";
import { courierBadges, courierLevel, performance } from "@/courier/selectors";
import type { CourierAlertKind, CourierDocKind } from "@/courier/types";
import { REFERRAL_REWARD_POINTS, referralCodeFor } from "@/data/phase4";
import { getCampusName } from "@/data/repository";
import { emergencyNumbers } from "@/data/safety";
import type { Role } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { StudentCardFlip } from "@/screens/account/CardBacks";
import { walletCardWidth } from "@/screens/account/WalletCards";
import { AttachSheet } from "@/screens/seller/attach";
import { useCountUp } from "@/screens/seller/motion";

import { ago, shortDate, useCourier, useNow } from "./hooks";
import { dateToIso, Field, isoToDate, VehicleForm } from "./CourierSetupScreens";
import { Button, Card, Chips, CourierPage, COURIER, Empty, Heading, MenuRow, Pill, Rise, type PillTone, type } from "./ui";

function initials(name: string): string {
  return name.split(/\s+/).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase() || "C";
}

/** The level, with a bar that fills towards the next one, and the badges earned so far. */
export function LevelCard() {
  const reduced = useReducedMotion();
  const { courier } = useCourier();
  const level = courierLevel(courier);
  const badges = courierBadges(courier);
  const fill = useSharedValue(reduced ? level.progress : 0);
  const percent = useCountUp(Math.round(level.progress * 100), 700);
  const earned = badges.filter((badge) => badge.earned).length;
  useEffect(() => {
    if (!reduced) fill.set(withDelay(250, withTiming(level.progress, { duration: 800, easing: Easing.out(Easing.cubic) })));
  }, [fill, level.progress, reduced]);
  const bar = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  return (
    <Card style={styles.level} testID="level-card" tone="dark">
      <View style={styles.levelTop}>
        <View style={styles.levelBadge}>
          <Icon color={COURIER.solid} name="award" size={22} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.levelLabel}>Courier level</Text>
          <Text style={styles.levelName} testID="level-name">
            {level.label}
          </Text>
        </View>
        <Text style={styles.levelEarned}>
          {earned}/{badges.length} badges
        </Text>
      </View>
      {level.next ? (
        <>
          <View style={styles.levelTrack}>
            <Animated.View style={[styles.levelFill, bar]} />
          </View>
          <Text style={styles.levelNeed}>
            {percent}% to {level.next}. {level.need}.
          </Text>
        </>
      ) : (
        <Text style={styles.levelNeed}>{level.need}.</Text>
      )}
      <View style={styles.badges}>
        {badges.map((badge) => (
          <View accessibilityLabel={`${badge.label}${badge.earned ? ", earned" : `, ${badge.hint}`}`} key={badge.key} style={[styles.badge, !badge.earned && styles.badgeOff]} testID={`badge-${badge.key}`}>
            <Icon color={badge.earned ? "#FFFFFF" : "rgba(255,255,255,0.45)"} name={badge.icon as IconName} size={16} />
          </View>
        ))}
      </View>
    </Card>
  );
}

const VEHICLE_NAME = { bicycle: "Bicycle", car: "Car", scooter: "Scooter", walking: "On foot" } as const;

/** Account: the student card, who you are and your level, the vehicle, your money, documents, alerts and the way back to buying or selling. */
export function CourierAccountScreen() {
  const router = useRouter();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const { courier, dispatch, state } = useCourier();
  const [roleOpen, setRoleOpen] = useState(false);
  const verified = courier.documents.filter((doc) => doc.kind !== "background").every((doc) => doc.status === "verified" || doc.status === "missing");
  const unread = courier.alerts.filter((alert) => !alert.read).length;
  const to = (path: string) => router.push(path as Href);
  const motor = needsLicence(courier.profile.vehicle);
  const licence = courier.documents.find((doc) => doc.kind === "licence");
  const now = useNow(60_000);
  const left = daysLeft(licence?.expiresAt, now);
  const code = referralCodeFor(state.profile?.fullName ?? courier.profile.fullName, state.profile?.studentNumber);
  const balance = balanceCents(courier);

  const switchTo = (role: Role) => {
    dispatch({ role, type: "switchRole" });
    setRoleOpen(false);
    if (role === "buyer") router.replace("/home" as Href);
    else if (role === "seller") router.replace((state.seller.setupDone ? "/seller/home" : "/seller-setup/welcome") as Href);
  };
  const invite = async () => {
    try {
      await Share.share({ message: `Deliver on campus with Vossie and get paid every Friday. Use my code ${code} when you sign up.` });
    } catch {
      toast.show("Sharing isn't available here");
    }
  };

  return (
    <CourierPage subtitle="Courier profile" testID="courier-account" title="Account">
      <Rise>
        <View style={styles.cardGap} testID="courier-student-card">
          <StudentCardFlip campusName={getCampusName(state.profile?.campusId ?? courier.profile.campusId)} name={state.profile?.fullName ?? courier.profile.fullName} studentNumber={state.profile?.studentNumber ?? ""} verified={state.profile?.isVerifiedStudent ?? false} width={uprightWidth(walletCardWidth(width)) - 28} />
        </View>
      </Rise>
      <Rise index={1}>
        <Card style={styles.profile} testID="courier-profile">
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
      <Rise index={2}>
        <LevelCard />
      </Rise>
      {motor ? (
        <Rise index={3}>
          <Card onPress={() => to("/courier/account/documents")} style={styles.vehicle} testID="vehicle-card">
            <View style={styles.vehicleIcon}>
              <Icon color={COURIER.solid} name={courier.profile.vehicle === "car" ? "truck" : "navigation"} size={22} />
            </View>
            <View style={styles.flex}>
              <Text style={type.card}>{vehicleComplete(courier.profile.vehicleInfo) ? vehicleLabel(courier.profile) : "Add your vehicle details"}</Text>
              <Text style={type.caption}>{left === null ? "Add your licence and its expiry date" : left <= 0 ? "Your licence has expired" : `Licence valid for ${left} more ${left === 1 ? "day" : "days"}`}</Text>
            </View>
            <Pill label={left === null ? "Required" : left <= 0 ? "Expired" : left <= 30 ? "Expiring" : "Valid"} tone={left === null || left <= 0 ? "red" : left <= 30 ? "amber" : "green"} />
          </Card>
        </Rise>
      ) : null}
      <MenuRow detail={`${rand(balance)} available · cards and bank`} icon="credit-card" label="Wallet" onPress={() => to("/courier/account/wallet")} testID="row-wallet" />
      <MenuRow detail={verified ? "ID, selfie and licence verified" : "Checks in progress"} icon="file-text" label="Documents" onPress={() => to("/courier/account/documents")} testID="row-documents" />
      <MenuRow detail="Hours, breaks, zones and your vehicle" icon="map-pin" label="Availability and zones" onPress={() => to("/courier/account/availability")} testID="row-zones" />
      <MenuRow detail="Sound and vibration" icon="bell" label="Job alerts" onToggle={(on) => dispatch({ on, type: "courierSetJobAlerts" })} testID="row-alerts" toggle={courier.jobAlerts} />
      <MenuRow detail="Your score and how buyers rate you" icon="trending-up" label="Performance" onPress={() => to("/courier/account/performance")} testID="row-performance" />
      <MenuRow detail="Weekly and monthly, with your tips" icon="file-text" label="Statements" onPress={() => to("/courier/account/statements")} testID="row-statements" />
      <MenuRow detail="Every delivery you finished" icon="clock" label="History" onPress={() => to("/courier/account/history")} testID="row-history" />
      <MenuRow detail={unread > 0 ? `${unread} new` : "You are up to date"} icon="inbox" label="Notifications" onPress={() => to("/courier/home/notifications")} testID="row-notifications" />
      <Card style={styles.refer} testID="refer-card" tone="soft">
        <View style={styles.flex}>
          <Text style={type.card}>Invite a friend to deliver</Text>
          <Text style={type.caption}>
            Share your code {code}. Demo: sharing works, but rewards ({REFERRAL_REWARD_POINTS} points) are not tracked yet.
          </Text>
        </View>
        <View style={styles.referButton}>
          <Button icon="share-2" label="Share" onPress={() => void invite()} testID="refer-share" />
        </View>
      </Card>
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
  licence: { icon: "truck", sub: "Required for a car or scooter", title: "Driving licence" },
  selfie: { icon: "camera", sub: "Matches your ID photo", title: "Selfie check" },
};

/** Your documents: what was checked, what is still being checked, the licence's expiry date and the vehicle's details, and a way to send a new file. */
export function CourierDocumentsScreen() {
  const { courier, dispatch } = useCourier();
  const toast = useToast();
  const [replacing, setReplacing] = useState<CourierDocKind | null>(null);
  const motor = needsLicence(courier.profile.vehicle);
  const licence = courier.documents.find((doc) => doc.kind === "licence");
  const [expiry, setExpiry] = useState(isoToDate(licence?.expiresAt));
  const [info, setInfo] = useState(courier.profile.vehicleInfo);
  const [licenceNumber, setLicenceNumber] = useState(courier.profile.licenceNumber);
  const docs = courier.documents.filter((doc) => doc.kind !== "licence" || motor);
  const now = useNow(60_000);
  const left = daysLeft(licence?.expiresAt, now);
  const iso = dateToIso(expiry);
  const tone = (status: string): PillTone => (status === "verified" ? "green" : status === "in-review" || status === "uploaded" ? "amber" : status === "rejected" ? "red" : "grey");
  const label = (status: string) => (status === "verified" ? "Verified" : status === "in-review" ? "In review" : status === "uploaded" ? "Added" : status === "rejected" ? "Try again" : "Not added");
  const vehicleOk = vehicleComplete(info, courier.profile.vehicle);
  const licenceOk = validLicenceNumber(licenceNumber);
  const detailsChanged = JSON.stringify(info) !== JSON.stringify(courier.profile.vehicleInfo) || licenceNumber.toUpperCase().replace(/\s/g, "") !== courier.profile.licenceNumber;
  return (
    <CourierPage back subtitle="What Vossie Operations has checked" testID="courier-documents" title="Documents">
      {docs.map((doc, index) => {
        const doc_info = DOC_INFO[doc.kind];
        return (
          <Rise index={index} key={doc.kind}>
            <Card onPress={doc.kind === "background" ? undefined : () => setReplacing(doc.kind)} style={styles.doc} testID={`doc-${doc.kind}`}>
              <View style={styles.docIcon}>
                <Icon color={COURIER.solid} name={doc_info.icon} size={20} />
              </View>
              <View style={styles.flex}>
                <Text style={type.card}>{doc_info.title}</Text>
                <Text style={type.caption}>{doc.kind === "licence" && doc.expiresAt ? `${doc.fileName ?? doc_info.sub} · expires ${isoToDate(doc.expiresAt)}` : (doc.fileName ?? doc_info.sub)}</Text>
              </View>
              <Pill label={label(doc.status)} tone={tone(doc.status)} />
            </Card>
          </Rise>
        );
      })}
      {motor ? (
        <>
          <Heading>Licence</Heading>
          <Card style={styles.form} testID="licence-card" tone="soft">
            <Field error={expiry && !iso ? "Use the date as 25/12/2027" : undefined} icon="calendar" keyboardType="numbers-and-punctuation" label="Licence expiry date" onChangeText={(value) => { setExpiry(value); const parsed = dateToIso(value); if (parsed) dispatch({ expiresAt: parsed, type: "courierSetLicenceExpiry" }); }} placeholder="25/12/2027" testID="licence-expiry" value={expiry} />
            <Text style={[type.caption, left !== null && left <= 30 && { color: left <= 0 ? COURIER.red : COURIER.amber }]}>
              {left === null ? "Add the date so we can remind you before it runs out." : left <= 0 ? "This licence has expired. Send a new one to take offers again." : left <= 30 ? `Update your licence in ${left} ${left === 1 ? "day" : "days"}.` : `Valid for ${left} more days.`}
            </Text>
          </Card>
          <Heading>Vehicle</Heading>
          <Card style={styles.form} testID="vehicle-card-form">
            <VehicleForm info={info} onChange={setInfo} vehicle={courier.profile.vehicle} />
            <Field icon="credit-card" label="Driving licence number" onChangeText={setLicenceNumber} placeholder="As printed on your card" testID="licence-number" value={licenceNumber} />
            <Button disabled={!detailsChanged || !vehicleOk || !licenceOk} label="Save vehicle" onPress={() => { dispatch({ patch: { licenceNumber: licenceNumber.toUpperCase().replace(/\s/g, ""), vehicleInfo: { ...info, plate: normalisePlate(info.plate) ?? info.plate } }, type: "courierSetProfile" }); toast.show("Vehicle saved. Buyers see it on tracking."); }} testID="vehicle-save" />
          </Card>
        </>
      ) : null}
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

/** Performance: the score buyers give you and the three rates Vossie looks at. */
export function CourierPerformanceScreen() {
  const { courier } = useCourier();
  const stats = performance(courier);
  const recent = courier.jobs.filter((job) => job.rating !== undefined).sort((a, b) => (b.deliveredAt ?? "").localeCompare(a.deliveredAt ?? "")).slice(0, 5);
  const top = stats.rating !== null && stats.rating >= 4.7 && stats.deliveries >= 10;
  return (
    <CourierPage back subtitle="Your courier score" testID="courier-performance" title="Performance" tone="blue">
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
      <View style={styles.gapTop}>
        <LevelCard />
      </View>
      <Card style={styles.rates} tone="soft">
        <Rate label="Acceptance rate" value={stats.acceptance} />
        <Rate label="On-time delivery" value={stats.onTime} />
        <Rate label="Completion rate" value={stats.completion} />
      </Card>
      <Heading>Recent feedback</Heading>
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
  badge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 17, height: 34, justifyContent: "center", width: 34 },
  badgeOff: { backgroundColor: "rgba(255,255,255,0.08)" },
  badges: { flexDirection: "row", gap: 8, marginTop: 4 },
  cardGap: { alignItems: "center", marginBottom: 14 },
  form: { gap: 4, marginBottom: 6 },
  gapTop: { marginTop: 14 },
  level: { gap: 10, marginBottom: 12 },
  levelBadge: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  levelEarned: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "700" },
  levelFill: { backgroundColor: "#FFFFFF", borderRadius: 5, height: 9 },
  levelLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12 },
  levelName: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  levelNeed: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  levelTop: { alignItems: "center", flexDirection: "row", gap: 12 },
  levelTrack: { backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 5, height: 9, overflow: "hidden" },
  pair: { flexDirection: "row", gap: 10 },
  refer: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 12 },
  referButton: { minWidth: 110 },
  vehicle: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 12 },
  vehicleIcon: { alignItems: "center", backgroundColor: "#DDE8EC", borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
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
  scoreValue: { color: "#FFFFFF", fontSize: 40, fontWeight: "800" },
  section: { color: COURIER.ink, fontSize: 15, fontWeight: "700", marginBottom: 8, marginTop: 16 },
  sos: { alignItems: "center", backgroundColor: COURIER.redSoft, flexDirection: "row", gap: 12, marginBottom: 12 },
  sosButton: { backgroundColor: COURIER.red, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8 },
  sosButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  sosTitle: { color: COURIER.red, fontSize: 15, fontWeight: "800" },
  time: { color: COURIER.ink, fontSize: 12, fontWeight: "700" },
  track: { backgroundColor: "#D3DFE4", borderRadius: 5, height: 9, overflow: "hidden" },
  trackFill: { backgroundColor: COURIER.solid, borderRadius: 5, height: 9 },
});
