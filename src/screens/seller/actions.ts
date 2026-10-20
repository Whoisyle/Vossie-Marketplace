import { useCallback, useEffect, useRef } from "react";

import { useToast } from "@/components";
import { liveBackend } from "@/backend/mode";
import { completeHandoffLive, isSellerAction, runLiveSellerAction } from "@/seller/liveActions";
import type { SellerOrder } from "@/seller/types";
import { toServiceError } from "@/services/errors";
import { type DemoAction } from "@/state/demoReducer";
import { useDemoStore } from "@/state/DemoStore";

/**
 * The one way seller screens change anything. In the demo it is the store's own dispatch. With the live backend it
 * also sends seller actions to Supabase and reads the result back; if the server says no, the screen shows why and
 * goes back to what the server holds.
 */
export function useSellerDispatch() {
  const { dispatch, state } = useDemoStore();
  const toast = useToast();
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });
  return useCallback(
    (action: DemoAction) => {
      const before = latest.current;
      dispatch(action);
      if (!liveBackend || !isSellerAction(action)) return;
      runLiveSellerAction(action, before, dispatch).catch((error: unknown) => toast.show(toServiceError(error).message));
    },
    [dispatch, toast],
  );
}

/**
 * Hands an order over. In the demo the code is compared on the phone; with the live backend only the server knows
 * it, so the seller types what the buyer reads out and the server answers.
 */
export function useHandoff() {
  const { dispatch } = useDemoStore();
  const send = useSellerDispatch();
  return useCallback(
    async (order: SellerOrder, code: string): Promise<{ ok: boolean; message?: string }> => {
      if (liveBackend) {
        try {
          return await completeHandoffLive(order.id, code, dispatch);
        } catch (error) {
          return { message: toServiceError(error).message, ok: false };
        }
      }
      if (code.trim() !== order.handoffCode) return { message: "That code does not match. Ask the buyer to read it out again.", ok: false };
      send({ id: order.id, type: "sellerCompleteOrder" });
      return { ok: true };
    },
    [dispatch, send],
  );
}
