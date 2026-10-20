import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, Card, Chip, Icon, ProgressRing, Screen, useToast } from "@/components";
import { dateAndTime, formatRand } from "@/data/format";
import { canRedeem, nextTier, orderPoints, pointsBalance, pointsValueCents, REDEEM_OPTIONS, TIER_COLORS, TIERS, tierFor } from "@/data/points";
import { confirmWithBiometrics } from "@/lib/biometric";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

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
  const palette = TIER_COLORS[tier.id];
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
        <ProgressRing accessibilityLabel={upcoming ? `${Math.round(upcoming.progress * 100)} percent of the way to ${upcoming.tier.label}` : "Top tier reached"} progress={upcoming ? upcoming.progress : 1} size={184} stroke={16} tint={palette.solid} track={palette.tint}>
          <Text style={styles.balance}>{balance.toLocaleString("en-ZA")}</Text>
          <Text style={text.caption}>points</Text>
          <View style={styles.tier}>
            <LinearGradient colors={palette.gradient} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
            <Icon color={palette.ink} name="award" size={13} />
            <Text style={[styles.tierText, { color: palette.ink }]}>{tier.label}</Text>
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
          {TIERS.map((item) => {
            const tone = TIER_COLORS[item.id];
            const on = item.id === tier.id;
            return (
              <View key={item.id} style={[styles.tierBox, on && styles.tierBoxOn]} testID={`tier-${item.id}`}>
                <LinearGradient colors={tone.gradient} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={[StyleSheet.absoluteFill, { opacity: on ? 1 : 0.55 }]} />
                <View style={[styles.tierBadge, { backgroundColor: on ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.4)" }]}>
                  <Icon color={tone.ink} name={on ? "check" : "award"} size={18} />
                </View>
                <Text style={[styles.tierName, { color: tone.ink }]}>{item.label}</Text>
                <Text style={[styles.tierFrom, { color: tone.ink }]}>{item.from === 0 ? "Start" : `${item.from}+ pts`}</Text>
              </View>
            );
          })}
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
  tier: { alignItems: "center", borderRadius: 14, flexDirection: "row", gap: 5, marginTop: 4, overflow: "hidden", paddingHorizontal: 12, paddingVertical: 5 },
  tierBadge: { alignItems: "center", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  tierBox: { alignItems: "center", borderCurve: "continuous", borderRadius: corner.xl, flex: 1, gap: 4, minHeight: 124, overflow: "hidden", paddingHorizontal: space.xs, paddingVertical: space.md },
  tierBoxOn: { boxShadow: "0 10px 22px rgba(30, 42, 56, 0.22)" },
  tierFrom: { fontSize: 12, fontWeight: "700", opacity: 0.85 },
  tierName: { fontSize: 17, fontWeight: "800" },
  tierText: { fontSize: 13, fontWeight: "800" },
  tiers: { flexDirection: "row", gap: space.xs, marginTop: space.sm },
});
