import { useRouter, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  AppHeader,
  Button,
  Card,
  EmptyState,
  Chip,
  Icon,
  RadioRow,
  Screen,
  Sheet,
  useToast,
} from "@/components";
import {
  availableModes,
  courierAvailable,
  fulfilmentFor,
  recommendedMode,
  splitByCampus,
} from "@/data/delivery";
import { formatRand } from "@/data/format";
import { getListing } from "@/data/repository";
import { vouchers } from "@/data/mock/account";
import { scheduleSlots, voucherProblem } from "@/data/phase4";
import { confirmWithBiometrics } from "@/lib/biometric";
import { useOnline } from "@/lib/useOnline";
import type { PaymentMethod } from "@/data/types";
import { BrandMark } from "./BrandMark";
import { DeliveryGroup } from "./DeliveryChoice";
import { EftPay } from "./EftPay";
import { TapToPay } from "./TapToPay";
import { PayButton, PROCESSING_MS, SUCCESS_HOLD_MS, type PayState } from "./PayButton";
import { checkPayment, eftBanks } from "./payment";
import { useCartTotals, useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

/** Checkout: address, delivery or collection, payment method, voucher and summary. */
export function CheckoutScreen() {
  const router = useRouter();
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const totals = useCartTotals();
  const { address, cardId, payment, voucherCode } = state.checkout;
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [payState, setPayState] = useState<PayState>("idle");
  const [tapOpen, setTapOpen] = useState(false);
  const [eftOpen, setEftOpen] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [slotDay, setSlotDay] = useState<"Today" | "Tomorrow">("Today");
  const online = useOnline();
  const [now] = useState(() => Date.now());
  const liveVouchers = state.userVouchers.filter((item) => new Date(item.expiresAt).getTime() >= now);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // items from the student's own campus and from other campuses are delivered separately
  const buyerCampus = state.profile?.campusId ?? "potchefstroom";
  const { local, remote } = splitByCampus(buyerCampus, state.cart, (line) => getListing(line.listingId)?.campusId);
  const courierFree = courierAvailable();
  const localModes = availableModes({ courierFree, crossCampus: false });
  const remoteModes = availableModes({ courierFree, crossCampus: true });
  const { deliveryMode, remoteMode, thirdPartyTier } = state.checkout;
  const preferred = state.preferredDelivery;
  const hasLocal = local.length > 0;
  const hasRemote = remote.length > 0;
  // auto-pick: keep each choice if it is still possible, otherwise move to the best available one
  useEffect(() => {
    if (hasLocal && !localModes.includes(deliveryMode)) {
      dispatch({ mode: recommendedMode({ courierFree, crossCampus: false, preferred }), type: "setDeliveryMode" });
    }
    if (hasRemote && !remoteModes.includes(remoteMode)) {
      dispatch({ group: "remote", mode: recommendedMode({ courierFree, crossCampus: true }), type: "setDeliveryMode" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLocal, hasRemote, courierFree, deliveryMode, remoteMode]);
  const needsAddress =
    (hasLocal && fulfilmentFor(deliveryMode) === "delivery") || (hasRemote && fulfilmentFor(remoteMode) === "delivery");
  const names = (lines: typeof state.cart) =>
    [...new Set(lines.map((line) => getListing(line.listingId)?.title ?? "Item"))].join(", ");

  if (state.cart.length === 0 && !placing) {
    return (
      <Screen>
        <AppHeader back title="Checkout" />
        <EmptyState
          actionLabel="Back to Cart"
          icon="shopping-cart"
          message="Add something to your cart before checking out."
          onAction={() => router.replace("/cart")}
          title="Nothing to pay for"
        />
      </Screen>
    );
  }

  const card = state.cards.find((item) => item.id === cardId) ?? state.cards.find((item) => item.isDefault);
  const select = (method: PaymentMethod) => {
    if (method === "card" && !card) {
      router.push("/cart/add-card" as Href);
      return;
    }
    dispatch({ cardId: method === "card" ? card?.id : undefined, payment: method, type: "setPayment" });
  };

  const applyCode = (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!vouchers[code]) {
      setVoucherError("That code isn't valid.");
      return;
    }
    const problem = voucherProblem(state.userVouchers.find((item) => item.code === code), totals.subtotalCents);
    if (problem) {
      setVoucherError(problem);
      return;
    }
    setVoucherError(null);
    dispatch({ code, type: "applyVoucher" });
    setVoucherInput("");
    toast.show(`${vouchers[code].label} applied`);
  };
  const applyVoucher = () => applyCode(voucherInput);

  const pay = () => {
    if (!online) {
      setPayError("You're offline. Reconnect to pay.");
      setPayState("failed");
      return;
    }
    // Apple Pay and Google Pay: the phone's own pay screen takes over, then the order goes through
    if (payment === "apple-pay" || payment === "google-pay") {
      setPayError(null);
      setTapOpen(true);
      return;
    }
    // instant EFT: hand over to the bank to sign in and approve, then the order goes through
    if (payment === "eft") {
      if (!state.checkout.bank) {
        setPayError("Choose your bank to pay by instant EFT.");
        setPayState("failed");
        return;
      }
      setPayError(null);
      setEftOpen(true);
      return;
    }
    if (state.settings.biometric) {
      setPayError(null);
      void confirmWithBiometrics(true, "Confirm your payment").then((ok) => {
        if (ok) startPayment();
        else {
          setPayError("Payment cancelled. Face ID or your passcode wasn't confirmed.");
          setPayState("failed");
        }
      });
      return;
    }
    startPayment();
  };

  const startPayment = () => {
    const outcome = checkPayment({
      bank: state.checkout.bank,
      hasCard: Boolean(card),
      method: payment,
      totalCents: totals.totalCents,
      walletCents: state.wallet.balanceCents,
    });
    setPayError(null);
    setPayState("processing");
    timers.current.push(
      setTimeout(() => {
        if (!outcome.ok) {
          setPayError(outcome.reason);
          setPayState("failed");
          return;
        }
        setPlacing(true);
        setPayState("success");
        dispatch({ type: "placeOrder" });
        timers.current.push(setTimeout(() => router.replace("/cart/confirmation" as Href), SUCCESS_HOLD_MS));
      }, PROCESSING_MS),
    );
  };

  return (
    <Screen
      footer={
        <>
          {payError ? (
            <Text accessibilityLiveRegion="polite" style={styles.payError}>
              {payError}
            </Text>
          ) : null}
          <PayButton
            label={`Pay Now · ${formatRand(totals.totalCents, { fixed: true })}`}
            onPress={pay}
            state={payState}
          />
        </>
      }
    >
      <AppHeader back title="Checkout" />

      <Text style={styles.heading}>How do you want it?</Text>
      {hasLocal ? (
        <DeliveryGroup
          items={names(local)}
          mode={deliveryMode}
          modes={localModes}
          onMode={(mode) => dispatch({ mode, type: "setDeliveryMode" })}
          onTier={(tier) => dispatch({ tier, type: "setThirdPartyTier" })}
          testPrefix="mode"
          tier={thirdPartyTier}
          title={hasRemote ? "From your campus" : "Delivery"}
        />
      ) : null}
      {hasRemote ? (
        <DeliveryGroup
          items={names(remote)}
          mode={remoteMode}
          modes={remoteModes}
          onMode={(mode) => dispatch({ group: "remote", mode, type: "setDeliveryMode" })}
          onTier={(tier) => dispatch({ tier, type: "setThirdPartyTier" })}
          testPrefix="remote"
          tier={thirdPartyTier}
          title="From another campus"
        />
      ) : null}
      {hasRemote ? (
        <Text style={styles.hint}>
          Items from another campus travel hub to hub and are collected at your campus hub. A third-party courier can bring them faster for a higher fee.
        </Text>
      ) : !courierFree ? (
        <Text style={styles.hint}>Vossie couriers are off duty right now, so a third-party courier is offered.</Text>
      ) : null}

      {needsAddress ? (
        <>
          <Text style={styles.heading}>Delivery Address</Text>
          <Card onPress={() => router.push("/cart/address" as Href)} style={styles.addressCard} variant="soft">
            <Icon name="map-pin" size={18} />
            <Text numberOfLines={2} style={styles.addressText}>
              {address}
            </Text>
            <Text style={styles.edit}>{state.checkout.addressPoint ? "Change" : "Pin on map"}</Text>
          </Card>
        </>
      ) : null}

      {hasLocal ? (
        <>
          <Text style={styles.heading}>When?</Text>
          <View style={styles.when}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: !state.checkout.scheduledFor }}
              onPress={() => dispatch({ iso: null, type: "setScheduledFor" })}
              style={[styles.whenCard, !state.checkout.scheduledFor && styles.whenOn]}
              testID="when-now"
            >
              <Icon color={!state.checkout.scheduledFor ? color.onPrimary : color.heading} name="zap" size={16} />
              <Text style={[styles.whenText, !state.checkout.scheduledFor && styles.whenTextOn]}>As soon as possible</Text>
            </Pressable>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: Boolean(state.checkout.scheduledFor) }}
              onPress={() => setSlotsOpen(true)}
              style={[styles.whenCard, Boolean(state.checkout.scheduledFor) && styles.whenOn]}
              testID="when-later"
            >
              <Icon color={state.checkout.scheduledFor ? color.onPrimary : color.heading} name="clock" size={16} />
              <Text style={[styles.whenText, Boolean(state.checkout.scheduledFor) && styles.whenTextOn]}>
                {state.checkout.scheduledFor ? slotLabel(state.checkout.scheduledFor) : "Order for later"}
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}

      <Text style={styles.heading}>Payment Method</Text>
      <Card variant="soft">
        <RadioRow
          left={<BrandMark kind="apple-pay" />}
          onPress={() => select("apple-pay")}
          selected={payment === "apple-pay"}
          subtitle="Pay with your Apple Pay account"
          title="Apple Pay"
        />
        <RadioRow
          left={<BrandMark kind="google-pay" />}
          onPress={() => select("google-pay")}
          selected={payment === "google-pay"}
          subtitle="Pay with your Google Pay account"
          title="Google Pay"
        />
        <RadioRow
          left={<BrandMark kind={card?.brand ?? "visa"} />}
          onPress={() => select("card")}
          selected={payment === "card"}
          subtitle={card ? `${card.brand === "visa" ? "Visa" : "Mastercard"} ending ${card.last4}` : "Add a card to pay with"}
          title={card?.brand === "mastercard" ? "Mastercard" : "Visa Card"}
        />
        <RadioRow
          left={<BrandMark kind="wallet" />}
          onPress={() => select("wallet")}
          selected={payment === "wallet"}
          subtitle={`Balance ${formatRand(state.wallet.balanceCents)}`}
          title="Vossie Wallet"
        />
        <RadioRow
          left={<BrandMark kind="eft" />}
          onPress={() => select("eft")}
          selected={payment === "eft"}
          subtitle={state.checkout.bank ? `Pay from ${state.checkout.bank}` : "Pay straight from your bank"}
          title="Instant EFT"
        />
        {payment === "eft" ? (
          <View accessibilityLabel="Choose your bank" style={styles.banks}>
            {eftBanks.map((bank) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: state.checkout.bank === bank }}
                key={bank}
                onPress={() => dispatch({ bank, payment: "eft", type: "setPayment" })}
                style={[styles.bank, state.checkout.bank === bank && styles.bankSelected]}
              >
                <Text style={[styles.bankText, state.checkout.bank === bank && styles.bankTextSelected]}>{bank}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/cart/add-card" as Href)}
          style={styles.addCard}
        >
          <Icon name="plus" size={16} />
          <Text style={styles.addCardText}>Add a new card</Text>
        </Pressable>
      </Card>

      <Text style={styles.heading}>Voucher Code</Text>
      {voucherCode ? (
        <Card style={styles.appliedRow} variant="soft">
          <Icon color={color.success} name="check-circle" size={18} />
          <Text style={styles.addressText}>
            {voucherCode} · {vouchers[voucherCode]?.label}
          </Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => dispatch({ code: null, type: "applyVoucher" })}>
            <Text style={styles.edit}>Remove</Text>
          </Pressable>
        </Card>
      ) : (
        <>
          <View style={styles.voucherRow}>
            <TextInput
              accessibilityLabel="Voucher code"
              autoCapitalize="characters"
              onChangeText={(value) => { setVoucherInput(value); setVoucherError(null); }}
              onSubmitEditing={applyVoucher}
              placeholder="Enter voucher code"
              placeholderTextColor={color.textMuted}
              style={styles.voucherInput}
              value={voucherInput}
            />
            <Button disabled={!voucherInput.trim()} label="Apply" onPress={applyVoucher} size="sm" />
          </View>
          {voucherError ? <Text style={styles.error}>{voucherError}</Text> : null}
          {liveVouchers.length > 0 ? (
            <View style={styles.myVouchers}>
              <Text style={text.caption}>Your vouchers</Text>
              <View style={styles.voucherChips}>
                {liveVouchers.map((item) => (
                    <Chip
                      disabled={Boolean(voucherProblem(item, totals.subtotalCents))}
                      icon="tag"
                      key={item.code}
                      label={`${item.code} · ${item.label}`}
                      onPress={() => applyCode(item.code)}
                      testID={`use-voucher-${item.code}`}
                    />
                  ))}
              </View>
            </View>
          ) : null}
        </>
      )}

      <Card style={styles.benefits} variant="soft">
        <Text style={text.cardTitle}>Monthly Subscriber Benefits</Text>
        <Text style={text.caption}>Subscribers save {formatRand(400)} on every order.</Text>
      </Card>

      <Text style={styles.heading}>Order Summary</Text>
      <Card variant="soft">
        <SummaryRow label="Subtotal" value={formatRand(totals.subtotalCents)} />
        <SummaryRow label="Delivery fee" value={totals.deliveryFeeCents ? formatRand(totals.deliveryFeeCents) : "Free"} />
        {totals.discountCents > 0 ? (
          <SummaryRow label="Discounts" value={`- ${formatRand(totals.discountCents)}`} />
        ) : null}
        <View style={styles.divider} />
        <SummaryRow bold label="Total" value={formatRand(totals.totalCents, { fixed: true })} />
      </Card>

      <Sheet onClose={() => setSlotsOpen(false)} title="Order for later" visible={slotsOpen}>
        <View style={styles.dayRow}>
          {(["Today", "Tomorrow"] as const).map((day) => (
            <Chip key={day} label={day} onPress={() => setSlotDay(day)} selected={slotDay === day} />
          ))}
        </View>
        <View style={styles.slotGrid}>
          {scheduleSlots().filter((slot) => slot.day === slotDay).map((slot) => (
            <Chip
              key={slot.iso}
              label={slot.label}
              onPress={() => {
                dispatch({ iso: slot.iso, type: "setScheduledFor" });
                setSlotsOpen(false);
              }}
              selected={state.checkout.scheduledFor === slot.iso}
              testID={`slot-${slot.label}`}
            />
          ))}
        </View>
        {scheduleSlots().every((slot) => slot.day !== slotDay) ? <Text style={text.bodySmall}>No more slots today. Pick tomorrow.</Text> : null}
        <Text style={text.caption}>The seller is reminded before your time so it is ready when you are.</Text>
      </Sheet>
      {payment === "eft" && state.checkout.bank ? (
        <EftPay
          amountCents={totals.totalCents}
          bank={state.checkout.bank}
          merchant="Vossie Marketplace"
          onCancel={() => {
            setEftOpen(false);
            setPayError(`You declined the payment at ${state.checkout.bank}. No money was taken.`);
            setPayState("failed");
          }}
          onDone={() => {
            setEftOpen(false);
            startPayment();
          }}
          visible={eftOpen}
        />
      ) : null}
      {payment === "apple-pay" || payment === "google-pay" ? (
        <TapToPay
          amountCents={totals.totalCents}
          cardLabel={card ? `${card.brand === "visa" ? "Visa" : "Mastercard"} ending ${card.last4}` : "Vossie"}
          merchant="Vossie Marketplace"
          method={payment}
          onCancel={() => setTapOpen(false)}
          onDone={() => {
            setTapOpen(false);
            startPayment();
          }}
          visible={tapOpen}
        />
      ) : null}
    </Screen>
  );
}

/** "Today 14:30" or "Tomorrow 09:00" for a chosen slot. */
export function slotLabel(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const sameDay = at.toDateString() === now.toDateString();
  const hh = String(at.getHours()).padStart(2, "0");
  const mm = String(at.getMinutes()).padStart(2, "0");
  return `${sameDay ? "Today" : "Tomorrow"} ${hh}:${mm}`;
}

function SummaryRow({ bold = false, label, value }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={bold ? styles.totalLabel : text.bodySmall}>{label}</Text>
      <Text style={bold ? styles.totalLabel : text.bodySmall}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  addCard: { alignItems: "center", flexDirection: "row", gap: space.xs, minHeight: 44, paddingHorizontal: space.xs },
  addCardText: { color: color.link, fontSize: 14, fontWeight: "600" },
  bank: { borderColor: color.borderStrong, borderRadius: corner.pill, borderWidth: 1, justifyContent: "center", minHeight: 36, paddingHorizontal: space.sm },
  bankSelected: { backgroundColor: color.primary, borderColor: color.primary },
  bankText: { color: color.heading, fontSize: 13, fontWeight: "600" },
  bankTextSelected: { color: color.onPrimary },
  banks: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, paddingBottom: space.xs, paddingLeft: space.xl },
  payError: { color: color.danger, fontSize: 13, marginBottom: space.xs, textAlign: "center" },
  hint: { ...text.caption, marginTop: space.xs },
  dayRow: { flexDirection: "row", gap: space.xs, marginBottom: space.sm },
  myVouchers: { gap: space.xxs, marginTop: space.xs },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginBottom: space.sm },
  voucherChips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  when: { flexDirection: "row", gap: space.xs },
  whenCard: { alignItems: "center", backgroundColor: color.surfaceSoft, borderCurve: "continuous", borderRadius: corner.md, flex: 1, flexDirection: "row", gap: 6, minHeight: 52, padding: space.sm },
  whenOn: { backgroundColor: color.accent },
  whenText: { color: color.heading, flex: 1, fontSize: 13, fontWeight: "700" },
  whenTextOn: { color: color.onPrimary },
  addressCard: { alignItems: "center", flexDirection: "row", gap: space.sm },
  addressText: { ...text.body, flex: 1 },
  appliedRow: { alignItems: "center", flexDirection: "row", gap: space.sm },
  benefits: { gap: 2, marginTop: space.md },
  choice: {
    backgroundColor: color.surfaceSoft,
    borderRadius: corner.md,
    flex: 1,
    gap: 2,
    minHeight: 88,
    padding: space.sm,
  },
  choiceLabel: { color: color.heading, fontSize: 15, fontWeight: "700" },
  choiceMeta: { color: color.textSecondary, fontSize: 12 },
  choiceSelected: { backgroundColor: color.accent },
  choiceTextSelected: { color: color.onPrimary },
  divider: { backgroundColor: color.borderStrong, height: 1, marginVertical: space.xs },
  edit: { color: color.link, fontSize: 13, fontWeight: "600" },
  error: { color: color.danger, fontSize: 12, marginTop: space.xxs },
  heading: { ...text.sectionTitle, marginBottom: space.xs, marginTop: space.md },
  row: { flexDirection: "row", gap: space.sm },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalLabel: { color: color.heading, fontSize: 16, fontWeight: "700" },
  voucherInput: {
    backgroundColor: color.surface,
    borderColor: color.border,
    borderRadius: corner.pill,
    borderWidth: 1,
    color: color.text,
    flex: 1,
    fontSize: 14,
    height: 44,
    paddingHorizontal: space.md,
  },
  voucherRow: { alignItems: "center", flexDirection: "row", gap: space.xs },
});
