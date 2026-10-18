import { useRouter, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  AppHeader,
  Button,
  Card,
  EmptyState,
  Icon,
  RadioRow,
  Screen,
  Sheet,
  TextField,
  useToast,
} from "@/components";
import { formatRand } from "@/data/format";
import { vouchers } from "@/data/mock/account";
import type { PaymentMethod } from "@/data/types";
import { BrandMark } from "./BrandMark";
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
  const { address, cardId, fulfilment, payment, voucherCode } = state.checkout;
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressDraft, setAddressDraft] = useState(address);
  const [placing, setPlacing] = useState(false);
  const [payState, setPayState] = useState<PayState>("idle");
  const [payError, setPayError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

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

  const applyVoucher = () => {
    const code = voucherInput.trim().toUpperCase();
    if (!vouchers[code]) {
      setVoucherError("That code isn't valid.");
      return;
    }
    setVoucherError(null);
    dispatch({ code, type: "applyVoucher" });
    setVoucherInput("");
    toast.show(`${vouchers[code].label} applied`);
  };

  const pay = () => {
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

      <Text style={styles.heading}>Delivery Address</Text>
      <Card onPress={() => { setAddressDraft(address); setAddressOpen(true); }} style={styles.addressCard} variant="soft">
        <Icon name="map-pin" size={18} />
        <Text numberOfLines={2} style={styles.addressText}>
          {address}
        </Text>
        <Text style={styles.edit}>Edit</Text>
      </Card>

      <Text style={styles.heading}>Delivery or Collection</Text>
      <View style={styles.row}>
        <Choice
          detail="Approx. 1 hour"
          label="Delivery"
          onPress={() => dispatch({ fulfilment: "delivery", type: "setFulfilment" })}
          price={formatRand(1500)}
          selected={fulfilment === "delivery"}
        />
        <Choice
          detail="Ready in 20 min"
          label="Campus Collection"
          onPress={() => dispatch({ fulfilment: "collection", type: "setFulfilment" })}
          price="Free"
          selected={fulfilment === "collection"}
        />
      </View>

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

      <Sheet onClose={() => setAddressOpen(false)} title="Delivery address" visible={addressOpen}>
        <TextField
          autoCapitalize="words"
          label="Address"
          multiline
          onChangeText={setAddressDraft}
          value={addressDraft}
        />
        <Button
          disabled={addressDraft.trim().length < 5}
          fullWidth
          label="Save address"
          onPress={() => {
            dispatch({ address: addressDraft.trim(), type: "setAddress" });
            setAddressOpen(false);
          }}
        />
      </Sheet>
    </Screen>
  );
}

function Choice({
  detail,
  label,
  onPress,
  price,
  selected,
}: {
  label: string;
  detail: string;
  price: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label}, ${price}, ${detail}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <Text style={[styles.choiceLabel, selected && styles.choiceTextSelected]}>{label}</Text>
      <Text style={[styles.choiceMeta, selected && styles.choiceTextSelected]}>{price}</Text>
      <Text style={[styles.choiceMeta, selected && styles.choiceTextSelected]}>{detail}</Text>
    </Pressable>
  );
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
