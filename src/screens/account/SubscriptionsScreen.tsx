import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, BandPanel, Button, Card, Icon, Screen, Sheet, StatusBadge, useToast } from "@/components";
import { formatRand, longDate } from "@/data/format";
import { getPlan, hasPlan, plans, type Plan } from "@/data/subscriptions";
import { confirmWithBiometrics } from "@/lib/biometric";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, gradient, space, text } from "@/theme/tokens";

const TONES = { ink: gradient.ink, primary: gradient.primary, teal: gradient.teal } as const;

/** A warm accent for the plan that is not slate, so each plan reads as its own. */
const PLAN_COLOURS: Record<string, readonly [string, string]> = {
  plus: ["#40677A", "#2F5A67"],
  "seller-plus": ["#4E7B86", "#385F6B"],
  "seller-pro": ["#2C4150", "#1E2A38"],
  "study-pass": ["#D39A5C", "#B07338"],
};

/** Subscriptions: the plans you are on (and when they renew or end), and the plans you can apply for. */
export function SubscriptionsScreen() {
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const [applying, setApplying] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);

  const current = state.subscriptions.filter((item) => hasPlan(state.subscriptions, item.planId));
  const available = plans.filter((plan) => !hasPlan(state.subscriptions, plan.id));
  const enough = applying ? state.wallet.balanceCents >= applying.priceCents : true;

  const confirm = async () => {
    if (!applying || busy) return;
    setBusy(true);
    const ok = await confirmWithBiometrics(state.settings.biometric, `Confirm ${applying.name}`);
    setBusy(false);
    if (!ok) {
      toast.show("Confirmation cancelled");
      return;
    }
    dispatch({ planId: applying.id, type: "subscribe" });
    toast.show(`You're on ${applying.name}`);
    setApplying(null);
  };

  return (
    <Screen testID="subscriptions-screen">
      <AppHeader back subtitle="Your plans and the ones you can join." title="Subscriptions" />

      <Text style={styles.heading}>Your plans</Text>
      {current.length === 0 ? (
        <Card variant="soft">
          <Text style={text.bodySmall}>You aren&apos;t on a plan yet. Pick one below to start saving.</Text>
        </Card>
      ) : (
        current.map((item) => {
          const plan = getPlan(item.planId);
          return (
            <View key={plan.id} style={styles.current} testID={`current-${plan.id}`}>
              <BandPanel colours={PLAN_COLOURS[plan.id] ?? TONES[plan.tone]} style={StyleSheet.absoluteFill} />
              <View style={styles.row}>
                <View style={styles.badge}>
                  <Icon color={color.onPrimary} name={plan.icon} size={20} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planMeta}>
                    {item.cancelling ? `Ends on ${longDate(item.renewsAt)}` : `${formatRand(plan.priceCents)} a month · renews ${longDate(item.renewsAt)}`}
                  </Text>
                </View>
                <StatusBadge label={item.cancelling ? "Ending" : "Active"} tone={item.cancelling ? "warning" : "success"} />
              </View>
              {plan.perks.map((perk) => (
                <View key={perk} style={styles.perk}>
                  <Icon color={color.onPrimary} name="check" size={14} />
                  <Text style={styles.perkText}>{perk}</Text>
                </View>
              ))}
              <View style={styles.actions}>
                {item.cancelling ? (
                  <Button label="Keep this plan" onPress={() => dispatch({ planId: plan.id, type: "resumeSubscription" })} size="sm" testID={`resume-${plan.id}`} variant="light" />
                ) : (
                  <Button
                    label="Cancel plan"
                    onPress={() => {
                      dispatch({ planId: plan.id, type: "cancelSubscription" });
                      toast.show(`${plan.name} will end on ${longDate(item.renewsAt)}`);
                    }}
                    size="sm"
                    testID={`cancel-${plan.id}`}
                    variant="light"
                  />
                )}
              </View>
            </View>
          );
        })
      )}

      <Text style={styles.heading}>Plans you can apply for</Text>
      {available.length === 0 ? <Text style={text.bodySmall}>You&apos;re on every plan.</Text> : null}
      <View style={styles.list}>
        {available.map((plan) => (
          <Card key={plan.id} style={styles.available} testID={`available-${plan.id}`}>
            <BandPanel colours={PLAN_COLOURS[plan.id] ?? TONES[plan.tone]} style={styles.planHead}>
              <View style={styles.row}>
                <View style={styles.badge}>
                  <Icon color={color.onPrimary} name={plan.icon} size={20} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planMeta}>{plan.audience}</Text>
                </View>
                <Text style={styles.priceOnBand}>{formatRand(plan.priceCents)}/mo</Text>
              </View>
            </BandPanel>
            <Text style={text.bodySmall}>{plan.tagline}</Text>
            {plan.perks.map((perk) => (
              <View key={perk} style={styles.perk}>
                <Icon color={(PLAN_COLOURS[plan.id] ?? TONES[plan.tone])[0]} name="check" size={14} />
                <Text style={[text.bodySmall, styles.flex]}>{perk}</Text>
              </View>
            ))}
            <Button fullWidth label={`Apply for ${plan.name}`} onPress={() => setApplying(plan)} testID={`apply-${plan.id}`} />
          </Card>
        ))}
      </View>
      <Text style={[text.caption, styles.note]}>Demo billing: plans are paid from your Vossie wallet. Prices and perks may change before release.</Text>

      <Sheet onClose={() => setApplying(null)} title={applying ? `Join ${applying.name}` : "Join"} visible={Boolean(applying)}>
        {applying ? (
          <>
            <Text style={text.body}>
              {formatRand(applying.priceCents)} a month, paid from your wallet. You can cancel any time and keep the plan until the end of the month.
            </Text>
            <Text style={text.caption}>Wallet balance: {formatRand(state.wallet.balanceCents)}</Text>
            {!enough ? <Text style={styles.error}>Your wallet balance is too low. Add funds first.</Text> : null}
            <Button disabled={!enough} fullWidth label={`Pay ${formatRand(applying.priceCents)} and join`} loading={busy} onPress={() => void confirm()} testID="confirm-subscribe" />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { alignItems: "flex-start", marginTop: space.xs },
  available: { gap: space.xs, overflow: "hidden" },
  planHead: { borderRadius: corner.lg, marginBottom: space.xxs, padding: space.sm },
  priceOnBand: { color: color.onPrimary, fontSize: 15, fontWeight: "800" },
  badge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  badgeLight: { backgroundColor: color.surfaceIcon },
  current: {
    borderCurve: "continuous",
    borderRadius: corner.xl,
    boxShadow: "0 10px 24px rgba(30, 42, 56, 0.18)",
    gap: space.xs,
    overflow: "hidden",
    padding: space.md,
  },
  error: { color: color.danger, fontSize: 13 },
  flex: { flex: 1 },
  heading: { ...text.sectionTitle, marginBottom: space.xs, marginTop: space.lg },
  list: { gap: space.sm },
  note: { marginTop: space.md },
  perk: { alignItems: "center", flexDirection: "row", gap: 6 },
  perkText: { color: color.onPrimary, flex: 1, fontSize: 13 },
  planMeta: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  planName: { color: color.onPrimary, fontSize: 18, fontWeight: "800" },
  price: { color: color.heading, fontSize: 15, fontWeight: "800" },
  row: { alignItems: "center", flexDirection: "row", gap: space.sm },
});
