/**
 * South African ID numbers: 13 digits, YYMMDD (date of birth), SSSS (gender), C (0 citizen, 1 permanent resident), A (old race
 * digit, now 8 or 9), and a Luhn check digit. This checks the shape, a real date, the citizenship digit and the check digit. It
 * cannot tell whether the number belongs to the person; Vossie Operations checks the ID document itself. The database does the
 * same check (private.is_valid_sa_id) so a wrong number is refused even if the app is bypassed.
 */
export function cleanIdNumber(value: string): string {
  return value.replace(/\s+/g, "");
}

export function isValidSouthAfricanId(value: string): boolean {
  const id = cleanIdNumber(value);
  if (!/^\d{13}$/.test(id)) return false;
  const month = Number(id.slice(2, 4));
  const day = Number(id.slice(4, 6));
  const twoDigitYear = Number(id.slice(0, 2));
  const validDate = (year: number) => {
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  };
  if (!validDate(2000 + twoDigitYear) && !validDate(1900 + twoDigitYear)) return false;
  if (id[10] !== "0" && id[10] !== "1") return false;
  let sum = 0;
  for (let position = 1; position <= 13; position += 1) {
    let digit = Number(id[13 - position]);
    // every second digit from the right is doubled
    if (position % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** 8001015009087 as "800101 5009 087", the way it is usually read out. */
export function formatIdNumber(value: string): string {
  const id = cleanIdNumber(value).slice(0, 13);
  return [id.slice(0, 6), id.slice(6, 10), id.slice(10)].filter(Boolean).join(" ");
}

/** What the app shows once an ID number is saved: only the last four digits. */
export function maskIdNumber(value: string): string {
  const id = cleanIdNumber(value);
  return id.length <= 4 ? id : `${"•".repeat(id.length - 4)}${id.slice(-4)}`;
}
