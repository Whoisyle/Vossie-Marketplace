import { useEffect } from "react";

import { liveBackend } from "@/backend/mode";
import { loadSellerState } from "@/seller/live";
import { useDemoStore } from "@/state/DemoStore";

/** How often the live seller state is read again. Real-time updates will replace this. */
export const LIVE_SYNC_MS = 20_000;

/**
 * With the live backend on, keeps the seller screens in step with the database: once when the student signs in and
 * then every twenty seconds, so a new order or an approval shows up without a refresh. Does nothing in the demo.
 */
export function SellerLiveSync() {
  const { dispatch, state } = useDemoStore();
  const signedIn = Boolean(state.profile);
  useEffect(() => {
    if (!liveBackend || !signedIn) return;
    let cancelled = false;
    const load = async () => {
      const patch = await loadSellerState().catch(() => null);
      if (!cancelled && patch) dispatch({ patch, type: "sellerHydrate" });
    };
    void load();
    const timer = setInterval(() => void load(), LIVE_SYNC_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [dispatch, signedIn]);
  return null;
}
