import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { formatRand } from "@/data/format";

import { useSeller } from "./hooks";
import { BarChart, Confetti, CountUpRand } from "./motion";
import { whenLabel } from "./OrderParts";
import { SELLER, SellerButton, SellerCard, SellerHeader, SellerHeading, SellerScreen } from "./ui";
import { WithdrawSheet } from "./WithdrawSheet";

/** Seller Earnings: the balance that can be withdrawn, the last seven days as bars, and every sale and payout. */
export function SellerEarningsScreen() {
  const view = useSeller();
  const [withdrawing, setWithdrawing] = useState(false);
  const [coins, setCoins] = useState(false);
  const recent = view.seller.ledger.slice(0, 8);

  return (
    <SellerScreen testID="seller-earnings">
      <SellerHeader />
      <Text accessibilityRole="header" style={styles.title}>
        Earnings
      </Text>

      <Animated.View entering={FadeInDown.duration(380)}>
        <SellerCard style={styles.balance} testID="balance-card">
          <Text style={styles.small}>Available balance</Text>
          <CountUpRand cents={view.available} style={styles.money} />
          <SellerButton label="Withdraw" onPress={() => setWithdrawing(true)} size="md" style={styles.withdraw} testID="open-withdraw" variant="dark" />
        </SellerCard>
      </Animated.View>

      <SellerHeading>This week</SellerHeading>
      <Animated.View entering={FadeInDown.delay(100).duration(380)}>
        <SellerCard style={styles.chart}>
          <BarChart bars={view.bars} />
          <Text style={styles.small}>
            {formatRand(view.week.thisWeekCents)} in the last 7 days
            {view.week.changePercent === null ? "" : view.week.changePercent >= 0 ? `, ${view.week.changePercent}% up on the week before` : `, ${Math.abs(view.week.changePercent)}% down on the week before`}
          </Text>
        </SellerCard>
      </Animated.View>

      <SellerHeading>Recent activity</SellerHeading>
      <View style={styles.list}>
        {recent.map((entry, index) => (
          <Animated.View entering={FadeInDown.delay(180 + index * 50).duration(340)} key={entry.id}>
            <SellerCard style={styles.row} testID={`ledger-${entry.id}`}>
              <View style={styles.rowText}>
                <Text numberOfLines={1} style={styles.rowTitle}>
                  {entry.label}
                </Text>
                <Text style={styles.small}>{whenLabel(entry.createdAt)}</Text>
              </View>
              <Text style={[styles.amount, entry.amountCents < 0 ? styles.out : styles.in]}>{formatRand(entry.amountCents, { fixed: true, signed: true })}</Text>
            </SellerCard>
          </Animated.View>
        ))}
      </View>

      <WithdrawSheet availableCents={view.available} onClose={() => setWithdrawing(false)} onPaid={() => setCoins(true)} visible={withdrawing} />
      <Confetti coins count={26} play={coins} />
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  amount: { fontSize: 15, fontWeight: "800" },
  balance: { borderRadius: 28, gap: 4, paddingBottom: 18 },
  chart: { gap: 10 },
  in: { color: "#2F8A57" },
  list: { gap: 10 },
  money: { color: SELLER.ink, fontSize: 38, fontWeight: "800", letterSpacing: -0.5 },
  out: { color: "#B4544A" },
  row: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 64 },
  rowText: { flex: 1, gap: 1 },
  rowTitle: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  small: { color: SELLER.inkSoft, fontSize: 13 },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginBottom: 12, marginTop: 18 },
  withdraw: { alignSelf: "flex-start", marginTop: 8 },
});
