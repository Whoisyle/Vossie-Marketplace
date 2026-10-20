import * as Clipboard from "expo-clipboard";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Image } from "expo-image";

import { AppHeader, Button, Card, EmptyState, Icon, Screen, SegmentedTabs, StatusBadge, Ticket, useToast } from "@/components";
import { vouchers as voucherRules } from "@/data/mock/account";
import { getListing } from "@/data/repository";
import { shortDate } from "@/data/format";
import { voucherProblem, type UserVoucher } from "@/data/phase4";
import { promoDefs, promoPercent } from "@/data/promos";
import { REFERRAL_REWARD_POINTS } from "@/data/phase4";
import { useDetail } from "@/lib/paths";
import { cartTotals, useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

/** Days left until a voucher expires, rounded up; negative once it has expired. */
export function daysLeft(expiresAt: string, now: Date = new Date()): number {
  return Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86_400_000);
}

/** My vouchers: codes with their expiry and minimum spend. Apply one in a tap, or use it at checkout. */
export function VouchersScreen() {
  const router = useRouter();
  const open = useDetail();
  const [tab, setTab] = useState<"coupons" | "offers">("coupons");
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const subtotal = cartTotals(state).subtotalCents;

  const active = state.userVouchers.filter((item) => daysLeft(item.expiresAt) >= 0);
  const expired = state.userVouchers.filter((item) => daysLeft(item.expiresAt) < 0);

  const apply = (voucher: UserVoucher) => {
    if (state.cart.length === 0) {
      toast.show("Add something to your cart first, then apply it at checkout");
      return;
    }
    const problem = voucherProblem(voucher, subtotal);
    if (problem) {
      toast.show(problem);
      return;
    }
    dispatch({ code: voucher.code, type: "applyVoucher" });
    toast.show(`${voucher.code} applied`);
    router.push("/cart/checkout" as Href);
  };

  return (
    <Screen testID="vouchers-screen">
      <AppHeader back subtitle="Your codes, and deals from stores and Vossie." title="Coupons and offers" />
      <SegmentedTabs
        onChange={setTab}
        options={[
          { count: active.length, key: "coupons", label: "Coupons" },
          { count: promoDefs.length + 2, key: "offers", label: "Offers" },
        ]}
        value={tab}
      />
      {tab === "offers" ? (
        <View style={styles.list}>
          {promoDefs.map((def, index) => {
            const photo = getListing(def.productId)?.images[0];
            return (
              <Pressable accessibilityRole="button" key={def.id} onPress={() => router.push(open("promo", def.id))} testID={`offer-${def.id}`}>
                <Ticket
                  stub={
                    photo ? (
                      <Image accessibilityLabel={getListing(def.productId)?.title} contentFit="cover" source={photo} style={styles.stubPhoto} />
                    ) : (
                      <Icon color={color.onPrimary} name="percent" size={26} />
                    )
                  }
                  stubColours={STUB_COLOURS[index % STUB_COLOURS.length]!}
                >
                  <View style={styles.flex}>
                    <Text style={text.cardTitle}>{def.title}</Text>
                    <Text style={text.caption}>{def.subtitle}</Text>
                    {promoPercent(def) > 0 ? <Text style={styles.code}>Up to {promoPercent(def)}% off</Text> : null}
                  </View>
                </Ticket>
              </Pressable>
            );
          })}
          <Card onPress={() => router.push("/account/referral" as Href)} style={styles.card} testID="offer-referral" variant="soft">
            <View style={styles.badge}>
              <Icon color={color.onPrimary} name="gift" size={18} />
            </View>
            <View style={styles.flex}>
              <Text style={text.cardTitle}>Refer a friend</Text>
              <Text style={text.caption}>You both earn {REFERRAL_REWARD_POINTS} points after their first delivered order.</Text>
            </View>
            <Icon color={color.textMuted} name="chevron-right" size={18} />
          </Card>
          <Card onPress={() => router.push("/account/subscriptions" as Href)} style={styles.card} testID="offer-plus" variant="soft">
            <View style={styles.badge}>
              <Icon color={color.onPrimary} name="star" size={18} />
            </View>
            <View style={styles.flex}>
              <Text style={text.cardTitle}>Vossie Plus</Text>
              <Text style={text.caption}>R4 off every order, free courier over R100 and double points.</Text>
            </View>
            <Icon color={color.textMuted} name="chevron-right" size={18} />
          </Card>
        </View>
      ) : null}

      {tab === "coupons" && state.userVouchers.length === 0 ? (
        <EmptyState icon="tag" message="Vouchers you earn or are given will appear here." title="No vouchers yet" />
      ) : null}

      {tab === "coupons" ? (
      <View style={styles.list}>
        {active.map((voucher) => (
          <VoucherCard key={voucher.code} onApply={() => apply(voucher)} voucher={voucher} />
        ))}
      </View>
      ) : null}

      {tab === "coupons" && expired.length > 0 ? (
        <>
          <Text style={styles.heading}>Expired</Text>
          <View style={styles.list}>
            {expired.map((voucher) => (
              <VoucherCard key={voucher.code} voucher={voucher} />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

/** What a voucher is worth, in the big print on the ticket stub. */
export function voucherValue(code: string): { big: string; small: string } {
  const rule = voucherRules[code];
  if (rule?.percentOff) return { big: `${rule.percentOff}%`, small: "OFF" };
  if (rule?.centsOff) return { big: `R${Math.round(rule.centsOff / 100)}`, small: "OFF" };
  return { big: "%", small: "DEAL" };
}

/** Stub colours for the tickets: slate, ink and a warm accent, in turn. */
const STUB_COLOURS: readonly (readonly [string, string])[] = [
  ["#40677A", "#2F5A67"],
  ["#2C4150", "#1E2A38"],
  ["#D39A5C", "#B07338"],
];

function VoucherCard({ onApply, voucher }: { voucher: UserVoucher; onApply?: () => void }) {
  const toast = useToast();
  const left = daysLeft(voucher.expiresAt);
  const expired = left < 0;
  const value = voucherValue(voucher.code);
  const colours = STUB_COLOURS[voucher.code.length % STUB_COLOURS.length]!;
  return (
    <Ticket
      dim={expired}
      stub={
        <>
          <Text style={styles.stubBig}>{value.big}</Text>
          <Text style={styles.stubSmall}>{value.small}</Text>
        </>
      }
      stubColours={colours}
      testID={`voucher-${voucher.code}`}
    >
      <View style={styles.ticketRow}>
        <View style={styles.flex}>
          <Text style={text.cardTitle}>{voucher.label}</Text>
          <Text style={styles.code}>{voucher.code}</Text>
          <Text style={text.caption}>{voucher.detail}</Text>
          <Text style={[text.caption, !expired && left <= 7 && styles.soon]}>
            {expired ? `Expired ${shortDate(voucher.expiresAt)}` : left <= 7 ? `Ends in ${left} ${left === 1 ? "day" : "days"}` : `Valid until ${shortDate(voucher.expiresAt)}`}
          </Text>
        </View>
        {expired ? (
          <StatusBadge label="Expired" tone="neutral" />
        ) : (
          <View style={styles.buttons}>
            <Button
              label="Copy"
              onPress={() => {
                void Clipboard.setStringAsync(voucher.code);
                toast.show(`${voucher.code} copied`);
              }}
              size="sm"
              testID={`copy-${voucher.code}`}
              variant="soft"
            />
            <Button label="Apply" onPress={onApply ?? (() => undefined)} size="sm" />
          </View>
        )}
      </View>
    </Ticket>
  );
}

const styles = StyleSheet.create({
  buttons: { gap: 6 },
  badge: { alignItems: "center", backgroundColor: color.primary, borderRadius: corner.md, height: 44, justifyContent: "center", width: 44 },
  card: { alignItems: "center", flexDirection: "row", gap: space.sm },
  code: { color: color.accent, fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  expired: { opacity: 0.55 },
  flex: { flex: 1, gap: 1 },
  heading: { ...text.sectionTitle, marginBottom: space.xs, marginTop: space.lg },
  list: { gap: space.xs, marginTop: space.sm },
  soon: { color: color.warning, fontWeight: "700" },
  stubBig: { color: "#FFFFFF", fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  stubPhoto: { borderColor: "#FFFFFF", borderRadius: 32, borderWidth: 3, height: 64, width: 64 },
  stubSmall: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "800", letterSpacing: 1.5 },
  ticketRow: { alignItems: "center", flexDirection: "row", gap: space.sm },
});
