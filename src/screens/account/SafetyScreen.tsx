import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Linking, Share, StyleSheet, Switch, Text, View } from "react-native";

import {
  AppHeader,
  Button,
  Card,
  Chip,
  Icon,
  ProgressRing,
  RadioRow,
  Screen,
  SegmentedTabs,
  Sheet,
  StatusBadge,
  TextField,
  useToast,
} from "@/components";
import { campusPlaces } from "@/data/geo";
import { dateAndTime } from "@/data/format";
import {
  dialable,
  emergencyNumbers,
  reportCategories,
  safetyCheckup,
  tripMessage,
  validContact,
  type ReportCategory,
} from "@/data/safety";
import { isActive } from "@/screens/activity/orderStatus";
import { trackingLink } from "@/screens/activity/TrackOrderScreen";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

type Tab = "checkup" | "contacts" | "trip" | "report";

/** Safety: a check-up with a score, trusted contacts and emergency numbers, sharing a trip, and reporting a problem. */
export function SafetyScreen() {
  const router = useRouter();
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const [tab, setTab] = useState<Tab>("checkup");
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [contactErrors, setContactErrors] = useState<{ name?: string; phone?: string }>({});
  const [category, setCategory] = useState<ReportCategory>("Safety incident");
  const [notes, setNotes] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [shareWith, setShareWith] = useState<string | null>(null);

  const others = state.loginEvents.filter((event) => !event.current).length;
  const check = safetyCheckup({
    biometric: state.settings.biometric,
    campusSecurityNumber: state.campusSecurityNumber,
    contacts: state.emergencyContacts.length,
    otherSessions: others,
    twoFactor: state.twoFactor,
  });
  const campusId = state.profile?.campusId ?? "potchefstroom";
  const tracked = state.orders.filter((order) => isActive(order) && order.fulfilment === "delivery");

  const call = (number: string) => {
    const dial = dialable(number);
    if (!dial) return;
    void Linking.openURL(`tel:${dial}`).catch(() => toast.show("Couldn't open the phone app"));
  };

  const fix = (id: (typeof check.items)[number]["id"]) => {
    if (id === "two-factor") dispatch({ enabled: true, type: "setTwoFactor" });
    else if (id === "biometric") dispatch({ key: "biometric", type: "setSetting", value: true });
    else if (id === "contact") {
      setTab("contacts");
      setAddOpen(true);
    } else if (id === "sessions") {
      dispatch({ type: "signOutOtherSessions" });
      toast.show("Other sessions signed out");
    } else setTab("contacts");
  };

  const addContact = () => {
    const problems = validContact({ name, phone });
    setContactErrors(problems);
    if (problems.name || problems.phone) return;
    dispatch({ name, phone, relationship, type: "addEmergencyContact" });
    setAddOpen(false);
    setName("");
    setPhone("");
    setRelationship("");
    toast.show("Trusted contact added");
  };

  const share = async (message: string) => {
    try {
      await Share.share({ message });
    } catch {
      toast.show("Sharing isn't available here");
    }
  };

  const submitReport = () => {
    if (notes.trim().length < 5) {
      setReportError("Tell us a little about what happened.");
      return;
    }
    dispatch({ category, notes, type: "submitSafetyReport" });
    setNotes("");
    setReportError(null);
    toast.show("Report sent. Thank you");
  };

  return (
    <Screen testID="safety-screen">
      <AppHeader back subtitle="Keep yourself and your orders safe." title="Safety" />
      <Card onPress={() => call("10111")} style={styles.sos} testID="sos" variant="soft">
        <Icon color={color.danger} name="phone-call" size={20} />
        <View style={styles.flex}>
          <Text style={text.cardTitle}>In danger? Call 10111 now</Text>
          <Text style={text.caption}>Tap to call the police. Ambulance 10177, or 112 from a mobile.</Text>
        </View>
      </Card>

      <View style={styles.tabs}>
        <SegmentedTabs
          onChange={setTab}
          options={[
            { key: "checkup", label: "Check-up" },
            { key: "contacts", label: "Contacts" },
            { key: "trip", label: "Share trip" },
            { key: "report", label: "Report" },
          ]}
          value={tab}
        />
      </View>

      {tab === "checkup" ? (
        <View testID="tab-checkup">
          <View style={styles.ringWrap}>
            <ProgressRing accessibilityLabel={`Safety score ${check.score} of ${check.total}`} progress={check.score / check.total} tint={check.score === check.total ? color.success : color.primary}>
              <Text style={styles.score}>
                {check.score}/{check.total}
              </Text>
              <Text style={text.caption}>{check.score === check.total ? "All set" : "to do"}</Text>
            </ProgressRing>
          </View>
          <View style={styles.list}>
            {check.items.map((item) => (
              <Card key={item.id} style={styles.item} testID={`check-${item.id}`} variant="soft">
                <View style={[styles.dot, item.done && styles.dotDone]}>
                  <Icon color={item.done ? color.onPrimary : color.warning} name={item.done ? "check" : "alert-triangle"} size={14} />
                </View>
                <View style={styles.flex}>
                  <Text style={text.cardTitle}>{item.title}</Text>
                  <Text style={text.caption}>{item.detail}</Text>
                </View>
                {item.done ? null : <Button label="Fix" onPress={() => fix(item.id)} size="sm" testID={`fix-${item.id}`} />}
              </Card>
            ))}
          </View>
          <Card onPress={() => router.push("/account/security" as Href)} style={styles.more} variant="soft">
            <Icon color={color.heading} name="shield" size={18} />
            <Text style={[text.cardTitle, styles.flex]}>More in Security and Settings</Text>
            <Icon color={color.textMuted} name="chevron-right" size={16} />
          </Card>
        </View>
      ) : null}

      {tab === "contacts" ? (
        <View testID="tab-contacts">
          <Text style={styles.heading}>Emergency numbers</Text>
          <View style={styles.list}>
            {emergencyNumbers.map((item) => (
              <Card key={item.number} style={styles.item} variant="soft">
                <View style={styles.flex}>
                  <Text style={text.cardTitle}>
                    {item.label} · {item.number}
                  </Text>
                  <Text style={text.caption}>{item.detail}</Text>
                </View>
                <Button icon="phone" label="Call" onPress={() => call(item.number)} size="sm" testID={`call-${item.number}`} variant="soft" />
              </Card>
            ))}
          </View>

          <Text style={styles.heading}>Campus security</Text>
          <TextField
            keyboardType="phone-pad"
            label="Campus security number"
            onChangeText={(value) => dispatch({ number: value, type: "setCampusSecurityNumber" })}
            placeholder="Add your campus security number"
            right={state.campusSecurityNumber ? <Icon color={color.success} name="check-circle" size={16} /> : undefined}
            value={state.campusSecurityNumber}
          />
          {state.campusSecurityNumber ? <Button fullWidth icon="phone" label="Call campus security" onPress={() => call(state.campusSecurityNumber)} style={styles.gap} variant="outline" /> : null}

          <Text style={styles.heading}>Trusted contacts</Text>
          {state.emergencyContacts.length === 0 ? <Text style={text.bodySmall}>Add someone you trust so they are one tap away.</Text> : null}
          <View style={styles.list}>
            {state.emergencyContacts.map((contact) => (
              <Card key={contact.id} style={styles.item} testID={`contact-${contact.id}`} variant="soft">
                <View style={styles.flex}>
                  <Text style={text.cardTitle}>{contact.name}</Text>
                  <Text style={text.caption}>
                    {contact.relationship ? `${contact.relationship} · ` : ""}
                    {contact.phone}
                  </Text>
                </View>
                <Button icon="phone" label="Call" onPress={() => call(contact.phone)} size="sm" variant="soft" />
                <Button label="Remove" onPress={() => dispatch({ contactId: contact.id, type: "removeEmergencyContact" })} size="sm" variant="outline" />
              </Card>
            ))}
          </View>
          <Button fullWidth icon="user-plus" label="Add a trusted contact" onPress={() => setAddOpen(true)} style={styles.gap} testID="add-contact" />
        </View>
      ) : null}

      {tab === "trip" ? (
        <View testID="tab-trip">
          <Text style={styles.heading}>Share a delivery</Text>
          {tracked.length === 0 ? (
            <Text style={text.bodySmall}>When you have an order on its way you can share where it is.</Text>
          ) : (
            <View style={styles.list}>
              {tracked.map((order) => (
                <Card key={order.id} style={styles.item} variant="soft">
                  <View style={styles.flex}>
                    <Text style={text.cardTitle}>Order {order.number}</Text>
                    <Text style={text.caption}>{order.lines.map((line) => line.title).join(", ")}</Text>
                  </View>
                  <Button
                    icon="share-2"
                    label="Share"
                    onPress={() => {
                      if (!state.settings.shareTracking) {
                        toast.show("Turn on sharing in Security and Settings first");
                        return;
                      }
                      void share(tripMessage({ kind: "order", link: trackingLink(order.id), name: state.profile?.fullName ?? "" }));
                    }}
                    size="sm"
                    testID={`share-order-${order.id}`}
                  />
                </Card>
              ))}
            </View>
          )}

          <Text style={styles.heading}>Safe meet-up spots</Text>
          <Text style={text.bodySmall}>Busy, well-lit places on campus. Share the spot with someone you trust.</Text>
          <View style={styles.list}>
            {campusPlaces(campusId).map((place) => (
              <RadioRow
                key={place.id}
                onPress={() => {
                  setShareWith(place.name);
                  void share(tripMessage({ kind: "meetup", name: state.profile?.fullName ?? "", place: place.name }));
                }}
                selected={shareWith === place.name}
                subtitle={place.detail}
                title={place.name}
              />
            ))}
          </View>
          <View style={styles.row}>
            <Switch
              accessibilityLabel="Let others follow my order tracking"
              onValueChange={(value) => dispatch({ key: "shareTracking", type: "setSetting", value })}
              thumbColor={color.onPrimary}
              trackColor={{ false: color.borderStrong, true: color.primary }}
              value={state.settings.shareTracking}
            />
            <Text style={[text.bodySmall, styles.flex]}>Let people I send a link to follow my order tracking</Text>
          </View>
        </View>
      ) : null}

      {tab === "report" ? (
        <View testID="tab-report">
          <Text style={styles.heading}>Report a problem</Text>
          <Text style={text.bodySmall}>Tell us about a person, listing, delivery or anything that made you feel unsafe.</Text>
          <View style={styles.chips}>
            {reportCategories.map((item) => (
              <Chip key={item} label={item} onPress={() => setCategory(item)} selected={category === item} />
            ))}
          </View>
          <TextField
            error={reportError ?? undefined}
            label="What happened?"
            multiline
            onChangeText={(value) => {
              setNotes(value);
              setReportError(null);
            }}
            placeholder="Describe what happened"
            value={notes}
          />
          <Button fullWidth label="Send report" onPress={submitReport} style={styles.gap} testID="send-report" />

          <Text style={styles.heading}>Your reports</Text>
          {state.safetyReports.length === 0 ? <Text style={text.bodySmall}>You haven&apos;t sent any reports.</Text> : null}
          <View style={styles.list}>
            {state.safetyReports.map((report) => (
              <Card key={report.id} style={styles.item} variant="row">
                <View style={styles.flex}>
                  <Text style={text.cardTitle}>{report.category}</Text>
                  <Text numberOfLines={2} style={text.caption}>
                    {report.notes}
                  </Text>
                  <Text style={text.caption}>{dateAndTime(report.createdAt)}</Text>
                </View>
                <StatusBadge label="Received" tone="info" />
              </Card>
            ))}
          </View>
        </View>
      ) : null}

      <Sheet onClose={() => setAddOpen(false)} title="Add a trusted contact" visible={addOpen}>
        <TextField autoCapitalize="words" error={contactErrors.name} label="Name" onChangeText={setName} placeholder="Their name" value={name} />
        <TextField error={contactErrors.phone} keyboardType="phone-pad" label="Phone number" onChangeText={setPhone} placeholder="071 234 5678" value={phone} />
        <TextField autoCapitalize="words" label="Who are they to you? (optional)" onChangeText={setRelationship} placeholder="Parent, friend, housemate" value={relationship} />
        <Button fullWidth label="Save contact" onPress={addContact} testID="save-contact" />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginVertical: space.sm },
  dot: { alignItems: "center", backgroundColor: color.warningSoft, borderRadius: 14, height: 28, justifyContent: "center", width: 28 },
  dotDone: { backgroundColor: color.success },
  flex: { flex: 1 },
  gap: { marginTop: space.sm },
  heading: { ...text.sectionTitle, marginBottom: space.xs, marginTop: space.lg },
  item: { alignItems: "center", flexDirection: "row", gap: space.sm },
  list: { gap: space.xs },
  more: { alignItems: "center", flexDirection: "row", gap: space.sm, marginTop: space.md },
  ringWrap: { alignItems: "center", marginVertical: space.md },
  row: { alignItems: "center", flexDirection: "row", gap: space.sm, marginTop: space.md },
  score: { color: color.heading, fontSize: 34, fontWeight: "800" },
  sos: { alignItems: "center", backgroundColor: color.dangerSoft, borderRadius: corner.lg, flexDirection: "row", gap: space.sm, marginTop: space.sm },
  tabs: { marginTop: space.md },
});
