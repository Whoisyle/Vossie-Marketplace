import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { formatRand } from "@/data/format";
import { feesPaidCents, pendingCents } from "@/seller/selectors";

import { Timeline, ScreenHead, StatCards } from "./HomeParts";
import { LinearGradient } from "expo-linear-gradient";
import { color } from "@/theme/tokens";
import { useSeller } from "./hooks";
import { ScrubBars } from "./charts";
import { Confetti, CountUpRand } from "./motion";
import { SELLER, SellerButton, SellerCard, SellerHeading, SellerScreen, Text } from "./ui";
import { TxRow } from "./SellerMoneyScreens";
import { WithdrawSheet } from "./WithdrawSheet";

/** Seller Earnings: the balance that can be withdrawn, the last seven days as bars, and every sale and payout. */
export function SellerPayoutsScreen() {
  const view = useSeller();
  const router = useRouter();
  const [withdrawing, setWithdrawing] = useState(false);
  const [coins, setCoins] = useState(false);
  const recent = view.seller.ledger.slice(0, 8);

  return (
    <SellerScreen testID="seller-payouts" tone="white">
      <ScreenHead subtitle="Earnings, fees and payouts" title="Payouts" />

      <Animated.View entering={FadeInDown.duration(380)}>
        <View style={styles.balance} testID="balance-card">
          <LinearGradient colors={[color.accent, "#1F4350"]} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
          <Text style={styles.balanceLabel}>Available balance</Text>
          <CountUpRand cents={view.available} style={styles.balanceMoney} />
          <Pressable accessibilityRole="button" onPress={() => setWithdrawing(true)} style={({ pressed }) => [styles.payout, pressed && styles.pressed]} testID="open-withdraw">
            <Text style={styles.payoutText}>Request payout</Text>
          </Pressable>
        </View>
      </Animated.View>

      <StatCards
        items={[
          { label: "Pending", testID: "payout-pending", tone: "sage", value: formatRand(pendingCents(view.seller.orders)) },
          { label: "Fees paid", testID: "payout-fees", tone: "grey", value: formatRand(feesPaidCents(view.seller.ledger)) },
        ]}
      />

      <SellerHeading>This week</SellerHeading>
      <Animated.View entering={FadeInDown.delay(100).duration(380)}>
        <SellerCard style={styles.chart}>
          <ScrubBars bars={view.bars.map((bar) => ({ detail: bar.isToday ? "Today" : undefined, label: bar.label, title: `${bar.label} · ${formatRand(bar.cents)}`, value: bar.cents }))} testID="week-chart" />
          <Text style={styles.small}>
            {formatRand(view.week.thisWeekCents)} in the last 7 days
            {view.week.changePercent === null ? "" : view.week.changePercent >= 0 ? `, ${view.week.changePercent}% up on the week before` : `, ${Math.abs(view.week.changePercent)}% down on the week before`}
          </Text>
        </SellerCard>
      </Animated.View>

      <SellerHeading>How payouts work</SellerHeading>
      <Animated.View entering={FadeInDown.delay(140).duration(380)}>
        <SellerCard testID="payout-steps">
          <Timeline
            active={0}
            steps={[
              { hint: "Pick an amount from your available balance", label: "You request a payout" },
              { hint: "Vossie checks it and sends it to your bank", label: "Vossie processes it" },
              { hint: "Usually within 1 to 2 working days", label: "It arrives in your bank" },
            ]}
          />
        </SellerCard>
      </Animated.View>

      <View style={styles.headRow}>
        <SellerHeading style={styles.headFlat}>Recent transactions</SellerHeading>
        <Pressable accessibilityRole="button" onPress={() => router.push("/seller/payouts/transactions" as Href)} testID="see-all-transactions">
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>
      <View style={styles.list}>
        {recent.map((entry, index) => (
          <Animated.View entering={FadeInDown.delay(180 + index * 50).duration(340)} key={entry.id}>
            <TxRow entry={entry} onPress={() => router.push(`/seller/payouts/receipt/${entry.id}` as Href)} />
          </Animated.View>
        ))}
      </View>
      <SellerButton icon="credit-card" label="Wallet" onPress={() => router.push("/seller/account/wallet" as Href)} size="sm" style={styles.withdraw} testID="payouts-wallet" variant="glass" />
      <SellerButton icon="file-text" label="Monthly statements" onPress={() => router.push("/seller/payouts/statements" as Href)} size="sm" style={styles.withdraw} testID="payouts-statements" variant="light" />

      <WithdrawSheet availableCents={view.available} onClose={() => setWithdrawing(false)} onPaid={() => setCoins(true)} visible={withdrawing} />
      <Confetti coins count={26} play={coins} />
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  amount: { fontSize: 15, fontWeight: "800" },
  balance: { borderRadius: 26, gap: 4, overflow: "hidden", padding: 20 },
  chart: { gap: 10 },
  in: { color: "#2F8A57" },
  list: { gap: 10 },
  money: { color: SELLER.ink, fontSize: 38, fontWeight: "800", letterSpacing: -0.5 },
  out: { color: "#B4544A" },
  row: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 64 },
  rowText: { flex: 1, gap: 1 },
  rowTitle: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  small: { color: SELLER.inkSoft, fontSize: 13 },
  headFlat: { marginBottom: 0, marginTop: 0 },
  headRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10, marginTop: 20 },
  balanceLabel: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  balanceMoney: { color: "#FFFFFF", fontSize: 40, fontWeight: "800", letterSpacing: -0.5 },
  payout: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "#F4F5F2", borderRadius: 22, marginTop: 12, paddingHorizontal: 22, paddingVertical: 12 },
  payoutText: { color: color.charcoal, fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.88 },
  seeAll: { color: color.accent, fontSize: 14, fontWeight: "800" },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  withdraw: { alignSelf: "flex-start", marginTop: 8 },
});
