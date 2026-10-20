import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Button, Icon, Sheet, useToast } from "@/components";
import { dateAndTime, formatRand } from "@/data/format";
import { getPlan, hasPlan, type PlanId } from "@/data/subscriptions";
import { confirmWithBiometrics } from "@/lib/biometric";
import { FEE_PERCENT, LIMITS, PLAN_NAMES, type SellerPlan } from "@/seller/plan";
import { useDemoStore } from "@/state/DemoStore";
import { space, text } from "@/theme/tokens";

import { useSeller } from "./hooks";
import { Pill, SELLER, SellerButton, SellerCard, SellerHeading, SellerScreen, SellerTopBar, Text } from "./ui";

const ORDER: SellerPlan[] = ["free", "plus", "pro"];
const PLAN_ID: Record<Exclude<SellerPlan, "free">, PlanId> = { plus: "seller-plus", pro: "seller-pro" };

function perksFor(plan: SellerPlan): string[] {
  const limits = LIMITS[plan];
  const perks = [
    Number.isFinite(limits.products) ? `Up to ${limits.products} products` : "Unlimited products",
    `${FEE_PERCENT[plan]}% fee on each sale`,
    limits.liveReels === 0 ? "No new reels" : Number.isFinite(limits.liveReels) ? `Up to ${limits.liveReels} live reels` : "Unlimited reels",
    plan === "free" ? "Sales analytics" : plan === "plus" ? "Sales and product analytics" : "Sales, product and reel analytics",
  ];
  if (plan === "pro") perks.push("Featured listings in Explore", "Priority support");
  return perks;
}

/** Seller plans: Free, Seller Plus and Seller Pro, with what each allows, how to join or leave, and what has been billed. */
export function SellerPlansScreen() {
  const { dispatch, state } = useDemoStore();
  const view = useSeller();
  const toast = useToast();
  const [choosing, setChoosing] = useState<Exclude<SellerPlan, "free"> | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const current = view.plan;
  const chosen = choosing ? getPlan(PLAN_ID[choosing]) : null;
  const enough = chosen ? state.wallet.balanceCents >= chosen.priceCents : true;
  const mine = current === "free" ? undefined : state.subscriptions.find((item) => item.planId === PLAN_ID[current]);
  const billing = state.wallet.transactions.filter((item) => item.kind === "subscription" && /Seller/.test(item.label));

  const join = async () => {
    if (!chosen || busy) return;
    setBusy(true);
    const ok = await confirmWithBiometrics(state.settings.biometric, `Confirm ${chosen.name}`);
    setBusy(false);
    if (!ok) return toast.show("Confirmation cancelled");
    dispatch({ planId: chosen.id, type: "subscribe" });
    toast.show(`You are on ${chosen.name}`);
    setChoosing(null);
  };

  return (
    <SellerScreen tone="white" testID="seller-plans">
      <SellerTopBar title="Plans" />
      <SellerCard style={styles.current} testID="current-plan">
        <View style={styles.between}>
          <View style={styles.flex}>
            <Text style={styles.hint}>Your plan</Text>
            <Text style={styles.big}>{PLAN_NAMES[current]}</Text>
            <Text style={styles.hint}>
              {FEE_PERCENT[current]}% fee on each sale
              {mine ? ` · ${mine.cancelling ? "ends" : "renews"} ${dateAndTime(mine.renewsAt).split(",")[0]}` : ""}
            </Text>
          </View>
          <Pill label={current === "free" ? "Free" : mine?.cancelling ? "Ending" : "Active"} tone={current === "free" ? "neutral" : mine?.cancelling ? "warn" : "success"} />
        </View>
      </SellerCard>

      <View style={styles.stack}>
        {ORDER.map((plan, index) => {
          const price = plan === "free" ? 0 : getPlan(PLAN_ID[plan]).priceCents;
          const here = plan === current;
          return (
            <Animated.View entering={FadeInDown.delay(index * 70).duration(320)} key={plan}>
              <SellerCard style={[styles.plan, here && styles.planHere]} testID={`plan-${plan}`}>
                <View style={styles.between}>
                  <Text style={styles.big}>{PLAN_NAMES[plan]}</Text>
                  <Text style={styles.price}>{price === 0 ? "R 0" : `${formatRand(price)} / month`}</Text>
                </View>
                {perksFor(plan).map((perk) => (
                  <View key={perk} style={styles.perk}>
                    <Icon color={SELLER.solid} name="check" size={15} />
                    <Text style={styles.perkText}>{perk}</Text>
                  </View>
                ))}
                {here ? (
                  <Pill label="Your plan" tone="success" />
                ) : plan === "free" ? (
                  <SellerButton label="Switch to Free" onPress={() => setLeaving(true)} size="sm" testID="choose-free" variant="outline" />
                ) : (
                  <SellerButton label={ORDER.indexOf(plan) > ORDER.indexOf(current) ? `Choose ${PLAN_NAMES[plan]}` : `Switch to ${PLAN_NAMES[plan]}`} onPress={() => setChoosing(plan)} size="sm" testID={`choose-${plan}`} variant="solid" />
                )}
              </SellerCard>
            </Animated.View>
          );
        })}
      </View>

      <SellerHeading>Billing</SellerHeading>
      <View style={styles.stack} testID="billing">
        {billing.length === 0 ? (
          <SellerCard>
            <Text style={styles.hint}>Nothing billed yet. Paid plans are charged to your Vossie wallet.</Text>
          </SellerCard>
        ) : (
          billing.map((item) => (
            <SellerCard key={item.id} style={styles.between}>
              <View style={styles.flex}>
                <Text style={styles.name}>{item.label}</Text>
                <Text style={styles.hint}>{dateAndTime(item.createdAt)}</Text>
              </View>
              <Text style={styles.name}>{formatRand(item.amountCents, { fixed: true })}</Text>
            </SellerCard>
          ))
        )}
      </View>
      <Text style={styles.note}>Prices and limits are demo values until confirmed. Paid plans are bought with your Vossie wallet.</Text>

      <Sheet onClose={() => setChoosing(null)} title={chosen ? chosen.name : "Plan"} visible={Boolean(chosen)}>
        {chosen ? (
          <>
            <Text style={text.body}>
              {formatRand(chosen.priceCents)} a month, charged now from your Vossie wallet ({formatRand(state.wallet.balanceCents, { fixed: true })} available).
            </Text>
            {!enough ? <Text style={[text.body, styles.warn]}>Your wallet is too low. Add money to your wallet first.</Text> : null}
            <Button disabled={!enough} fullWidth label={`Pay ${formatRand(chosen.priceCents)} and join`} loading={busy} onPress={() => void join()} testID="confirm-plan" />
          </>
        ) : null}
      </Sheet>
      <Sheet onClose={() => setLeaving(false)} title="Switch to Free" visible={leaving}>
        <Text style={text.body}>Your paid plan keeps working until the end of the month you paid for. After that you are on Free: 10 products, a 5% fee and no new reels.</Text>
        <Button
          fullWidth
          label="Stop my paid plan"
          onPress={() => {
            for (const id of Object.values(PLAN_ID)) if (hasPlan(state.subscriptions, id)) dispatch({ planId: id, type: "cancelSubscription" });
            setLeaving(false);
            toast.show("Your plan will end at the end of the month");
          }}
          testID="confirm-leave"
          variant="outline"
        />
      </Sheet>
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  between: { alignItems: "center", flexDirection: "row", gap: space.sm, justifyContent: "space-between" },
  big: { color: SELLER.ink, fontSize: 20, fontWeight: "800" },
  current: { marginTop: 14 },
  flex: { flex: 1, gap: 2 },
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  name: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  note: { color: SELLER.inkSoft, fontSize: 12, marginTop: 14, textAlign: "center" },
  perk: { alignItems: "center", flexDirection: "row", gap: 8 },
  perkText: { color: SELLER.ink, flex: 1, fontSize: 14 },
  plan: { gap: 10 },
  planHere: { borderColor: SELLER.solid, borderWidth: 1.5 },
  price: { color: SELLER.solid, fontSize: 15, fontWeight: "800" },
  stack: { gap: 12, marginTop: 14 },
  warn: { color: "#B4544A" },
});
