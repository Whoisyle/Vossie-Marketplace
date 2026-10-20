import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon, useToast } from "@/components";
import { formatRand } from "@/data/format";
import { LIMITS, PLAN_NAMES } from "@/seller/plan";
import { goalProgress, suggestedGoal } from "@/seller/selectors";

import { useSeller } from "./hooks";
import { UpgradeSheet } from "./SellerReelsScreens";
import { Pill, SELLER, SellerButton, SellerCard, SellerHeading, SellerScreen, SellerTopBar, Text } from "./ui";

function Stepper({ label, onChange, suffix, testID, value }: { label: string; value: number; onChange: (value: number) => void; suffix: string; testID: string }) {
  return (
    <View style={styles.step}>
      <Text style={styles.hint}>{label}</Text>
      <View style={styles.stepRow}>
        <SellerButton icon="minus" label="" onPress={() => onChange(Math.max(0, value - 50))} size="sm" testID={`${testID}-minus`} variant="light" />
        <Text style={styles.big} testID={`${testID}-value`}>
          {value === 0 ? "No limit" : `${suffix}${value}`}
        </Text>
        <SellerButton icon="plus" label="" onPress={() => onChange(value + 50)} size="sm" testID={`${testID}-plus`} variant="light" />
      </View>
    </View>
  );
}

/** Order rules: let the store take orders by itself, in the cases the seller allows. Auto-accept is a Seller Plus tool. */
export function SellerRulesScreen() {
  const router = useRouter();
  const view = useSeller();
  const rule = view.seller.settings.autoAccept;
  const allowed = LIMITS[view.plan].tools.autoAccept;
  const [locked, setLocked] = useState(false);
  const save = (patch: Partial<typeof rule>) => {
    if (!allowed) return setLocked(true);
    view.dispatch({ rule: { ...rule, ...patch }, type: "sellerSetAutoAccept" });
  };

  return (
    <SellerScreen tone="white" testID="seller-rules">
      <SellerTopBar title="Order rules" />
      <Text style={styles.sub}>Let your store take orders while you are busy packing.</Text>

      {!allowed ? (
        <SellerCard onPress={() => router.push("/seller/account/plans" as Href)} style={styles.lock} testID="rules-locked">
          <Icon color={SELLER.solid} name="lock" size={20} />
          <View style={styles.flex}>
            <Text style={styles.name}>Auto-accept is a Seller Plus tool</Text>
            <Text style={styles.hint}>You are on {PLAN_NAMES[view.plan]}. See the plans.</Text>
          </View>
          <Pill label="Plus" tone="info" />
        </SellerCard>
      ) : null}

      <SellerCard style={styles.stack} testID="auto-accept-card">
        <View style={styles.between}>
          <View style={styles.flex}>
            <Text style={styles.name}>Accept orders automatically</Text>
            <Text style={styles.hint}>The buyer is told straight away. You still pack and hand over.</Text>
          </View>
          <Switch accessibilityLabel="Accept orders automatically" onValueChange={(value) => save({ on: value })} testID="auto-on" thumbColor="#FFFFFF" trackColor={{ false: "#C3CED3", true: SELLER.solid }} value={rule.on && allowed} />
        </View>
      </SellerCard>

      <SellerHeading>Only when</SellerHeading>
      <Animated.View entering={FadeInDown.duration(300)} style={styles.stack}>
        <SellerCard style={styles.between}>
          <View style={styles.flex}>
            <Text style={styles.name}>The store is open</Text>
            <Text style={styles.hint}>Orders that arrive while closed wait for you.</Text>
          </View>
          <Switch accessibilityLabel="Only when the store is open" onValueChange={(value) => save({ onlyWhenOpen: value })} testID="auto-open" thumbColor="#FFFFFF" trackColor={{ false: "#C3CED3", true: SELLER.solid }} value={rule.onlyWhenOpen} />
        </SellerCard>
        <SellerCard style={styles.between}>
          <View style={styles.flex}>
            <Text style={styles.name}>Everything is in stock</Text>
            <Text style={styles.hint}>An order for something you have run out of is left for you.</Text>
          </View>
          <Switch accessibilityLabel="Only when everything is in stock" onValueChange={(value) => save({ needStock: value })} testID="auto-stock" thumbColor="#FFFFFF" trackColor={{ false: "#C3CED3", true: SELLER.solid }} value={rule.needStock} />
        </SellerCard>
        <SellerCard>
          <Stepper label="Orders up to (R)" onChange={(value) => save({ maxOrderCents: value === 0 ? null : value * 100 })} suffix="R " testID="auto-max" value={rule.maxOrderCents === null ? 0 : Math.round(rule.maxOrderCents / 100)} />
          <Text style={styles.hint}>Bigger orders are left for you to check.</Text>
        </SellerCard>
      </Animated.View>
      <Text style={styles.note}>Rules run on this phone for now. On the live app they run on Vossie&apos;s servers, so they work when your phone is off.</Text>
      <UpgradeSheet kind="orderTools" onClose={() => setLocked(false)} visible={locked} />
      <View />
    </SellerScreen>
  );
}

const GOAL_STEP = 10_000;

/** Weekly goal: the revenue target for the last seven days, with a ring that fills as sales come in. */
export function SellerGoalsScreen() {
  const view = useSeller();
  const toast = useToast();
  const [now] = useState(() => Date.now());
  const progress = goalProgress(view.seller, now);
  const target = view.seller.goals.weeklyRevenueCents;
  const suggestion = suggestedGoal(view.seller, now);
  const set = (cents: number | null) => view.dispatch({ type: "sellerSetGoal", weeklyRevenueCents: cents });

  return (
    <SellerScreen tone="white" testID="seller-goals">
      <SellerTopBar title="Weekly goal" />
      <Text style={styles.sub}>Pick what you would like to sell each week and watch it fill.</Text>

      <SellerCard style={styles.hero} testID="goal-card">
        <View style={styles.ringWrap}>
          <View style={styles.ring}>
            <View style={[styles.ringFill, { height: `${progress?.percent ?? 0}%` }]} />
            <Text style={styles.ringText} testID="goal-percent">
              {progress ? `${progress.percent}%` : "No goal"}
            </Text>
          </View>
        </View>
        <Text style={styles.big}>{progress ? `${formatRand(progress.earnedCents)} of ${formatRand(progress.targetCents)}` : "Set a target"}</Text>
        <Text style={styles.hint}>{progress ? (progress.reached ? "You reached it this week." : `${formatRand(progress.remainingCents)} to go.`) : "Your sales over the last seven days count towards it."}</Text>
      </SellerCard>

      <SellerCard style={styles.stack}>
        <Text style={styles.name}>Target for the week</Text>
        <View style={styles.stepRow}>
          <SellerButton icon="minus" label="" onPress={() => set(Math.max(GOAL_STEP, (target ?? suggestion) - GOAL_STEP))} size="sm" testID="goal-minus" variant="light" />
          <Text style={styles.big} testID="goal-target">
            {target ? formatRand(target) : "None"}
          </Text>
          <SellerButton icon="plus" label="" onPress={() => set((target ?? suggestion) + GOAL_STEP)} size="sm" testID="goal-plus" variant="light" />
        </View>
        <View style={styles.row}>
          <SellerButton label={`Suggest ${formatRand(suggestion)}`} onPress={() => { set(suggestion); toast.show("A little above last week"); }} size="sm" testID="goal-suggest" variant="solid" />
          {target ? <SellerButton label="Clear goal" onPress={() => set(null)} size="sm" testID="goal-clear" variant="outline" /> : null}
        </View>
      </SellerCard>
      <Text style={styles.note}>You are told once, the week you reach it.</Text>
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  between: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  big: { color: SELLER.ink, fontSize: 20, fontWeight: "800" },
  flex: { flex: 1, gap: 2 },
  hero: { alignItems: "center", gap: 6, marginTop: 14, paddingVertical: 22 },
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  lock: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: 12 },
  name: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  note: { color: SELLER.inkSoft, fontSize: 12, marginTop: 14, textAlign: "center" },
  ring: { alignItems: "center", backgroundColor: "#E3ECEF", borderColor: "#B5CAD2", borderRadius: 60, borderWidth: 4, height: 120, justifyContent: "center", overflow: "hidden", width: 120 },
  ringFill: { backgroundColor: "rgba(56,96,111,0.35)", bottom: 0, left: 0, position: "absolute", right: 0 },
  ringText: { color: SELLER.ink, fontSize: 24, fontWeight: "800" },
  ringWrap: { marginBottom: 6 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stack: { gap: 12, marginTop: 12 },
  step: { gap: 6 },
  stepRow: { alignItems: "center", flexDirection: "row", gap: 14 },
  sub: { color: SELLER.inkSoft, fontSize: 14, marginTop: 8 },
});
