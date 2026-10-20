import { useEffect, useState } from "react";

import type { CourierJob } from "@/courier/types";
import { useDemoStore } from "@/state/DemoStore";

/** The courier's slice of the demo store and the dispatcher, in one hook. */
export function useCourier() {
  const { dispatch, state } = useDemoStore();
  return { courier: state.courier, dispatch, state };
}

/** One job by id, or undefined. */
export function useJob(id: string | undefined): CourierJob | undefined {
  const { state } = useDemoStore();
  return state.courier.jobs.find((job) => job.id === id);
}

/** The time, ticking every `ms`, so a countdown redraws. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}

/** "0:42" for a number of milliseconds left. */
export function mmss(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Good morning, afternoon or evening. */
export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/** The first word of a name, for "Hi, Vumisa". */
export function firstWord(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "15 Oct" for a date, in the short form the designs use. */
export function shortDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "10:42" for a time. */
export function clock(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** "now", "4 min", "3 d": how long ago, as short as the notifications list wants it. */
export function ago(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h`;
  return `${Math.round(minutes / 1440)} d`;
}
