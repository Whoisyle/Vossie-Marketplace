import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Share, StyleSheet, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon, useToast } from "@/components";
import { formatRand } from "@/data/format";
import { filterLedger, orderFor, receiptText, referenceFor, statements, statementText, type TxFilter, type TxRange } from "@/seller/receipts";
import type { LedgerEntry } from "@/seller/types";

import { useSeller } from "./hooks";
import { Chips } from "./parts";
import { whenLabel } from "./OrderParts";
import { Pill, SELLER, SellerButton, SellerCard, SellerScreen, SellerTopBar, SellerWell, Text } from "./ui";

/** Shares text through the phone's share sheet, or copies it when there is none (the web). */
export function useShareText() {
  const toast = useToast();
  return async (message: string, title: string) => {
    try {
      const result = await Share.share({ message, title });
      if (result.action === Share.dismissedAction) return;
    } catch {
      await Clipboard.setStringAsync(message);
      toast.show("Copied. Paste it where you want to keep it.");
    }
  };
}

const FILTERS: { key: TxFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sale", label: "Sales" },
  { key: "payout", label: "Payouts" },
  { key: "refund", label: "Refunds" },
];

const RANGES: { key: TxRange; label: string }[] = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "all", label: "All time" },
];

const KIND_ICON = { payout: "arrow-up-right", refund: "corner-up-left", sale: "arrow-down-left" } as const;

/** The row for one transaction, used by the Payouts page and the full list. */
export function TxRow({ entry, onPress }: { entry: LedgerEntry; onPress: () => void }) {
  return (
    <SellerCard onPress={onPress} style={styles.row} testID={`ledger-${entry.id}`}>
      <View style={[styles.icon, entry.amountCents < 0 && styles.iconOut]}>
        <Icon color={entry.amountCents < 0 ? "#B4544A" : "#2F8A57"} name={KIND_ICON[entry.kind]} size={18} />
      </View>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={styles.name}>
          {entry.label}
        </Text>
        <Text numberOfLines={1} style={styles.hint}>
          {entry.note ? `${entry.note} · ` : ""}
          {whenLabel(entry.createdAt)}
        </Text>
      </View>
      <Text style={[styles.amount, entry.amountCents < 0 ? styles.out : styles.in]}>{formatRand(entry.amountCents, { fixed: true, signed: true })}</Text>
    </SellerCard>
  );
}

/** Every sale, payout and refund, with filters, a date range and a search for an order number. Tap one for its receipt. */
export function SellerTransactionsScreen() {
  const router = useRouter();
  const view = useSeller();
  const [filter, setFilter] = useState<TxFilter>("all");
  const [range, setRange] = useState<TxRange>("30");
  const [query, setQuery] = useState("");
  const [now] = useState(() => Date.now());
  const list = filterLedger(view.seller.ledger, filter, range, query, now);

  return (
    <SellerScreen tone="white" testID="seller-transactions">
      <SellerTopBar title="Transactions" />
      <SellerWell style={styles.search}>
        <Icon color={SELLER.inkSoft} name="search" size={18} />
        <TextInput accessibilityLabel="Search transactions" onChangeText={setQuery} placeholder="Search an order number" placeholderTextColor="#8A99A1" style={styles.searchInput} testID="tx-search" value={query} />
      </SellerWell>
      <Chips items={FILTERS} onChange={setFilter} prefix="tx" value={filter} />
      <Chips items={RANGES} onChange={setRange} prefix="range" value={range} />
      <View style={styles.actions}>
        <SellerButton icon="file-text" label="Monthly statements" onPress={() => router.push("/seller/payouts/statements" as Href)} size="sm" testID="open-statements" variant="light" />
      </View>
      {list.length === 0 ? (
        <SellerCard style={styles.empty} testID="tx-empty">
          <Icon color={SELLER.solid} name="inbox" size={26} />
          <Text style={styles.name}>No transactions match</Text>
        </SellerCard>
      ) : (
        <View style={styles.list}>
          {list.map((entry, index) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(300)} key={entry.id}>
              <TxRow entry={entry} onPress={() => router.push(`/seller/payouts/receipt/${entry.id}` as Href)} />
            </Animated.View>
          ))}
        </View>
      )}
    </SellerScreen>
  );
}

/** One receipt: the reference, the items and the fee for a sale, or the bank and amount for a payout. Share it as text. */
export function SellerReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const view = useSeller();
  const share = useShareText();
  const entry = view.seller.ledger.find((item) => item.id === id);
  if (!entry) {
    return (
      <SellerScreen tone="white" testID="seller-receipt-missing">
        <SellerTopBar title="Receipt" />
        <SellerCard style={styles.empty}>
          <Text style={styles.name}>That receipt is not here any more.</Text>
        </SellerCard>
      </SellerScreen>
    );
  }
  const order = orderFor(entry, view.seller.orders);
  const text = receiptText(entry, order, view.storeName, view.seller.profile.bank);

  return (
    <SellerScreen
      footer={<SellerButton icon="share-2" label="Share or save receipt" onPress={() => void share(text, "Vossie receipt")} size="lg" testID="share-receipt" variant="solid" />}
      tone="white"
      testID="seller-receipt"
    >
      <SellerTopBar title="Receipt" />
      <SellerCard style={styles.receipt} testID="receipt-card">
        <View style={styles.between}>
          <Text style={styles.hint}>{entry.kind === "sale" ? "Sale" : entry.kind === "payout" ? "Payout" : "Refund"}</Text>
          <Pill label={entry.kind === "payout" ? entry.note ?? "Paid" : entry.kind === "refund" ? "Refunded" : "Paid to you"} tone={entry.kind === "refund" ? "danger" : "success"} />
        </View>
        <Text style={[styles.big, entry.amountCents < 0 ? styles.out : styles.in]}>{formatRand(entry.amountCents, { fixed: true, signed: true })}</Text>
        <Line label="Reference" value={referenceFor(entry)} />
        <Line label="Date" value={whenLabel(entry.createdAt)} />
        {entry.kind === "sale" && order ? (
          <>
            <Line label="Order" value={order.number} />
            <Line label="Buyer" value={order.buyerName} />
            <View style={styles.rule} />
            {order.lines.map((line) => (
              <Line key={`${line.title}-${line.optionLabel ?? ""}`} label={`${line.quantity} x ${line.title}`} value={formatRand(line.unitPriceCents * line.quantity, { fixed: true })} />
            ))}
            <View style={styles.rule} />
            <Line label="Subtotal" value={formatRand(order.subtotalCents, { fixed: true })} />
            {order.deliveryFeeCents > 0 ? <Line label="Delivery (paid by buyer)" value={formatRand(order.deliveryFeeCents, { fixed: true })} /> : null}
            <Line label="Vossie platform fee" value={formatRand(-order.feeCents, { fixed: true })} />
            <Line bold label="You earned" value={formatRand(entry.amountCents, { fixed: true })} />
          </>
        ) : null}
        {entry.kind === "sale" && !order ? <Line label="Details" value={entry.note ?? "Sale"} /> : null}
        {entry.kind === "payout" ? <Line label="To" value={view.seller.profile.bank ? `${view.seller.profile.bank.bankName} ending ${view.seller.profile.bank.last4}` : "Your bank account"} /> : null}
        {entry.kind === "refund" ? <Line label="Reason" value={entry.note ?? "Refund to the buyer"} /> : null}
      </SellerCard>
      <Text style={styles.note}>Demo receipt. A signed PDF comes with the live backend.</Text>
    </SellerScreen>
  );
}

function Line({ bold, label, value }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.between}>
      <Text style={[styles.hint, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.value, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

/** A statement for each month: sales, fees, refunds and payouts, with a way to share it. */
export function SellerStatementsScreen() {
  const view = useSeller();
  const share = useShareText();
  const list = statements(view.seller.ledger);
  return (
    <SellerScreen tone="white" testID="seller-statements">
      <SellerTopBar title="Statements" />
      <View style={styles.list}>
        {list.length === 0 ? (
          <SellerCard style={styles.empty}>
            <Text style={styles.name}>No statements yet.</Text>
          </SellerCard>
        ) : (
          list.map((item, index) => (
            <Animated.View entering={FadeInDown.delay(index * 60).duration(300)} key={item.key}>
              <SellerCard style={styles.receipt} testID={`statement-${item.key}`}>
                <Text style={styles.name}>{item.title}</Text>
                <Line label="Sales after fees" value={formatRand(item.salesCents, { fixed: true })} />
                <Line label="Vossie fees" value={formatRand(item.feesCents, { fixed: true })} />
                <Line label="Refunds" value={formatRand(-item.refundsCents, { fixed: true })} />
                <Line label="Payouts" value={formatRand(-item.payoutsCents, { fixed: true })} />
                <Line bold label="Left in your balance" value={formatRand(item.netCents, { fixed: true })} />
                <SellerButton icon="share-2" label="Share statement" onPress={() => void share(statementText(item, view.storeName), `Statement ${item.title}`)} size="sm" testID={`share-statement-${item.key}`} variant="light" />
              </SellerCard>
            </Animated.View>
          ))
        )}
      </View>
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", marginTop: 4 },
  amount: { fontSize: 15, fontWeight: "800" },
  big: { fontSize: 32, fontWeight: "800" },
  bold: { color: SELLER.ink, fontWeight: "800" },
  between: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  empty: { alignItems: "center", gap: 6, marginTop: 20, paddingVertical: 28 },
  flex: { flex: 1, gap: 1 },
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  icon: { alignItems: "center", backgroundColor: "#DDF2E5", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  iconOut: { backgroundColor: "#F8DCD8" },
  in: { color: "#2F8A57" },
  list: { gap: 12, marginTop: 12 },
  name: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  note: { color: SELLER.inkSoft, fontSize: 12, marginTop: 14, textAlign: "center" },
  out: { color: "#B4544A" },
  receipt: { gap: 10, marginTop: 12 },
  row: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 64 },
  rule: { backgroundColor: "rgba(95,110,118,0.25)", height: 1 },
  search: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 12, minHeight: 48, paddingHorizontal: 14 },
  searchInput: { color: SELLER.ink, flex: 1, fontSize: 15, paddingVertical: 8 },
  value: { color: SELLER.ink, fontSize: 14, fontWeight: "600", maxWidth: "62%", textAlign: "right" },
});
