import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button, Chip, Sheet, StatusBadge, useToast } from "@/components";
import { formatRand } from "@/data/format";
import type { Order, ReturnRequest } from "@/data/types";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

const RETURN_REASONS = ["Item does not fit", "Not as described", "Changed my mind", "Damaged or faulty"];
const PROBLEM_REASONS = ["Item arrived damaged", "Something is missing", "Wrong item", "Seller did not show up"];

const STATUS: Record<ReturnRequest["status"], { label: string; tone: "info" | "success" | "danger" | "warning" }> = {
  approved: { label: "Refund approved", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  open: { label: "Waiting for the seller", tone: "warning" },
  replied: { label: "The seller replied", tone: "info" },
};

/** What the student sent about this order and what the seller said back. Shows nothing when they have not reported anything. */
export function ReturnStatus({ order }: { order: Order }) {
  const { state } = useDemoStore();
  const request = state.returns.find((item) => item.orderId === order.id);
  if (!request) return null;
  const look = STATUS[request.status];
  return (
    <View style={styles.status} testID="return-status">
      <View style={styles.statusTop}>
        <Text style={text.cardTitle}>{request.kind === "return" ? "Return requested" : "Problem reported"}</Text>
        <StatusBadge label={look.label} tone={look.tone} />
      </View>
      <Text style={text.bodySmall}>{request.reason}</Text>
      {request.response ? (
        <View style={styles.answer}>
          <Text style={text.caption}>The seller wrote</Text>
          <Text style={text.bodySmall}>{request.response}</Text>
        </View>
      ) : null}
      {request.refundCents ? <Text style={styles.refund}>{formatRand(request.refundCents, { fixed: true })} was added to your wallet.</Text> : null}
    </View>
  );
}

/**
 * Return something or report a problem on a delivered order: pick which, say why, send it. The seller sees it in their Returns and
 * disputes and answers there; a refund goes back to the student's wallet.
 */
export function ReturnSheet({ onClose, order, visible }: { visible: boolean; onClose: () => void; order: Order }) {
  const toast = useToast();
  const { dispatch } = useDemoStore();
  const [kind, setKind] = useState<"return" | "dispute">("return");
  const [reason, setReason] = useState<string | null>(null);
  const reasons = kind === "return" ? RETURN_REASONS : PROBLEM_REASONS;
  return (
    <Sheet onClose={onClose} title="Return or report a problem" visible={visible}>
      <Text style={text.bodySmall}>Tell the seller what went wrong with {order.number}. They reply here.</Text>
      <View style={styles.chips}>
        <Chip label="Return an item" onPress={() => { setKind("return"); setReason(null); }} selected={kind === "return"} testID="kind-return" />
        <Chip label="Report a problem" onPress={() => { setKind("dispute"); setReason(null); }} selected={kind === "dispute"} testID="kind-dispute" />
      </View>
      <View style={styles.chips}>
        {reasons.map((item) => (
          <Chip key={item} label={item} onPress={() => setReason(item)} selected={reason === item} testID={`reason-${item}`} />
        ))}
      </View>
      <Button
        disabled={!reason}
        fullWidth
        label="Send to the seller"
        onPress={() => {
          dispatch({ kind, orderId: order.id, reason: reason ?? "", type: "openReturn" });
          toast.show("Sent. The seller will reply here.");
          onClose();
        }}
        testID="send-return"
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  answer: { backgroundColor: color.surfaceSoft, borderRadius: 12, gap: 2, padding: space.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginVertical: space.xs },
  refund: { color: color.success, fontSize: 13, fontWeight: "700" },
  status: { backgroundColor: color.surface, borderRadius: 16, gap: space.xs, marginTop: space.sm, padding: space.md },
  statusTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
});
