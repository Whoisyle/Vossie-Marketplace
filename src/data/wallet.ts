import type { WalletTransaction, WalletTransactionKind } from "./types";

/** Smallest withdrawal. A real limit comes from the card provider; this is a demo value. */
export const MIN_WITHDRAW_CENTS = 6000;

export const kindLabels: Record<WalletTransactionKind, string> = {
  other: "Wallet activity",
  points: "Points redeemed",
  purchase: "Purchase",
  refund: "Refund",
  subscription: "Subscription",
  tip: "Courier tip",
  "top-up": "Top up",
  withdrawal: "Withdrawal to card",
};

/** Older demo transactions have no kind, so it is read from the label. */
export function transactionKind(tx: Pick<WalletTransaction, "kind" | "label" | "amountCents">): WalletTransactionKind {
  if (tx.kind) return tx.kind;
  const label = tx.label.toLowerCase();
  if (label.includes("top up")) return "top-up";
  if (label.includes("refund")) return "refund";
  if (label.includes("tip")) return "tip";
  if (label.includes("withdraw")) return "withdrawal";
  if (label.includes("points")) return "points";
  if (label.includes("subscription")) return "subscription";
  return tx.amountCents < 0 ? "purchase" : "other";
}

/** The wallet balance right after each transaction, newest first (the first is the current balance). */
export function balancesAfter(balanceCents: number, transactions: Pick<WalletTransaction, "id" | "amountCents">[]): Record<string, number> {
  const result: Record<string, number> = {};
  let running = balanceCents;
  for (const tx of transactions) {
    result[tx.id] = running;
    running -= tx.amountCents;
  }
  return result;
}

export type WithdrawProblem = "no-card" | "too-small" | "too-much" | null;

export function withdrawProblem(input: { amountCents: number; balanceCents: number; hasCard: boolean }): WithdrawProblem {
  if (!input.hasCard) return "no-card";
  if (input.amountCents < MIN_WITHDRAW_CENTS) return "too-small";
  if (input.amountCents > input.balanceCents) return "too-much";
  return null;
}

export const withdrawMessages: Record<Exclude<WithdrawProblem, null>, string> = {
  "no-card": "Add a card to withdraw to.",
  "too-much": "That's more than your wallet balance.",
  "too-small": "The smallest withdrawal is R60.",
};
