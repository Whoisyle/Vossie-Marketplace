import type { PaymentMethod } from "@/data/types";

/** South African banks offered for instant EFT (mock-up: no bank is contacted). */
export const eftBanks = ["Absa", "Capitec", "Discovery Bank", "FNB", "Investec", "Nedbank", "Standard Bank", "TymeBank"] as const;
export type EftBank = (typeof eftBanks)[number];

export const paymentLabels: Record<PaymentMethod, string> = {
  "apple-pay": "Apple Pay",
  card: "Card",
  eft: "Instant EFT",
  "google-pay": "Google Pay",
  wallet: "Vossie wallet",
};

export type PayOutcome = { ok: true } | { ok: false; reason: string };

/**
 * Demo-only payment check. Nothing is charged: the only real rules are the ones the app can know,
 * a wallet needs enough balance and a card or bank has to be chosen first.
 */
export function checkPayment(input: {
  method: PaymentMethod;
  totalCents: number;
  walletCents: number;
  hasCard: boolean;
  bank?: string | null;
}): PayOutcome {
  if (input.method === "wallet" && input.walletCents < input.totalCents) {
    return { ok: false, reason: "Your Vossie wallet balance is too low. Add funds or pick another method." };
  }
  if (input.method === "card" && !input.hasCard) return { ok: false, reason: "Add a card to pay with." };
  if (input.method === "eft" && !input.bank) return { ok: false, reason: "Choose your bank to pay by instant EFT." };
  return { ok: true };
}
