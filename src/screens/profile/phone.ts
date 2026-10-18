/** Accepts South African mobile numbers like 071 234 5678 or +27 71 234 5678. */
export function isValidSouthAfricanPhone(value: string): boolean {
  const digits = value.replace(/[\s()-]/g, "");
  return /^(\+27|0)[6-8]\d{8}$/.test(digits);
}

export function formatSouthAfricanPhone(value: string): string {
  const digits = value.replace(/[\s()-]/g, "");
  const local = digits.startsWith("+27") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  if (local.length !== 9) return value.trim();
  return `+27 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
}
