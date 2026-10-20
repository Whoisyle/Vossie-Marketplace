import { useEffect } from "react";

import { useDemoStore } from "@/state/DemoStore";

/** How long after a document goes in for review the demo review clears the next check. */
export const COURIER_REVIEW_MS = 4_500;
/** How often the courier moves along the road in the demo, and how much of the road each step covers. */
export const COURIER_STEP_MS = 1_500;
export const COURIER_STEP = 1 / 30;

/**
 * Demo only, kept apart from the screens so it is easy to remove. It stands in for people and systems that do not exist yet:
 * Vossie Operations clearing the courier's documents, and the courier's phone reporting where it is. It also runs the offer
 * countdowns. Listed in docs/DEMO-TO-REAL.md; with the live backend on, the review and the position come from the server.
 */
export function CourierEffects({ enabled = true }: { enabled?: boolean }) {
  const { dispatch, state } = useDemoStore();
  const courier = state.courier;

  const reviewing = enabled && courier.status === "pending" && courier.documents.some((doc) => doc.status === "in-review");
  useEffect(() => {
    if (!reviewing) return;
    const timer = setInterval(() => dispatch({ type: "courierReviewTick" }), COURIER_REVIEW_MS);
    return () => clearInterval(timer);
  }, [dispatch, reviewing]);

  // offers run out: wake up when the first one is due
  const nextExpiry = courier.jobs
    .filter((job) => job.status === "offered" && job.expiresAt)
    .map((job) => new Date(job.expiresAt!).getTime())
    .sort((a, b) => a - b)[0];
  useEffect(() => {
    if (nextExpiry === undefined) return;
    const timer = setTimeout(() => dispatch({ type: "courierExpireJobs" }), Math.max(250, nextExpiry - Date.now() + 100));
    return () => clearTimeout(timer);
  }, [dispatch, nextExpiry]);

  // the road: a job that is on the way to the buyer, or coming back, advances until it gets there
  const moving = courier.jobs
    .filter((job) => (job.status === "on-the-way" || job.status === "returning") && job.progress < 1)
    .map((job) => `${job.id}:${job.progress.toFixed(2)}`)
    .join(",");
  useEffect(() => {
    if (!enabled || !moving) return;
    const timer = setInterval(() => {
      for (const item of moving.split(",")) {
        const [id, progress] = item.split(":");
        dispatch({ id: id!, progress: Number(progress) + COURIER_STEP, type: "courierProgress" });
      }
    }, COURIER_STEP_MS);
    return () => clearInterval(timer);
  }, [dispatch, enabled, moving]);

  return null;
}
