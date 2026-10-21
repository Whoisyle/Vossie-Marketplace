import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

import { Icon, Sheet } from "@/components";
import { VossieMap } from "@/components/map/VossieMap";
import { regionFor } from "@/data/geo";
import { applyPreset, DAY_KEYS, DAY_LABELS, workStatus, type CourierSchedule } from "@/courier/schedule";
import { needsLicence } from "@/courier/state";
import type { Vehicle } from "@/courier/types";
import { haptic } from "@/lib/haptics";
import { searchPlaces, type FoundPlace } from "@/seller/places";
import { TimeStepper } from "@/screens/seller/parts";

import { useCourier, useNow } from "./hooks";
import { Button, Card, Chips, CourierPage, COURIER, Heading, Pill, Radar, Rise, Toggle, type, useRaised } from "./ui";

const FULL = { fri: "Friday", mon: "Monday", sat: "Saturday", sun: "Sunday", thu: "Thursday", tue: "Tuesday", wed: "Wednesday" } as const;
const BREAKS = [15, 30, 60] as const;
const DISTANCES = [2, 3, 5, 8, 10] as const;
const VEHICLES: { key: Vehicle; label: string }[] = [
  { key: "walking", label: "Walking" },
  { key: "bicycle", label: "Bicycle" },
  { key: "scooter", label: "Scooter" },
  { key: "car", label: "Car" },
];

/** A search for a place by name, for adding a zone. Waits for the typing to stop, then asks OpenStreetMap. */
function ZoneSearch({ onPick, visible, onClose }: { visible: boolean; onClose: () => void; onPick: (place: FoundPlace) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundPlace[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!visible || query.trim().length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setBusy(true);
      searchPlaces(query.trim(), controller.signal)
        .then((found) => setResults(found))
        .catch(() => setResults([]))
        .finally(() => setBusy(false));
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, visible]);
  const shown = query.trim().length < 3 ? [] : results;
  return (
    <Sheet onClose={onClose} title="Add a zone" visible={visible}>
      <Text style={type.caption}>Search for a place, like a mall, a suburb or a residence. You will see offers whose pickup is within about a kilometre of it.</Text>
      <View style={styles.search}>
        <Icon color={COURIER.inkSoft} name="search" size={18} />
        <TextInput accessibilityLabel="Search for a place" autoFocus onChangeText={setQuery} placeholder="Search for a place" placeholderTextColor={COURIER.muted} style={styles.searchInput} testID="zone-search" value={query} />
        {busy ? <ActivityIndicator color={COURIER.solid} size="small" /> : null}
      </View>
      {shown.map((place) => (
        <Pressable accessibilityRole="button" key={place.id} onPress={() => { onPick(place); setQuery(""); onClose(); }} style={styles.result} testID={`zone-result-${place.id}`}>
          <Icon color={COURIER.solid} name="map-pin" size={18} />
          <View style={styles.flex}>
            <Text numberOfLines={1} style={type.card}>
              {place.name}
            </Text>
            <Text numberOfLines={1} style={type.caption}>
              {place.address}
            </Text>
          </View>
        </Pressable>
      ))}
      {query.trim().length >= 3 && !busy && shown.length === 0 ? <Text style={type.caption}>No places found. Try another name.</Text> : null}
    </Sheet>
  );
}

/** Hours, zones and the longest trip, used as the third setup step and again from Account. Status, breaks and finishing early only show once the courier is working. */
export function AvailabilityEditor({ setup = false, withVehicle = false }: { setup?: boolean; withVehicle?: boolean }) {
  const { courier, dispatch } = useCourier();
  const raised = useRaised();
  const now = useNow(30_000);
  const [adding, setAdding] = useState(false);
  const schedule = courier.schedule;
  const status = workStatus(schedule, new Date(now));
  const onBreak = status.reason === "break";
  const save = (next: CourierSchedule) => dispatch({ schedule: next, type: "courierSetSchedule" });
  const setDay = (day: (typeof DAY_KEYS)[number], patch: Partial<CourierSchedule["hours"][typeof day]>) => save({ ...schedule, hours: { ...schedule.hours, [day]: { ...schedule.hours[day], ...patch } }, preset: "custom" });
  const zonePoints = useMemo(() => courier.zones.filter((zone) => zone.on).map((zone) => ({ latitude: zone.latitude, longitude: zone.longitude })), [courier.zones]);
  const region = useMemo(() => regionFor(zonePoints.length > 0 ? zonePoints : [{ latitude: courier.zones[0]!.latitude, longitude: courier.zones[0]!.longitude }], 1.8), [courier.zones, zonePoints]);

  return (
    <View testID="availability-form">
      {setup ? null : (
        <Rise>
          <Card style={styles.status} testID="work-status" tone={status.working && courier.online ? "dark" : "plain"}>
            <View style={styles.statusTop}>
              <Radar active={courier.online && status.working} size={44} />
              <View style={styles.flex}>
                <Text style={[styles.statusTitle, !(status.working && courier.online) && { color: COURIER.ink }]}>{courier.online ? (onBreak ? "On a break" : "You are online") : "You are offline"}</Text>
                <Text style={[styles.statusLine, !(status.working && courier.online) && { color: COURIER.inkSoft }]}>{status.label}</Text>
              </View>
            </View>
            {courier.online ? (
              <View style={styles.statusActions}>
                {onBreak ? (
                  <Button label="Resume now" onPress={() => dispatch({ type: "courierEndBreak" })} testID="resume" tone="light" />
                ) : (
                  <>
                    {BREAKS.map((minutes) => (
                      <Pressable accessibilityLabel={`Take a ${minutes} minute break`} accessibilityRole="button" key={minutes} onPress={() => { haptic.tap(); dispatch({ minutes, type: "courierStartBreak" }); }} style={[styles.breakChip, raised]} testID={`break-${minutes}`}>
                        <Icon color={COURIER.solid} name="coffee" size={14} />
                        <Text style={styles.breakText}>{minutes} min</Text>
                      </Pressable>
                    ))}
                    <Pressable accessibilityLabel="Finish for today" accessibilityRole="button" onPress={() => { haptic.tap(); dispatch({ type: "courierFinishToday" }); }} style={[styles.breakChip, styles.finish]} testID="finish-today">
                      <Icon color="#FFFFFF" name="moon" size={14} />
                      <Text style={[styles.breakText, { color: "#FFFFFF" }]}>Finish for today</Text>
                    </Pressable>
                  </>
                )}
              </View>
            ) : (
              <Text style={type.caption}>Go online from Home to take offers. You can start outside your hours; the day is not cut off.</Text>
            )}
          </Card>
        </Rise>
      )}

      <Heading>Your week</Heading>
      <Chips
        chips={[
          { key: "weekdays", label: "Weekdays" },
          { key: "every-day", label: "Every day" },
          { key: "custom", label: "Custom" },
        ]}
        onChange={(preset) => (preset === "custom" ? save({ ...schedule, preset: "custom" }) : save(applyPreset(schedule, preset)))}
        value={schedule.preset}
      />
      <Card style={styles.rule} testID="auto-offline-card">
        <View style={styles.flex}>
          <Text style={type.card}>Go offline when my hours end</Text>
          <Text style={type.caption}>You stop getting offers at closing time, with a notice. Starting early is still one tap.</Text>
        </View>
        <Toggle label="Go offline when my hours end" on={schedule.autoOffline} onChange={(on) => save({ ...schedule, autoOffline: on })} testID="auto-offline" />
      </Card>
      {DAY_KEYS.map((day) => {
        const hours = schedule.hours[day];
        return (
          <Animated.View key={day} layout={LinearTransition.springify().damping(20)}>
            <Card style={styles.day} testID={`day-${day}`}>
              <View style={styles.between}>
                <Text style={type.card}>{FULL[day]}</Text>
                <Toggle label={`${FULL[day]} on duty`} on={hours.open} onChange={(open) => setDay(day, { open })} testID={`open-${day}`} />
              </View>
              {hours.open ? (
                <View style={styles.times}>
                  <TimeStepper label="From" onChange={(value) => setDay(day, { from: value })} testID={`from-${day}`} value={hours.from} />
                  <TimeStepper label="To" onChange={(value) => setDay(day, { to: value })} testID={`to-${day}`} value={hours.to} />
                </View>
              ) : (
                <Text style={type.caption}>Not on duty. {DAY_LABELS[day]} stays quiet.</Text>
              )}
            </Card>
          </Animated.View>
        );
      })}

      <Heading>Where you deliver</Heading>
      <View style={[styles.zoneMap, raised]}>
        <VossieMap accessibilityLabel="Map of your delivery zones" initialRegion={region} interactive={false} key={zonePoints.map((p) => `${p.latitude}`).join(",")} markers={zonePoints.map((point, index) => ({ coordinate: point, id: `z${index}`, kind: "pin" as const }))} style={StyleSheet.absoluteFill} testID="zone-map" />
      </View>
      <Text style={[type.caption, styles.caption]}>Only offers whose pickup is within about a kilometre of a zone you switch on are shown. These are the places for your campus.</Text>
      {courier.zones.map((zone) => (
        <Card key={zone.id} style={styles.zone} testID={`zone-${zone.id}`}>
          <View style={styles.zoneIcon}>
            <Icon color={COURIER.solid} name="map-pin" size={20} />
          </View>
          <View style={styles.flex}>
            <Text style={type.card}>{zone.name}</Text>
            <Text numberOfLines={1} style={type.caption}>
              {zone.custom ? "Added by you" : zone.detail}
            </Text>
          </View>
          {zone.custom ? (
            <Pressable accessibilityLabel={`Remove ${zone.name}`} accessibilityRole="button" hitSlop={8} onPress={() => dispatch({ id: zone.id, type: "courierRemoveZone" })} testID={`remove-${zone.id}`}>
              <Icon color={COURIER.red} name="trash-2" size={18} />
            </Pressable>
          ) : null}
          <Toggle label={zone.name} on={zone.on} onChange={() => dispatch({ id: zone.id, type: "courierToggleZone" })} testID={`zone-toggle-${zone.id}`} />
        </Card>
      ))}
      <Button icon="plus" label="Add a zone" onPress={() => setAdding(true)} testID="add-zone" tone="outline" />

      <Heading>Longest delivery</Heading>
      <Chips chips={DISTANCES.map((km) => ({ key: String(km), label: `${km} km` }))} onChange={(km) => dispatch({ km: Number(km), type: "courierSetMaxKm" })} value={String(courier.maxKm)} />

      {withVehicle ? (
        <>
          <Heading>How you deliver</Heading>
          <View style={styles.vehicles}>
            {VEHICLES.map((item) => {
              const on = item.key === courier.profile.vehicle;
              return (
                <Pressable accessibilityLabel={item.label} accessibilityRole="radio" accessibilityState={{ checked: on }} key={item.key} onPress={() => { haptic.tap(); dispatch({ patch: { vehicle: item.key }, type: "courierSetProfile" }); }} style={[styles.vehicle, on ? styles.vehicleOn : raised]} testID={`vehicle-${item.key}`}>
                  <Text style={[styles.vehicleText, on && { color: "#FFFFFF" }]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {needsLicence(courier.profile.vehicle) ? <Text style={type.caption}>A car or scooter needs your driving licence and vehicle details. Update them in Documents and Vehicle.</Text> : null}
        </>
      ) : null}
      <ZoneSearch
        onClose={() => setAdding(false)}
        onPick={(place) => dispatch({ detail: place.address.split(",").slice(0, 2).join(","), latitude: place.coordinate.latitude, longitude: place.coordinate.longitude, name: place.name, type: "courierAddZone" })}
        visible={adding}
      />
    </View>
  );
}

/** Availability from Account: the same editor, with the status, breaks and the vehicle on top. */
export function CourierAvailabilityScreen() {
  return (
    <CourierPage back subtitle="When and where you deliver" testID="courier-availability" title="Availability">
      <AvailabilityEditor withVehicle />
    </CourierPage>
  );
}

export { Pill };

const styles = StyleSheet.create({
  between: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  breakChip: { alignItems: "center", flexDirection: "row", gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18 },
  breakText: { color: COURIER.solid, fontSize: 12, fontWeight: "800" },
  caption: { marginBottom: 10 },
  day: { gap: 10, marginBottom: 12 },
  finish: { backgroundColor: COURIER.solid },
  flex: { flex: 1 },
  result: { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 10 },
  rule: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 12 },
  search: { alignItems: "center", backgroundColor: "#E4EAED", borderRadius: 22, flexDirection: "row", gap: 10, minHeight: 48, paddingHorizontal: 14 },
  searchInput: { color: COURIER.ink, flex: 1, fontSize: 15, paddingVertical: 10 },
  status: { gap: 12, marginBottom: 6 },
  statusActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusLine: { color: "rgba(255,255,255,0.78)", fontSize: 13, marginTop: 2 },
  statusTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  statusTop: { alignItems: "center", flexDirection: "row", gap: 12 },
  times: { flexDirection: "row", gap: 12 },
  vehicle: { alignItems: "center", borderRadius: 16, height: 34, justifyContent: "center", paddingHorizontal: 13 },
  vehicleOn: { backgroundColor: COURIER.solid },
  vehicleText: { color: COURIER.inkSoft, fontSize: 12, fontWeight: "700" },
  vehicles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  zone: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 12 },
  zoneIcon: { alignItems: "center", backgroundColor: "#DDE8EC", borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  zoneMap: { borderRadius: 22, height: 170, overflow: "hidden", position: "relative" },
});
