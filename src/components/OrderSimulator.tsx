import { useEffect, useRef } from "react";

import { liveBackend } from "@/backend/mode";
import { useDemoStore } from "@/state/DemoStore";

/**
 * Demo only: moves a freshly placed order through accepted, preparing and on the way (or ready) by itself, so a
 * student can watch the notifications and live tracking without a real seller or courier. Steps are in
 * milliseconds after the order was placed. With the live backend on, sellers and couriers do this, so it stays off.
 */
export const SIMULATED_STEPS: { status: "accepted" | "preparing" | "on-the-way" | "ready"; after: number }[] = [
  { after: 8_000, status: "accepted" },
  { after: 20_000, status: "preparing" },
  { after: 35_000, status: "on-the-way" },
];

/** Orders older than this are history, not something to animate. */
export const SIMULATE_WINDOW_MS = 120_000;

export function OrderSimulator({ enabled = !liveBackend }: { enabled?: boolean }) {
  const { dispatch, state } = useDemoStore();
  const scheduled = useRef(new Set<string>());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!enabled) return;
    for (const order of state.orders) {
      if (order.status !== "placed" || scheduled.current.has(order.id)) continue;
      const age = Date.now() - new Date(order.placedAt).getTime();
      if (age > SIMULATE_WINDOW_MS) continue;
      scheduled.current.add(order.id);
      const door = order.fulfilment === "delivery";
      for (const step of SIMULATED_STEPS) {
        // collection orders end at "ready" instead of "on the way"
        const status = step.status === "on-the-way" && !door ? "ready" : step.status;
        timers.current.push(setTimeout(() => dispatch({ orderId: order.id, status, type: "advanceOrder" }), Math.max(0, step.after - age)));
      }
    }
  }, [dispatch, enabled, state.orders]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  return null;
}
