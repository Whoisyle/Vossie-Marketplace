import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { Icon, RadioRow, Sheet } from "@/components";
import { rand } from "@/courier/pay";
import { type EarningsRange, earningsFor, history, nextPayoutDate, statements, type HistoryRange, type Statement } from "@/courier/selectors";
import { balanceCents, MIN_CASH_OUT_CENTS } from "@/courier/state";
import { haptic } from "@/lib/haptics";
import { useCountUp } from "@/screens/seller/motion";

import { JobRow } from "./CourierDeliveryScreens";
import { shortDate, useCourier } from "./hooks";
import { Button, Card, Chips, CourierPage, COURIER, Empty, Heading, Muted, Pill, Rise, RoundButton, type } from "./ui";

const RANGE_LABEL: Record<EarningsRange, string> = { month: "This month", week: "This week", year: "This year" };
const BAR_LABELS: Record<EarningsRange, string[]> = {
  month: ["W1", "W2", "W3", "W4", "W5"],
  week: ["M", "T", "W", "T", "F", "S", "S"],
  year: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** One bar that grows up from nothing when it appears, a little after the one before it. */
function Bar({ delay, height, index, on, onPress, label, text }: { delay: number; height: number; index: number; on: boolean; onPress: () => void; label: string; text: string }) {
  const reduced = useReducedMotion();
  const grow = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    grow.set(0);
    grow.set(withDelay(delay, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })));
  }, [delay, grow, height, reduced]);
  const style = useAnimatedStyle(() => ({ height: Math.max(10, height * grow.get()) }));
  return (
    <Pressable accessibilityLabel={text} accessibilityRole="button" onPress={onPress} style={styles.barCol} testID={`bar-${index}`}>
      <Animated.View style={[styles.bar, on && styles.barOn, style]} />
      <Text style={type.caption}>{label}</Text>
    </Pressable>
  );
}

/** Bars you can tap: the one you touch turns dark and says what it is. They grow in when the period changes. */
function Bars({ labels, values }: { values: number[]; labels: string[] }) {
  const [picked, setPicked] = useState<number | null>(null);
  const top = Math.max(...values, 1);
  const best = values.indexOf(Math.max(...values));
  const shown = picked ?? (Math.max(...values) > 0 ? best : null);
  return (
    <Card style={styles.chart} testID="earnings-chart">
      <Text style={[type.caption, styles.chartNote]}>{shown !== null ? `${labels[shown]}: ${rand(values[shown]!)}` : "Nothing earned yet"}</Text>
      <View style={styles.bars}>
        {values.map((value, index) => (
          <Bar delay={index * 55} height={(value / top) * 96} index={index} key={`${labels.length}-${index}`} label={`${labels[index]}${index}`.replace(/\d+$/, "") + (labels.length > 7 ? "" : "")} on={index === shown} onPress={() => { haptic.tap(); setPicked(index); }} text={`${labels[index]}, ${rand(value)}`} />
        ))}
      </View>
    </Card>
  );
}

/** Earnings: the total, a chart of the days, what is waiting to be paid and what was paid. Cash out goes through the wallet. */
export function CourierEarningsScreen() {
  const router = useRouter();
  const { courier } = useCourier();
  const [range, setRange] = useState<EarningsRange>("week");
  const [rangeOpen, setRangeOpen] = useState(false);
  const data = earningsFor(courier, range);
  const balance = balanceCents(courier);
  const payout = nextPayoutDate();
  const canCash = balance >= MIN_CASH_OUT_CENTS;
  const shown = useCountUp(Math.round(data.total / 100), 800);
  const available = useCountUp(Math.round(balance / 100), 800);

  return (
    <CourierPage right={<RoundButton dark icon="calendar" label="Choose the period" onPress={() => setRangeOpen(true)} testID="range-button" />} subtitle={RANGE_LABEL[range]} testID="courier-earnings" title="Earnings" tone="blue">
      <Rise>
        <Card style={styles.total} testID="earnings-total" tone="dark">
          <Text style={styles.totalLabel}>Total {RANGE_LABEL[range].toLowerCase()}</Text>
          <Text style={styles.totalValue} testID="earnings-value">{`R ${String(shown).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`}</Text>
          <View style={styles.pills}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {data.deliveries} {data.deliveries === 1 ? "delivery" : "deliveries"}
              </Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>Tips {rand(data.tips)}</Text>
            </View>
          </View>
        </Card>
      </Rise>
      <Rise index={1}>
        <Bars labels={BAR_LABELS[range]} values={data.bars} />
      </Rise>
      <View style={styles.linkRow}>
        <Heading style={styles.headFlat}>Payouts</Heading>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push("/courier/account/statements" as Href)} testID="statements-link">
          <Muted style={styles.linkText}>Statements</Muted>
        </Pressable>
      </View>
      <Card style={styles.available} testID="available" tone="soft">
        <View style={styles.flex}>
          <Text style={type.caption}>Available to withdraw</Text>
          <Text style={styles.availableValue}>{`R ${String(available).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`}</Text>
        </View>
        <View style={styles.cash}>
          <Button disabled={!canCash} label="Cash out" onPress={() => router.push("/courier/account/wallet" as Href)} testID="cash-out" />
        </View>
      </Card>
      {!canCash ? <Muted style={styles.minNote}>You can withdraw from {rand(MIN_CASH_OUT_CENTS)}. Otherwise it is paid out every Friday.</Muted> : null}
      {balance > 0 ? (
        <Card style={styles.payRow} testID="weekly-payout">
          <View style={styles.payIcon}>
            <Icon color={COURIER.solid} name="credit-card" size={20} />
          </View>
          <View style={styles.flex}>
            <Text style={type.card}>Weekly payout</Text>
            <Text style={type.caption}>
              {DAYS[payout.getDay()]} {payout.getDate()} {MONTHS[payout.getMonth()]} · Scheduled
            </Text>
          </View>
          <View style={styles.payEnd}>
            <Text style={styles.payAmount}>{rand(balance)}</Text>
            <Pill label="Pending" tone="amber" />
          </View>
        </Card>
      ) : null}
      {courier.payouts.map((item) => (
        <Card key={item.id} style={styles.payRow}>
          <View style={[styles.payIcon, { backgroundColor: COURIER.greenSoft }]}>
            <Icon color={COURIER.green} name="check" size={20} />
          </View>
          <View style={styles.flex}>
            <Text style={type.card}>{item.label}</Text>
            <Text style={type.caption}>{shortDate(item.on)} · Paid</Text>
          </View>
          <Text style={[styles.payAmount, { color: COURIER.green }]}>{rand(item.cents)}</Text>
        </Card>
      ))}
      {balance === 0 && courier.payouts.length === 0 ? <Empty detail="Finish a delivery and what you earn shows up here, with a payout every Friday." icon="credit-card" title="No earnings yet" /> : null}
      <Sheet onClose={() => setRangeOpen(false)} title="Show earnings for" visible={rangeOpen}>
        {(Object.keys(RANGE_LABEL) as EarningsRange[]).map((key) => (
          <RadioRow key={key} onPress={() => { setRange(key); setRangeOpen(false); }} selected={key === range} title={RANGE_LABEL[key]} />
        ))}
      </Sheet>
    </CourierPage>
  );
}

/** History: every finished delivery, newest first, for all time, this week or this month. */
export function CourierHistoryScreen() {
  const router = useRouter();
  const { courier } = useCourier();
  const [range, setRange] = useState<HistoryRange>("all");
  const list = history(courier, range);
  return (
    <CourierPage back subtitle="Completed deliveries" testID="courier-history" title="History">
      <Chips
        chips={[
          { key: "all", label: "All" },
          { key: "week", label: "This week" },
          { key: "month", label: "This month" },
        ]}
        onChange={setRange}
        value={range}
      />
      {list.length === 0 ? <Empty detail="Deliveries you finish are listed here." icon="clock" title="Nothing here yet" /> : list.map((job) => <JobRow job={job} key={job.id} onPress={() => router.push(`/courier/active/detail/${job.id}` as Href)} />)}
    </CourierPage>
  );
}

/** Statements, a blue page like the seller's: each week or month with what was delivered, earned and tipped. Open one to see its deliveries. */
export function CourierStatementsScreen() {
  const router = useRouter();
  const { courier } = useCourier();
  const [kind, setKind] = useState<"week" | "month">("week");
  const [open, setOpen] = useState<Statement | null>(null);
  const list = statements(courier, kind);
  return (
    <CourierPage back subtitle="Your deliveries, tips and earnings" testID="courier-statements" title="Statements" tone="blue">
      <Chips
        chips={[
          { key: "week", label: "Weekly" },
          { key: "month", label: "Monthly" },
        ]}
        onChange={setKind}
        value={kind}
      />
      {list.length === 0 ? (
        <Empty detail="A statement appears for every week or month you have earned in." icon="file-text" title="No statements yet" />
      ) : (
        list.map((item, index) => (
          <Rise index={index} key={item.key}>
            <Card onPress={() => setOpen(item)} style={styles.statement} testID={`statement-${index}`}>
              <View style={styles.flex}>
                <Text style={type.card}>{item.label}</Text>
                <Text style={type.caption}>
                  {item.deliveries} {item.deliveries === 1 ? "delivery" : "deliveries"} · tips {rand(item.tipsCents)}
                </Text>
              </View>
              <Text style={styles.payAmount}>{rand(item.earnedCents)}</Text>
              <Icon color={COURIER.muted} name="chevron-right" size={16} />
            </Card>
          </Rise>
        ))
      )}
      <Sheet onClose={() => setOpen(null)} title={open?.label ?? ""} visible={open !== null}>
        {open ? (
          <>
            <Text style={type.caption}>
              {open.deliveries} deliveries · {rand(open.earnedCents)} earned, {rand(open.tipsCents)} of it tips
            </Text>
            {open.jobs.slice(0, 12).map((job) => (
              <JobRow job={job} key={job.id} onPress={() => { setOpen(null); router.push(`/courier/active/detail/${job.id}` as Href); }} />
            ))}
            {open.jobs.length > 12 ? <Text style={type.caption}>and {open.jobs.length - 12} more</Text> : null}
          </>
        ) : null}
      </Sheet>
    </CourierPage>
  );
}

const styles = StyleSheet.create({
  headFlat: { marginBottom: 0, marginTop: 0 },
  linkRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10, marginTop: 20 },
  linkText: { fontWeight: "800", marginBottom: 0 },
  statement: { alignItems: "center", flexDirection: "row", gap: 10, marginBottom: 12 },
  available: { alignItems: "center", flexDirection: "row", gap: 12 },
  availableValue: { color: COURIER.ink, fontSize: 22, fontWeight: "800" },
  bar: { backgroundColor: "#C3D3D9", borderRadius: 10, width: 28 },
  barCol: { alignItems: "center", flex: 1, gap: 4, justifyContent: "flex-end" },
  barOn: { backgroundColor: COURIER.solid },
  bars: { alignItems: "flex-end", flexDirection: "row", height: 124 },
  cash: { minWidth: 120 },
  chart: { borderRadius: 22, marginTop: 16, padding: 14 },
  chartNote: { marginBottom: 6 },
  chip: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  flex: { flex: 1 },
  minNote: { marginBottom: 10, marginTop: 6 },
  payAmount: { color: COURIER.ink, fontSize: 16, fontWeight: "800" },
  payEnd: { alignItems: "flex-end", gap: 4 },
  payIcon: { alignItems: "center", backgroundColor: "#DDE8EC", borderRadius: 14, height: 46, justifyContent: "center", width: 46 },
  payRow: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: 12 },
  pills: { flexDirection: "row", gap: 8, marginTop: 10 },
  total: { gap: 2 },
  totalLabel: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  totalValue: { color: "#FFFFFF", fontSize: 36, fontWeight: "800" },
});
