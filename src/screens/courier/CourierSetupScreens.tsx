import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon, RadioRow, Sheet, Wordmark, type IconName } from "@/components";
import { WEEKDAYS, type CourierDocKind, type CourierDocStatus, type Vehicle, type Weekday } from "@/courier/types";
import { getCampusName, getCampuses } from "@/data/repository";
import type { CampusId } from "@/data/types";
import { haptic } from "@/lib/haptics";

import { AttachSheet } from "@/screens/seller/attach";

import { useCourier } from "./hooks";
import { Button, COURIER, Card, Pill, Rise, Toggle, type PillTone, type } from "./ui";

const VEHICLES: { key: Vehicle; label: string }[] = [
  { key: "walking", label: "Walking" },
  { key: "bicycle", label: "Bicycle" },
  { key: "scooter", label: "Scooter" },
  { key: "car", label: "Car" },
];

const DAY_LABEL: Record<Weekday, string> = { fri: "Fri", mon: "Mon", sat: "Sat", sun: "Sun", thu: "Thu", tue: "Tue", wed: "Wed" };

/** A South African mobile number: ten digits starting with 0, or +27 and nine digits. Spaces and dashes do not matter. */
export function validPhone(value: string): boolean {
  const digits = value.replace(/[\s-]/g, "");
  return /^0\d{9}$/.test(digits) || /^\+27\d{9}$/.test(digits);
}

/** A time written as 08:00 or 8:00, between 00:00 and 23:59. */
export function validTime(value: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

/** A white setup page: the Vossie mark, the three-step bar and its title. */
function SetupPage({ children, footer, step, subtitle, title, testID }: { step: 1 | 2 | 3; title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode; testID: string }) {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.page} testID={testID}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Wordmark tone="brand" width={150} />
        <Steps step={step} />
        <Text accessibilityRole="header" style={[type.title, styles.setupTitle]}>
          {title}
        </Text>
        <Text style={type.caption}>{subtitle}</Text>
        <View style={styles.body}>{children}</View>
      </ScrollView>
      <View style={styles.footer}>{footer}</View>
    </SafeAreaView>
  );
}

/** "Step 2 of 3" with three bars that fill as you go. */
function Steps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <View style={styles.steps} testID="courier-steps">
      <View style={styles.bars}>
        {[1, 2, 3].map((n) => (
          <Bar done={n <= step} key={n} />
        ))}
      </View>
      <Text style={type.caption}>Step {step} of 3</Text>
    </View>
  );
}

function Bar({ done }: { done: boolean }) {
  const reduced = useReducedMotion();
  const fill = useSharedValue(reduced ? (done ? 1 : 0) : 0);
  useEffect(() => {
    fill.set(withTiming(done ? 1 : 0, { duration: 500 }));
  }, [done, fill]);
  const style = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  return (
    <View style={styles.bar}>
      <Animated.View style={[styles.barFill, style]} />
    </View>
  );
}

function Field({ error, icon, label, onChangeText, placeholder, testID, value, keyboardType, autoCapitalize }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; icon?: IconName; error?: string; testID: string; keyboardType?: "phone-pad" | "default"; autoCapitalize?: "words" | "none" }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.input, error ? styles.inputError : null]}>
        {icon ? <Icon color={COURIER.inkSoft} name={icon} size={20} /> : null}
        <TextInput accessibilityLabel={label} autoCapitalize={autoCapitalize ?? "words"} keyboardType={keyboardType} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={COURIER.muted} style={styles.inputText} testID={testID} value={value} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** Step 1: who you are, which campus, and how you will deliver. */
export function CourierDetailsScreen() {
  const router = useRouter();
  const { courier, dispatch, state } = useCourier();
  const [name, setName] = useState(courier.profile.fullName || state.profile?.fullName || "");
  const [phone, setPhone] = useState(courier.profile.phone || state.profile?.phone || "");
  const [campus, setCampus] = useState<CampusId>(courier.profile.campusId || state.profile?.campusId || "potchefstroom");
  const [vehicle, setVehicle] = useState<Vehicle>(courier.profile.vehicle);
  const [campusOpen, setCampusOpen] = useState(false);
  const [tried, setTried] = useState(false);
  const nameError = name.trim().length < 2 ? "Enter your full name" : undefined;
  const phoneError = !validPhone(phone) ? "Enter a South African mobile number, like 082 573 5164" : undefined;

  const next = () => {
    setTried(true);
    if (nameError || phoneError) {
      haptic.error();
      return;
    }
    dispatch({ type: "courierStart" });
    dispatch({ patch: { campusId: campus, fullName: name.trim(), phone: phone.trim(), vehicle }, type: "courierSetProfile" });
    router.push("/courier-setup/verify" as Href);
  };

  return (
    <SetupPage footer={<Button label="Continue" onPress={next} testID="courier-continue" />} step={1} subtitle="Earn by delivering on campus" testID="courier-details" title="Become a courier">
      <Field error={tried ? nameError : undefined} label="Full name" onChangeText={setName} placeholder="Name" testID="courier-name" value={name} />
      <Field error={tried ? phoneError : undefined} icon="phone" keyboardType="phone-pad" label="Phone number" onChangeText={setPhone} placeholder="087 983 9342" testID="courier-phone" value={phone} />
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Campus</Text>
        <Pressable accessibilityLabel={`Campus, ${getCampusName(campus)}`} accessibilityRole="button" onPress={() => setCampusOpen(true)} style={styles.input} testID="courier-campus">
          <Icon color={COURIER.inkSoft} name="map-pin" size={20} />
          <Text style={[styles.inputText, styles.flex]}>{getCampusName(campus)}</Text>
          <Icon color={COURIER.muted} name="chevron-down" size={18} />
        </Pressable>
      </View>
      <Text style={styles.fieldLabel}>How will you deliver?</Text>
      <View style={styles.vehicles}>
        {VEHICLES.map((item) => {
          const on = item.key === vehicle;
          return (
            <Pressable accessibilityLabel={item.label} accessibilityRole="radio" accessibilityState={{ checked: on }} key={item.key} onPress={() => { haptic.tap(); setVehicle(item.key); }} style={[styles.vehicle, on && styles.vehicleOn]} testID={`vehicle-${item.key}`}>
              <Text style={[styles.vehicleText, on && styles.vehicleTextOn]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Card style={styles.note} tone="soft">
        <Text style={type.body}>Earn per delivery plus tips, paid out weekly</Text>
      </Card>
      <Sheet onClose={() => setCampusOpen(false)} title="Your campus" visible={campusOpen}>
        {getCampuses().map((item) => (
          <RadioRow key={item.id} onPress={() => { setCampus(item.id); setCampusOpen(false); }} selected={item.id === campus} subtitle={item.region} title={item.name} />
        ))}
      </Sheet>
    </SetupPage>
  );
}

const CHECKS: { kind: CourierDocKind; icon: IconName; title: string; sub: string; optional?: boolean }[] = [
  { icon: "file-text", kind: "id", sub: "South African ID or passport", title: "ID document" },
  { icon: "camera", kind: "selfie", sub: "Match your ID photo", title: "Selfie check" },
  { icon: "truck", kind: "vehicle", optional: true, sub: "Only if using a bike or car", title: "Vehicle or licence" },
  { icon: "shield", kind: "background", sub: "Run by Vossie Operations", title: "Background check" },
];

function docLabel(status: CourierDocStatus, kind: CourierDocKind, optional?: boolean): { label: string; tone: PillTone } {
  if (kind === "background") return status === "verified" ? { label: "Verified", tone: "green" } : status === "in-review" ? { label: "In review", tone: "amber" } : { label: "After you submit", tone: "grey" };
  if (status === "verified") return { label: "Verified", tone: "green" };
  if (status === "in-review") return { label: "In review", tone: "amber" };
  if (status === "uploaded") return { label: "Added", tone: "blue" };
  if (status === "rejected") return { label: "Try again", tone: "red" };
  return optional ? { label: "Optional", tone: "grey" } : { label: "Required", tone: "red" };
}

/** Step 2: the ID, the selfie, an optional vehicle document, and the check Vossie Operations runs. */
export function CourierVerifyScreen() {
  const router = useRouter();
  const { courier, dispatch } = useCourier();
  const [adding, setAdding] = useState<CourierDocKind | null>(null);
  const doc = (kind: CourierDocKind) => courier.documents.find((item) => item.kind === kind)!;
  const done = courier.documents.filter((item) => item.status === "uploaded" || item.status === "verified" || item.status === "in-review").length;
  const needed = courier.profile.vehicle === "walking" ? 3 : 4;
  const ready = doc("id").status !== "missing" && doc("selfie").status !== "missing";
  const checks = CHECKS.filter((check) => check.kind !== "vehicle" || courier.profile.vehicle !== "walking");

  const submit = () => {
    dispatch({ type: "courierSubmitVerification" });
    router.push("/courier-setup/availability" as Href);
  };

  return (
    <SetupPage footer={<Button disabled={!ready} label="Submit for review" onPress={submit} testID="courier-submit" />} step={2} subtitle="Required before your first job" testID="courier-verify" title="Verify your identity">
      <Card style={styles.status} tone="selected">
        <View style={styles.statusIcon}>
          <Icon color={COURIER.solid} name="shield" size={22} />
        </View>
        <View style={styles.flex}>
          <Text style={type.card}>Verification status</Text>
          <Text style={type.caption}>{Math.min(done, needed)} of {needed} checks complete</Text>
        </View>
        <Pill label={courier.status === "pending" ? "In review" : "Pending"} tone="amber" />
      </Card>
      {checks.map((check, index) => {
        const current = doc(check.kind);
        const look = docLabel(current.status, check.kind, check.optional);
        const tappable = check.kind !== "background";
        return (
          <Rise index={index} key={check.kind}>
            <Card onPress={tappable ? () => setAdding(check.kind) : undefined} style={styles.check} testID={`check-${check.kind}`}>
              <View style={styles.checkIcon}>
                <Icon color={COURIER.solid} name={check.icon} size={22} />
              </View>
              <View style={styles.flex}>
                <Text style={type.card}>{check.title}</Text>
                <Text style={type.caption}>{current.fileName ?? check.sub}</Text>
              </View>
              <Pill label={look.label} tone={look.tone} />
            </Card>
          </Rise>
        );
      })}
      <AttachSheet
        onClose={() => setAdding(null)}
        onPicked={(file) => {
          if (adding) dispatch({ fileName: file.name, kind: adding, type: "courierUploadDocument", uri: file.uri });
          setAdding(null);
        }}
        sources={adding === "selfie" ? ["camera", "library"] : ["library", "camera", "files"]}
        title={adding === "selfie" ? "Take a selfie" : "Add your document"}
        visible={adding !== null}
      />
    </SetupPage>
  );
}

/** Working days, hours and zones. Used as step 3 and again from Account. */
export function AvailabilityForm({ onVehicle }: { onVehicle?: boolean }) {
  const { courier, dispatch } = useCourier();
  const [from, setFrom] = useState(courier.hours.from);
  const [to, setTo] = useState(courier.hours.to);
  return (
    <View testID="availability-form">
      <Text style={styles.sectionLabel}>Working days</Text>
      <View style={styles.days}>
        {WEEKDAYS.map((day) => {
          const on = courier.hours.days.includes(day);
          return (
            <Pressable accessibilityLabel={DAY_LABEL[day]} accessibilityRole="checkbox" accessibilityState={{ checked: on }} key={day} onPress={() => { haptic.tap(); dispatch({ day, type: "courierToggleDay" }); }} style={[styles.day, on && styles.dayOn]} testID={`day-${day}`}>
              <Text style={[styles.dayText, on && styles.dayTextOn]}>{DAY_LABEL[day]}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.times}>
        <View style={styles.flex}>
          <Text style={styles.fieldLabel}>From</Text>
          <View style={styles.input}>
            <TextInput accessibilityLabel="From" keyboardType="numbers-and-punctuation" onBlur={() => validTime(from) && dispatch({ patch: { from: from.trim().padStart(5, "0") }, type: "courierSetHours" })} onChangeText={setFrom} placeholder="08:00" placeholderTextColor={COURIER.muted} style={styles.inputText} testID="hours-from" value={from} />
          </View>
        </View>
        <View style={styles.flex}>
          <Text style={styles.fieldLabel}>To</Text>
          <View style={styles.input}>
            <TextInput accessibilityLabel="To" keyboardType="numbers-and-punctuation" onBlur={() => validTime(to) && dispatch({ patch: { to: to.trim().padStart(5, "0") }, type: "courierSetHours" })} onChangeText={setTo} placeholder="17:00" placeholderTextColor={COURIER.muted} style={styles.inputText} testID="hours-to" value={to} />
          </View>
        </View>
      </View>
      {!validTime(from) || !validTime(to) ? <Text style={styles.error}>Use the 24 hour clock, like 08:00 or 17:30</Text> : null}
      <Text style={styles.sectionLabel}>Delivery zones</Text>
      {courier.zones.map((zone) => (
        <Card key={zone.id} style={styles.zone}>
          <View style={styles.checkIcon}>
            <Icon color={COURIER.solid} name="map-pin" size={20} />
          </View>
          <Text style={[type.card, styles.flex]}>{zone.name}</Text>
          <Toggle label={zone.name} on={zone.on} onChange={() => dispatch({ id: zone.id, type: "courierToggleZone" })} testID={`zone-${zone.id}`} />
        </Card>
      ))}
      {onVehicle ? (
        <>
          <Text style={styles.sectionLabel}>How you deliver</Text>
          <View style={styles.vehicles}>
            {VEHICLES.map((item) => {
              const on = item.key === courier.profile.vehicle;
              return (
                <Pressable accessibilityLabel={item.label} accessibilityRole="radio" accessibilityState={{ checked: on }} key={item.key} onPress={() => { haptic.tap(); dispatch({ patch: { vehicle: item.key }, type: "courierSetProfile" }); }} style={[styles.vehicle, on && styles.vehicleOn]} testID={`vehicle-${item.key}`}>
                  <Text style={[styles.vehicleText, on && styles.vehicleTextOn]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

/** Step 3: when and where to deliver, while the documents are being checked. */
export function CourierAvailabilityStepScreen() {
  const router = useRouter();
  return (
    <SetupPage footer={<Button label="Finish" onPress={() => router.replace("/courier/home" as Href)} testID="courier-finish" />} step={3} subtitle="Choose when you deliver" testID="courier-availability-step" title="Availability">
      <AvailabilityForm />
    </SetupPage>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: "#D8E2E6", borderRadius: 3, flex: 1, height: 6, overflow: "hidden" },
  barFill: { backgroundColor: COURIER.solid, borderRadius: 3, height: 6 },
  bars: { flexDirection: "row", gap: 8 },
  body: { gap: 4, marginTop: 14 },
  check: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 10 },
  checkIcon: { alignItems: "center", backgroundColor: "#E3EDF0", borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  day: { alignItems: "center", backgroundColor: COURIER.card, borderRadius: 16, height: 32, justifyContent: "center", paddingHorizontal: 10 },
  dayOn: { backgroundColor: COURIER.solid },
  dayText: { color: COURIER.ink, fontSize: 12, fontWeight: "600" },
  dayTextOn: { color: "#FFFFFF" },
  days: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  error: { color: COURIER.red, fontSize: 12, marginTop: 4 },
  field: { marginBottom: 12 },
  fieldLabel: { color: COURIER.ink, fontSize: 14, fontWeight: "700", marginBottom: 6 },
  flex: { flex: 1 },
  footer: { paddingBottom: 12, paddingHorizontal: 18, paddingTop: 6 },
  input: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: COURIER.border, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 52, paddingHorizontal: 14 },
  inputError: { borderColor: COURIER.red },
  inputText: { color: COURIER.ink, flex: 1, fontSize: 15, paddingVertical: 12 },
  note: { marginTop: 8 },
  page: { backgroundColor: "#FFFFFF", flex: 1 },
  scroll: { gap: 4, padding: 18, paddingBottom: 30 },
  sectionLabel: { color: COURIER.ink, fontSize: 15, fontWeight: "700", marginBottom: 8, marginTop: 14 },
  setupTitle: { marginTop: 14 },
  status: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 12 },
  statusIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  steps: { gap: 6, marginTop: 16 },
  times: { flexDirection: "row", gap: 12 },
  vehicle: { alignItems: "center", backgroundColor: "#DCE3E6", borderRadius: 16, height: 32, justifyContent: "center", paddingHorizontal: 12 },
  vehicleOn: { backgroundColor: COURIER.solid },
  vehicleText: { color: COURIER.ink, fontSize: 12, fontWeight: "600" },
  vehicleTextOn: { color: "#FFFFFF" },
  vehicles: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  zone: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 10 },
});
