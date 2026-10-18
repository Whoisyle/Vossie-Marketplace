// Database tests for subscriptions, safety and card withdrawals. Run with: npm run test:db
import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { as, createDb, newUser } from "./harness.mjs";

let db;
const u = {};

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

before(async () => {
  db = await createDb();
  for (const name of ["buyer", "other", "ops"]) u[name] = await newUser(db, `${name}@vossie.net`, { display_name: name });
  for (const who of ["buyer", "other"]) {
    await rpc(u[who], "(public.update_my_profile($1, '0712345678', 'potchefstroom')).id", [`Student ${who}`]);
    await rpc(u[who], "public.demo_top_up(100000)");
  }
  await db.exec(`insert into memberships (user_id, role, state) values ('${u.ops}', 'support', 'active')`);
});

describe("subscriptions", () => {
  it("lists the three plans to everyone", async () => {
    const plans = await q("anon", "select id, price_cents from subscription_plans order by price_cents");
    assert.deepEqual(plans.map((p) => p.id), ["study-pass", "plus", "seller-pro"]);
  });

  it("charges the wallet, refuses a second subscription to the same plan, and keeps the books balanced", async () => {
    const before = await wallet(u.buyer);
    await rpc(u.buyer, "public.subscribe_plan('plus')");
    assert.equal(await wallet(u.buyer), before - 4900n);
    assert.equal(await bal("subscription_revenue"), 4900n);
    await fails(rpc(u.buyer, "public.subscribe_plan('plus')"), /already_subscribed/);
    await fails(rpc(u.buyer, "public.subscribe_plan('nope')"), /unknown_plan/);
    assert.equal((await q(u.buyer, "select * from subscriptions")).length, 1);
    assert.equal((await q(u.other, "select * from subscriptions")).length, 0, "subscriptions are private");
    await fails(q(u.buyer, "update subscriptions set current_period_end = now() + interval '5 years'"), /permission denied/);
    await walletMatchesLedger(u.buyer);
    await ledgerBalanced();
  });

  it("refuses a plan the wallet cannot pay and saves nothing", async () => {
    const poor = await newUser(db, "poor@vossie.net", { display_name: "poor" });
    await rpc(poor, "(public.update_my_profile('Poor Student', '0712345678', 'potchefstroom')).id");
    await fails(rpc(poor, "public.subscribe_plan('study-pass')"), /insufficient_funds|violates check/);
    assert.equal((await q(poor, "select * from subscriptions")).length, 0);
  });

  it("renews due plans, ends cancelled ones and ends ones the wallet cannot pay", async () => {
    await rpc(u.other, "public.subscribe_plan('study-pass')");
    await rpc(u.other, "public.cancel_subscription('study-pass')");
    await db.exec(`update subscriptions set current_period_end = now() - interval '1 hour' where user_id in ('${u.buyer}', '${u.other}')`);
    await fails(rpc(u.buyer, "public.renew_subscriptions()"), /permission denied/);
    const before = await wallet(u.buyer);
    assert.equal(await rpc("service_role", "public.renew_subscriptions()"), 1, "only Plus renews");
    assert.equal(await wallet(u.buyer), before - 4900n);
    assert.equal((await one(u.other, "select status from subscriptions")).status, "ended");
    const renewed = await one(u.buyer, "select status, current_period_end from subscriptions");
    assert.equal(renewed.status, "active");
    assert.equal(new Date(renewed.current_period_end) > new Date(), true);

    // a wallet that cannot cover the next month ends the plan
    await db.exec(`update wallets set balance_cents = 0 where user_id = '${u.buyer}'`);
    await db.exec(`update subscriptions set current_period_end = now() - interval '1 hour' where user_id = '${u.buyer}'`);
    assert.equal(await rpc("service_role", "public.renew_subscriptions()"), 0);
    assert.equal((await one(u.buyer, "select status from subscriptions")).status, "ended");
    assert.equal((await q(u.buyer, "select * from notifications where kind = 'subscription'")).length, 1);
  });

  it("lets a cancel be undone before the period ends", async () => {
    await rpc(u.other, "public.subscribe_plan('seller-pro')");
    await rpc(u.other, "public.cancel_subscription('seller-pro')");
    assert.equal((await one(u.other, "select cancel_at_period_end from subscriptions where plan_id = 'seller-pro'")).cancel_at_period_end, true);
    await rpc(u.other, "public.resume_subscription('seller-pro')");
    assert.equal((await one(u.other, "select cancel_at_period_end from subscriptions where plan_id = 'seller-pro'")).cancel_at_period_end, false);
  });
});

describe("safety", () => {
  it("keeps trusted contacts private, validates them and limits them to five", async () => {
    await rpc(u.buyer, "public.add_emergency_contact('Mam Zodwa', '071 234 5678', 'Mother')");
    await fails(rpc(u.buyer, "public.add_emergency_contact('A', '071 234 5678')"), /check/);
    await fails(rpc(u.buyer, "public.add_emergency_contact('Someone', 'abc')"), /check/);
    assert.equal((await q(u.buyer, "select * from emergency_contacts")).length, 1);
    assert.equal((await q(u.other, "select * from emergency_contacts")).length, 0);
    for (let i = 0; i < 4; i += 1) await rpc(u.buyer, "public.add_emergency_contact($1, '0712345678')", [`Friend ${i}`]);
    await fails(rpc(u.buyer, "public.add_emergency_contact('Sixth', '0712345678')"), /too_many_contacts/);
    const id = (await one(u.buyer, "select id from emergency_contacts limit 1")).id;
    await rpc(u.other, "public.remove_emergency_contact($1)", [id]);
    assert.equal((await q(u.buyer, "select * from emergency_contacts")).length, 5, "someone else cannot remove it");
    await rpc(u.buyer, "public.remove_emergency_contact($1)", [id]);
    assert.equal((await q(u.buyer, "select * from emergency_contacts")).length, 4);
  });

  it("saves the campus security number for its owner only", async () => {
    await rpc(u.buyer, "public.set_campus_security_number('018 299 1111')");
    await rpc(u.buyer, "public.set_campus_security_number('018 299 2222')");
    assert.equal((await one(u.buyer, "select campus_security_number n from safety_settings")).n, "018 299 2222");
    assert.equal((await q(u.other, "select * from safety_settings")).length, 0);
    await fails(rpc(u.buyer, "public.set_campus_security_number('call me maybe')"), /invalid_phone/);
  });

  it("takes reports, shows them to the reporter and to staff, and rejects bad ones", async () => {
    await rpc(u.buyer, "public.submit_safety_report('Safety incident', 'Someone followed me after a meet-up')");
    await fails(rpc(u.buyer, "public.submit_safety_report('Nonsense', 'something happened')"), /check/);
    await fails(rpc(u.buyer, "public.submit_safety_report('User', 'no')"), /check/);
    assert.equal((await q(u.buyer, "select * from safety_reports")).length, 1);
    assert.equal((await q(u.other, "select * from safety_reports")).length, 0, "other students cannot read it");
    assert.equal((await q(u.ops, "select * from safety_reports")).length, 1, "staff can");
    await fails(q(u.buyer, "update safety_reports set status = 'closed'"), /permission denied/);
    for (let i = 0; i < 9; i += 1) await rpc(u.buyer, "public.submit_safety_report('Other', 'Another report here')");
    await fails(rpc(u.buyer, "public.submit_safety_report('Other', 'One too many')"), /rate_limited/);
  });
});

describe("card withdrawals", () => {
  let card;
  before(async () => {
    // a fresh student whose wallet came only through the ledger
    u.wd = await newUser(db, "wd@vossie.net", { display_name: "wd" });
    await rpc(u.wd, "(public.update_my_profile('Student wd', '0712345678', 'potchefstroom')).id");
    await rpc(u.wd, "public.demo_top_up(100000)");
    await rpc("service_role", "public.save_payment_method($1, 'test', 'tok_buyer_1', 'visa', '4242', 8, 2030, 'Student wd', true)", [u.wd]);
    await rpc("service_role", "public.save_payment_method($1, 'test', 'tok_other_1', 'visa', '1111', 8, 2030, 'Student other', true)", [u.other]);
    card = (await one(u.wd, "select id from payment_methods")).id;
    await db.exec(`insert into ledger_accounts (code, kind) select 'provider_clearing', 'asset' where not exists (select 1 from ledger_accounts where code = 'provider_clearing' and owner_user_id is null)`);
  });

  it("takes the money out of the wallet into clearing, once per key, with limits", async () => {
    const before = await wallet(u.wd);
    await fails(rpc(u.wd, "public.request_card_withdrawal(1000, $1, 'withdraw-key-1')", [card]), /invalid_amount/);
    await fails(rpc(u.wd, "public.request_card_withdrawal(10000, $1, 'x')", [card]), /idempotency_key_required/);
    const other = (await one(u.other, "select id from payment_methods")).id;
    await fails(rpc(u.wd, "public.request_card_withdrawal(10000, $1, 'withdraw-key-1')", [other]), /forbidden/);
    const id = await rpc(u.wd, "public.request_card_withdrawal(10000, $1, 'withdraw-key-1')", [card]);
    assert.equal(await rpc(u.wd, "public.request_card_withdrawal(10000, $1, 'withdraw-key-1')", [card]), id, "a retry returns the same request");
    assert.equal(await wallet(u.wd), before - 10000n);
    assert.equal(await bal("withdrawals_clearing"), 10000n);
    assert.equal((await one(u.wd, "select status from withdrawal_requests where id = $1", [id])).status, "pending");
    assert.equal((await q(u.other, "select * from withdrawal_requests")).length, 0);
    await fails(rpc(u.wd, "public.request_card_withdrawal(99999999, $1, 'withdraw-key-2')", [card]), /invalid_amount/);
    await fails(rpc(u.wd, "public.request_card_withdrawal(2000000, $1, 'withdraw-key-3')", [card]), /insufficient_funds|violates check/);
    await walletMatchesLedger(u.wd);
    await ledgerBalanced();
    card = { card, id };
  });

  it("only trusted code settles a withdrawal: paid keeps it gone, failed returns it", async () => {
    const { id } = card;
    await fails(rpc(u.wd, "public.settle_withdrawal($1, true)", [id]), /permission denied/);
    await rpc("service_role", "public.settle_withdrawal($1, true)", [id]);
    assert.equal((await one(u.wd, "select status from withdrawal_requests where id = $1", [id])).status, "paid");
    assert.equal(await bal("withdrawals_clearing"), 0n);
    await fails(rpc("service_role", "public.settle_withdrawal($1, true)", [id]), /not_pending/);

    const before = await wallet(u.wd);
    const second = await rpc(u.wd, "public.request_card_withdrawal(5000, $1, 'withdraw-key-9')", [card.card]);
    assert.equal(await wallet(u.wd), before - 5000n);
    await rpc("service_role", "public.settle_withdrawal($1, false)", [second]);
    assert.equal(await wallet(u.wd), before, "a failed withdrawal returns the money");
    assert.equal((await q(u.wd, "select * from notifications where kind = 'withdrawal'")).length, 1);
    await walletMatchesLedger(u.wd);
    await ledgerBalanced();
  });
});
