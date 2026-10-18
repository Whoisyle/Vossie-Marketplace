const MINUTE = 60_000;

export function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * MINUTE).toISOString();
}

export function hoursAgo(hours: number): string {
  return minutesAgo(hours * 60);
}

export function daysAgo(days: number): string {
  return minutesAgo(days * 24 * 60);
}

export function hoursFromNow(hours: number): string {
  return minutesAgo(-hours * 60);
}
