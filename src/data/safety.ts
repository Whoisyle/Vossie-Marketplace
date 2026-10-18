/**
 * Safety: emergency numbers, trusted contacts, the safety check-up and incident reports.
 * The national emergency numbers are real South African numbers. Campus security numbers differ by campus
 * and are entered by the student until the owner supplies them.
 */
export const emergencyNumbers: { label: string; number: string; detail: string }[] = [
  { detail: "Police", label: "SAPS", number: "10111" },
  { detail: "Ambulance and medical", label: "Ambulance", number: "10177" },
  { detail: "From any mobile phone", label: "Emergency", number: "112" },
];

/** A campus number kept in the database (security desk, clinic or hub). */
export type CampusContact = { id: string; campusId: string; kind: "security" | "clinic" | "hub"; label: string; phone: string };

export type EmergencyContact = { id: string; name: string; phone: string; relationship: string };

export const reportCategories = ["User", "Listing", "Delivery or courier", "Safety incident", "Other"] as const;
export type ReportCategory = (typeof reportCategories)[number];

export type SafetyReport = { id: string; category: ReportCategory; notes: string; createdAt: string; status: "received" };

export type CheckupItem = {
  id: "two-factor" | "biometric" | "contact" | "sessions" | "security-number";
  title: string;
  detail: string;
  done: boolean;
};

/** The safety check-up: five things that make a student safer, each done or not. */
export function safetyCheckup(input: {
  twoFactor: boolean;
  biometric: boolean;
  contacts: number;
  otherSessions: number;
  campusSecurityNumber: string;
}): { items: CheckupItem[]; score: number; total: number } {
  const items: CheckupItem[] = [
    { detail: "A code on top of your password stops others signing in as you.", done: input.twoFactor, id: "two-factor", title: "Two-factor sign-in" },
    { detail: "Confirm payments and wallet actions with your face or fingerprint.", done: input.biometric, id: "biometric", title: "Face ID or Touch ID" },
    { detail: "Someone we can show you how to reach quickly.", done: input.contacts > 0, id: "contact", title: "A trusted contact" },
    { detail: "Sign out of devices you do not use any more.", done: input.otherSessions === 0, id: "sessions", title: "No other signed-in devices" },
    { detail: "Save your campus security number so help is one tap away.", done: input.campusSecurityNumber.trim().length > 0, id: "security-number", title: "Campus security number" },
  ];
  return { items, score: items.filter((item) => item.done).length, total: items.length };
}

/** Digits and a leading + only, for a phone number to dial. */
export function dialable(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function validContact(input: { name: string; phone: string }): { name?: string; phone?: string } {
  const digits = dialable(input.phone).replace(/^\+/, "");
  return {
    name: input.name.trim().length >= 2 ? undefined : "Enter a name.",
    phone: digits.length >= 9 && digits.length <= 15 ? undefined : "Enter a phone number, like 071 234 5678.",
  };
}

/** The text sent when a student shares a trip or a meet-up with a trusted person. */
export function tripMessage(input: { kind: "order" | "meetup"; place?: string; link?: string; name: string }): string {
  if (input.kind === "order") {
    return `Hi, I'm following my Vossie order. You can see where it is here: ${input.link ?? ""}`.trim();
  }
  return `Hi, I'm meeting a buyer or seller at ${input.place ?? "a spot on campus"}. This is ${input.name}. I'll message when I'm done.`;
}
