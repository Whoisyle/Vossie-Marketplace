import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Share, StyleSheet, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon, useToast } from "@/components";
import { formatRand } from "@/data/format";
import { balanceAfter, filterLedger, orderFor, receiptText, referenceFor, statements, statementText, type TxFilter, type TxRange } from "@/seller/receipts";
import type { LedgerEntry } from "@/seller/types";

import { useSeller } from "./hooks";
import { Chips } from "./parts";
import { whenLabel } from "./OrderParts";
import { SellerReceiptPaper } from "./SellerReceiptPaper";
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

/** One receipt, laid out like the buyer's: the amount and status on top, the details, then the paper receipt itself. Share it as text. */
export function SellerReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
  const money = entry.amountCents >= 0;
  const label = entry.kind === "sale" ? "Sale" : entry.kind === "payout" ? "Payout" : "Refund";

  return (
    <SellerScreen
      footer={<SellerButton icon="share-2" label="Share or save receipt" onPress={() => void share(text, "Vossie receipt")} size="lg" testID="share-receipt" variant="solid" />}
      tone="white"
      testID="seller-receipt"
    >
      <SellerTopBar title="Receipt" />
      <View style={styles.hero} testID="receipt-card">
        <View style={[styles.heroIcon, money ? styles.iconIn : styles.iconOut]}>
          <Icon color={money ? "#2F8A57" : "#B4544A"} name={money ? "arrow-down-left" : "arrow-up-right"} size={26} />
        </View>
        <Text style={[styles.big, money ? styles.in : styles.out]}>{formatRand(entry.amountCents, { fixed: true, signed: true })}</Text>
        <Text numberOfLines={2} style={styles.heroLabel}>
          {entry.label}
        </Text>
        <Pill label={entry.kind === "payout" ? entry.note ?? "Paid" : entry.kind === "refund" ? "Refunded" : "Paid to you"} tone={entry.kind === "refund" ? "danger" : "success"} />
      </View>

      <SellerCard style={styles.details} testID="receipt-details">
        <Line label="Type" value={label} />
        <Line label="Date and time" value={whenLabel(entry.createdAt)} />
        <Line label="Reference" value={referenceFor(entry)} />
        <Line label="Balance after" value={formatRand(balanceAfter(view.seller.ledger, entry), { fixed: true })} />
        {entry.note ? <Line label="Details" value={entry.note} /> : null}
      </SellerCard>

      <Text style={styles.heading}>Receipt</Text>
      <SellerReceiptPaper balanceAfterCents={balanceAfter(view.seller.ledger, entry)} bank={view.seller.profile.bank} entry={entry} order={order} store={view.storeName} />
      <View style={styles.receiptActions}>
        {order ? <SellerButton icon="clipboard" label="Open the order" onPress={() => router.push(`/seller/orders/${order.id}` as Href)} size="sm" testID="open-order" variant="light" /> : null}
        <SellerButton icon="life-buoy" label="Report a problem" onPress={() => router.push("/seller/account/support/new" as Href)} size="sm" testID="receipt-problem" variant="outline" />
      </View>
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
  details: { gap: 8, marginTop: 12 },
  heading: { color: SELLER.ink, fontSize: 18, fontWeight: "800", marginTop: 18 },
  hero: { alignItems: "center", gap: 8, marginTop: 14 },
  heroIcon: { alignItems: "center", borderRadius: 30, height: 60, justifyContent: "center", width: 60 },
  heroLabel: { color: SELLER.inkSoft, fontSize: 14, textAlign: "center" },
  iconIn: { backgroundColor: "#DDF2E5" },
  iconOut: { backgroundColor: "#F8DCD8" },
  receiptActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  icon: { alignItems: "center", backgroundColor: "#DDF2E5", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
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
