import { useMemo, useState } from "react";

import type { Conversation } from "@/data/types";
import { activeListings, attentionItems, isLowStock, orderCounts, weekBars, weekTotals } from "@/seller/selectors";
import { averageRating, sellerBalanceCents } from "@/seller/state";
import { useDemoStore } from "@/state/DemoStore";

import { useSellerDispatch } from "./actions";

/** Good morning, afternoon or evening, from the phone's clock. */
export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** The conversations buyers started with this seller, newest first, ready for lists and the attention panel. */
export function useBuyerMessages() {
  const { state } = useDemoStore();
  return useMemo(
    () =>
      state.conversations
        .filter((item: Conversation) => item.kind === "buyer")
        .map((item) => {
          const last = item.messages[item.messages.length - 1];
          return { at: last?.sentAt ?? "", id: item.id, name: item.name, preview: last?.body ?? "", unread: item.unread };
        })
        .sort((a, b) => b.at.localeCompare(a.at)),
    [state.conversations],
  );
}

/**
 * Everything the seller screens read from the store in one place: the seller state, whether they may trade yet,
 * and the numbers the cards show. Recomputed when the underlying data changes, not on every render.
 */
export function useSeller() {
  const { state } = useDemoStore();
  const dispatch = useSellerDispatch();
  const messages = useBuyerMessages();
  const seller = state.seller;
  const canTrade = seller.status === "approved";
  // the clock the week charts are measured against; fixed for the life of the screen
  const [now] = useState(() => Date.now());
  return useMemo(() => {
    return {
      attention: attentionItems(seller, messages),
      available: sellerBalanceCents(seller),
      bars: weekBars(seller, now),
      canTrade,
      counts: orderCounts(seller.orders),
      dispatch,
      firstName: state.profile?.fullName.split(" ")[0] ?? "there",
      listingsActive: activeListings(seller.listings).length,
      lowStock: seller.listings.filter(isLowStock).length,
      rating: averageRating(seller.reviewCounts),
      messages,
      seller,
      storeName: seller.profile.storeName || "Your store",
      unreadAlerts: seller.alerts.filter((item) => !item.read).length,
      unreadMessages: messages.filter((item) => item.unread).length,
      week: weekTotals(seller, now),
    };
  }, [canTrade, dispatch, messages, now, seller, state.profile?.fullName]);
}
