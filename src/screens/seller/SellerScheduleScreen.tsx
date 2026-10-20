import { useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";

import { Icon } from "@/components";
import { applyPreset, applyTimetable, dateKey, pickupSlots, shortDay, storeStatus } from "@/seller/schedule";
import { sellerId } from "@/seller/state";
import { DAY_KEYS, DAY_LABELS, type DayKey, type SellerSchedule } from "@/seller/types";

import { useSeller } from "./hooks";
import { Chips, TimeStepper } from "./parts";
import { Pill, SELLER, SellerButton, SellerCard, SellerHeading, SellerScreen, SellerTopBar, Text } from "./ui";

type Preset = SellerSchedule["preset"];

const PRESETS: { key: Preset; label: string }[] = [
  { key: "weekdays", label: "Weekdays" },
  { key: "every-day", label: "Every day" },
  { key: "timetable", label: "Class timetable" },
  { key: "custom", label: "Custom" },
];

const FULL: Record<DayKey, string> = { fri: "Friday", mon: "Monday", sat: "Saturday", sun: "Sunday", thu: "Thursday", tue: "Tuesday", wed: "Wednesday" };

const CLOSURE_LABELS = ["Exam week", "Holiday", "Away"] as const;

/**
 * Operating times. The seller picks a preset or enters their lectures and the system sets the week, the open and closed
 * badge, order queuing and pickup times from it. Every day can still be changed by hand, and exam weeks or holidays can be
 * blocked out ahead.
 */
export function SellerScheduleScreen() {
  const view = useSeller();
  const schedule = view.seller.schedule;
  const [now] = useState(() => Date.now());
  const status = storeStatus(schedule, new Date(now));
  const slots = pickupSlots(schedule, new Date(now));

  const [lectureDay, setLectureDay] = useState<DayKey>("mon");
  const [lectureFrom, setLectureFrom] = useState("09:00");
  const [lectureTo, setLectureTo] = useState("11:00");
  const [startsIn, setStartsIn] = useState(7);
  const [length, setLength] = useState(5);
  const [closureLabel, setClosureLabel] = useState<(typeof CLOSURE_LABELS)[number]>("Exam week");

  const save = (next: SellerSchedule) => view.dispatch({ schedule: next, type: "sellerSetSchedule" });
  const setDay = (day: DayKey, patch: Partial<SellerSchedule["hours"][DayKey]>) => save({ ...schedule, hours: { ...schedule.hours, [day]: { ...schedule.hours[day], ...patch } }, preset: "custom" });
  const choose = (preset: Preset) => {
    if (preset === "weekdays" || preset === "every-day") save(applyPreset(schedule, preset));
    else if (preset === "timetable") save(applyTimetable(schedule, schedule.lectures));
    else save({ ...schedule, preset: "custom" });
  };
  const validLecture = lectureFrom < lectureTo;
  const addLecture = () => {
    if (!validLecture) return;
    save(applyTimetable(schedule, [...schedule.lectures, { day: lectureDay, from: lectureFrom, id: sellerId("lec"), label: "Lecture", to: lectureTo }]));
  };
  const removeLecture = (id: string) => save(applyTimetable(schedule, schedule.lectures.filter((item) => item.id !== id)));
  const addClosure = () => {
    const from = new Date(now + startsIn * 86_400_000);
    const to = new Date(now + (startsIn + Math.max(1, length) - 1) * 86_400_000);
    save({ ...schedule, closures: [...schedule.closures, { from: dateKey(from), id: sellerId("clo"), label: closureLabel, to: dateKey(to) }].sort((a, b) => a.from.localeCompare(b.from)) });
  };

  return (
    <SellerScreen tone="white" testID="seller-schedule">
      <SellerTopBar title="Operating times" />

      <SellerCard style={styles.status} testID="schedule-status">
        <View style={styles.between}>
          <View style={styles.flex}>
            <Text style={styles.big}>{status.open ? "Open" : "Closed"}</Text>
            <Text style={styles.hint}>{status.label}</Text>
          </View>
          <Pill label={status.open ? "Taking orders" : schedule.autoPause ? "Orders queue" : "Orders still arrive"} tone={status.open ? "success" : "warn"} />
        </View>
        <Row label="Close the store now" hint="Buyers see Closed until you open it again" onChange={(value) => save({ ...schedule, closedNow: value })} testID="close-now" value={schedule.closedNow} />
        <Row label="Queue orders when closed" hint="New orders wait for you instead of asking for an answer" onChange={(value) => save({ ...schedule, autoPause: value })} testID="auto-pause" value={schedule.autoPause} />
      </SellerCard>

      <SellerHeading>Set it up for me</SellerHeading>
      <Chips items={PRESETS} onChange={choose} prefix="preset" value={schedule.preset} />
      <Text style={styles.hint}>Pick one and the whole week is filled in. You can still change any day below.</Text>

      <SellerHeading>Your week</SellerHeading>
      <View style={styles.stack}>
        {DAY_KEYS.map((day) => {
          const hours = schedule.hours[day];
          return (
            <Animated.View key={day} layout={LinearTransition.springify().damping(20)}>
              <SellerCard style={styles.day} testID={`day-${day}`}>
                <View style={styles.between}>
                  <Text style={styles.name}>{FULL[day]}</Text>
                  <Switch accessibilityLabel={`${FULL[day]} open`} onValueChange={(value) => setDay(day, { open: value })} testID={`open-${day}`} thumbColor="#FFFFFF" trackColor={{ false: "#C3CED3", true: SELLER.solid }} value={hours.open} />
                </View>
                {hours.open ? (
                  <View style={styles.times}>
                    <TimeStepper label="Opens" onChange={(value) => setDay(day, { from: value })} testID={`from-${day}`} value={hours.from} />
                    <TimeStepper label="Closes" onChange={(value) => setDay(day, { to: value })} testID={`to-${day}`} value={hours.to} />
                  </View>
                ) : (
                  <Text style={styles.hint}>Closed all day</Text>
                )}
              </SellerCard>
            </Animated.View>
          );
        })}
      </View>

      <SellerHeading>Your lectures</SellerHeading>
      <SellerCard style={styles.stack} testID="lectures">
        <Text style={styles.hint}>Add the times you are in class. The store opens in the longest gap between them.</Text>
        {schedule.lectures.map((lecture) => (
          <Animated.View entering={FadeInDown.duration(260)} key={lecture.id} style={styles.between} testID={`lecture-${lecture.id}`}>
            <Text style={styles.name}>
              {DAY_LABELS[lecture.day]} {lecture.from} to {lecture.to}
            </Text>
            <SellerButton label="Remove" onPress={() => removeLecture(lecture.id)} size="sm" testID={`remove-lecture-${lecture.id}`} variant="outline" />
          </Animated.View>
        ))}
        <Chips items={DAY_KEYS.map((key) => ({ key, label: DAY_LABELS[key] }))} onChange={setLectureDay} prefix="lecture-day" value={lectureDay} />
        <View style={styles.times}>
          <TimeStepper label="From" onChange={setLectureFrom} testID="lecture-from" value={lectureFrom} />
          <TimeStepper label="To" onChange={setLectureTo} testID="lecture-to" value={lectureTo} />
        </View>
        <SellerButton disabled={!validLecture} icon="plus" label="Add lecture" onPress={addLecture} size="sm" testID="add-lecture" variant="solid" />
      </SellerCard>

      <SellerHeading>Exam weeks and holidays</SellerHeading>
      <SellerCard style={styles.stack} testID="closures">
        <Text style={styles.hint}>Block out days ahead. Buyers see Back on, with the day you return.</Text>
        {schedule.closures.map((item) => (
          <View key={item.id} style={styles.between} testID={`closure-${item.id}`}>
            <Text style={styles.name}>
              {item.label} · {shortDay(item.from)}
              {item.to !== item.from ? ` to ${shortDay(item.to)}` : ""}
            </Text>
            <SellerButton label="Remove" onPress={() => save({ ...schedule, closures: schedule.closures.filter((c) => c.id !== item.id) })} size="sm" testID={`remove-closure-${item.id}`} variant="outline" />
          </View>
        ))}
        <Chips items={CLOSURE_LABELS.map((label) => ({ key: label, label }))} onChange={setClosureLabel} prefix="closure" value={closureLabel} />
        <View style={styles.times}>
          <Step label="Starts in (days)" onChange={setStartsIn} testID="closure-start" value={startsIn} />
          <Step label="Length (days)" min={1} onChange={setLength} testID="closure-length" value={length} />
        </View>
        <SellerButton icon="plus" label="Block these days" onPress={addClosure} size="sm" testID="add-closure" variant="solid" />
      </SellerCard>

      <SellerHeading>Pickup times</SellerHeading>
      <SellerCard style={styles.stack} testID="pickup">
        <Text style={styles.hint}>Buyers choose a pickup time from your open hours.</Text>
        <Chips items={[{ key: "30", label: "30 minute slots" }, { key: "60", label: "1 hour slots" }]} onChange={(key) => save({ ...schedule, slotMinutes: key === "30" ? 30 : 60 })} prefix="slot" value={String(schedule.slotMinutes)} />
        <Chips items={[15, 30, 45, 60].map((minutes) => ({ key: String(minutes), label: `${minutes} min cut-off` }))} onChange={(key) => save({ ...schedule, cutoffMinutes: Number(key) })} prefix="cutoff" value={String(schedule.cutoffMinutes)} />
        <View style={styles.slots} testID="slot-preview">
          <Icon color={SELLER.solid} name="clock" size={16} />
          <Text style={styles.hint}>{slots.length === 0 ? "No pickup times left today" : `Today: ${slots.slice(0, 6).join(", ")}${slots.length > 6 ? ` and ${slots.length - 6} more` : ""}`}</Text>
        </View>
      </SellerCard>
      <Text style={styles.note}>Hours are kept on this phone for now. Buyers see them once the live backend is on.</Text>
    </SellerScreen>
  );
}

function Row({ hint, label, onChange, testID, value }: { label: string; hint: string; value: boolean; onChange: (value: boolean) => void; testID: string }) {
  return (
    <View style={styles.between}>
      <View style={styles.flex}>
        <Text style={styles.name}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch accessibilityLabel={label} onValueChange={onChange} testID={testID} thumbColor="#FFFFFF" trackColor={{ false: "#C3CED3", true: SELLER.solid }} value={value} />
    </View>
  );
}

function Step({ label, min = 0, onChange, testID, value }: { label: string; value: number; onChange: (value: number) => void; testID: string; min?: number }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepRow}>
        <SellerButton icon="minus" label="" onPress={() => onChange(Math.max(min, value - 1))} size="sm" testID={`${testID}-minus`} variant="light" />
        <Text style={styles.name} testID={`${testID}-value`}>
          {value}
        </Text>
        <SellerButton icon="plus" label="" onPress={() => onChange(value + 1)} size="sm" testID={`${testID}-plus`} variant="light" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  between: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  big: { color: SELLER.ink, fontSize: 24, fontWeight: "800" },
  day: { gap: 10 },
  flex: { flex: 1, gap: 1 },
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  name: { color: SELLER.ink, flex: 0, fontSize: 15, fontWeight: "800" },
  note: { color: SELLER.inkSoft, fontSize: 12, marginTop: 14, textAlign: "center" },
  slots: { alignItems: "center", flexDirection: "row", gap: 8 },
  stack: { gap: 12 },
  status: { gap: 14, marginTop: 14 },
  step: { gap: 4 },
  stepLabel: { color: SELLER.inkSoft, fontSize: 12, fontWeight: "700" },
  stepRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  times: { flexDirection: "row", gap: 28 },
});
