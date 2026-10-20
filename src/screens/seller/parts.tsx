import { type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";

import { Icon, type IconName } from "@/components";

import { shiftTime } from "@/seller/schedule";

import { SELLER, Text, useTone } from "./ui";

/** A row of filter chips on the gradient. The chosen one turns white. */
export function Chips<T extends string>({ items, onChange, value, prefix = "chip" }: { items: { key: T; label: string }[]; value: T; onChange: (key: T) => void; prefix?: string }) {
  const look = useTone();
  return (
    <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
      {items.map((chip) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: value === chip.key }}
          key={chip.key}
          onPress={() => onChange(chip.key)}
          style={[styles.chip, { backgroundColor: value === chip.key ? look.chipOn : look.chip, boxShadow: value === chip.key ? look.pressed : look.raised }]}
          testID={`${prefix}-${chip.key}`}
        >
          <Text style={[styles.chipText, { color: value === chip.key ? look.chipTextOn : look.chipText }]}>{chip.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/** A page title with a smaller line under it, in white on the gradient. */
export function PageTitle({ right, subtitle, title }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.titleRow}>
      <View style={styles.titleText}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** A square count tile: a big number and what it counts. */
export function StatTile({ label, onPress, testID, tone = "ink", value }: { label: string; value: string | number; onPress?: () => void; testID?: string; tone?: "ink" | "danger" | "success" }) {
  const color = tone === "danger" ? "#B4544A" : tone === "success" ? "#2F8A57" : SELLER.ink;
  const body = (
    <>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.stat} testID={testID}>
      {body}
    </Pressable>
  ) : (
    <View style={styles.stat} testID={testID}>
      {body}
    </View>
  );
}

/** A time with a minus and a plus: each press moves it by half an hour. */
export function TimeStepper({ label, onChange, step = 30, testID, value }: { label: string; value: string; onChange: (value: string) => void; step?: number; testID?: string }) {
  const look = useTone();
  const press = (delta: number) => onChange(shiftTime(value, delta));
  return (
    <View style={styles.time} testID={testID}>
      <Text style={styles.timeLabel}>{label}</Text>
      <View style={styles.timeRow}>
        <Pressable accessibilityLabel={`${label} earlier`} accessibilityRole="button" onPress={() => press(-step)} style={[styles.timeBtn, { backgroundColor: look.card, boxShadow: look.raised }]} testID={testID ? `${testID}-minus` : undefined}>
          <Icon color={SELLER.solid} name="minus" size={14} />
        </Pressable>
        <Text style={styles.timeValue} testID={testID ? `${testID}-value` : undefined}>
          {value}
        </Text>
        <Pressable accessibilityLabel={`${label} later`} accessibilityRole="button" onPress={() => press(step)} style={[styles.timeBtn, { backgroundColor: look.card, boxShadow: look.raised }]} testID={testID ? `${testID}-plus` : undefined}>
          <Icon color={SELLER.solid} name="plus" size={14} />
        </Pressable>
      </View>
    </View>
  );
}

/** A tick box with a label. */
export function Check({ checked, label, onChange, testID }: { checked: boolean; label: string; onChange: (value: boolean) => void; testID?: string }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={styles.check} testID={testID}>
      <View style={[styles.box, checked && styles.boxOn]}>{checked ? <Icon color="#FFFFFF" name="check" size={14} /> : null}</View>
      <Text style={styles.checkText}>{label}</Text>
    </Pressable>
  );
}

/** A row on a card: icon, title, a line under it, and a switch or arrow on the right. */
export function SettingRow({ hint, icon, label, onPress, onToggle, testID, toggle }: { icon: IconName; label: string; hint?: string; onPress?: () => void; toggle?: boolean; onToggle?: (value: boolean) => void; testID?: string }) {
  const inner = (
    <>
      <View style={styles.rowIcon}>
        <Icon color={SELLER.solid} name={icon} size={20} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {toggle !== undefined ? <Switch accessibilityLabel={label} onValueChange={onToggle} thumbColor="#FFFFFF" trackColor={{ false: "#C3CED3", true: SELLER.solid }} value={toggle} /> : onPress ? <Icon color={SELLER.inkSoft} name="chevron-right" size={18} /> : null}
    </>
  );
  return onPress ? (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.row} testID={testID}>
      {inner}
    </Pressable>
  ) : (
    <View style={styles.row} testID={testID}>
      {inner}
    </View>
  );
}

/** Stars for a rating: filled up to the number. */
export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View accessibilityLabel={`${rating} out of 5`} style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon color={n <= Math.round(rating) ? "#E5A92B" : "#C3CED3"} key={n} name="star" size={size} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", borderColor: SELLER.solid, borderRadius: 7, borderWidth: 1.5, height: 22, justifyContent: "center", width: 22 },
  boxOn: { backgroundColor: SELLER.solid },
  check: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 36 },
  checkText: { color: SELLER.ink, flex: 1, fontSize: 15 },
  chip: { borderRadius: 20, minHeight: 38, paddingHorizontal: 16, paddingVertical: 9 },
  chipScroll: { marginHorizontal: -20 },
  chipText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  chips: { gap: 10, paddingHorizontal: 20, paddingVertical: 10 },
  row: { alignItems: "center", backgroundColor: SELLER.card, borderCurve: "continuous", borderRadius: 20, flexDirection: "row", gap: 12, padding: 14 },
  rowHint: { color: SELLER.inkSoft, fontSize: 13 },
  rowIcon: { alignItems: "center", backgroundColor: "#E3ECEF", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  rowText: { flex: 1, gap: 1 },
  rowTitle: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  stars: { flexDirection: "row", gap: 2 },
  stat: { backgroundColor: SELLER.card, borderCurve: "continuous", borderRadius: 20, flexBasis: "47%", flexGrow: 1, gap: 4, padding: 14 },
  statLabel: { color: SELLER.inkSoft, fontSize: 13, fontWeight: "600" },
  statValue: { fontSize: 26, fontWeight: "800" },
  time: { gap: 4 },
  timeBtn: { alignItems: "center", borderRadius: 15, height: 30, justifyContent: "center", width: 30 },
  timeLabel: { color: SELLER.inkSoft, fontSize: 12, fontWeight: "700" },
  timeRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  timeValue: { color: SELLER.ink, fontSize: 16, fontWeight: "800", minWidth: 50, textAlign: "center" },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  titleRow: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between", marginBottom: 12, marginTop: 18 },
  titleText: { flex: 1, gap: 2 },
});
