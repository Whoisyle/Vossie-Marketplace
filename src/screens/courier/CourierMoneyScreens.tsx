import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Icon, RadioRow, Sheet, useToast } from "@/components";
import { rand } from "@/courier/pay";
import { type EarningsRange, earningsFor, history, nextPayoutDate, type HistoryRange } from "@/courier/selectors";
import { balanceCents, MIN_CASH_OUT_CENTS } from "@/courier/state";
import { haptic } from "@/lib/haptics";

import { JobRow } from "./CourierDeliveryScreens";
import { shortDate, useCourier } from "./hooks";
import { Button, Card, Chips, CourierPage, COURIER, Empty, Pill, RoundButton, Rise, type } from "./ui";

const RANGE_LABEL: Record<EarningsRange, string> = { month: "This month", week: "This week", year: "This year" };
const BAR_LABELS: Record<EarningsRange, string[]> = {
  month: ["W1", "W2", "W3", "W4", "W5"],
  week: ["M", "T", "W", "T", "F", "S", "S"],
  year: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
};

/** Bars you can tap: the one you touch turns dark and says what it is. */
function Bars({ labels, values }: { values: number[]; labels: string[] }) {
  const [picked, setPicked] = useState<number | null>(null);
  const top = Math.max(...values, 1);
  const best = values.indexOf(Math.max(...values));
  const shown = picked ?? (Math.max(...values) > 0 ? best : null);
  return (
    <View style={styles.chart} testID="earnings-chart">
      <Text style={[type.caption, styles.chartNote]}>{shown !== null ? `${labels[shown]}: ${rand(values[shown]!)}` : "Nothing earned yet"}</Text>
      <View style={styles.bars}>
        {values.map((value, index) => (
          <Pressable accessibilityLabel={`${labels[index]}, ${rand(value)}`} accessibilityRole="button" key={index} onPress={() => { haptic.tap(); setPicked(index); }} style={styles.barCol} testID={`bar-${index}`}>
            <View style={[styles.bar, { height: Math.max(10, (value / top) * 96) }, index === shown && styles.barOn]} />
            <Text style={type.caption}>{labels[index]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Earnings: the total for the week, a chart of the days, what is waiting to be paid and what was paid. */
export function CourierEarningsScreen() {
  const toast = useToast();
  const { courier, dispatch } = useCourier();
  const [range, setRange] = useState<EarningsRange>("week");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [bank, setBank] = useState(courier.bank);
  const data = earningsFor(courier, range);
  const balance = balanceCents(courier);
  const payout = nextPayoutDate();
  const canCash = balance >= MIN_CASH_OUT_CENTS;

  const cashOut = () => {
    if (!courier.bank) {
      setBankOpen(true);
      return;
    }
    haptic.success();
    dispatch({ type: "courierCashOut" });
    toast.show(`${rand(balance)} is on its way to ${courier.bank}`);
  };

  return (
    <CourierPage right={<RoundButton dark icon="calendar" label="Choose the period" onPress={() => setRangeOpen(true)} testID="range-button" />} subtitle={RANGE_LABEL[range]} testID="courier-earnings" title="Earnings">
      <Rise>
        <Card style={styles.total} tone="dark" testID="earnings-total">
          <Text style={styles.totalLabel}>Total {RANGE_LABEL[range].toLowerCase()}</Text>
          <Text style={styles.totalValue}>{rand(data.total)}</Text>
          <View style={styles.pills}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{data.deliveries} {data.deliveries === 1 ? "delivery" : "deliveries"}</Text>
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
      <View style={styles.head}>
        <Text style={type.section}>Payouts</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setBankOpen(true)} testID="bank-details">
          <Text style={styles.link}>{courier.bank ? "Bank details" : "Add bank details"}</Text>
        </Pressable>
      </View>
      <Card style={styles.available} tone="soft" testID="available">
        <View style={styles.flex}>
          <Text style={type.caption}>Available to cash out</Text>
          <Text style={styles.availableValue}>{rand(balance)}</Text>
        </View>
        <View style={styles.cash}>
          <Button disabled={!canCash} label="Cash out" onPress={cashOut} testID="cash-out" />
        </View>
      </Card>
      {!canCash ? <Text style={[type.caption, styles.minNote]}>You can cash out from {rand(MIN_CASH_OUT_CENTS)}. Otherwise it is paid out every Friday.</Text> : null}
      {balance > 0 ? (
        <Card style={styles.payRow} testID="weekly-payout">
          <View style={styles.payIcon}>
            <Icon color={COURIER.solid} name="credit-card" size={20} />
          </View>
          <View style={styles.flex}>
            <Text style={type.card}>Weekly payout</Text>
            <Text style={type.caption}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][payout.getDay()]} {payout.getDate()} {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][payout.getMonth()]} · Scheduled
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
      <Sheet onClose={() => setBankOpen(false)} title="Bank details" visible={bankOpen}>
        <Text style={type.caption}>Where your payouts go. Write the bank and the last digits, like FNB 1234.</Text>
        <View style={styles.bankBox}>
          <TextInput accessibilityLabel="Bank and account" onChangeText={setBank} placeholder="FNB 1234" placeholderTextColor={COURIER.muted} style={styles.bankInput} testID="bank-input" value={bank} />
        </View>
        <Button
          disabled={bank.trim().length < 4}
          label="Save bank details"
          onPress={() => {
            dispatch({ bank, type: "courierSetBank" });
            setBankOpen(false);
            toast.show("Bank details saved");
          }}
          testID="bank-save"
        />
        <Text style={type.caption}>Demo: nothing is sent to a bank yet. Real payouts come with the payment provider.</Text>
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

const styles = StyleSheet.create({
  available: { alignItems: "center", flexDirection: "row", gap: 12 },
  availableValue: { color: COURIER.ink, fontSize: 22, fontWeight: "800" },
  bankBox: { backgroundColor: COURIER.card, borderRadius: 18, paddingHorizontal: 14 },
  bankInput: { color: COURIER.ink, fontSize: 15, paddingVertical: 14 },
  bar: { backgroundColor: "#C3D3D9", borderRadius: 10, width: 28 },
  barCol: { alignItems: "center", flex: 1, gap: 4, justifyContent: "flex-end" },
  barOn: { backgroundColor: COURIER.solid },
  bars: { alignItems: "flex-end", flexDirection: "row", height: 124 },
  cash: { minWidth: 120 },
  chart: { backgroundColor: COURIER.card, borderRadius: 20, marginTop: 14, padding: 14 },
  chartNote: { marginBottom: 6 },
  chip: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  flex: { flex: 1 },
  head: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10, marginTop: 18 },
  link: { color: COURIER.solid, fontSize: 13, fontWeight: "700" },
  minNote: { marginBottom: 10, marginTop: 6 },
  payAmount: { color: COURIER.ink, fontSize: 16, fontWeight: "800" },
  payEnd: { alignItems: "flex-end", gap: 4 },
  payIcon: { alignItems: "center", backgroundColor: "#E3EDF0", borderRadius: 14, height: 46, justifyContent: "center", width: 46 },
  payRow: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: 10 },
  pills: { flexDirection: "row", gap: 8, marginTop: 10 },
  total: { gap: 2 },
  totalLabel: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  totalValue: { color: "#FFFFFF", fontFamily: "Lora_600SemiBold", fontSize: 34 },
});
