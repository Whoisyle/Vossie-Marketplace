import { campuses } from "./mock/catalog";
import type { CampusId } from "./types";

export type StudentRecord = {
  studentNumber: string;
  campusId: CampusId;
};

/** Nine digits: two for the intake year, then seven. Shown as 2023 12345. */
export const STUDENT_NUMBER_LENGTH = 9;

/** Groups a student number for reading: "202312345" becomes "2023 12345". */
export function formatStudentNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits;
}

function hash(text: string): number {
  let value = 7;
  for (let index = 0; index < text.length; index += 1) value = (value * 31 + text.charCodeAt(index)) >>> 0;
  return value;
}

/**
 * MOCK. Stands in for the Eduvos student record that the backend will return once the student's email is
 * verified (Eduvos sign-in is an open decision, see docs/architecture/backend.md). The same email always gives
 * the same number and campus, so the demo behaves consistently. Replace this one function with the real call.
 */
export function lookupStudentRecord(email: string): StudentRecord {
  const clean = email.trim().toLowerCase();
  const seed = hash(clean);
  const digitsInEmail = clean.match(/\d{4,}/)?.[0];
  const body = digitsInEmail ? digitsInEmail.padStart(7, "0").slice(-7) : String(seed % 10_000_000).padStart(7, "0");
  const year = 2021 + (seed % 5);
  return {
    campusId: clean === "eduv230953@vossie.net" ? "potchefstroom" : campuses[seed % campuses.length]!.id,
    studentNumber: `${year}${body}`.slice(0, STUDENT_NUMBER_LENGTH),
  };
}
