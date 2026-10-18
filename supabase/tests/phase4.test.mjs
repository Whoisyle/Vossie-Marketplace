// Phase 4 database tests: courier ratings and tips, points, referrals, the voucher wallet, order for later,
// meet-up spots, shared tracking, alerts, verified sellers and reorder. Run with: npm run test:db
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
const bal = async (code, owner = null) => BigInt((await db.query("select private.account_balance($1, $2) b", [code, owner])).rows[0].b);
const wallet = async (user) => BigInt((await db.query("select balance_cents from wallets where user_id = $1", [user])).rows[0]?.balance_cents ?? 0);
const ledgerBalanced = async () => {
  const [{ d, c }] = (await db.query("select sum(debit_cents)::bigint d, sum(credit_cents)::bigint c from ledger_entries")).rows;
  assert.equal(d, c, "ledger debits equal credits");
};
const walletMatchesLedger = async (user) => assert.equal(await wallet(user), await bal("wallet", user), "wallet equals ledger");
const key = () => `key-${Math.random().toString(36).slice(2)}-xx`;

async function makeListing(seller, { title, price = 5000, stock = 20 }) {
  const listing = { type: "goods", category_id: "food", title, description: "A long enough description for checks", condition: "good", weight_grams: 500 };
  const id = await rpc(seller, "public.upsert_listing($1::jsonb, $2::jsonb, $3::jsonb)", [
    JSON.stringify(listing),
    JSON.stringify([{ label: "Standard", price_cents: price, on_hand: stock }]),
    JSON.stringify([{ storage_path: `${seller}/${title}.jpg` }]),
  ]);
  await rpc(seller, "public.submit_listing($1)", [id]);
  return { id, option: (await db.query("select id from listing_options where listing_id = $1", [id])).rows[0].id };
}

async function place(buyer, option, fulfilment = "campus_handoff", qty = 1) {
  await rpc(buyer, "public.cart_clear()");
  await rpc(buyer, "public.cart_add($1, $2)", [option, qty]);
  const placed = await rpc(buyer, "public.place_order($1::fulfilment_method, 'wallet', $2, $3, '', null)", [fulfilment, key(), "12 Campus Road, Potch"]);
  const so = await one(buyer, "select * from seller_orders where order_id = $1", [placed.order_id]);
  return { placed, so };
}

/** Order, accept, courier delivers with the one-time codes; leaves the order in the issue window. */
async function deliver(buyer, option) {
  const { so } = await place(buyer, option, "vossie_delivery");
  await rpc(u.seller, "public.seller_respond($1, true)", [so.id]);
  const job = (await db.query("select * from delivery_jobs where seller_order_id = $1", [so.id])).rows[0];
  await rpc(u.courier, "public.courier_claim_job($1)", [job.id]);
  await rpc(u.seller, "public.seller_advance($1, 'ready')", [so.id]);
  const pickup = await rpc(u.seller, "public.reveal_handoff_code($1, 'pickup')", [so.id]);
  await rpc(u.courier, "public.courier_confirm_pickup($1, $2)", [job.id, pickup.code]);
  await rpc(u.courier, "public.courier_update_status($1, 'in_transit', -26.7, 27.1)", [job.id]);
  await rpc(u.courier, "public.courier_update_status($1, 'arrived')", [job.id]);
  const drop = await rpc(buyer, "public.reveal_handoff_code($1, 'dropoff')", [so.id]);
  await rpc(u.courier, "public.courier_confirm_delivery($1, $2)", [job.id, drop.code]);
  return { so, job };
}

/** The next half hour that is at least 60 minutes away and between 08:00 and 20:00 in South Africa (UTC+2). */
function nextSlot() {
  const t = new Date(Math.ceil((Date.now() + 60 * 60_000) / 1_800_000) * 1_800_000);
  for (let i = 0; i < 96; i += 1) {
    const local = new Date(t.getTime() + i * 1_800_000 + 2 * 3_600_000);
    const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
    if (minutes >= 480 && minutes <= 1200) return new Date(t.getTime() + i * 1_800_000);
  }
  throw new Error("no slot");
}

before(async () => {
  db = await createDb();
  for (const name of ["buyer", "buyer2", "stranger", "seller", "courier", "ops"]) {
    u[name] = await newUser(db, `${name}@vossie.net`, { display_name: name === "buyer" ? "Vumisa" : name });
  }
  for (const who of ["buyer", "buyer2", "stranger", "seller"]) {
    await rpc(u[who], "(public.update_my_profile($1, '0712345678', 'potchefstroom')).id", [who === "seller" ? "Campus Bites" : who === "buyer" ? "Vumisa" : `Student ${who}`]);
  }
  await db.exec(`
    insert into memberships (user_id, role, state) values ('${u.ops}', 'operations', 'active'), ('${u.courier}', 'courier', 'active');
    insert into courier_profiles (user_id, full_name, phone, campus_ids, online)
      values ('${u.courier}', 'Linda M', '0820000000', '{potchefstroom}', true);`);
  await rpc(u.seller, "(public.submit_seller_profile('Campus Bites', 'Burgers', 'Food court', 'potchefstroom', true, true)).id");
  ids.sellerRow = (await db.query("select id from sellers where user_id = $1", [u.seller])).rows[0].id;
  await rpc(u.ops, "public.review_seller($1, 'approved', 'ok')", [ids.sellerRow]);
  ids.burger = await makeListing(u.seller, { title: "Burger and Chips", price: 6000, stock: 50 });
  for (const who of ["buyer", "buyer2", "stranger"]) await rpc(u[who], "public.demo_top_up(100000)");
});

describe("courier ratings and tips", () => {
  it("lets the buyer rate and tip once, pays the courier and keeps the books balanced", async () => {
    const { job } = await deliver(u.buyer, ids.burger.option);
    const walletBefore = await wallet(u.buyer);
    await fails(rpc(u.buyer2, "public.rate_courier($1, 5, 0)", [job.id]), /forbidden/);
    await fails(rpc(u.buyer, "public.rate_courier($1, 6, 0)", [job.id]), /invalid_rating/);
    await fails(rpc(u.buyer, "public.rate_courier($1, 5, 60000)", [job.id]), /invalid_tip/);
    await rpc(u.buyer, "public.rate_courier($1, 5, 1000)", [job.id]);
    assert.equal(await wallet(u.buyer), walletBefore - 1000n);
    assert.equal(await bal("courier_payable", u.courier), 1000n, "the tip is the courier's");
    assert.equal(Number((await db.query("select rating_avg from courier_profiles where user_id = $1", [u.courier])).rows[0].rating_avg), 5);
    await fails(rpc(u.buyer, "public.rate_courier($1, 4, 0)", [job.id]), /already_rated/);
    assert.equal((await q(u.courier, "select * from courier_ratings")).length, 1, "the courier sees their own rating");
    assert.equal((await q(u.buyer2, "select * from courier_ratings")).length, 0, "others do not");
    await fails(q(u.buyer, "update courier_ratings set rating = 1"), /permission denied/);
    await walletMatchesLedger(u.buyer);
    await ledgerBalanced();
  });

  it("refuses a rating before delivery and a tip the wallet cannot cover", async () => {
    const { so } = await place(u.buyer, ids.burger.option, "vossie_delivery");
    await rpc(u.seller, "public.seller_respond($1, true)", [so.id]);
    const job = (await db.query("select id from delivery_jobs where seller_order_id = $1", [so.id])).rows[0];
    await fails(rpc(u.buyer, "public.rate_courier($1, 5, 0)", [job.id]), /not_delivered/);

    const poor = await newUser(db, "poor@vossie.net", { display_name: "poor" });
    await rpc(poor, "(public.update_my_profile('Poor Student', '0712345678', 'potchefstroom')).id");
    await rpc(poor, "public.demo_top_up(7500)");
    const delivered = await deliver(poor, ids.burger.option);
    await fails(rpc(poor, "public.rate_courier($1, 5, 500)", [delivered.job.id]), /insufficient_funds/);
    assert.equal((await db.query("select count(*)::int n from courier_ratings where delivery_job_id = $1", [delivered.job.id])).rows[0].n, 0, "nothing was saved");
  });
});

describe("Vossie Points", () => {
  it("awards 1 point per R10 when an order completes, once", async () => {
    const { so } = await deliver(u.buyer2, ids.burger.option);
    await rpc(u.buyer2, "public.buyer_confirm_received($1)", [so.id]);
    const mine = await rpc(u.buyer2, "public.my_points()");
    assert.equal(mine.points, 7); // R60 + R15 delivery = R75 -> 7 points
    assert.equal(mine.tier, "bronze");
    assert.equal(mine.value_cents, 0);
    assert.equal((await q(u.buyer2, "select * from points_ledger")).length, 1);
    assert.equal((await q(u.stranger, "select * from points_ledger")).length, 0, "points are private");
  });

  it("redeems in steps of 100 into the wallet, once per key, and never below zero", async () => {
    await db.exec(`insert into points_ledger (user_id, points, kind, label) values ('${u.buyer2}', 500, 'bonus', 'test bonus')`);
    assert.equal((await rpc(u.buyer2, "public.my_points()")).tier, "silver");
    const before = await wallet(u.buyer2);
    await fails(rpc(u.buyer2, "public.redeem_points(150, 'redeem-key-001')"), /invalid_points/);
    await fails(rpc(u.buyer2, "public.redeem_points(100, 'x')"), /idempotency_key_required/);
    await rpc(u.buyer2, "public.redeem_points(100, 'redeem-key-001')");
    await rpc(u.buyer2, "public.redeem_points(100, 'redeem-key-001')"); // retry: nothing happens twice
    assert.equal(await wallet(u.buyer2), before + 1000n);
    assert.equal((await rpc(u.buyer2, "public.my_points()")).points, 407);
    await fails(rpc(u.buyer2, "public.redeem_points(500, 'redeem-key-002')"), /insufficient_points/);
    await fails(q(u.buyer2, "update points_ledger set points = 1000000"), /permission denied/);
    await fails(q(u.buyer2, "insert into points_ledger (user_id, points, kind) values ($1, 999, 'bonus')", [u.buyer2]), /permission denied/);
    await walletMatchesLedger(u.buyer2);
    await ledgerBalanced();
  });
});

describe("referrals", () => {
  it("gives each student a stable code in the VUMI-1234 shape", async () => {
    const code = await rpc(u.buyer, "public.my_referral_code()");
    assert.match(code, /^[A-Z]{4}-\d{4}$/);
    assert.equal(code.slice(0, 4), "VUMI");
    assert.equal(await rpc(u.buyer, "public.my_referral_code()"), code);
    ids.referralCode = code;
  });

  it("rejects bad codes and your own, and pays both once on the friend's first order", async () => {
    await fails(rpc(u.stranger, "public.apply_referral_code('NOPE-0000')"), /invalid_code/);
    await fails(rpc(u.buyer, "public.apply_referral_code($1)", [ids.referralCode]), /own_code/);
    const friend = await newUser(db, "friend@vossie.net", { display_name: "Kamo" });
    await rpc(friend, "(public.update_my_profile('Kamo Friend', '0712345678', 'potchefstroom')).id");
    await rpc(friend, "public.demo_top_up(50000)");
    await rpc(friend, "public.apply_referral_code($1)", [ids.referralCode.toLowerCase()]);
    await fails(rpc(friend, "public.apply_referral_code($1)", [ids.referralCode]), /already_referred/);
    assert.equal((await one(friend, "select status from referrals")).status, "joined");

    const referrerBefore = await wallet(u.buyer);
    const friendBefore = await wallet(friend);
    await place(friend, ids.burger.option); // R60 paid from the wallet
    assert.equal(await wallet(u.buyer), referrerBefore + 3000n);
    assert.equal(await wallet(friend), friendBefore - 6000n + 3000n);
    assert.equal((await one(friend, "select status from referrals")).status, "rewarded");
    assert.equal((await q(u.buyer, "select * from referrals")).length, 1, "the referrer sees the invite");
    assert.equal((await q(u.stranger, "select * from referrals")).length, 0);

    await place(friend, ids.burger.option); // second order: no second reward
    assert.equal(await wallet(u.buyer), referrerBefore + 3000n);
    await fails(rpc(u.buyer2, "public.apply_referral_code($1)", [ids.referralCode]), /already_ordered/);
    await walletMatchesLedger(u.buyer);
    await walletMatchesLedger(friend);
    await ledgerBalanced();
  });
});

describe("voucher wallet", () => {
  it("lists granted vouchers with expiry and keeps granting to trusted code", async () => {
    await db.exec(`
      insert into vouchers (code, description, percent_off, min_subtotal_cents, ends_at) values ('EXAM15', 'Exam season', 15, 10000, now() + interval '21 days');
      insert into vouchers (code, description, cents_off, ends_at) values ('OLD5', 'Gone', 500, now() - interval '3 days');`);
    await fails(rpc(u.buyer, "public.grant_voucher($1, 'EXAM15')", [u.buyer]), /permission denied/);
    await rpc("service_role", "public.grant_voucher($1, 'exam15')", [u.buyer]);
    await rpc("service_role", "public.grant_voucher($1, 'OLD5')", [u.buyer]);
    const mine = await q(u.buyer, "select * from public.my_vouchers()");
    assert.deepEqual(mine.map((v) => [v.code, v.expired, v.used]), [["EXAM15", false, false], ["OLD5", true, false]]);
    assert.equal(Number(mine[0].min_subtotal_cents), 10000);
    assert.equal((await q(u.buyer2, "select * from public.my_vouchers()")).length, 0);
    await fails(q(u.buyer, "insert into user_vouchers (user_id, code) values ($1, 'EXAM15')", [u.buyer]), /permission denied/);
  });
});

describe("order for later", () => {
  it("accepts a valid slot, rejects bad ones, and reminds the seller once", async () => {
    const { so } = await place(u.stranger, ids.burger.option);
    const slot = nextSlot();
    await fails(rpc(u.buyer2, "public.schedule_seller_order($1, $2)", [so.id, slot.toISOString()]), /forbidden/);
    await fails(rpc(u.stranger, "public.schedule_seller_order($1, now() + interval '10 minutes')", [so.id]), /invalid_slot/);
    await fails(rpc(u.stranger, "public.schedule_seller_order($1, now() + interval '5 days')", [so.id]), /invalid_slot/);
    await fails(rpc(u.stranger, "public.schedule_seller_order($1, $2)", [so.id, new Date(slot.getTime() + 7 * 60_000).toISOString()]), /invalid_slot/);
    await rpc(u.stranger, "public.schedule_seller_order($1, $2)", [so.id, slot.toISOString()]);
    assert.equal(new Date((await one(u.stranger, "select scheduled_for from seller_orders where id = $1", [so.id])).scheduled_for).getTime(), slot.getTime());

    await db.exec(`update seller_orders set scheduled_for = now() + interval '20 minutes' where id = '${so.id}'`);
    await fails(rpc(u.stranger, "public.send_prep_reminders()"), /permission denied/);
    assert.equal(await rpc("service_role", "public.send_prep_reminders()"), 1);
    assert.equal(await rpc("service_role", "public.send_prep_reminders()"), 0, "only once");
    assert.equal((await q(u.seller, "select * from notifications where kind = 'prep_reminder'")).length, 1);

    await rpc(u.seller, "public.seller_respond($1, true)", [so.id]);
    await fails(rpc(u.stranger, "public.schedule_seller_order($1, $2)", [so.id, slot.toISOString()]), /too_late/);
  });
});

describe("meet-up spots and shared tracking", () => {
  it("lists five safe spots per campus for signed-in students only", async () => {
    const spots = await q(u.buyer, "select name from meetup_points where campus_id = 'potchefstroom' order by sort_order");
    assert.equal(spots.length, 5);
    assert.equal(spots[0].name, "Main entrance");
    await fails(q("anon", "select * from meetup_points"), /permission denied/);
  });

  it("shares status only, through a link that expires, can be revoked, and is limited", async () => {
    const { so } = await place(u.buyer, ids.burger.option);
    await fails(rpc(u.stranger, "public.create_tracking_share($1)", [so.id]), /forbidden/);
    const token = await rpc(u.buyer, "public.create_tracking_share($1)", [so.id]);
    assert.equal(token.length, 64);
    const shared = await rpc("anon", "public.shared_tracking($1)", [token]);
    assert.equal(shared.order_number, so.number);
    assert.equal(shared.status, "awaiting_seller");
    for (const secret of ["address", "phone", "items", "total"]) {
      assert.equal(Object.keys(shared).some((k) => k.includes(secret)), false, `no ${secret} in the shared view`);
    }
    assert.equal(await rpc("anon", "public.shared_tracking('not-a-token')"), null);
    await fails(q("anon", "select * from tracking_shares"), /permission denied/);
    assert.equal((await q(u.stranger, "select * from tracking_shares")).length, 0);

    await rpc(u.buyer, "public.revoke_tracking_share($1)", [token]);
    assert.equal(await rpc("anon", "public.shared_tracking($1)", [token]), null);

    const second = await rpc(u.buyer, "public.create_tracking_share($1)", [so.id]);
    await db.exec(`update tracking_shares set expires_at = now() - interval '1 minute' where token = '${second}'`);
    assert.equal(await rpc("anon", "public.shared_tracking($1)", [second]), null);
    for (let i = 0; i < 5; i += 1) await rpc(u.buyer, "public.create_tracking_share($1)", [so.id]);
    await fails(rpc(u.buyer, "public.create_tracking_share($1)", [so.id]), /too_many_links/);
  });
});

describe("alerts, verified sellers and reorder", () => {
  it("tells students when the price drops or an item is back, once", async () => {
    assert.equal(await rpc(u.buyer, "public.toggle_alert($1, 'price-drop')", [ids.burger.id]), true);
    assert.equal(await rpc(u.buyer, "public.toggle_alert($1, 'price-drop')", [ids.burger.id]), false);
    assert.equal(await rpc(u.buyer, "public.toggle_alert($1, 'price-drop')", [ids.burger.id]), true);
    await fails(rpc(u.buyer, "public.toggle_alert($1, 'nonsense')", [ids.burger.id]), /invalid_kind/);
    await fails(rpc(u.buyer, "public.toggle_alert(gen_random_uuid(), 'price-drop')"), /not_found/);

    await db.exec(`update listing_options set price_cents = 5000 where id = '${ids.burger.option}'`);
    assert.equal((await q(u.buyer, "select * from notifications where kind = 'price_drop'")).length, 1);
    assert.equal((await q(u.buyer2, "select * from notifications where kind = 'price_drop'")).length, 0);
    await db.exec(`update listing_options set price_cents = 4500 where id = '${ids.burger.option}'`);
    assert.equal((await q(u.buyer, "select * from notifications where kind = 'price_drop'")).length, 1, "already notified");

    await db.exec(`update listing_options set on_hand = 0, reserved = 0 where id = '${ids.burger.option}'`);
    await rpc(u.buyer, "public.toggle_alert($1, 'back-in-stock')", [ids.burger.id]);
    await db.exec(`update listing_options set on_hand = 30 where id = '${ids.burger.option}'`);
    assert.equal((await q(u.buyer, "select * from notifications where kind = 'back_in_stock'")).length, 1);
    assert.equal((await q(u.buyer2, "select * from price_alerts")).length, 0, "alerts are private");
    await db.exec(`update listing_options set price_cents = 6000 where id = '${ids.burger.option}'`);
  });

  it("marks strong, established sellers as verified", async () => {
    assert.equal(await rpc("anon", "public.is_verified_seller($1)", [ids.sellerRow]), false);
    await db.exec(`update sellers set rating_avg = 4.8, rating_count = 60 where id = '${ids.sellerRow}'`);
    assert.equal(await rpc("anon", "public.is_verified_seller($1)", [ids.sellerRow]), true);
    await db.exec(`update sellers set rating_count = 10 where id = '${ids.sellerRow}'`);
    assert.equal(await rpc("anon", "public.is_verified_seller($1)", [ids.sellerRow]), false);
  });

  it("puts the available items from a past order back in the cart, for the buyer only", async () => {
    const { so } = await place(u.buyer, ids.burger.option, "campus_handoff", 2);
    await rpc(u.buyer, "public.cart_clear()");
    await fails(rpc(u.stranger, "public.reorder_to_cart($1)", [so.id]), /forbidden/);
    assert.equal(await rpc(u.buyer, "public.reorder_to_cart($1)", [so.id]), 1);
    const cart = await q(u.buyer, "select quantity from cart_items");
    assert.equal(cart.length, 1);
    assert.equal(cart[0].quantity, 2);
    await db.exec(`update listing_options set on_hand = 0, reserved = 0 where id = '${ids.burger.option}'`);
    await rpc(u.buyer, "public.cart_clear()");
    assert.equal(await rpc(u.buyer, "public.reorder_to_cart($1)", [so.id]), 0, "sold-out items are skipped");
  });

  it("keeps the ledger balanced after all of it", async () => {
    await ledgerBalanced();
  });
});
