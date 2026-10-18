import { rpc, supabase, unwrap } from "./client";
import type { Balances } from "./types";

export const getBalances = () => rpc<Balances>("my_balances");

export async function listWalletTransactions(limit = 50) {
  return unwrap(
    await supabase
      .from("wallet_transactions")
      .select("id, amount_cents, balance_after_cents, kind, label, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
  );
}

/** Demo only: refused by the server unless the wallet_demo_topups setting is on. */
export const demoTopUp = (amountCents: number) => rpc<number>("demo_top_up", { p_amount_cents: amountCents });

export async function listPaymentMethods() {
  return unwrap(
    await supabase.from("payment_methods").select("id, brand, last4, exp_month, exp_year, holder_name, is_default").order("created_at"),
  );
}
export const removePaymentMethod = (id: string) => rpc("remove_payment_method", { p_id: id });
export const setDefaultPaymentMethod = (id: string) => rpc("set_default_payment_method", { p_id: id });

export async function listPayoutDestinations() {
  return unwrap(await supabase.from("payout_destinations").select("id, bank_name, account_holder, account_last4, is_default"));
}
export const addPayoutDestination = (bank: string, holder: string, last4: string) =>
  rpc<string>("add_payout_destination", { p_bank: bank, p_holder: holder, p_last4: last4 });
export const requestPayout = (amountCents: number, role: "seller" | "courier", destinationId: string, idempotencyKey: string) =>
  rpc<string>("request_payout", { p_amount_cents: amountCents, p_role: role, p_destination_id: destinationId, p_idempotency_key: idempotencyKey });

export async function listMyPayouts() {
  return unwrap(await supabase.from("payouts").select("id, role, amount_cents, status, created_at, settled_at").order("created_at", { ascending: false }));
}
