/**
 * Checks on what a courier types. They check the shape only: a plate that looks like a South African plate, a licence number of the
 * right length and a licence that has not run out. Nothing here asks the national
 * records whether the plate or the licence is real; that needs a verification provider, which is listed in DEMO-TO-REAL.
 */

const PROVINCES = "GP|MP|NW|FS|EC|NC|LP|KZN|WC";

/**
 * A South African number plate in the standard form, or null when it does not look like one. Accepts the three patterns on the road:
 * the provincial one (CA 12 AB GP, ABC 123 GP), the Western Cape one (CA 123-456, CAW 12345) and the KwaZulu-Natal one (ND 123-456).
 */
export function normalisePlate(input: string): string | null {
  const text = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const province = new RegExp(`^([A-Z]{2,3})(\\d{2,3})([A-Z]{2})?(${PROVINCES})$`).exec(text);
  if (province) {
    const [, letters, digits, extra, code] = province;
    return [letters, digits, extra, code].filter(Boolean).join(" ");
  }
  const cape = /^(C[A-Z]{1,2})(\d{3})(\d{3})?$/.exec(text);
  if (cape) return cape[3] ? `${cape[1]} ${cape[2]}-${cape[3]}` : `${cape[1]} ${cape[2]}`;
  const cape5 = /^(C[A-Z]{1,2})(\d{4,6})$/.exec(text);
  if (cape5) return `${cape5[1]} ${cape5[2]}`;
  const natal = /^(N[A-Z]{1,2})(\d{3})(\d{3})?$/.exec(text);
  if (natal) return natal[3] ? `${natal[1]} ${natal[2]}-${natal[3]}` : `${natal[1]} ${natal[2]}`;
  return null;
}

/** A driving licence number as printed on the card: ten to thirteen letters and digits. */
export function validLicenceNumber(value: string): boolean {
  return /^[A-Z0-9]{10,13}$/.test(value.toUpperCase().replace(/\s/g, ""));
}

/** Why a licence expiry date cannot be right: it has passed, or it is more than five years away (South African licences last five years). */
export function expiryProblem(iso: string | undefined, now: number): "past" | "far" | null {
  const match = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  if (!match) return "past";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
  if (date <= now) return "past";
  return date > now + 5 * 366 * 86_400_000 ? "far" : null;
}
