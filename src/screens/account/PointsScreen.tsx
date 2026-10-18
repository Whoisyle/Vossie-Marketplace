import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, Card, Chip, Icon, ProgressRing, Screen, useToast } from "@/components";
import { dateAndTime, formatRand } from "@/data/format";
import { canRedeem, nextTier, orderPoints, pointsBalance, pointsValueCents, REDEEM_OPTIONS, TIERS, tierFor } from "@/data/points";
import { confirmWithBiometrics } from "@/lib/biometric";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

type Line = { id: string; label: string; points: number; at: string };

/** Every point movement, newest first: earned on delivered orders, plus redemptions. */
export function pointsHistory(state: { orders: { id: string; number: string; status: string; totalCents: number; pointsMultiplier?: number; deliveredAt?: string; placedAt: string }[]; pointsLedger: { id: string; label: string; points: number; createdAt: string }[] }): Line[] {
  const earned = state.orders
    .filter((order) => order.status === "delivered" && orderPoints(order) > 0)
    .map((order) => ({ at: order.deliveredAt ?? order.placedAt, id: order.id, label: `Order ${order.number} delivered`, points: orderPoints(order) }));
  const ledger = state.pointsLedger.map((entry) => ({ at: entry.createdAt, id: entry.id, label: entry.label, points: entry.points }));
  return [...earned, ...ledger].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/** Vossie Points: the ring to the next tier, redeem as wallet credit, how to earn, and the history. */
export function PointsScreen() {
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const [busy, setBusy] = useState(false);
  const balance = pointsBalance(state.orders, state.pointsLedger);
  const tier = tierFor(balance);
  const upcoming = nextTier(balance);
  const history = pointsHistory(state);

  const redeem = async (points: number) => {
    if (busy || !canRedeem(balance, points)) return;
    setBusy(true);
    const ok = await confirmWithBiometrics(state.settings.biometric, "Confirm to redeem your points");
    setBusy(false);
    if (!ok) {
      toast.show("Confirmation cancelled");
      return;
    }
    dispatch({ points, type: "redeemPoints" });
    toast.show(`${formatRand(pointsValueCents(points))} added to your wallet`);
  };

  return (
    <Screen testID="points-screen">
      <AppHeader back subtitle="Earn on every delivered order." title="Vossie Points" />
      <View style={styles.ringWrap}>
        <ProgressRing accessibilityLabel={upcoming ? `${Math.round(upcoming.progress * 100)} percent of the way to ${upcoming.tier.label}` : "Top tier reached"} progress={upcoming ? upcoming.progress : 1}>
          <Text style={styles.balance}>{balance.toLocaleString("en-ZA")}</Text>
          <Text style={text.caption}>points</Text>
          <View style={styles.tier}>
            <Icon color={color.ink} name="award" size={12} />
            <Text style={styles.tierText}>{tier.label}</Text>
          </View>
        </ProgressRing>
        <Text style={styles.next}>
          {upcoming ? `${upcoming.remaining} more points to ${upcoming.tier.label}` : "You are at the top tier"}
        </Text>
        <Text style={text.bodySmall}>Worth {formatRand(pointsValueCents(balance))} in wallet credit</Text>
      </View>

      <Text style={styles.heading}>Redeem for wallet credit</Text>
      <Card variant="soft">
        <View style={styles.chips}>
          {REDEEM_OPTIONS.map((points) => (
            <Chip
              disabled={!canRedeem(balance, points)}
              key={points}
              label={`${points} pts · ${formatRand(pointsValueCents(points))}`}
              onPress={() => void redeem(points)}
              testID={`redeem-${points}`}
            />
          ))}
        </View>
        <Text style={text.caption}>10 points are worth R1. Credit lands in your wallet straight away.</Text>
      </Card>

      <Text style={styles.heading}>How you earn</Text>
      <Card>
        <Text style={text.body}>1 point for every R10 you spend, added when your order is delivered.</Text>
        <View style={styles.tiers}>
          {TIERS.map((item) => (
            <View key={item.id} style={[styles.tierBox, item.id === tier.id && styles.tierBoxOn]}>
              <Text style={[styles.tierName, item.id === tier.id && styles.tierNameOn]}>{item.label}</Text>
              <Text style={[text.caption, item.id === tier.id && styles.tierNameOn]}>{item.from === 0 ? "Start" : `${item.from}+ pts`}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Text style={styles.heading}>History</Text>
      {history.length === 0 ? (
        <Text style={text.bodySmall}>Your first points appear here once an order is delivered.</Text>
      ) : (
        <View style={styles.list}>
          {history.map((line) => (
            <Card key={line.id} style={styles.row} variant="row">
              <View style={styles.flex}>
                <Text numberOfLines={1} style={text.cardTitle}>
                  {line.label}
                </Text>
                <Text style={text.caption}>{dateAndTime(line.at)}</Text>
              </View>
              <Text style={[styles.points, { color: line.points < 0 ? color.danger : color.success }]}>
                {line.points > 0 ? "+" : ""}
                {line.points}
              </Text>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  balance: { color: color.heading, fontSize: 38, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginBottom: space.xs },
  flex: { flex: 1 },
  heading: { ...text.sectionTitle, marginBottom: space.xs, marginTop: space.lg },
  list: { gap: space.xs },
  next: { color: color.heading, fontSize: 16, fontWeight: "700", marginTop: space.sm },
  points: { fontSize: 15, fontWeight: "800" },
  ringWrap: { alignItems: "center", gap: 2, marginTop: space.md },
  row: { alignItems: "center", flexDirection: "row", gap: space.sm },
  tier: { alignItems: "center", backgroundColor: color.mist, borderRadius: 12, flexDirection: "row", gap: 4, marginTop: 4, paddingHorizontal: 10, paddingVertical: 3 },
  tierBox: { alignItems: "center", backgroundColor: color.surfaceSoft, borderRadius: 12, flex: 1, gap: 2, padding: space.sm },
  tierBoxOn: { backgroundColor: color.primary },
  tierName: { color: color.heading, fontSize: 14, fontWeight: "800" },
  tierNameOn: { color: color.onPrimary },
  tierText: { color: color.ink, fontSize: 12, fontWeight: "800" },
  tiers: { flexDirection: "row", gap: space.xs, marginTop: space.sm },
});
