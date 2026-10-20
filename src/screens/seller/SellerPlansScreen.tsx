import { useState } from "react";
import { StyleSheet, Text as RawText, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { BandPanel, Button, Icon, Sheet, useToast, type IconName } from "@/components";
import { dateAndTime, formatRand } from "@/data/format";
import { getPlan, hasPlan, type PlanId } from "@/data/subscriptions";
import { confirmWithBiometrics } from "@/lib/biometric";
import { FEE_PERCENT, LIMITS, PLAN_NAMES, type SellerPlan } from "@/seller/plan";
import { useDemoStore } from "@/state/DemoStore";
import { space, text } from "@/theme/tokens";

import { useSeller } from "./hooks";
import { Pill, SELLER, SellerButton, SellerCard, SellerHeading, SellerScreen, SellerTopBar, Text } from "./ui";

const ORDER: SellerPlan[] = ["free", "plus", "pro"];

/** How each plan card looks: free is plain and light, Plus is the brand teal, Pro is deep ink with a gold touch. */
const LOOK: Record<SellerPlan, { colours: readonly [string, string]; bands: readonly string[]; ink: string; soft: string; chip: string; rule: string; tick: string; tickFg: string; icon: IconName; iconBg: string; iconFg: string; tagline: string }> = {
  free: { bands: ["rgba(56,96,111,0.05)", "rgba(56,96,111,0.04)", "rgba(56,96,111,0.06)"], chip: "rgba(56,96,111,0.12)", colours: ["#F4F8FA", "#DCE6EA"], icon: "package", iconBg: "#FFFFFF", iconFg: "#38606F", ink: "#1E2B33", rule: "rgba(56,96,111,0.2)", soft: "#5F6E76", tagline: "Start selling today", tick: "#38606F", tickFg: "#FFFFFF" },
  plus: { bands: ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0.1)"], chip: "rgba(255,255,255,0.22)", colours: ["#4E7B86", "#2F5A67"], icon: "trending-up", iconBg: "rgba(255,255,255,0.2)", iconFg: "#FFFFFF", ink: "#FFFFFF", rule: "rgba(255,255,255,0.25)", soft: "rgba(255,255,255,0.82)", tagline: "Room to grow", tick: "#FFFFFF", tickFg: "#2F5A67" },
  pro: { bands: ["rgba(255,215,106,0.12)", "rgba(255,255,255,0.05)", "rgba(255,215,106,0.1)"], chip: "rgba(255,215,106,0.22)", colours: ["#2C4150", "#141F29"], icon: "award", iconBg: "rgba(255,215,106,0.22)", iconFg: "#FFD76A", ink: "#FFFFFF", rule: "rgba(255,215,106,0.3)", soft: "rgba(255,255,255,0.75)", tagline: "The full toolkit", tick: "#FFD76A", tickFg: "#141F29" },
};
const PLAN_ID: Record<Exclude<SellerPlan, "free">, PlanId> = { plus: "seller-plus", pro: "seller-pro" };

function perksFor(plan: SellerPlan): string[] {
  const limits = LIMITS[plan];
  const perks = [
    Number.isFinite(limits.products) ? `Up to ${limits.products} products` : "Unlimited products",
    `${FEE_PERCENT[plan]}% fee on each sale`,
    limits.liveReels === 0 ? "No new reels" : Number.isFinite(limits.liveReels) ? `Up to ${limits.liveReels} live reels` : "Unlimited reels",
    plan === "free" ? "Sales analytics" : plan === "plus" ? "Sales and product analytics" : "Sales, product and reel analytics",
  ];
  if (plan !== "free") perks.push("Order search, accept all and auto-accept");
  if (plan === "pro") perks.push("Returning buyer flags for your marketing", "Featured listings in Explore", "Priority support");
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
          const look = LOOK[plan];
          const rank = ORDER.indexOf(plan) - ORDER.indexOf(current);
          return (
            <Animated.View entering={FadeInDown.delay(index * 90).duration(380)} key={plan}>
              <BandPanel bands={look.bands} colours={look.colours} ring={plan !== "free"} style={[styles.plan, here && styles.planHere]}>
                <View style={styles.planTop} testID={`plan-${plan}`}>
                  <View style={[styles.planIcon, { backgroundColor: look.iconBg }]}>
                    <Icon color={look.iconFg} name={look.icon} size={22} />
                  </View>
                  <View style={styles.flex}>
                    <RawText style={[styles.planName, { color: look.ink }]}>{PLAN_NAMES[plan]}</RawText>
                    <RawText style={[styles.planTag, { color: look.soft }]}>{look.tagline}</RawText>
                  </View>
                  {plan === "plus" && !here ? (
                    <View style={styles.popular}>
                      <RawText style={styles.popularText}>Most popular</RawText>
                    </View>
                  ) : null}
                  {here ? (
                    <View style={styles.hereBadge}>
                      <Icon color="#1E7A4A" name="check-circle" size={13} />
                      <RawText style={styles.hereText}>Your plan</RawText>
                    </View>
                  ) : null}
                </View>
                <View style={styles.priceRow}>
                  <RawText style={[styles.priceBig, { color: look.ink }]}>{price === 0 ? "R 0" : formatRand(price)}</RawText>
                  <RawText style={[styles.priceUnit, { color: look.soft }]}>{price === 0 ? "forever" : "a month"}</RawText>
                  <View style={[styles.feeChip, { backgroundColor: look.chip }]}>
                    <RawText style={[styles.feeText, { color: look.ink }]}>{FEE_PERCENT[plan]}% fee</RawText>
                  </View>
                </View>
                <View style={[styles.rule, { backgroundColor: look.rule }]} />
                {perksFor(plan).map((perk, perkIndex) => (
                  <Animated.View entering={FadeInDown.delay(index * 90 + 160 + perkIndex * 50).duration(300)} key={perk} style={styles.perk}>
                    <View style={[styles.tick, { backgroundColor: look.tick }]}>
                      <Icon color={look.tickFg} name="check" size={11} />
                    </View>
                    <RawText style={[styles.perkText, { color: look.ink }]}>{perk}</RawText>
                  </Animated.View>
                ))}
                {here ? null : plan === "free" ? (
                  <SellerButton label="Switch to Free" onPress={() => setLeaving(true)} size="sm" style={styles.planButton} testID="choose-free" variant="light" />
                ) : (
                  <SellerButton label={rank > 0 ? `Choose ${PLAN_NAMES[plan]}` : `Switch to ${PLAN_NAMES[plan]}`} onPress={() => setChoosing(plan)} size="sm" style={styles.planButton} testID={`choose-${plan}`} variant="light" />
                )}
              </BandPanel>
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
  perk: { alignItems: "center", flexDirection: "row", gap: 10 },
  perkText: { flex: 1, fontSize: 14 },
  feeChip: { borderRadius: 12, marginLeft: "auto", paddingHorizontal: 10, paddingVertical: 4 },
  feeText: { fontSize: 12, fontWeight: "800" },
  hereBadge: { alignItems: "center", backgroundColor: "#DDF2E5", borderRadius: 12, flexDirection: "row", gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  hereText: { color: "#1E7A4A", fontSize: 11, fontWeight: "800" },
  plan: { borderRadius: 24, gap: 10, padding: 18 },
  planButton: { alignSelf: "flex-start", marginTop: 6 },
  planHere: { borderColor: "#FFFFFF", borderWidth: 2 },
  planIcon: { alignItems: "center", borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  planName: { fontSize: 20, fontWeight: "800" },
  planTag: { fontSize: 13 },
  planTop: { alignItems: "center", flexDirection: "row", gap: 12 },
  popular: { backgroundColor: "#FFD76A", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  popularText: { color: "#5C3D00", fontSize: 11, fontWeight: "800" },
  priceBig: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  priceRow: { alignItems: "baseline", flexDirection: "row", gap: 6 },
  priceUnit: { fontSize: 14 },
  rule: { height: 1 },
  tick: { alignItems: "center", borderRadius: 9, height: 18, justifyContent: "center", width: 18 },
  stack: { gap: 12, marginTop: 14 },
  warn: { color: "#B4544A" },
});
