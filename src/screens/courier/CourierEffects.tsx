import { useEffect } from "react";

import { withinHours } from "@/courier/schedule";
import { activeJobs } from "@/courier/state";
import { dateKey } from "@/seller/schedule";
import { useDemoStore } from "@/state/DemoStore";

import { useNow } from "./hooks";

/** How long after a document goes in for review the demo review clears the next check. */
export const COURIER_REVIEW_MS = 4_500;
/** How often the courier moves along the road in the demo, and how much of the road each step covers. */
export const COURIER_STEP_MS = 500;
export const COURIER_STEP = 1 / 90;

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

  // the working hours end: go offline with a notice, unless the courier started outside them on purpose or is in the middle of a delivery
  const now = useNow(20_000);
  const clock = new Date(now);
  const hoursOver = courier.online && courier.status === "approved" && courier.schedule.autoOffline && !withinHours(courier.schedule, clock) && courier.schedule.overrideOn !== dateKey(clock) && activeJobs(courier).length === 0;
  useEffect(() => {
    if (enabled && hoursOver) dispatch({ type: "courierAutoOffline" });
  }, [dispatch, enabled, hoursOver]);

  // a break ends by itself
  const breakUntil = courier.schedule.breakUntil;
  useEffect(() => {
    if (!enabled || !breakUntil) return;
    const timer = setTimeout(() => dispatch({ type: "courierEndBreak" }), Math.max(250, new Date(breakUntil).getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [breakUntil, dispatch, enabled]);

  // the licence: a reminder when it is about to run out, and again when it has (the reducer sends each once)
  const licenceDate = courier.documents.find((doc) => doc.kind === "licence")?.expiresAt;
  useEffect(() => {
    if (enabled && courier.status === "approved") dispatch({ type: "courierCheckDocuments" });
  }, [courier.status, dispatch, enabled, licenceDate]);

  return null;
}
