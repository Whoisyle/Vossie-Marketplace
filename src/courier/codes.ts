/** Four digits that are the same for the same seed, so a code can be shown in two places. */
export function fourDigits(seed: string, salt: string): string {
  let hash = 7;
  for (const char of `${seed}:${salt}`) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  return String(1000 + (hash % 9000));
}

/** A small number from a text, between 0 and 1, the same every time: for things that should look varied but must not change. */
export function unitOf(seed: string): number {
  let hash = 17;
  for (const char of seed) hash = (hash * 33 + char.charCodeAt(0)) % 100_003;
  return (hash % 1000) / 1000;
}
