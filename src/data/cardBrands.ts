/**
 * The banks whose cards the wallet can draw. Each card is drawn to match the real card the owner supplied (see
 * `screens/account/BankFaces.tsx`); this file holds what the rest of the app needs to know about each bank.
 */
export type Issuer = {
  id: string;
  name: string;
  /** Main colour of the card, used for the small swatch in pickers. */
  swatch: string;
};

export const issuers: readonly Issuer[] = [
  { id: "nedbank", name: "Nedbank", swatch: "#A6A18A" },
  { id: "fnb", name: "FNB", swatch: "#17181A" },
  { id: "standard-bank", name: "Standard Bank", swatch: "#2440A0" },
  { id: "absa", name: "Absa", swatch: "#1B141A" },
  { id: "capitec", name: "Capitec", swatch: "#232325" },
  { id: "tymebank", name: "TymeBank", swatch: "#06090B" },
  { id: "discovery", name: "Discovery Bank", swatch: "#F4F1EA" },
  { id: "african-bank", name: "African Bank", swatch: "#0A0A0A" },
  { id: "investec", name: "Investec", swatch: "#8D8E90" },
];

/** The scheme faces, used when a card has no bank chosen. */
export const schemeFaces = {
  mastercard: { face: ["#1B1B1F", "#3A2A2A"] as const, ink: "#FFFFFF" },
  visa: { face: ["#1A1F71", "#0E1345"] as const, ink: "#FFFFFF" },
} as const;

export function issuerByName(name?: string | null): Issuer | undefined {
  if (!name) return undefined;
  const key = name.trim().toLowerCase();
  return issuers.find((issuer) => issuer.id === key || issuer.name.toLowerCase() === key);
}
