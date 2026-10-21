import { useRouter, type Href } from "expo-router";
import { useState, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text as RNText, View } from "react-native";

import { Icon, RadioRow, Sheet, type IconName } from "@/components";
import { daysLeft, needsLicence, parseExpiry, setupProblem } from "@/courier/state";
import type { CourierDocKind, CourierDocStatus, Vehicle, VehicleInfo } from "@/courier/types";
import { expiryProblem, normalisePlate, validLicenceNumber } from "@/courier/validate";
import { COLOURS, makesFor, modelsFor } from "@/courier/vehicles";
import { getCampusName, getCampuses } from "@/data/repository";
import type { CampusId } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { SellerField } from "@/screens/seller/fields";
import { AttachSheet } from "@/screens/seller/attach";
import { StepBar } from "@/screens/seller/motion";
import { SellerButton, SellerScreen, Text, useTone } from "@/screens/seller/ui";

import { AvailabilityEditor } from "./CourierScheduleScreens";
import { useCourier, useNow } from "./hooks";
import { Card, Chips, COURIER, Pill, Rise, type PillTone, type } from "./ui";

const VEHICLES: { key: Vehicle; label: string }[] = [
  { key: "walking", label: "Walking" },
  { key: "bicycle", label: "Bicycle" },
  { key: "scooter", label: "Scooter" },
  { key: "car", label: "Car" },
];

/** A South African mobile number: ten digits starting with 0, or +27 and nine digits. Spaces and dashes do not matter. */
export function validPhone(value: string): boolean {
  const digits = value.replace(/[\s-]/g, "");
  return /^0\d{9}$/.test(digits) || /^\+27\d{9}$/.test(digits);
}

/** "01/03/2027" or "1-3-2027" to "2027-03-01", or null when it is not a real date. */
export function dateToIso(value: string): string | null {
  const match = /^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{4})$/.exec(value.trim());
  if (!match) return null;
  const iso = `${match[3]}-${match[2]!.padStart(2, "0")}-${match[1]!.padStart(2, "0")}`;
  return parseExpiry(iso) ? iso : null;
}

/** "2027-03-01" to "01/03/2027". */
export function isoToDate(iso: string | undefined): string {
  const date = parseExpiry(iso);
  return date ? `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}` : "";
}

/** A text field, the seller's. */
export function Field({ error, icon, keyboardType, label, onChangeText, placeholder, testID, value }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; icon?: IconName; error?: string; testID: string; keyboardType?: "phone-pad" | "default" | "numbers-and-punctuation" | "number-pad"; autoCapitalize?: "words" | "none" | "characters" }) {
  return <SellerField error={error} icon={icon} keyboardType={keyboardType} label={label} onChangeText={onChangeText} placeholder={placeholder} testID={testID} value={value} />;
}

/** A field you tap to choose from a list: the same pressed-in box as a text field, with the choice in it and a chevron. */
export function PickerField({ disabled, error, icon, label, onPress, placeholder, testID, value }: { label: string; value: string; placeholder: string; onPress: () => void; icon?: IconName; error?: string; testID: string; disabled?: boolean }) {
  const look = useTone();
  return (
    <View style={styles.pickWrap}>
      <Text style={styles.pickLabel}>{label}</Text>
      <Pressable accessibilityLabel={`${label}, ${value || "not chosen"}`} accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress} style={[styles.pick, { backgroundColor: look.well, boxShadow: look.pressed }, error ? styles.pickError : null, disabled && { opacity: 0.5 }]} testID={testID}>
        {icon ? <Icon color={COURIER.inkSoft} name={icon} size={20} /> : null}
        <RNText style={[styles.pickText, !value && { color: "#8A99A1" }]}>{value || placeholder}</RNText>
        <Icon color={COURIER.muted} name="chevron-down" size={18} />
      </Pressable>
      {error ? <Text style={styles.pickErrorText}>{error}</Text> : null}
    </View>
  );
}

/** A sheet of choices, one tap to pick. */
export function OptionSheet({ onClose, onPick, options, selected, title, visible }: { visible: boolean; title: string; options: { value: string; sub?: string }[]; selected: string; onClose: () => void; onPick: (value: string) => void }) {
  return (
    <Sheet onClose={onClose} title={title} visible={visible}>
      {options.map((option) => (
        <RadioRow key={option.value} onPress={() => { onPick(option.value); onClose(); }} selected={option.value === selected} subtitle={option.sub} testID={`option-${option.value}`} title={option.value} />
      ))}
    </Sheet>
  );
}

/** The make, model, colour and number plate of a car or scooter, each chosen from a list or checked for its form. Used in setup and in Documents. */
export function VehicleForm({ errors, info, onChange, vehicle }: { vehicle: Vehicle; info: VehicleInfo; onChange: (info: VehicleInfo) => void; errors?: Partial<Record<keyof VehicleInfo, string>> }) {
  const [picking, setPicking] = useState<"make" | "model" | "colour" | null>(null);
  const makes = makesFor(vehicle);
  const models = modelsFor(vehicle, info.make);
  return (
    <View testID="vehicle-form">
      <View style={styles.pair}>
        <View style={styles.flex}>
          <PickerField error={errors?.make} label="Make" onPress={() => setPicking("make")} placeholder="Choose" testID="vehicle-make" value={info.make} />
        </View>
        <View style={styles.flex}>
          <PickerField disabled={!info.make} error={errors?.model} label="Model" onPress={() => setPicking("model")} placeholder={info.make ? "Choose" : "Pick a make"} testID="vehicle-model" value={info.model} />
        </View>
      </View>
      <View style={styles.pair}>
        <View style={styles.flex}>
          <PickerField error={errors?.colour} label="Colour" onPress={() => setPicking("colour")} placeholder="Choose" testID="vehicle-colour" value={info.colour} />
        </View>
        <View style={styles.flex}>
          <SellerField error={errors?.plate} label="Number plate" onChangeText={(plate) => onChange({ ...info, plate })} placeholder="CA 123-456" testID="vehicle-plate" value={info.plate} />
        </View>
      </View>
      {info.plate && normalisePlate(info.plate) && normalisePlate(info.plate) !== info.plate ? <Text style={styles.plateHint}>Saved as {normalisePlate(info.plate)}</Text> : null}
      <OptionSheet onClose={() => setPicking(null)} onPick={(make) => onChange({ ...info, make, model: modelsFor(vehicle, make).includes(info.model) ? info.model : "" })} options={makes.map((value) => ({ value }))} selected={info.make} title="Make" visible={picking === "make"} />
      <OptionSheet onClose={() => setPicking(null)} onPick={(model) => onChange({ ...info, model })} options={models.map((value) => ({ value }))} selected={info.model} title={`${info.make} models`} visible={picking === "model"} />
      <OptionSheet onClose={() => setPicking(null)} onPick={(colour) => onChange({ ...info, colour })} options={COLOURS.map((value) => ({ value }))} selected={info.colour} title="Colour" visible={picking === "colour"} />
    </View>
  );
}

/** A setup page: the seller's blue page with the three-step bar, the title and its line, then the form, and the button pinned below. */
export function SetupPage({ children, footer, step, subtitle, title, testID }: { step: 1 | 2 | 3; title: string; subtitle: string; children: ReactNode; footer: ReactNode; testID: string }) {
  return (
    <SellerScreen footer={footer} tabs={false} testID={testID}>
      <View style={styles.top}>
        <StepBar step={step} />
        <Text style={styles.step}>Step {step} of 3</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {children}
    </SellerScreen>
  );
}

/** Step 1: who you are, which campus, how you will deliver and, for a car or scooter, what it is and the licence number. */
export function CourierDetailsScreen() {
  const router = useRouter();
  const { courier, dispatch, state } = useCourier();
  const [name, setName] = useState(courier.profile.fullName || state.profile?.fullName || "");
  const [phone, setPhone] = useState(courier.profile.phone || state.profile?.phone || "");
  const [campus, setCampus] = useState<CampusId>(courier.profile.campusId || state.profile?.campusId || "potchefstroom");
  const [vehicle, setVehicle] = useState<Vehicle>(courier.profile.vehicle);
  const [info, setInfo] = useState(courier.profile.vehicleInfo);
  const [licenceNumber, setLicenceNumber] = useState(courier.profile.licenceNumber);
  const [campusOpen, setCampusOpen] = useState(false);
  const [tried, setTried] = useState(false);
  const motor = needsLicence(vehicle);
  const plate = normalisePlate(info.plate);
  const errors = {
    colour: motor && !COLOURS.includes(info.colour as (typeof COLOURS)[number]) ? "Choose a colour" : undefined,
    licence: motor && !validLicenceNumber(licenceNumber) ? "Enter the licence number as printed on your card (10 to 13 letters and digits)" : undefined,
    make: motor && !makesFor(vehicle).includes(info.make) ? "Choose a make" : undefined,
    model: motor && !modelsFor(vehicle, info.make).includes(info.model) ? "Choose a model" : undefined,
    name: name.trim().length < 2 ? "Enter your full name" : undefined,
    phone: !validPhone(phone) ? "Enter a South African mobile number, like 082 573 5164" : undefined,
    plate: motor && !plate ? "Use a South African plate, like CA 123-456 or ABC 123 GP" : undefined,
  };
  const bad = Object.values(errors).some(Boolean);

  const next = () => {
    setTried(true);
    if (bad) {
      haptic.error();
      return;
    }
    dispatch({ type: "courierStart" });
    dispatch({ patch: { campusId: campus, fullName: name.trim(), licenceNumber: licenceNumber.toUpperCase().replace(/\s/g, ""), phone: phone.trim(), vehicle, vehicleInfo: motor ? { ...info, plate: plate! } : info }, type: "courierSetProfile" });
    router.push("/courier-setup/verify" as Href);
  };

  return (
    <SetupPage footer={<SellerButton label="Continue" onPress={next} size="lg" testID="courier-continue" variant="light" />} step={1} subtitle="Earn by delivering on campus" testID="courier-details" title="Become a courier">
      <SellerField error={tried ? errors.name : undefined} label="Full name" onChangeText={setName} placeholder="Name" testID="courier-name" value={name} />
      <SellerField error={tried ? errors.phone : undefined} icon="phone" keyboardType="phone-pad" label="Phone number" onChangeText={setPhone} placeholder="087 983 9342" testID="courier-phone" value={phone} />
      <PickerField icon="map-pin" label="Campus" onPress={() => setCampusOpen(true)} placeholder="Choose" testID="courier-campus" value={getCampusName(campus)} />
      <Text style={styles.pickLabel}>How will you deliver?</Text>
      <Chips chips={VEHICLES} onChange={setVehicle} value={vehicle} />
      {motor ? (
        <Rise>
          <Card style={styles.vehicleCard} testID="vehicle-details">
            <RNText style={type.card}>Your {vehicle === "car" ? "car" : "scooter"}</RNText>
            <RNText style={type.caption}>Pick it from the lists. The buyer sees the make, colour and number plate so they know what is arriving.</RNText>
            <VehicleForm errors={tried ? errors : undefined} info={info} onChange={setInfo} vehicle={vehicle} />
            <SellerField error={tried ? errors.licence : undefined} icon="credit-card" label="Driving licence number" onChangeText={setLicenceNumber} placeholder="As printed on your card" testID="licence-number" value={licenceNumber} />
          </Card>
        </Rise>
      ) : null}
      <OptionSheet onClose={() => setCampusOpen(false)} onPick={(label) => setCampus(getCampuses().find((item) => item.name === label)?.id ?? campus)} options={getCampuses().map((item) => ({ sub: item.region, value: item.name }))} selected={getCampusName(campus)} title="Your campus" visible={campusOpen} />
    </SetupPage>
  );
}

function docLook(status: CourierDocStatus, kind: CourierDocKind): { label: string; tone: PillTone } {
  if (kind === "background") return status === "verified" ? { label: "Verified", tone: "green" } : status === "in-review" ? { label: "In review", tone: "amber" } : { label: "After you submit", tone: "grey" };
  if (status === "verified") return { label: "Verified", tone: "green" };
  if (status === "in-review") return { label: "In review", tone: "amber" };
  if (status === "uploaded") return { label: "Added", tone: "blue" };
  if (status === "rejected") return { label: "Try again", tone: "red" };
  return { label: "Required", tone: "red" };
}

export const CHECK_INFO: Record<CourierDocKind, { icon: IconName; title: string; sub: string }> = {
  background: { icon: "shield", sub: "Run by Vossie Operations", title: "Background check" },
  id: { icon: "file-text", sub: "South African ID or passport", title: "ID document" },
  licence: { icon: "truck", sub: "Required for a car or scooter", title: "Driving licence" },
  selfie: { icon: "camera", sub: "Match your ID photo", title: "Selfie check" },
};

/** Step 2: the ID, the selfie, the driving licence with its expiry date for a car or scooter, and the check Vossie Operations runs. */
export function CourierVerifyScreen() {
  const router = useRouter();
  const { courier, dispatch } = useCourier();
  const now = useNow(60_000);
  const [adding, setAdding] = useState<CourierDocKind | null>(null);
  const [expiry, setExpiry] = useState(isoToDate(courier.documents.find((doc) => doc.kind === "licence")?.expiresAt));
  const [tried, setTried] = useState(false);
  const doc = (kind: CourierDocKind) => courier.documents.find((item) => item.kind === kind)!;
  const motor = needsLicence(courier.profile.vehicle);
  const checks = (["id", "selfie", "licence", "background"] as CourierDocKind[]).filter((kind) => kind !== "licence" || motor);
  const needed = checks.length;
  const done = checks.filter((kind) => ["uploaded", "verified", "in-review"].includes(doc(kind).status) && kind !== "background").length;
  const iso = dateToIso(expiry);
  const left = iso ? daysLeft(iso, now) : null;
  const dateProblem = iso ? expiryProblem(iso, now) : null;
  const expiryError = !motor ? undefined : expiry.trim() === "" ? "Enter the date your licence expires" : !iso ? "Use the date as 25/12/2027" : dateProblem === "past" ? "That licence has already expired" : dateProblem === "far" ? "A licence lasts five years, so that date is too far away" : undefined;
  const problem = doc("id").status === "missing" || doc("selfie").status === "missing" ? "Add your ID and a selfie to go on." : motor && doc("licence").status === "missing" ? "Add your driving licence to go on." : (expiryError ?? setupProblem(courier, now));
  const ready = problem === null;

  const setExpiryText = (value: string) => {
    setExpiry(value);
    const parsed = dateToIso(value);
    if (parsed) dispatch({ expiresAt: parsed, type: "courierSetLicenceExpiry" });
  };

  const submit = () => {
    setTried(true);
    if (!ready) {
      haptic.error();
      return;
    }
    dispatch({ type: "courierSubmitVerification" });
    router.push("/courier-setup/availability" as Href);
  };

  return (
    <SetupPage footer={<SellerButton label="Submit for review" onPress={submit} size="lg" testID="courier-submit" variant="light" />} step={2} subtitle={motor ? "Your licence is needed before your first job" : "Required before your first job"} testID="courier-verify" title="Verify your identity">
      <Card style={styles.status} tone="selected">
        <View style={styles.statusIcon}>
          <Icon color={COURIER.solid} name="shield" size={22} />
        </View>
        <View style={styles.flex}>
          <RNText style={type.card}>Verification status</RNText>
          <RNText style={type.caption}>
            {Math.min(done, needed - 1)} of {needed} checks complete
          </RNText>
        </View>
        <Pill label={courier.status === "pending" ? "In review" : "Pending"} tone="amber" />
      </Card>
      {checks.map((kind, index) => {
        const current = doc(kind);
        const look = docLook(current.status, kind);
        const info = CHECK_INFO[kind];
        return (
          <Rise index={index} key={kind}>
            <Card onPress={kind === "background" ? undefined : () => setAdding(kind)} style={styles.check} testID={`check-${kind}`}>
              <View style={styles.checkIcon}>{current.uri && kind !== "background" ? <Image source={{ uri: current.uri }} style={styles.thumb} /> : <Icon color={COURIER.solid} name={info.icon} size={22} />}</View>
              <View style={styles.flex}>
                <RNText style={type.card}>{info.title}</RNText>
                <RNText style={type.caption}>{current.fileName ?? info.sub}</RNText>
              </View>
              <Pill label={look.label} tone={look.tone} />
            </Card>
          </Rise>
        );
      })}
      {motor ? (
        <Rise index={5}>
          <View testID="licence-expiry-card">
            <SellerField error={tried || expiry ? expiryError : undefined} icon="calendar" keyboardType="numbers-and-punctuation" label="Licence expiry date" onChangeText={setExpiryText} placeholder="25/12/2027" testID="licence-expiry" value={expiry} />
            <Text style={styles.hint}>{left !== null && left > 0 && !dateProblem ? `Valid for ${left} more ${left === 1 ? "day" : "days"}. We remind you before it runs out.` : "We remind you before it runs out, so you are never stopped by surprise."}</Text>
          </View>
        </Rise>
      ) : null}
      {tried && !ready ? <Text style={styles.error}>{problem}</Text> : null}
      <AttachSheet
        onClose={() => setAdding(null)}
        onPicked={(file) => {
          if (adding) dispatch({ fileName: file.name, kind: adding, type: "courierUploadDocument", uri: file.uri });
          setAdding(null);
        }}
        sources={adding === "selfie" ? ["camera", "library"] : ["library", "camera", "files"]}
        title={adding === "selfie" ? "Take a selfie" : adding === "licence" ? "Add your driving licence" : "Add your document"}
        visible={adding !== null}
      />
    </SetupPage>
  );
}

/** Step 3: when and where to deliver, while the documents are being checked. */
export function CourierAvailabilityStepScreen() {
  const router = useRouter();
  return (
    <SetupPage footer={<SellerButton label="Finish" onPress={() => router.replace("/courier/home" as Href)} size="lg" testID="courier-finish" variant="light" />} step={3} subtitle="Choose when and where you deliver" testID="courier-availability-step" title="Availability">
      <AvailabilityEditor setup />
    </SetupPage>
  );
}

const styles = StyleSheet.create({
  check: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 12 },
  checkIcon: { alignItems: "center", backgroundColor: "#DDE8EC", borderRadius: 14, height: 44, justifyContent: "center", overflow: "hidden", width: 44 },
  error: { color: "#FFD8D2", fontSize: 13, fontWeight: "700", marginTop: 6 },
  flex: { flex: 1 },
  hint: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: -4 },
  pair: { flexDirection: "row", gap: 10 },
  pick: { alignItems: "center", borderRadius: 18, flexDirection: "row", gap: 10, minHeight: 52, paddingHorizontal: 14 },
  pickError: { borderColor: "#B4544A", borderWidth: 1.5 },
  pickErrorText: { color: "#FFD8D2", fontSize: 12, marginTop: 4 },
  pickLabel: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", marginBottom: 6 },
  pickText: { color: COURIER.ink, flex: 1, fontSize: 15 },
  pickWrap: { marginBottom: 12 },
  plateHint: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginBottom: 8, marginTop: -6 },
  status: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 12 },
  statusIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  step: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "700" },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  thumb: { height: 44, width: 44 },
  title: { color: "#FFFFFF", fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  top: { gap: 6, marginBottom: 14, marginTop: 6 },
  vehicleCard: { gap: 8, marginBottom: 12, marginTop: 8 },
});

