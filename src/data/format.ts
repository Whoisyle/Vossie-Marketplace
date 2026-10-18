/** "R 60" for whole rands, "R 60.50" otherwise; `fixed` always shows cents. */
export function formatRand(cents: number, options?: { fixed?: boolean; signed?: boolean }): string {
  const negative = cents < 0;
  const rands = Math.abs(cents) / 100;
  const showCents = options?.fixed || !Number.isInteger(rands);
  const amount = rands
    .toFixed(showCents ? 2 : 0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const sign = negative ? "- " : options?.signed ? "+ " : "";
  return `${sign}R ${amount}`;
}

export function relativeTime(iso: string, now: number = Date.now()): string {
  const diffMinutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function shortDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function longDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${LONG_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function timeOfDay(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function dateAndTime(iso: string): string {
  return `${shortDate(iso)}, ${timeOfDay(iso)}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "V";
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** "Today", "Yesterday", or the date, for dividers between days in a conversation. */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const day = new Date(iso);
  const startOf = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(day)) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return shortDate(iso);
}
