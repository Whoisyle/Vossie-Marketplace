import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Button, Icon, Sheet, useToast, type IconName } from "@/components";
import { formatRand } from "@/data/format";
import { PROMOTION_KINDS, promotionDetail, promotionProblems, promotionState, type PromotionState } from "@/seller/promotions";
import { dateKey, shortDay } from "@/seller/schedule";
import { sellerId } from "@/seller/state";
import type { PromotionKind, SellerListing, SellerPromotion } from "@/seller/types";
import { space, text } from "@/theme/tokens";

import { SellerField } from "./fields";
import { useSeller } from "./hooks";
import { Chips } from "./parts";
import { Pill, SELLER, SellerButton, SellerCard, SellerScreen, SellerTopBar, SellerWell, Text } from "./ui";

export const PROMO_ICON: Record<PromotionKind, IconName> = { bundle: "package", "buy-x-get-y": "gift", "free-delivery": "truck", "rand-off": "tag", percent: "percent" };

const DAY_MS = 86_400_000;

type Tab = "active" | "scheduled" | "paused" | "ended";

const TABS: { key: Tab; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "scheduled", label: "Scheduled" },
  { key: "paused", label: "Paused" },
  { key: "ended", label: "Ended" },
];

const STATE_PILL: Record<PromotionState, { label: string; tone: "success" | "info" | "warn" | "neutral" }> = {
  active: { label: "Active", tone: "success" },
  ended: { label: "Ended", tone: "neutral" },
  paused: { label: "Paused", tone: "warn" },
  scheduled: { label: "Scheduled", tone: "info" },
};

/** Promotions: every offer with where it is up to, a switch to pause it, and a tap to change it. */
export function SellerPromotionsScreen() {
  const router = useRouter();
  const view = useSeller();
  const [tab, setTab] = useState<Tab>("active");
  const [now] = useState(() => new Date());
  const all = view.seller.promotions;
  const withState = all.map((item) => ({ item, state: promotionState(item, now) }));
  const shown = withState.filter((entry) => entry.state === tab);
  const redemptions = all.reduce((sum, item) => sum + item.redemptions, 0);
  const count = (key: Tab) => withState.filter((entry) => entry.state === key).length;

  return (
    <SellerScreen
      footer={<SellerButton icon="plus" label="Create promotion" onPress={() => router.push("/seller/account/promotion/new" as Href)} size="lg" testID="create-promotion" variant="glass" />}
      tone="white"
      testID="seller-promotions"
    >
      <SellerTopBar title="Promotions" />
      <Text style={styles.sub}>Offers for your buyers</Text>
      <Chips items={TABS.map((entry) => ({ key: entry.key, label: `${entry.label}${count(entry.key) ? ` ${count(entry.key)}` : ""}` }))} onChange={setTab} value={tab} />
      <View style={styles.tiles}>
        <SellerCard style={styles.tile}>
          <Text style={styles.hint}>Redemptions</Text>
          <Text style={styles.big}>{redemptions}</Text>
        </SellerCard>
        <SellerCard style={styles.tile}>
          <Text style={styles.hint}>Sales lift</Text>
          <Text style={[styles.big, styles.good]}>+18%</Text>
        </SellerCard>
      </View>
      <View style={styles.stack}>
        {shown.length === 0 ? (
          <SellerCard testID="promotions-empty">
            <Text style={styles.hint}>Nothing here yet.</Text>
          </SellerCard>
        ) : (
          shown.map(({ item, state }, index) => (
            <Animated.View entering={FadeInDown.delay(index * 60).duration(300)} key={item.id}>
              <SellerCard onPress={() => router.push(`/seller/account/promotion/${item.id}` as Href)} style={styles.row} testID={`promo-${item.id}`}>
                <View style={styles.icon}>
                  <Icon color={SELLER.solid} name={PROMO_ICON[item.kind]} size={20} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.name}>{item.title}</Text>
                  <Text numberOfLines={2} style={styles.hint}>
                    {item.detail}
                  </Text>
                  <View style={styles.pills}>
                    <Pill label={STATE_PILL[state].label} tone={STATE_PILL[state].tone} />
                    {item.redemptions > 0 ? <Pill label={`${item.redemptions} used`} tone="neutral" /> : null}
                  </View>
                </View>
                {state !== "ended" ? (
                  <Switch accessibilityLabel={`${item.title} on`} onValueChange={(value) => view.dispatch({ active: value, id: item.id, type: "sellerTogglePromotion" })} testID={`toggle-${item.id}`} thumbColor="#FFFFFF" trackColor={{ false: "#C3CED3", true: SELLER.solid }} value={item.active} />
                ) : null}
              </SellerCard>
            </Animated.View>
          ))
        )}
      </View>
      <SellerCard style={styles.tip}>
        <Icon color={SELLER.solid} name="star" size={18} />
        <Text style={styles.tipText}>Tip: free delivery lifts orders for sellers like you</Text>
      </SellerCard>
    </SellerScreen>
  );
}

const TEMPLATES: { label: string; make: () => Partial<SellerPromotion> }[] = [
  { label: "First order 10% off", make: () => ({ code: "FIRST10", firstOrderOnly: true, kind: "percent", title: "First order 10% off", value: 10 }) },
  { label: "Free delivery over R150", make: () => ({ kind: "free-delivery", minSpendCents: 15_000, title: "Free delivery over R150" }) },
  { label: "Buy 2 get 1 free", make: () => ({ buyX: 2, code: undefined, getY: 1, kind: "buy-x-get-y", title: "Buy 2 get 1 free" }) },
];

const BLANK: SellerPromotion = { active: true, appliesTo: "store", code: undefined, detail: "", firstOrderOnly: false, id: "", kind: "percent", perStudent: 1, redemptions: 0, title: "", value: 10 };

/** The same few numbers as steppers, so no keyboard is needed for counts and percentages. */
function Stepper({ label, max, min = 0, onChange, step = 1, suffix = "", testID, value }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; suffix?: string; testID: string }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepRow}>
        <SellerButton icon="minus" label="" onPress={() => onChange(Math.max(min, value - step))} size="sm" testID={`${testID}-minus`} variant="light" />
        <Text style={styles.name} testID={`${testID}-value`}>
          {value}
          {suffix}
        </Text>
        <SellerButton icon="plus" label="" onPress={() => onChange(max === undefined ? value + step : Math.min(max, value + step))} size="sm" testID={`${testID}-plus`} variant="light" />
      </View>
    </View>
  );
}

/**
 * Create or change an offer: what kind it is and how much, what it covers, the minimum spend, a code or automatic,
 * the dates and the limits, with a preview of how buyers will see it. An existing offer can also be duplicated or deleted.
 */
export function SellerPromotionFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const toast = useToast();
  const view = useSeller();
  const existing = id && id !== "new" ? view.seller.promotions.find((item) => item.id === id) : undefined;
  const [now] = useState(() => Date.now());
  const today = dateKey(new Date(now));
  const [form, setForm] = useState<SellerPromotion>(existing ?? { ...BLANK, startsAt: today });
  const [automatic, setAutomatic] = useState(existing ? !existing.code : false);
  const [endless, setEndless] = useState(existing ? !existing.endsAt : true);
  const [removing, setRemoving] = useState(false);
  const [errors, setErrors] = useState<ReturnType<typeof promotionProblems>>({});
  const set = (patch: Partial<SellerPromotion>) => setForm((current) => ({ ...current, ...patch }));
  const listings = view.seller.listings.filter((item) => item.status !== "archived");
  const categories = [...new Set(listings.map((item) => item.category))];
  const startOffset = Math.max(0, Math.round((new Date(`${form.startsAt ?? today}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / DAY_MS));
  const length = form.endsAt ? Math.max(1, Math.round((new Date(`${form.endsAt}T00:00:00`).getTime() - new Date(`${form.startsAt ?? today}T00:00:00`).getTime()) / DAY_MS) + 1) : 7;

  const finished = (): SellerPromotion => {
    const code = automatic ? undefined : form.code ? form.code.trim().toUpperCase() : undefined;
    const startsAt = form.startsAt ?? today;
    const endsAt = endless ? undefined : form.endsAt ?? dateKey(new Date(now + 6 * DAY_MS));
    const base: SellerPromotion = { ...form, code, endsAt, startsAt, title: form.title.trim() };
    return { ...base, detail: promotionDetail(base), scheduled: startsAt > today };
  };

  const save = () => {
    const next = finished();
    const found = promotionProblems(next, view.seller.promotions);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (existing) view.dispatch({ promotion: { ...next, id: existing.id }, type: "sellerUpdatePromotion" });
    else view.dispatch({ promotion: { ...next, id: sellerId("pr") }, type: "sellerCreatePromotion" });
    toast.show(existing ? "Promotion saved" : next.scheduled ? "Promotion scheduled" : "Promotion is live");
    router.back();
  };

  const preview = promotionDetail(finished());

  return (
    <SellerScreen
      footer={
        <View style={styles.footer}>
          <SellerButton label={existing ? "Save changes" : "Create promotion"} onPress={save} size="lg" testID="promo-save" variant="glass" />
          {existing ? (
            <View style={styles.footerRow}>
              <SellerButton
                icon="copy"
                label="Duplicate"
                onPress={() => {
                  const copy = finished();
                  view.dispatch({ promotion: { ...copy, active: false, code: copy.code ? `${copy.code.slice(0, 9)}2` : undefined, id: sellerId("pr"), redemptions: 0, title: `${copy.title} (copy)` }, type: "sellerCreatePromotion" });
                  toast.show("Copied. The copy is paused.");
                  router.back();
                }}
                size="sm"
                testID="promo-duplicate"
                variant="light"
              />
              <SellerButton icon="trash-2" label="Delete" onPress={() => setRemoving(true)} size="sm" testID="promo-delete" variant="outline" />
            </View>
          ) : null}
        </View>
      }
      tone="white"
      testID="seller-promotion-form"
    >
      <SellerTopBar title={existing ? "Edit promotion" : "New promotion"} />

      <SellerWell style={styles.preview} testID="promo-preview">
        <View style={styles.icon}>
          <Icon color={SELLER.solid} name={PROMO_ICON[form.kind]} size={22} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.hint}>How buyers see it</Text>
          <Text style={styles.name}>{form.title.trim() || "Your offer"}</Text>
          <Text style={styles.hint}>{preview}</Text>
        </View>
      </SellerWell>

      {!existing ? (
        <View style={styles.block}>
          <Text style={styles.label}>Start from</Text>
          <Chips items={TEMPLATES.map((entry, index) => ({ key: String(index), label: entry.label }))} onChange={(key) => { const made = TEMPLATES[Number(key)]!.make(); set(made); setAutomatic(!made.code); }} prefix="template" value="" />
        </View>
      ) : null}

      <View style={styles.form}>
        <SellerField error={errors.title} label="Name" onChangeText={(value) => set({ title: value })} placeholder="First order 10% off" testID="promo-title" value={form.title} />

        <View style={styles.block}>
          <Text style={styles.label}>Type</Text>
          <Chips items={PROMOTION_KINDS} onChange={(kind) => set({ kind, value: kind === "percent" ? 10 : kind === "rand-off" ? 2000 : kind === "bundle" ? 10_000 : undefined })} prefix="kind" value={form.kind} />
        </View>

        {form.kind === "percent" ? <Stepper label="Percent off" max={90} min={1} onChange={(value) => set({ value })} step={5} suffix="%" testID="promo-percent" value={form.value ?? 10} /> : null}
        {form.kind === "rand-off" ? <Stepper label="Rand off" min={5} onChange={(value) => set({ value: value * 100 })} step={5} suffix=" R" testID="promo-rand" value={Math.round((form.value ?? 2000) / 100)} /> : null}
        {form.kind === "bundle" ? <Stepper label="Bundle price (R)" min={5} onChange={(value) => set({ value: value * 100 })} step={10} testID="promo-bundle" value={Math.round((form.value ?? 10_000) / 100)} /> : null}
        {form.kind === "buy-x-get-y" ? (
          <View style={styles.twoCols}>
            <Stepper label="Buy" min={1} onChange={(value) => set({ buyX: value })} testID="promo-buy" value={form.buyX ?? 2} />
            <Stepper label="Get free" min={1} onChange={(value) => set({ getY: value })} testID="promo-get" value={form.getY ?? 1} />
          </View>
        ) : null}
        {errors.value ? <Text style={styles.error}>{errors.value}</Text> : null}

        <View style={styles.block}>
          <Text style={styles.label}>Applies to</Text>
          <Chips items={[{ key: "store", label: "Whole store" }, { key: "products", label: "Chosen products" }, { key: "category", label: "A category" }]} onChange={(appliesTo) => set({ appliesTo })} prefix="applies" value={form.appliesTo ?? "store"} />
          {form.appliesTo === "products" ? (
            <View style={styles.chips}>
              {listings.map((item: SellerListing) => {
                const on = form.listingIds?.includes(item.id) ?? false;
                return (
                  <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} key={item.id} onPress={() => set({ listingIds: on ? (form.listingIds ?? []).filter((x) => x !== item.id) : [...(form.listingIds ?? []), item.id] })} style={[styles.chip, on && styles.chipOn]} testID={`promo-product-${item.id}`}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{item.title}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {form.appliesTo === "category" ? <Chips items={categories.map((key) => ({ key, label: key[0]!.toUpperCase() + key.slice(1) }))} onChange={(category) => set({ category: category as SellerListing["category"] })} prefix="promo-category" value={form.category ?? ""} /> : null}
          {errors.products ? <Text style={styles.error}>{errors.products}</Text> : null}
        </View>

        <Stepper label="Minimum spend (R)" min={0} onChange={(value) => set({ minSpendCents: value * 100 })} step={10} testID="promo-min" value={Math.round((form.minSpendCents ?? 0) / 100)} />
        <ToggleRow hint="Only a buyer's first order from your store" label="First order only" onChange={(value) => set({ firstOrderOnly: value })} testID="promo-first" value={Boolean(form.firstOrderOnly)} />

        <ToggleRow hint="Applies by itself at checkout" label="No code needed" onChange={setAutomatic} testID="promo-auto" value={automatic} />
        {!automatic ? <SellerField error={errors.code} label="Code" onChangeText={(value) => set({ code: value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} placeholder="VOSSIE10" testID="promo-code" value={form.code ?? ""} /> : null}

        <View style={styles.block}>
          <Text style={styles.label}>Dates</Text>
          <View style={styles.twoCols}>
            <Stepper label="Starts in (days)" min={0} onChange={(value) => { const start = dateKey(new Date(now + value * DAY_MS)); set({ endsAt: endless ? undefined : dateKey(new Date(now + (value + length - 1) * DAY_MS)), startsAt: start }); }} testID="promo-start" value={startOffset} />
            {!endless ? <Stepper label="Runs for (days)" min={1} onChange={(value) => set({ endsAt: dateKey(new Date(now + (startOffset + value - 1) * DAY_MS)) })} testID="promo-length" value={length} /> : null}
          </View>
          <Text style={styles.hint}>
            {shortDay(form.startsAt ?? today)}
            {endless ? " and runs until you switch it off" : ` to ${shortDay(form.endsAt ?? dateKey(new Date(now + 6 * DAY_MS)))}`}
          </Text>
          <ToggleRow hint="No end date" label="Keep it running" onChange={(value) => { setEndless(value); if (!value) set({ endsAt: dateKey(new Date(now + (startOffset + 6) * DAY_MS)) }); }} testID="promo-endless" value={endless} />
          {errors.dates ? <Text style={styles.error}>{errors.dates}</Text> : null}
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Limits</Text>
          <View style={styles.twoCols}>
            <Stepper label="Total uses (0 = no limit)" min={0} onChange={(value) => set({ maxUses: value || undefined })} step={10} testID="promo-max" value={form.maxUses ?? 0} />
            <Stepper label="Per student" min={1} onChange={(value) => set({ perStudent: value })} testID="promo-per" value={form.perStudent ?? 1} />
          </View>
          {errors.limit ? <Text style={styles.error}>{errors.limit}</Text> : null}
        </View>
        {form.minSpendCents ? <Text style={styles.hint}>Needs a spend of {formatRand(form.minSpendCents)} or more.</Text> : null}
        <Text style={styles.note}>Offers are saved here and shown on your store. Applying them at buyer checkout comes with the live backend.</Text>
      </View>

      <Sheet onClose={() => setRemoving(false)} title="Delete this promotion?" visible={removing}>
        <Text style={text.body}>{form.title} will be removed for good.</Text>
        <Button
          fullWidth
          label="Delete promotion"
          onPress={() => {
            if (existing) view.dispatch({ id: existing.id, type: "sellerDeletePromotion" });
            setRemoving(false);
            toast.show("Promotion deleted");
            router.back();
          }}
          testID="promo-confirm-delete"
          variant="outline"
        />
      </Sheet>
    </SellerScreen>
  );
}

function ToggleRow({ hint, label, onChange, testID, value }: { label: string; hint: string; value: boolean; onChange: (value: boolean) => void; testID: string }) {
  return (
    <SellerCard style={styles.toggle}>
      <View style={styles.flex}>
        <Text style={styles.name}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch accessibilityLabel={label} onValueChange={onChange} testID={testID} thumbColor="#FFFFFF" trackColor={{ false: "#C3CED3", true: SELLER.solid }} value={value} />
    </SellerCard>
  );
}

const styles = StyleSheet.create({
  big: { color: SELLER.ink, fontSize: 24, fontWeight: "800" },
  block: { gap: 8 },
  chip: { backgroundColor: "#E9EFF3", borderRadius: 18, boxShadow: "-4px -4px 9px rgba(255,255,255,0.95), 4px 4px 10px rgba(150,166,180,0.45)", paddingHorizontal: 14, paddingVertical: 9 },
  chipOn: { backgroundColor: SELLER.solid },
  chipText: { color: SELLER.inkSoft, fontSize: 14, fontWeight: "700" },
  chipTextOn: { color: "#FFFFFF" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  error: { color: "#B4544A", fontSize: 13, fontWeight: "600" },
  flex: { flex: 1, gap: 2 },
  footer: { gap: 8 },
  footerRow: { flexDirection: "row", gap: space.sm, justifyContent: "center" },
  form: { gap: 16, marginTop: 14 },
  good: { color: "#2F8A57" },
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  icon: { alignItems: "center", backgroundColor: "#DCE6EA", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  label: { color: SELLER.ink, fontSize: 14, fontWeight: "800" },
  name: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  note: { color: SELLER.inkSoft, fontSize: 12, textAlign: "center" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  preview: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: 14, padding: 14 },
  row: { alignItems: "center", flexDirection: "row", gap: 12 },
  stack: { gap: 12, marginTop: 12 },
  step: { gap: 4 },
  stepLabel: { color: SELLER.inkSoft, fontSize: 12, fontWeight: "700" },
  stepRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  sub: { color: SELLER.inkSoft, fontSize: 14 },
  tile: { flexBasis: "47%", flexGrow: 1, gap: 4 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  tip: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 12 },
  tipText: { color: SELLER.ink, flex: 1, fontSize: 14 },
  toggle: { alignItems: "center", flexDirection: "row", gap: 12 },
  twoCols: { flexDirection: "row", flexWrap: "wrap", gap: 28 },
});
