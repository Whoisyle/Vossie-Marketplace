import { useEffect, useRef } from "react";

import { haptic } from "@/lib/haptics";
import { playSound } from "@/lib/sounds";
import { demoIncomingOrder } from "@/seller/state";
import { useDemoStore } from "@/state/DemoStore";

/** How long after entering seller mode each demo order arrives. */
export const DEMO_ARRIVAL_MS = [40_000, 110_000, 200_000];
/** How often the demo reels gain views. */
export const DEMO_REEL_MS = 12_000;
/** How long after an order is ready a demo courier takes the job. */
export const DEMO_COURIER_MS = 5_000;
/** How often the demo review accepts the next document. */
export const DEMO_REVIEW_MS = 4_500;

/**
 * Demo only, kept apart from the screens so it is easy to remove. It stands in for people and systems that do not
 * exist yet: Vossie Operations reviewing documents, and students ordering. It also gives a new order a buzz and a
 * chime. Listed in docs/DEMO-TO-REAL.md; with the live backend on, none of this runs.
 */
export function SellerDemoEffects({ enabled = true }: { enabled?: boolean }) {
  const { dispatch, state } = useDemoStore();
  const seller = state.seller;
  const reviewing = enabled && seller.status === "pending" && seller.documents.some((doc) => doc.status === "in-review");
  const selling = enabled && state.profile?.role === "seller" && seller.status === "approved" && seller.setupDone;

  useEffect(() => {
    if (!reviewing) return;
    const timer = setInterval(() => dispatch({ type: "sellerReviewTick" }), DEMO_REVIEW_MS);
    return () => clearInterval(timer);
  }, [dispatch, reviewing]);

  useEffect(() => {
    if (!selling) return;
    const timers = DEMO_ARRIVAL_MS.map((ms, n) => setTimeout(() => dispatch({ order: demoIncomingOrder(Date.now(), n), type: "sellerReceiveOrder" }), ms));
    return () => timers.forEach(clearTimeout);
  }, [dispatch, selling]);

  // a courier takes a delivery job a few seconds after the seller marks it ready
  const needsCourier = seller.orders.filter((item) => item.fulfilment === "delivery" && item.status === "ready" && !item.courier).map((item) => item.id).join(",");
  useEffect(() => {
    if (!selling || !needsCourier) return;
    const timers = needsCourier.split(",").map((id) => setTimeout(() => dispatch({ id, type: "sellerAssignCourier" }), DEMO_COURIER_MS));
    return () => timers.forEach(clearTimeout);
  }, [dispatch, needsCourier, selling]);

  // demo only: the live reels slowly collect views, likes and taps
  const liveReels = enabled && state.profile?.role === "seller" && seller.reels.some((item) => item.status === "published");
  const ticks = useRef(0);
  useEffect(() => {
    if (!liveReels) return;
    const timer = setInterval(() => {
      ticks.current += 1;
      dispatch({ n: ticks.current, type: "sellerReelTick" });
    }, DEMO_REEL_MS);
    return () => clearInterval(timer);
  }, [dispatch, liveReels]);

  const waiting = seller.orders.filter((item) => item.status === "new").length;
  const before = useRef(waiting);
  useEffect(() => {
    if (selling && waiting > before.current) {
      haptic.success();
      playSound("success");
    }
    before.current = waiting;
  }, [selling, waiting]);

  return null;
}
