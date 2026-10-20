import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon, ReceiptBand, StatusBadge, Wordmark } from "@/components";
import { dateAndTime, formatRand } from "@/data/format";
import { referenceFor } from "@/seller/receipts";
import type { LedgerEntry, SellerOrder } from "@/seller/types";
import { seeded } from "@/theme/motion";
import { color, corner, space, text } from "@/theme/tokens";

/**
 * The seller's receipt, set out like the buyer's paper receipt: the Vossie band with the reference and date, who it is with,
 * the items, the lines that add up to what the seller kept, a note about the money, a barcode and the torn edge.
 * It works for a sale, a payout and a refund.
 */
export function SellerReceiptPaper({
  balanceAfterCents,
  bank,
  entry,
  order,
  store,
}: {
  entry: LedgerEntry;
  order?: SellerOrder;
  store: string;
  balanceAfterCents: number;
  bank?: { bankName: string; last4: string };
}) {
  const reference = referenceFor(entry);
  const sale = entry.kind === "sale";
  const payout = entry.kind === "payout";
  const title = sale ? "Sale receipt" : payout ? "Payout receipt" : "Refund receipt";

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.paper} testID="receipt-paper">
      <View style={styles.bandBleed}>
        <ReceiptBand height={64}>
          <Wordmark tone="white" width={96} />
          <View style={styles.right}>
            <Text style={styles.numberOnBand}>{reference}</Text>
            <Text style={styles.dateOnBand}>{dateAndTime(entry.createdAt)}</Text>
          </View>
        </ReceiptBand>
      </View>

      <View style={styles.paidRow}>
        <View style={styles.badge}>
          <Icon color={color.ink} name={sale ? "shopping-bag" : payout ? "arrow-up-right" : "corner-up-left"} size={18} />
        </View>
        <View style={styles.flex}>
          <Text style={text.caption}>{title}</Text>
          <Text numberOfLines={1} style={text.cardTitle}>
            {store}
          </Text>
        </View>
        <StatusBadge icon="check-circle" label={payout ? entry.note ?? "Paid" : sale ? "Paid to you" : "Refunded"} tone={entry.kind === "refund" ? "warning" : "success"} />
      </View>

      {sale && order ? (
        <View style={styles.orderBlock} testID="receipt-order">
          <View style={styles.orderHead}>
            <Text numberOfLines={1} style={[text.cardTitle, styles.flex]}>
              {order.number} · {order.buyerName}
            </Text>
            <StatusBadge icon={order.fulfilment === "delivery" ? "truck" : "map-pin"} label={order.fulfilmentLabel} tone="info" />
          </View>
          {order.lines.map((line) => (
            <View key={`${line.title}-${line.optionLabel ?? ""}`} style={styles.line}>
              <Text numberOfLines={2} style={[text.body, styles.flex]}>
                {line.quantity} × {line.title}
                {line.optionLabel ? ` (${line.optionLabel})` : ""}
              </Text>
              <Text style={styles.value}>{formatRand(line.unitPriceCents * line.quantity)}</Text>
            </View>
          ))}
          <View style={styles.arrival}>
            <Icon color={color.textSecondary} name={order.fulfilment === "delivery" ? "clock" : "map-pin"} size={14} />
            <Text style={styles.arrivalText}>{order.place || "Campus collection"}</Text>
          </View>
        </View>
      ) : null}
      {sale && !order ? <Text style={text.bodySmall}>{entry.note ?? "Sale"}</Text> : null}
      {payout ? (
        <View style={styles.orderBlock}>
          <View style={styles.line}>
            <Text style={[text.body, styles.flex]}>To</Text>
            <Text style={styles.value}>{bank ? `${bank.bankName} ending ${bank.last4}` : "Your bank account"}</Text>
          </View>
          <View style={styles.line}>
            <Text style={[text.body, styles.flex]}>Usually arrives</Text>
            <Text style={styles.value}>1 to 3 working days</Text>
          </View>
        </View>
      ) : null}
      {entry.kind === "refund" ? (
        <View style={styles.orderBlock}>
          <View style={styles.line}>
            <Text style={[text.body, styles.flex]}>Reason</Text>
            <Text style={styles.value}>{entry.note ?? "Refund to the buyer"}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.dashed} />
      <View style={styles.totals}>
        {sale && order ? (
          <>
            <Row label="Subtotal" value={formatRand(order.subtotalCents, { fixed: true })} />
            <Row label={order.deliveryFeeCents > 0 ? "Delivery (paid by the buyer, goes to the courier)" : "Delivery"} value={order.deliveryFeeCents > 0 ? formatRand(order.deliveryFeeCents, { fixed: true }) : "None"} />
            <Row label="Vossie platform fee" value={`- ${formatRand(order.feeCents, { fixed: true })}`} />
            <Row bold label="You earned" value={formatRand(entry.amountCents, { fixed: true })} />
          </>
        ) : (
          <Row bold label={payout ? "Paid out" : sale ? "You earned" : "Refunded"} value={formatRand(Math.abs(entry.amountCents), { fixed: true })} />
        )}
        <Row label="Balance after" value={formatRand(balanceAfterCents, { fixed: true })} />
      </View>

      <View style={styles.note} testID="receipt-note">
        <Icon color={color.ink} name={sale ? "dollar-sign" : "info"} size={16} />
        <Text style={styles.noteText}>
          {sale ? "This sale is in your balance. Request a payout any time from Wallet." : payout ? "This payout left your balance and is on its way to your bank." : "This refund came out of your balance and went back to the buyer."}
        </Text>
      </View>

      <View style={styles.dashed} />
      <View style={styles.barcode}>
        {Array.from({ length: 46 }, (_, index) => (
          <View key={index} style={[styles.bar, { width: 1 + Math.round(seeded(index + 5) * 3) }]} />
        ))}
      </View>
      <Text style={styles.barcodeText}>{reference.replace("VM-", "VOSSIE-")}</Text>

      <View pointerEvents="none" style={styles.teeth}>
        {Array.from({ length: 24 }, (_, index) => (
          <View key={index} style={styles.tooth} />
        ))}
      </View>
    </Animated.View>
  );
}

function Row({ bold = false, label, value }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={[bold ? styles.bold : text.bodySmall, styles.flex]}>{label}</Text>
      <Text style={bold ? styles.bold : styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  arrival: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 2 },
  arrivalText: { color: color.textSecondary, flex: 1, fontSize: 12 },
  badge: { alignItems: "center", backgroundColor: color.mist, borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  bandBleed: { marginHorizontal: -space.md, marginTop: -space.md },
  bar: { backgroundColor: color.ink, height: 40 },
  barcode: { alignItems: "center", flexDirection: "row", gap: 2, height: 40, justifyContent: "center", overflow: "hidden" },
  barcodeText: { color: color.textMuted, fontSize: 11, letterSpacing: 2, textAlign: "center" },
  bold: { color: color.heading, fontSize: 16, fontWeight: "800" },
  dashed: { borderColor: color.borderStrong, borderStyle: "dashed", borderTopWidth: 1.5, marginVertical: space.xs },
  dateOnBand: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  flex: { flex: 1 },
  line: { alignItems: "flex-start", flexDirection: "row", gap: space.sm, justifyContent: "space-between", paddingVertical: 2 },
  note: { alignItems: "center", backgroundColor: color.mist, borderRadius: corner.md, flexDirection: "row", gap: space.xs, padding: space.sm },
  noteText: { color: color.ink, flex: 1, fontSize: 13, fontWeight: "600" },
  numberOnBand: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  orderBlock: { gap: 4, marginTop: space.xs },
  orderHead: { alignItems: "center", flexDirection: "row", gap: space.xs },
  paidRow: { alignItems: "center", backgroundColor: color.surfaceSoft, borderCurve: "continuous", borderRadius: corner.md, flexDirection: "row", gap: space.sm, padding: space.sm },
  paper: { backgroundColor: color.surface, borderCurve: "continuous", borderRadius: corner.lg, boxShadow: "0 10px 26px rgba(30, 42, 56, 0.14)", gap: space.xs, marginTop: space.md, overflow: "hidden", paddingBottom: space.lg, paddingHorizontal: space.md, paddingTop: space.md },
  right: { alignItems: "flex-end", gap: 1 },
  teeth: { bottom: -1, flexDirection: "row", justifyContent: "space-between", left: 0, position: "absolute", right: 0 },
  tooth: { backgroundColor: "#E9EFF3", borderRadius: 7, height: 14, transform: [{ translateY: 7 }], width: 14 },
  totals: { gap: 2 },
  value: { color: color.text, flexShrink: 1, fontSize: 13, fontWeight: "600", textAlign: "right" },
});
