import { formatRand } from "@/data/format";

import { weekKey } from "./schedule";
import type { LedgerEntry, SellerOrder, SellerState } from "./types";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** A reference to quote to support: VM-S for a sale, VM-P for a payout, VM-R for a refund, then the order digits or the date. */
export function referenceFor(entry: LedgerEntry): string {
  const prefix = entry.kind === "sale" ? "VM-S" : entry.kind === "payout" ? "VM-P" : "VM-R";
  const digits = entry.label.replace(/\D/g, "");
  if (digits) return `${prefix}-${digits.slice(-4)}`;
  const at = new Date(entry.createdAt);
  return `${prefix}-${at.getFullYear()}${String(at.getMonth() + 1).padStart(2, "0")}${String(at.getDate()).padStart(2, "0")}`;
}

/** What the balance stood at just after an entry: everything up to and including it. */
export function balanceAfter(ledger: LedgerEntry[], entry: LedgerEntry): number {
  const at = entry.createdAt;
  return ledger.filter((item) => item.createdAt < at || (item.createdAt === at && ledger.indexOf(item) >= ledger.indexOf(entry))).reduce((sum, item) => sum + item.amountCents, 0);
}

export type TxFilter = "all" | "sale" | "payout" | "refund";
export type TxRange = "7" | "30" | "all";

/** The ledger narrowed by type, by how far back, and by a search for an order number or a word in the label. Newest first. */
export function filterLedger(ledger: LedgerEntry[], filter: TxFilter, range: TxRange, query: string, now: number): LedgerEntry[] {
  const needle = query.trim().toLowerCase().replace(/^#/, "");
  const from = range === "all" ? 0 : now - Number(range) * 86_400_000;
  return ledger
    .filter((entry) => (filter === "all" || entry.kind === filter) && new Date(entry.createdAt).getTime() >= from)
    .filter((entry) => !needle || `${entry.label} ${entry.note ?? ""} ${referenceFor(entry)}`.toLowerCase().includes(needle))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** The order a sale came from, when it can be found. */
export function orderFor(entry: LedgerEntry, orders: SellerOrder[]): SellerOrder | undefined {
  if (entry.sellerOrderId) return orders.find((item) => item.id === entry.sellerOrderId);
  const digits = entry.label.replace(/\D/g, "");
  return digits ? orders.find((item) => item.number.replace(/\D/g, "") === digits) : undefined;
}

function dateLine(iso: string): string {
  const at = new Date(iso);
  return `${at.getDate()} ${MONTHS[at.getMonth()]!.slice(0, 3)} ${at.getFullYear()}, ${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
}

/** The receipt as plain text, ready to share or save. */
export function receiptText(entry: LedgerEntry, order: SellerOrder | undefined, store: string, bank?: SellerState["profile"]["bank"]): string {
  const lines = [`${store} · Vossie Marketplace`, entry.kind === "sale" ? "Sale receipt" : entry.kind === "payout" ? "Payout receipt" : "Refund receipt", `Reference: ${referenceFor(entry)}`, `Date: ${dateLine(entry.createdAt)}`];
  if (entry.kind === "sale" && order) {
    lines.push(`Order: ${order.number}`, `Buyer: ${order.buyerName}`, "");
    for (const line of order.lines) lines.push(`${line.quantity} x ${line.title}${line.optionLabel ? ` (${line.optionLabel})` : ""}  ${formatRand(line.unitPriceCents * line.quantity, { fixed: true })}`);
    lines.push("", `Subtotal: ${formatRand(order.subtotalCents, { fixed: true })}`);
    if (order.deliveryFeeCents > 0) lines.push(`Delivery (paid by buyer, goes to the courier): ${formatRand(order.deliveryFeeCents, { fixed: true })}`);
    lines.push(`Vossie platform fee: ${formatRand(-order.feeCents, { fixed: true })}`, `You earned: ${formatRand(entry.amountCents, { fixed: true })}`);
  } else if (entry.kind === "payout") {
    lines.push(`Amount: ${formatRand(-entry.amountCents, { fixed: true })}`, `To: ${bank ? `${bank.bankName} ending ${bank.last4}` : "your bank account"}`, `Status: ${entry.note ?? "Paid"}`);
  } else {
    lines.push(`Amount: ${formatRand(-entry.amountCents, { fixed: true })}`, `Reason: ${entry.note ?? "Refund to the buyer"}`);
  }
  lines.push("", "This is a demo receipt. Real receipts come with the live backend.");
  return lines.join("\n");
}

export type Statement = { key: string; title: string; salesCents: number; feesCents: number; refundsCents: number; payoutsCents: number; netCents: number; count: number };

/** One statement for each month that has activity, newest first. The net is what stayed in the balance that month. */
export function statements(ledger: LedgerEntry[]): Statement[] {
  const byMonth = new Map<string, Statement>();
  for (const entry of ledger) {
    const at = new Date(entry.createdAt);
    const key = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`;
    const current = byMonth.get(key) ?? { count: 0, feesCents: 0, key, netCents: 0, payoutsCents: 0, refundsCents: 0, salesCents: 0, title: `${MONTHS[at.getMonth()]} ${at.getFullYear()}` };
    if (entry.kind === "sale") {
      current.salesCents += entry.amountCents;
      current.feesCents += entry.feeCents ?? 0;
    } else if (entry.kind === "refund") current.refundsCents += -entry.amountCents;
    else current.payoutsCents += -entry.amountCents;
    current.netCents += entry.amountCents;
    current.count += 1;
    byMonth.set(key, current);
  }
  return [...byMonth.values()].sort((a, b) => b.key.localeCompare(a.key));
}

/** One statement for each week that has activity (Monday to Sunday), newest first. */
export function weeklyStatements(ledger: LedgerEntry[]): Statement[] {
  const byWeek = new Map<string, Statement>();
  for (const entry of ledger) {
    const at = new Date(entry.createdAt);
    const key = weekKey(at);
    const monday = new Date(at.getFullYear(), at.getMonth(), at.getDate() - ((at.getDay() + 6) % 7));
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    const title = `Week of ${monday.getDate()} ${MONTHS[monday.getMonth()]!.slice(0, 3)} to ${sunday.getDate()} ${MONTHS[sunday.getMonth()]!.slice(0, 3)}`;
    const current = byWeek.get(key) ?? { count: 0, feesCents: 0, key, netCents: 0, payoutsCents: 0, refundsCents: 0, salesCents: 0, title };
    if (entry.kind === "sale") {
      current.salesCents += entry.amountCents;
      current.feesCents += entry.feeCents ?? 0;
    } else if (entry.kind === "refund") current.refundsCents += -entry.amountCents;
    else current.payoutsCents += -entry.amountCents;
    current.netCents += entry.amountCents;
    current.count += 1;
    byWeek.set(key, current);
  }
  return [...byWeek.values()].sort((a, b) => b.key.localeCompare(a.key));
}

export function statementText(item: Statement, store: string): string {
  return [
    `${store} · Vossie Marketplace`,
    `Statement for ${item.title}`,
    `Sales (after fees): ${formatRand(item.salesCents, { fixed: true })}`,
    `Vossie fees on those sales: ${formatRand(item.feesCents, { fixed: true })}`,
    `Refunds: ${formatRand(-item.refundsCents, { fixed: true })}`,
    `Payouts: ${formatRand(-item.payoutsCents, { fixed: true })}`,
    `Left in your balance: ${formatRand(item.netCents, { fixed: true })}`,
    `${item.count} transactions`,
    "",
    "This is a demo statement. Real statements come with the live backend.",
  ].join("\n");
}
