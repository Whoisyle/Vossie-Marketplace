// Database tests. Run with: npm run test:db
// Boots an in-memory Postgres (PGlite), applies every migration, then drives the marketplace as
// different signed-in users so row level security and the state machines are exercised for real.
import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { as, createDb, newUser } from "./harness.mjs";

let db;
const u = {};
const ids = {};

const q = (who, sql, params = []) => as(db, who, (d) => d.query(sql, params)).then((r) => r.rows);
const one = async (who, sql, params) => (await q(who, sql, params))[0];
const rpc = (who, call, params = []) => one(who, `select ${call} as r`, params).then((x) => x.r);
const fails = async (promise, pattern) => {
  await assert.rejects(promise, (e) => (pattern ? pattern.test(e.message) : true), `expected failure ${pattern ?? ""}`);
};
const ledgerBalanced = async () => {
  const [{ d, c }] = (await db.query("select sum(debit_cents)::bigint d, sum(credit_cents)::bigint c from ledger_entries")).rows;
  assert.equal(d, c, "ledger debits equal credits");
};
const walletMatchesLedger = async (user) => {
  const w = (await db.query("select balance_cents from wallets where user_id = $1", [user])).rows[0]?.balance_cents ?? 0n;
  const l = (await db.query("select private.account_balance('wallet', $1) b", [user])).rows[0].b;
  assert.equal(BigInt(w), BigInt(l), "wallet balance equals ledger balance");
};

async function makeListing(seller, { title, price = 5000, stock = 5, type = "goods", category = "food", extra = {} }) {
  const listing = { type, category_id: category, title, description: "A long enough description for checks", condition: "good", weight_grams: 500, ...extra };
  const id = await rpc(seller, "public.upsert_listing($1::jsonb, $2::jsonb, $3::jsonb)", [
    JSON.stringify(listing),
    JSON.stringify([{ label: "Standard", price_cents: price, on_hand: stock }]),
    JSON.stringify([{ storage_path: `${seller}/${title}.jpg` }]),
  ]);
  const result = await rpc(seller, "public.submit_listing($1)", [id]);
  return { id, result, option: (await db.query("select id from listing_options where listing_id = $1", [id])).rows[0].id };
}

async function placeWalletOrder(buyer, option, { qty = 1, fulfilment = "campus_handoff", key, voucher = null, slot = null } = {}) {
  await rpc(buyer, "public.cart_add($1, $2, $3)", [option, qty, slot]);
  return rpc(buyer, "public.place_order($1::fulfilment_method, 'wallet', $2, $3, '', $4)", [
    fulfilment, key ?? `key-${Math.random().toString(36).slice(2)}-xx`, "12 Campus Road, Potch", voucher,
  ]);
}

before(async () => {
  db = await createDb();
  for (const name of ["buyer", "buyer2", "seller", "courier", "ops", "fin"]) {
    u[name] = await newUser(db, `${name}@vossie.net`, { display_name: name });
  }
  for (const who of ["buyer", "buyer2", "seller"]) {
    await rpc(u[who], "(public.update_my_profile($1, '0712345678', 'potchefstroom')).id", [who === "seller" ? "Campus Bites" : `Student ${who}`]);
  }
  // staff and courier are invited and granted by trusted code, never self-selected
  await db.exec(`
    insert into memberships (user_id, role, state) values
      ('${u.ops}', 'operations', 'active'), ('${u.fin}', 'finance', 'active'), ('${u.fin}', 'admin', 'active'),
      ('${u.courier}', 'courier', 'active');
    insert into courier_profiles (user_id, full_name, phone, campus_ids, online)
      values ('${u.courier}', 'Linda M', '0820000000', '{potchefstroom}', true);`);
  await rpc(u.seller, "(public.submit_seller_profile('Campus Bites', 'Burgers', 'Food court', 'potchefstroom', true, true)).id");
  ids.sellerRow = (await db.query("select id from sellers where user_id = $1", [u.seller])).rows[0].id;
  await rpc(u.ops, "public.review_seller($1, 'approved', 'ok')", [ids.sellerRow]);
  for (const who of ["buyer", "buyer2"]) await rpc(u[who], "public.demo_top_up(100000)");
});

describe("identity and profile", () => {
  it("creates a profile for every new auth user", async () => {
    const rows = await q(u.buyer, "select display_name, student_status, preferred_campus_id from profiles where id = $1", [u.buyer]);
    assert.equal(rows[0].student_status, "demo_unverified");
    assert.equal(rows[0].preferred_campus_id, "potchefstroom");
  });

  it("blocks sign-up outside the demo domain", async () => {
    const ok = (await db.query(`select public.hook_before_user_created('{"user":{"email":"a@vossie.net"}}') r`)).rows[0].r;
    const bad = (await db.query(`select public.hook_before_user_created('{"user":{"email":"a@gmail.com"}}') r`)).rows[0].r;
    assert.deepEqual(ok, {});
    assert.equal(bad.error.http_code, 400);
  });

  it("validates and privately stores the demo student number", async () => {
    await fails(rpc(u.buyer, "public.submit_student_number('12345')"), /invalid_student_number/);
    await rpc(u.buyer, "public.submit_student_number('EDUV230953')");
    assert.equal((await one(u.buyer, "select student_number from profile_private"))?.student_number, "eduv230953");
    assert.equal((await q(u.buyer2, "select * from profile_private where user_id = $1", [u.buyer])).length, 0);
    assert.equal((await q(u.ops, "select * from profile_private where user_id = $1", [u.buyer])).length, 0, "staff cannot read it either");
  });

  it("does not let users promote themselves or edit identity fields directly", async () => {
    await fails(q(u.buyer, "update profiles set student_status = 'verified'"), /permission denied/);
    await fails(q(u.buyer, "insert into memberships (user_id, role, state) values ($1, 'admin', 'active')", [u.buyer]), /permission denied/);
    await fails(rpc(u.buyer, "public.update_my_profile(null, null, null, null, 'seller')"), /workspace_not_available/);
  });
});

describe("catalog and moderation", () => {
  it("publishes a complete listing and keeps drafts private", async () => {
    const burger = await makeListing(u.seller, { title: "Burger and Chips", price: 6000, stock: 20 });
    ids.burger = burger;
    assert.equal(burger.result.status, "published");
    const draft = await rpc(u.seller, "public.upsert_listing($1::jsonb, $2::jsonb)", [
      JSON.stringify({ type: "goods", category_id: "food", title: "Draft only", description: "short" }),
      JSON.stringify([{ label: "Standard", price_cents: 100, on_hand: 1 }]),
    ]);
    const blocked = await rpc(u.seller, "public.submit_listing($1)", [draft]);
    assert.equal(blocked.status, "draft");
    assert.ok(blocked.issues.includes("photos_required"));
    assert.equal((await q("anon", "select id from listings where id = $1", [draft])).length, 0);
    assert.equal((await q(u.buyer, "select id from listings where id = $1", [draft])).length, 0);
    assert.equal((await q(u.seller, "select id from listings where id = $1", [draft])).length, 1);
    assert.equal((await q("anon", "select id from listing_cards where id = $1", [burger.id])).length, 1);
  });

  it("sends flagged content to staff and rejects prohibited content", async () => {
    const vape = await makeListing(u.seller, { title: "Vape pen", description: "x" });
    assert.equal(vape.result.status, "under_review");
    assert.equal((await q("anon", "select 1 from listings where id = $1", [vape.id])).length, 0);
    await rpc(u.ops, "public.review_listing($1, 'approved', 'age gate ok')", [vape.id]);
    assert.equal((await one("anon", "select status from listings where id = $1", [vape.id])).status, "published");
    const gun = await makeListing(u.seller, { title: "Firearm for sale" });
    assert.ok(gun.result.issues.includes("prohibited_content"));
  });

  it("stops a seller changing another seller's listing or approving themselves", async () => {
    await fails(rpc(u.buyer, "public.upsert_listing($1::jsonb, $2::jsonb)", [JSON.stringify({ id: ids.burger.id }), "[{}]"]), /not_found|options|not_a_seller/);
    await fails(q(u.seller, "update listings set status = 'published', base_price_cents = 1"), /permission denied/);
    await fails(rpc(u.seller, "public.review_listing($1, 'approved')", [ids.burger.id]), /forbidden/);
  });
});

describe("goods order with campus handoff (wallet payment)", () => {
  it("runs request, accept, ready, handoff, confirm and settles the money", async () => {
    const before = await one(u.buyer, "select balance_cents from wallets");
    const placed = await placeWalletOrder(u.buyer, ids.burger.option, { qty: 2, key: "order-handoff-1" });
    assert.equal(placed.status, "paid");
    assert.equal(placed.total_cents, 12000);
    const so = await one(u.buyer, "select * from seller_orders where order_id = $1", [placed.order_id]);
    assert.equal(so.status, "awaiting_seller");
    assert.equal(so.accept_by !== null, true);
    assert.equal((await one(u.seller, "select reserved from listing_options where id = $1", [ids.burger.option])).reserved, 2, "sellers read their own stock");
    assert.equal((await q(u.buyer, "select reserved from listing_options where id = $1", [ids.burger.option]))[0].reserved, 2, "published options are public");
    const opt = (await db.query("select reserved, on_hand from listing_options where id = $1", [ids.burger.option])).rows[0];
    assert.deepEqual([opt.reserved, opt.on_hand], [2, 20]);
    assert.equal(BigInt((await one(u.buyer, "select balance_cents from wallets")).balance_cents), BigInt(before.balance_cents) - 12000n);
    assert.equal(BigInt(await db.query("select private.account_balance('escrow') b").then((r) => r.rows[0].b)), 12000n);

    await fails(rpc(u.buyer, "public.seller_respond($1, true)", [so.id]), /not_found/);
    await rpc(u.seller, "public.seller_respond($1, true)", [so.id]);
    const committed = (await db.query("select reserved, on_hand from listing_options where id = $1", [ids.burger.option])).rows[0];
    assert.deepEqual([committed.reserved, committed.on_hand], [0, 18], "stock committed on acceptance");
    await rpc(u.seller, "public.seller_advance($1, 'ready')", [so.id]);

    await fails(rpc(u.seller, "public.reveal_handoff_code($1, 'campus_handoff')", [so.id]), /forbidden/);
    const { code } = await rpc(u.buyer, "public.reveal_handoff_code($1, 'campus_handoff')", [so.id]);
    assert.match(code, /^\d{6}$/);
    const wrong = await rpc(u.seller, "public.seller_complete_handoff($1, '000000')", [so.id]);
    assert.equal(wrong.ok, false);
    const good = await rpc(u.seller, "public.seller_complete_handoff($1, $2)", [so.id, code]);
    assert.equal(good.ok, true);
    assert.equal((await one(u.buyer, "select status from seller_orders where id = $1", [so.id])).status, "issue_window");
    const reuse = await rpc(u.seller, "public.seller_complete_handoff($1, $2)", [so.id, code]).catch((e) => ({ ok: false, error: e.message }));
    assert.equal(reuse.ok, false, "a code works once");

    await rpc(u.buyer, "public.buyer_confirm_received($1)", [so.id]);
    assert.equal((await one(u.buyer, "select status from seller_orders where id = $1", [so.id])).status, "completed");
    const payable = (await db.query("select private.account_balance('seller_payable', $1) b", [u.seller])).rows[0].b;
    assert.equal(BigInt(payable), 12000n, "seller receives subtotal (placeholder fee is 0%)");
    assert.equal(BigInt(await db.query("select private.account_balance('escrow') b").then((r) => r.rows[0].b)), 0n);
    await ledgerBalanced();
    await walletMatchesLedger(u.buyer);
    ids.completedSo = so.id;
  });

  it("locks a code after too many wrong attempts", async () => {
    const placed = await placeWalletOrder(u.buyer2, ids.burger.option, { key: "order-lockout-001" });
    const so = await one(u.buyer2, "select id from seller_orders where order_id = $1", [placed.order_id]);
    await rpc(u.seller, "public.seller_respond($1, true)", [so.id]);
    await rpc(u.seller, "public.seller_advance($1, 'ready')", [so.id]);
    const { code } = await rpc(u.buyer2, "public.reveal_handoff_code($1, 'campus_handoff')", [so.id]);
    for (let i = 0; i < 5; i++) await rpc(u.seller, "public.seller_complete_handoff($1, '999999')", [so.id]);
    const locked = await rpc(u.seller, "public.seller_complete_handoff($1, $2)", [so.id, code]);
    assert.deepEqual([locked.ok, locked.error], [false, "locked"]);
    const fresh = await rpc(u.buyer2, "public.reveal_handoff_code($1, 'campus_handoff')", [so.id]);
    assert.equal((await rpc(u.seller, "public.seller_complete_handoff($1, $2)", [so.id, fresh.code])).ok, true);
    ids.dispSo = so.id;
  });

  it("is idempotent for the same key and refuses to oversell", async () => {
    const a = await placeWalletOrder(u.buyer, ids.burger.option, { key: "same-key-0001" });
    await rpc(u.buyer, "public.cart_add($1, 1)", [ids.burger.option]);
    const b = await rpc(u.buyer, "public.place_order('campus_handoff', 'wallet', 'same-key-0001')");
    assert.equal(b.replayed, true);
    assert.equal(b.order_id, a.order_id);
    const last = await makeListing(u.seller, { title: "Last unit", price: 1000, stock: 1 });
    await rpc(u.buyer, "public.cart_clear()");
    await placeWalletOrder(u.buyer, last.option, { key: "last-unit-0001" });
    await rpc(u.buyer2, "public.cart_add($1, 1)", [last.option]);
    await fails(rpc(u.buyer2, "public.place_order('campus_handoff', 'wallet', 'oversell-key-01')"), /insufficient_stock/);
    assert.equal((await db.query("select count(*)::int c from orders where idempotency_key = 'oversell-key-01'")).rows[0].c, 0, "failed checkout leaves no order behind");
    await rpc(u.buyer2, "public.cart_clear()");
    ids.sameKeySo = (await one(u.buyer, "select id from seller_orders where order_id = $1", [a.order_id])).id;
  });

  it("refunds in full and releases stock when the seller declines", async () => {
    const opt = () => db.query("select reserved, on_hand from listing_options where id = $1", [ids.burger.option]).then((r) => r.rows[0]);
    const startBalance = BigInt((await one(u.buyer, "select balance_cents from wallets")).balance_cents);
    const reservedBefore = (await opt()).reserved;
    await rpc(u.seller, "public.seller_respond($1, false, 'out of buns')", [ids.sameKeySo]);
    assert.equal((await one(u.buyer, "select status from seller_orders where id = $1", [ids.sameKeySo])).status, "rejected");
    assert.equal(BigInt((await one(u.buyer, "select balance_cents from wallets")).balance_cents), startBalance + 6000n);
    assert.equal((await opt()).reserved, reservedBefore - 1);
    await ledgerBalanced();
    await walletMatchesLedger(u.buyer);
  });

  it("times out an unanswered order with a full refund", async () => {
    await rpc(u.seller, "public.upsert_listing($1::jsonb, $2::jsonb, $3::jsonb)", [
      JSON.stringify({ id: ids.burger.id }), JSON.stringify([{ id: ids.burger.option, label: "Standard", price_cents: 6000, on_hand: 10 }]), "null",
    ]).catch(() => null);
    await db.exec(`update listings set status = 'published' where id = '${ids.burger.id}'`);
    const placed = await placeWalletOrder(u.buyer, ids.burger.option, { key: "timeout-key-001" });
    const so = await one(u.buyer, "select id from seller_orders where order_id = $1", [placed.order_id]);
    const balance = BigInt((await one(u.buyer, "select balance_cents from wallets")).balance_cents);
    await fails(rpc(u.buyer, "public.expire_stale()"), /permission denied|forbidden/);
    await db.exec(`update seller_orders set accept_by = now() - interval '1 minute' where id = '${so.id}'`);
    const out = await rpc("service_role", "public.expire_stale()");
    assert.equal(out.seller_timeouts, 1);
    assert.equal((await one(u.buyer, "select status from seller_orders where id = $1", [so.id])).status, "timed_out");
    assert.equal(BigInt((await one(u.buyer, "select balance_cents from wallets")).balance_cents), balance + 6000n);
    await ledgerBalanced();
  });

  it("lets the buyer cancel before the seller prepares, with a refund", async () => {
    const placed = await placeWalletOrder(u.buyer, ids.burger.option, { key: "cancel-key-0001" });
    const so = await one(u.buyer, "select id from seller_orders where order_id = $1", [placed.order_id]);
    await rpc(u.seller, "public.seller_respond($1, true)", [so.id]);
    await rpc(u.buyer, "public.buyer_cancel_order($1)", [so.id]);
    assert.equal((await one(u.buyer, "select status from seller_orders where id = $1", [so.id])).status, "cancelled");
    await walletMatchesLedger(u.buyer);
    await ledgerBalanced();
  });
});

describe("delivery with a courier", () => {
  it("moves custody pickup to drop-off with one-time codes and pays everyone", async () => {
    const placed = await placeWalletOrder(u.buyer, ids.burger.option, { fulfilment: "vossie_delivery", key: "delivery-key-01" });
    assert.equal(placed.total_cents, 6000 + 1500);
    const so = await one(u.buyer, "select * from seller_orders where order_id = $1", [placed.order_id]);
    assert.equal(so.delivery_fee_cents, 1500);
    await rpc(u.seller, "public.seller_respond($1, true)", [so.id]);
    const job = (await db.query("select * from delivery_jobs where seller_order_id = $1", [so.id])).rows[0];
    assert.equal(job.status, "pending_assignment");
    assert.equal(job.courier_fee_cents, 1200);

    assert.equal((await q(u.buyer2, "select * from delivery_jobs")).length, 0);
    const pool = await q(u.courier, "select * from courier_job_pool");
    assert.equal(pool.length, 1);
    assert.equal("dropoff_text" in pool[0], false, "pool hides the buyer address");
    await fails(rpc(u.buyer, "public.courier_claim_job($1)", [job.id]), /forbidden/);
    await rpc(u.courier, "public.courier_claim_job($1)", [job.id]);
    assert.equal((await q(u.courier, "select * from delivery_jobs where id = $1", [job.id])).length, 1);

    await rpc(u.seller, "public.seller_advance($1, 'ready')", [so.id]);
    const pickup = await rpc(u.seller, "public.reveal_handoff_code($1, 'pickup')", [so.id]);
    assert.equal((await rpc(u.courier, "public.courier_confirm_pickup($1, '123456')", [job.id])).ok, false);
    assert.equal((await rpc(u.courier, "public.courier_confirm_pickup($1, $2)", [job.id, pickup.code])).ok, true);
    assert.equal((await one(u.buyer, "select status from seller_orders where id = $1", [so.id])).status, "in_fulfilment");
    await rpc(u.courier, "public.courier_update_status($1, 'in_transit', -26.7, 27.1)", [job.id]);
    await rpc(u.courier, "public.courier_update_status($1, 'arrived')", [job.id]);

    const drop = await rpc(u.buyer, "public.reveal_handoff_code($1, 'dropoff')", [so.id]);
    await fails(rpc(u.seller, "public.reveal_handoff_code($1, 'dropoff')", [so.id]), /forbidden/);
    assert.equal((await rpc(u.courier, "public.courier_confirm_delivery($1, $2)", [job.id, drop.code])).ok, true);
    assert.equal((await one(u.buyer, "select status from seller_orders where id = $1", [so.id])).status, "issue_window");
    const events = await q(u.buyer, "select event from custody_events where seller_order_id = $1 order by id", [so.id]);
    assert.deepEqual(events.map((e) => e.event), ["job_created", "courier_assigned", "picked_up", "in_transit", "arrived", "delivered"]);
    await fails(q(u.courier, "update custody_events set event = 'x'"), /permission denied/);

    await rpc(u.buyer, "public.buyer_confirm_received($1)", [so.id]);
    const bal = async (code, owner = null) => BigInt((await db.query("select private.account_balance($1, $2) b", [code, owner])).rows[0].b);
    assert.equal(await bal("courier_payable", u.courier), 1200n);
    assert.equal(await bal("delivery_revenue"), 300n);
    assert.equal(await bal("escrow") >= 0n, true);
    await ledgerBalanced();
  });

  it("freezes the order and routes a delivery exception to staff", async () => {
    const placed = await placeWalletOrder(u.buyer, ids.burger.option, { fulfilment: "vossie_delivery", key: "delivery-key-02" });
    const so = await one(u.buyer, "select id from seller_orders where order_id = $1", [placed.order_id]);
    await rpc(u.seller, "public.seller_respond($1, true)", [so.id]);
    const job = (await db.query("select id from delivery_jobs where seller_order_id = $1", [so.id])).rows[0];
    await rpc(u.courier, "public.courier_claim_job($1)", [job.id]);
    const caseId = await rpc(u.courier, "public.courier_report_exception($1, 'buyer_unavailable', 'no answer')", [job.id]);
    assert.equal((await one(u.ops, "select status from delivery_jobs where id = $1", [job.id])).status, "exception");
    await rpc(u.ops, "public.assign_courier($1, $2)", [job.id, u.courier]);
    await rpc(u.ops, "public.staff_resolve_case($1, 'other', null, 'reassigned')", [caseId]);
    assert.equal((await one(u.ops, "select status from cases where id = $1", [caseId])).status, "resolved");
  });
});

describe("disputes and payouts", () => {
  it("holds funds while a case is open and splits them on a partial refund", async () => {
    const so = ids.dispSo;
    const caseId = await rpc(u.buyer2, "public.open_order_issue($1, 'order_issue', 'burger was cold')", [so]);
    assert.equal((await one(u.buyer2, "select status from seller_orders where id = $1", [so])).status, "disputed");
    await fails(rpc(u.buyer2, "public.buyer_confirm_received($1)", [so]), /invalid_status/);
    await fails(rpc(u.buyer, "public.open_order_issue($1, 'order_issue', 'not my order')", [so]), /not_found/);
    assert.equal((await q(u.seller, "select id from cases where id = $1", [caseId])).length, 1, "seller sees the case");
    assert.equal((await q(u.buyer, "select id from cases where id = $1", [caseId])).length, 0, "strangers do not");
    await fails(rpc(u.buyer2, "public.staff_resolve_case($1, 'deny')", [caseId]), /forbidden/);
    await rpc(u.ops, "public.staff_resolve_case($1, 'refund_partial', 2000, 'cold food')", [caseId]);
    const so2 = await one(u.buyer2, "select * from seller_orders where id = $1", [so]);
    assert.equal(so2.status, "completed");
    assert.equal(BigInt(so2.refunded_cents), 2000n);
    await walletMatchesLedger(u.buyer2);
    await ledgerBalanced();
  });

  it("pays out only what is available and only through finance", async () => {
    const dest = await rpc(u.seller, "public.add_payout_destination('Capitec', 'Campus Bites', '1234')");
    const available = BigInt((await rpc(u.seller, "public.my_balances()")).seller_available_cents);
    assert.ok(available > 0n);
    await fails(rpc(u.seller, "public.request_payout($1, 'seller', $2, 'payout-key-1')", [available + 1n, dest]), /insufficient_available_funds/);
    const payout = await rpc(u.seller, "public.request_payout($1, 'seller', $2, 'payout-key-2')", [available, dest]);
    assert.equal(BigInt((await rpc(u.seller, "public.my_balances()")).seller_available_cents), 0n, "requested funds are reserved");
    await fails(rpc(u.seller, "public.finance_set_payout($1, 'paid')", [payout]), /forbidden/);
    await rpc(u.fin, "public.finance_set_payout($1, 'paid', 'ref-1')", [payout]);
    assert.equal((await one(u.seller, "select status from payouts where id = $1", [payout])).status, "paid");
    await ledgerBalanced();
  });
});

describe("services and bookings", () => {
  it("holds a slot, confirms on acceptance and refuses double booking", async () => {
    const svc = await makeListing(u.seller, {
      title: "Maths tutoring", type: "service", category: "services", price: 12000, stock: 0,
      extra: { duration_minutes: 60, mode: "on_campus", cancel_cutoff_hours: 24 },
    }).catch((e) => e);
    // services need availability first, so the first submit is expected to be incomplete
    const listing = (await db.query("select id from listings where title = 'Maths tutoring'")).rows[0].id;
    const option = (await db.query("select id from listing_options where listing_id = $1", [listing])).rows[0].id;
    await rpc(u.seller, "public.add_service_slots($1, $2::jsonb)", [listing, JSON.stringify([
      { starts_at: new Date(Date.now() + 3 * 86400e3).toISOString(), ends_at: new Date(Date.now() + 3 * 86400e3 + 3600e3).toISOString(), capacity: 1 },
    ])]);
    await rpc(u.seller, "public.upsert_listing($1::jsonb, $2::jsonb, $3::jsonb)", [
      JSON.stringify({ id: listing }), JSON.stringify([{ id: option, label: "Standard", price_cents: 12000, unlimited: true }]),
      JSON.stringify([]),
    ]);
    const res = await rpc(u.seller, "public.submit_listing($1)", [listing]);
    assert.equal(res.status, "published", JSON.stringify(res));
    const slot = (await db.query("select id from service_slots where listing_id = $1", [listing])).rows[0].id;

    const placed = await placeWalletOrder(u.buyer, option, { slot, key: "booking-key-001" });
    assert.equal(placed.status, "paid");
    const so = await one(u.buyer, "select id from seller_orders where order_id = $1", [placed.order_id]);
    assert.equal((await db.query("select reserved from service_slots where id = $1", [slot])).rows[0].reserved, 1);
    await rpc(u.buyer2, "public.cart_add($1, 1, $2)", [option, slot]);
    await fails(rpc(u.buyer2, "public.place_order('campus_handoff', 'wallet', 'booking-key-002')"), /slot_unavailable/);
    await rpc(u.buyer2, "public.cart_clear()");

    await rpc(u.seller, "public.seller_respond($1, true)", [so.id]);
    assert.equal((await db.query("select status from bookings where seller_order_id = $1", [so.id])).rows[0].status, "booked");
    await rpc(u.buyer, "public.buyer_cancel_order($1)", [so.id]);
    assert.equal((await db.query("select reserved from service_slots where id = $1", [slot])).rows[0].reserved, 0, "slot released exactly once");
    assert.equal((await db.query("select status from bookings where seller_order_id = $1", [so.id])).rows[0].status, "cancelled");
    await walletMatchesLedger(u.buyer);
  });
});

describe("card payments and webhooks", () => {
  it("leaves the order unpaid until a verified provider event arrives, and ignores replays", async () => {
    await rpc(u.buyer2, "public.cart_add($1, 1)", [ids.burger.option]);
    const pm = await rpc("service_role", "public.save_payment_method($1, 'mock', 'tok_123', 'visa', '4242', 12, 2030, 'Student', true)", [u.buyer2]);
    await fails(rpc(u.buyer2, "public.save_payment_method($1, 'mock', 'tok_9', 'visa', '4242', 12, 2030, 'x', true)", [u.buyer2]), /permission denied|forbidden/);
    const placed = await rpc(u.buyer2, "public.place_order('campus_handoff', 'card', 'card-key-0001', null, '', null, $1)", [pm]);
    assert.equal(placed.status, "pending_payment");
    const stock = (await db.query("select reserved from listing_options where id = $1", [ids.burger.option])).rows[0].reserved;
    assert.ok(stock >= 1, "stock is held while payment is pending");
    const intent = placed.payment_intent_id;

    await fails(rpc(u.buyer2, "public.apply_payment_event('mock', 'evt1', $1, 'payment.captured', '{\"amount_cents\":6000}')", [intent]), /permission denied|forbidden/);
    assert.equal(await rpc("service_role", "public.apply_payment_event('mock', 'evt0', $1, 'payment.captured', '{\"amount_cents\":1}')", [intent]), "amount_mismatch");
    assert.equal((await one(u.buyer2, "select status from orders where id = $1", [placed.order_id])).status, "pending_payment");
    assert.equal(await rpc("service_role", "public.apply_payment_event('mock', 'evt1', $1, 'payment.captured', '{\"amount_cents\":6000}')", [intent]), "processed");
    assert.equal(await rpc("service_role", "public.apply_payment_event('mock', 'evt1', $1, 'payment.captured', '{\"amount_cents\":6000}')", [intent]), "duplicate");
    assert.equal((await one(u.buyer2, "select status from orders where id = $1", [placed.order_id])).status, "paid");
    await ledgerBalanced();
  });

  it("releases stock when payment fails or the window expires", async () => {
    await rpc(u.buyer2, "public.cart_add($1, 1)", [ids.burger.option]);
    const before = (await db.query("select reserved from listing_options where id = $1", [ids.burger.option])).rows[0].reserved;
    const placed = await rpc(u.buyer2, "public.place_order('campus_handoff', 'apple_pay', 'apple-key-0001')");
    await db.exec(`update orders set expires_at = now() - interval '1 minute' where id = '${placed.order_id}'`);
    const out = await rpc("service_role", "public.expire_stale()");
    assert.equal(out.unpaid_orders_expired, 1);
    assert.equal((await db.query("select reserved from listing_options where id = $1", [ids.burger.option])).rows[0].reserved, before);
    assert.equal((await one(u.buyer2, "select status from orders where id = $1", [placed.order_id])).status, "expired");
  });
});

describe("vouchers and totals", () => {
  it("prices from the database, applies vouchers and ignores anything the client claims", async () => {
    await rpc(u.buyer, "public.cart_clear()");
    await rpc(u.buyer, "public.cart_add($1, 2)", [ids.burger.option]);
    const quote = await rpc(u.buyer, "public.quote_cart('vossie_delivery', 'welcome20')");
    assert.equal(quote.subtotal_cents, 12000);
    assert.equal(quote.discount_cents, 2000);
    assert.equal(quote.total_cents, 12000 + 1500 - 2000);
    const bad = await rpc(u.buyer, "public.quote_cart('campus_handoff', 'nope')");
    assert.equal(bad.valid_voucher, false);
    await fails(rpc(u.buyer, "public.place_order('campus_handoff', 'wallet', 'bad-voucher-001', null, '', 'nope')"), /invalid_voucher/);
    const placed = await rpc(u.buyer, "public.place_order('campus_handoff', 'wallet', 'voucher-key-001', null, '', 'WELCOME20')");
    assert.equal(placed.total_cents, 10000);
    const so = await one(u.buyer, "select * from seller_orders where order_id = $1", [placed.order_id]);
    assert.equal(so.discount_cents, 2000);
    await ledgerBalanced();
    await walletMatchesLedger(u.buyer);
    await fails(q(u.buyer, "update order_items set unit_price_cents = 1"), /permission denied/);
  });

  it("refunds only what the buyer paid and returns the voucher share", async () => {
    const so = await one(u.buyer, "select id from seller_orders where number like '%' order by created_at desc limit 1");
    const before = BigInt((await one(u.buyer, "select balance_cents from wallets")).balance_cents);
    await rpc(u.seller, "public.seller_respond($1, false, 'sold out')", [so.id]);
    assert.equal(BigInt((await one(u.buyer, "select balance_cents from wallets")).balance_cents), before + 10000n);
    assert.equal(BigInt((await db.query("select private.account_balance('promotions_expense') b")).rows[0].b), 0n);
    await ledgerBalanced();
  });
});

describe("row level security", () => {
  it("keeps orders, messages and money private to the people involved", async () => {
    assert.equal((await q(u.buyer2, "select id from orders where buyer_id = $1", [u.buyer])).length, 0);
    assert.equal((await q(u.buyer2, "select id from seller_orders where buyer_id = $1", [u.buyer])).length, 0);
    assert.equal((await q(u.buyer2, "select user_id from wallets where user_id = $1", [u.buyer])).length, 0);
    assert.equal((await q(u.buyer2, "select id from wallet_transactions where user_id = $1", [u.buyer])).length, 0);
    await fails(q("anon", "select 1 from notifications"), /permission denied/);
  });

  it("limits order conversations to the buyer and seller", async () => {
    const conv = (await db.query("select id from conversations where seller_order_id = $1", [ids.completedSo])).rows[0].id;
    assert.equal((await q(u.buyer, "select id from conversations where id = $1", [conv])).length, 1);
    assert.equal((await q(u.seller, "select id from conversations where id = $1", [conv])).length, 1);
    assert.equal((await q(u.buyer2, "select id from conversations where id = $1", [conv])).length, 0);
    assert.equal((await q(u.buyer2, "select id from messages where conversation_id = $1", [conv])).length, 0);
    await fails(rpc(u.buyer2, "public.send_message($1, 'hi')", [conv]), /forbidden/);
    await rpc(u.buyer, "public.send_message($1, 'thanks!')", [conv]);
    assert.ok((await q(u.seller, "select id from notifications where kind = 'message'")).length >= 1);
    await rpc(u.seller, "public.block_user($1)", [u.buyer]);
    await fails(rpc(u.buyer, "public.send_message($1, 'again')", [conv]), /blocked/);
  });

  it("hides ledger, webhooks and handoff codes from clients", async () => {
    await fails(q(u.buyer, "select * from handoff_challenges"), /permission denied/);
    assert.equal((await q(u.buyer, "select * from ledger_entries")).length, 0);
    assert.equal((await q(u.seller, "select * from payment_intents")).length, 0);
    assert.ok((await q(u.fin, "select * from ledger_entries")).length > 0, "finance can audit the ledger");
    await fails(q(u.buyer, "delete from ledger_entries"), /permission denied/);
    await fails(db.query("update ledger_entries set debit_cents = 1"), /append-only/);
  });

  it("does not expose trusted functions to signed-in users", async () => {
    for (const call of ["private.account_balance('escrow')", "private.post_journal('x', null, '', '[]'::jsonb)"]) {
      await fails(rpc(u.buyer, call), /permission denied/);
    }
    await fails(rpc(u.buyer, "public.settle_provider_refund(gen_random_uuid(), true)"), /permission denied|forbidden/);
  });

  it("scopes staff by role", async () => {
    await fails(rpc(u.buyer, "public.review_seller($1, 'suspended')", [ids.sellerRow]), /forbidden/);
    await fails(rpc(u.ops, "public.finance_set_payout(gen_random_uuid(), 'paid')"), /forbidden/);
    assert.equal((await q(u.ops, "select count(*)::int c from ledger_entries"))[0].c, 0, "operations cannot read the ledger");
  });
});

describe("accounts and invitations", () => {
  it("invites a courier once and rejects reused or mismatched tokens", async () => {
    const stranger = await newUser(db, "newcourier@vossie.net", { display_name: "Zed" });
    const token = await rpc(u.ops, "public.invite_staff('newcourier@vossie.net', 'courier', 'potchefstroom')");
    await fails(rpc(u.buyer, "public.accept_invitation($1)", [token]), /invalid_invitation/);
    assert.equal(await rpc(stranger, "public.accept_invitation($1, 'Zed Z', '0831112222')", [token]), "courier");
    await fails(rpc(stranger, "public.accept_invitation($1)", [token]), /invalid_invitation/);
    assert.equal((await q(stranger, "select campus_ids from courier_profiles"))[0].campus_ids[0], "potchefstroom");
    await fails(rpc(u.buyer, "public.invite_staff('x@vossie.net', 'admin')"), /forbidden/);
  });

  it("purges the student number after the retention period", async () => {
    await rpc(u.buyer2, "public.submit_student_number('eduv111111')");
    await db.exec(`insert into account_deletion_requests (user_id, purge_after) values ('${u.buyer2}', now() - interval '1 day')`);
    assert.equal((await db.query("select private.purge_deleted_accounts() n")).rows[0].n >= 1, true);
    assert.equal((await db.query("select student_number from profile_private where user_id = $1", [u.buyer2])).rows[0].student_number, null);
  });
});
