import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { ArtTile, hasArt } from "@/components/art/ProductArt";
import { Button, Icon, Sheet } from "@/components";
import { shortDate, timeOfDay } from "@/data/format";
import type { SellerListing, SellerOrder, SellerOrderStatus } from "@/seller/types";
import { space, text } from "@/theme/tokens";

import type { PillTone } from "./ui";
import { Text } from "./ui";

/** "Today 10:42", "Yesterday 16:05" or "12 Oct, 09:30". */
export function whenLabel(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const day = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diff = Math.round((day(now) - day(at)) / 86_400_000);
  if (diff === 0) return `Today ${timeOfDay(iso)}`;
  if (diff === 1) return `Yesterday ${timeOfDay(iso)}`;
  return `${shortDate(iso)}, ${timeOfDay(iso)}`;
}

/** "Burger & Chips x2", or the first item and a count when there are several. */
export function orderTitle(order: Pick<SellerOrder, "lines">): string {
  const [first, ...rest] = order.lines;
  if (!first) return "Order";
  const one = `${first.title}${first.quantity > 1 ? ` x${first.quantity}` : ""}`;
  return rest.length > 0 ? `${one} +${rest.length} more` : one;
}

export const STATUS_PILL: Record<SellerOrderStatus, { label: string; tone: PillTone }> = {
  accepted: { label: "Accepted", tone: "info" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  declined: { label: "Declined", tone: "danger" },
  done: { label: "Done", tone: "success" },
  new: { label: "New", tone: "info" },
  preparing: { label: "Preparing", tone: "warn" },
  ready: { label: "Ready", tone: "success" },
};

/** The picture beside an order: our drawing of the product when the seller has a listing for it, otherwise a plain tile. */
export function OrderThumb({ listings, order, size = 58 }: { order: Pick<SellerOrder, "lines">; listings: SellerListing[]; size?: number }) {
  const title = order.lines[0]?.title ?? "";
  const artId = listings.find((item) => item.title === title)?.artId;
  return (
    <View style={[styles.thumb, { height: size, width: size }]}>
      {artId && hasArt(artId) ? <ArtTile id={artId} inset={0.06} /> : <Icon color="#FFFFFF" name="package" size={size * 0.42} />}
    </View>
  );
}

export const DECLINE_REASONS = ["Sold out", "Too busy right now", "Can't meet that time", "Something else"] as const;

/** Why an order is being declined. The buyer is told, and their money goes back. */
export function DeclineSheet({ onClose, onDecline, order }: { order: SellerOrder | null; onClose: () => void; onDecline: (reason: string) => void }) {
  const [picked, setPicked] = useState<string>(DECLINE_REASONS[0]);
  return (
    <Sheet onClose={onClose} title={order ? `Decline ${order.number}` : "Decline"} visible={Boolean(order)}>
      <Text style={text.body}>The buyer is told why, and is refunded in full.</Text>
      <View style={styles.reasons}>
        {DECLINE_REASONS.map((reason) => (
          <Button key={reason} label={reason} onPress={() => setPicked(reason)} size="md" testID={`reason-${reason}`} variant={picked === reason ? "primary" : "soft"} />
        ))}
      </View>
      <Button
        fullWidth
        label="Decline order"
        onPress={() => {
          onDecline(picked);
          onClose();
        }}
        testID="confirm-decline"
        variant="outline"
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  reasons: { gap: space.xs, marginVertical: space.sm },
  thumb: { alignItems: "center", backgroundColor: "#7FA3B2", borderRadius: 14, justifyContent: "center", overflow: "hidden" },
});
