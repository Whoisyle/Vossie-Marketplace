import { useRouter, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, Button, Card, EmptyState, Icon, Screen, StatusBadge, useToast } from "@/components";
import { shortDate } from "@/data/format";
import { voucherProblem, type UserVoucher } from "@/data/phase4";
import { cartTotals, useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

/** Days left until a voucher expires, rounded up; negative once it has expired. */
export function daysLeft(expiresAt: string, now: Date = new Date()): number {
  return Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86_400_000);
}

/** My vouchers: codes with their expiry and minimum spend. Apply one in a tap, or use it at checkout. */
export function VouchersScreen() {
  const router = useRouter();
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
      <AppHeader back subtitle="Promo codes and offers, with their expiry." title="My vouchers" />
      {state.userVouchers.length === 0 ? (
        <EmptyState icon="tag" message="Vouchers you earn or are given will appear here." title="No vouchers yet" />
      ) : null}

      <View style={styles.list}>
        {active.map((voucher) => (
          <VoucherCard key={voucher.code} onApply={() => apply(voucher)} voucher={voucher} />
        ))}
      </View>

      {expired.length > 0 ? (
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

function VoucherCard({ onApply, voucher }: { voucher: UserVoucher; onApply?: () => void }) {
  const left = daysLeft(voucher.expiresAt);
  const expired = left < 0;
  return (
    <Card style={[styles.card, expired && styles.expired]} testID={`voucher-${voucher.code}`} variant="soft">
      <View style={styles.badge}>
        <Icon color={color.onPrimary} name="tag" size={18} />
      </View>
      <View style={styles.flex}>
        <Text style={text.cardTitle}>{voucher.label}</Text>
        <Text style={styles.code}>{voucher.code}</Text>
        <Text style={text.caption}>{voucher.detail}</Text>
        <Text style={[text.caption, !expired && left <= 7 && styles.soon]}>
          {expired ? `Expired ${shortDate(voucher.expiresAt)}` : left <= 7 ? `Ends in ${left} ${left === 1 ? "day" : "days"}` : `Valid until ${shortDate(voucher.expiresAt)}`}
        </Text>
      </View>
      {expired ? <StatusBadge label="Expired" tone="neutral" /> : <Button label="Apply" onPress={onApply ?? (() => undefined)} size="sm" />}
    </Card>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", backgroundColor: color.primary, borderRadius: corner.md, height: 44, justifyContent: "center", width: 44 },
  card: { alignItems: "center", flexDirection: "row", gap: space.sm },
  code: { color: color.accent, fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  expired: { opacity: 0.55 },
  flex: { flex: 1, gap: 1 },
  heading: { ...text.sectionTitle, marginBottom: space.xs, marginTop: space.lg },
  list: { gap: space.xs, marginTop: space.sm },
  soon: { color: color.warning, fontWeight: "700" },
});
