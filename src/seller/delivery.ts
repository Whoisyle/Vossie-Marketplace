import type { IconName } from "@/components";
import type { DeliveryMode } from "@/data/delivery";

/** The ways a seller can offer to get an order to the buyer, in the order they are shown. The same four the buyer chooses from. */
export const SELLER_DELIVERY_MODES: readonly DeliveryMode[] = ["campus-courier", "collection", "hub-to-hub", "third-party"];

/** The answer when a seller has not chosen yet. */
export const DEFAULT_DELIVERY_MODES: readonly DeliveryMode[] = ["campus-courier", "collection"];

/** What each way looks like to the seller: its name, one line about it, an icon and its own colour. */
export const DELIVERY_INFO: Record<DeliveryMode, { label: string; hint: string; icon: IconName; color: string; tint: string }> = {
  "campus-courier": { color: "#2F7DD1", hint: "A Vossie courier on your campus takes it to the student", icon: "truck", label: "Campus courier", tint: "#E3EEFA" },
  collection: { color: "#2E9E6B", hint: "The student picks it up from your collection place", icon: "map-pin", label: "Collection from me", tint: "#E1F4EA" },
  "hub-to-hub": { color: "#E58A2B", hint: "Dropped at a Vossie hub and collected at another campus hub", icon: "repeat", label: "Hub to hub", tint: "#FCEBD8" },
  "third-party": { color: "#7B5BD6", hint: "An outside courier company, for orders to other cities", icon: "send", label: "Third-party courier", tint: "#ECE6FA" },
};

/** Keeps only valid modes, once each, in the order they are shown. */
export function cleanDeliveryModes(modes: readonly string[] | null | undefined): DeliveryMode[] {
  const wanted = new Set(modes ?? []);
  return SELLER_DELIVERY_MODES.filter((mode) => wanted.has(mode));
}
