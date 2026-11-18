// Database tests for the seller agreement: who can sign, what is checked, who can read the ID number, and that an unsigned
// seller cannot publish a listing or act on an order.
// Run with: npm run test:db
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
  await assert.rejects(promise, (e) => pattern.test(e.message), `expected failure ${pattern}`);
};

const HASH = "a".repeat(64);
const SIGNATURE = "M10 40 C 30 5, 50 70, 70 30 S 110 60, 130 20";
const VERSION = "2026-11-v1";
const VALID_ID = "8001015009087";

const sign = (who, over = {}) =>
  rpc(who, "(public.sign_seller_agreement($1, $2, $3, $4, $5)).id", [over.version ?? VERSION, over.hash ?? HASH, over.name ?? "Student seller", over.id ?? VALID_ID, over.signature ?? SIGNATURE]);

before(async () => {
  db = await createDb();
  for (const name of ["seller", "other", "ops"]) u[name] = await newUser(db, `${name}@vossie.net`, { display_name: name });
  for (const who of ["seller", "other"]) await rpc(u[who], "(public.update_my_profile($1, '0712345678', 'potchefstroom')).id", [`Student ${who}`]);
  await db.exec(`insert into memberships (user_id, role, state) values ('${u.ops}', 'operations', 'active')`);
  await rpc(u.seller, "(public.submit_seller_profile('Campus Bites', 'Burgers', 'Food court', 'potchefstroom', true, true)).id");
  ids.seller = (await db.query("select id from sellers where user_id = $1", [u.seller])).rows[0].id;
});

describe("the South African ID check in the database", () => {
  const valid = (id) => db.query("select private.is_valid_sa_id($1) as ok", [id]).then((r) => r.rows[0].ok);
  it("accepts a real one with or without spaces, and refuses a wrong check digit, date, citizenship digit or length", async () => {
    assert.equal(await valid("8001015009087"), true);
    assert.equal(await valid("800101 5009 087"), true);
    assert.equal(await valid("0506150123087"), true);
    assert.equal(await valid("8001015009086"), false);
    assert.equal(await valid("8013015009087"), false);
    assert.equal(await valid("8001015009187"), false);
    assert.equal(await valid("800101500908"), false);
    assert.equal(await valid(""), false);
  });
});

describe("signing", () => {
  it("is for an approved seller only", async () => {
    await fails(sign(u.seller), /seller_not_active/);
    await fails(sign(u.other), /not_a_seller/);
    await rpc(u.ops, "public.review_seller($1, 'approved', 'ok')", [ids.seller]);
  });

  it("checks the version, the hash, the name, the ID number and the signature", async () => {
    await fails(sign(u.seller, { version: "2020-01-v0" }), /wrong_version/);
    await fails(sign(u.seller, { hash: "nope" }), /invalid_hash/);
    await fails(sign(u.seller, { name: "Somebody Else" }), /name_mismatch/);
    await fails(sign(u.seller, { name: "  " }), /name_mismatch/);
    await fails(sign(u.seller, { id: "8001015009086" }), /invalid_id_number/);
    await fails(sign(u.seller, { signature: "" }), /invalid_signature/);
    await fails(sign(u.seller, { signature: "not a path at all, it is long enough" }), /invalid_signature/);
  });

  it("accepts the name in any case and spacing, and keeps the details", async () => {
    ids.agreement = await sign(u.seller, { name: "  student   SELLER " });
    const row = (await db.query("select * from seller_agreements where id = $1", [ids.agreement])).rows[0];
    assert.equal(row.version, VERSION);
    assert.equal(row.signed_name, "student   SELLER");
    assert.equal(row.id_number, VALID_ID);
    assert.equal(row.id_last4, "9087");
    assert.equal(row.email, "seller@vossie.net");
    assert.ok(row.signed_at);
  });

  it("is idempotent: signing again returns the first signature and changes nothing", async () => {
    const again = await sign(u.seller, { signature: "M1 1 L 99 99 L 5 60 L 80 10 Z" });
    assert.equal(again, ids.agreement);
    assert.equal((await db.query("select count(*)::int c from seller_agreements")).rows[0].c, 1);
    assert.equal((await db.query("select signature_svg from seller_agreements where id = $1", [ids.agreement])).rows[0].signature_svg, SIGNATURE);
  });

  it("is never edited afterwards", async () => {
    await fails(db.query("update seller_agreements set signed_name = 'Changed' where id = $1", [ids.agreement]), /append-only/);
  });
});

describe("who can read it", () => {
  it("gives the seller and staff the last four digits and the signature, and no one the whole number through the app", async () => {
    const own = await q(u.seller, "select id_last4, signature_svg from seller_agreements");
    assert.equal(own.length, 1);
    assert.equal(own[0].id_last4, "9087");
    await fails(q(u.seller, "select id_number from seller_agreements"), /permission denied/);
    await fails(q(u.ops, "select id_number from seller_agreements"), /permission denied/);
    assert.equal((await q(u.ops, "select id_last4 from seller_agreements")).length, 1);
  });

  it("hides another seller's agreement from a student", async () => {
    assert.equal((await q(u.other, "select id_last4 from seller_agreements")).length, 0);
  });

  it("lets staff read the whole ID number through an audited function, and no one else", async () => {
    assert.equal(await rpc(u.ops, "public.staff_read_agreement_id($1)", [ids.agreement]), VALID_ID);
    await fails(rpc(u.seller, "public.staff_read_agreement_id($1)", [ids.agreement]), /forbidden/);
    await fails(rpc(u.other, "public.staff_read_agreement_id($1)", [ids.agreement]), /forbidden/);
    const log = await db.query("select count(*)::int c from audit_events where action = 'seller.agreement_id_read'");
    assert.equal(log.rows[0].c, 1);
  });
});

describe("enforcement", () => {
  it("refuses to publish a listing until the current agreement is signed, and allows it after", async () => {
    // a second seller, approved, who has not signed
    u.late = await newUser(db, "late@vossie.net", { display_name: "late" });
    await rpc(u.late, "(public.update_my_profile('Student late', '0712345678', 'potchefstroom')).id");
    await rpc(u.late, "(public.submit_seller_profile('Late Bites', 'Burgers', 'Food court', 'potchefstroom', true, true)).id");
    ids.late = (await db.query("select id from sellers where user_id = $1", [u.late])).rows[0].id;
    await rpc(u.ops, "public.review_seller($1, 'approved', 'ok')", [ids.late]);
    const listing = { type: "goods", category_id: "food", title: "Burger", description: "A long enough description for checks", condition: "good", weight_grams: 500 };
    const make = (who) =>
      rpc(who, "public.upsert_listing($1::jsonb, $2::jsonb, $3::jsonb)", [JSON.stringify(listing), JSON.stringify([{ label: "Standard", price_cents: 6000, on_hand: 10 }]), JSON.stringify([{ storage_path: `${who}/burger.jpg` }])]);
    const lateListing = await make(u.late);
    await fails(rpc(u.late, "public.submit_listing($1)", [lateListing]), /agreement_required/);
    // the one who signed can
    const signed = await make(u.seller);
    await rpc(u.seller, "public.submit_listing($1)", [signed]);
  });

  it("refuses to answer an order until the current agreement is signed", async () => {
    await fails(db.query("select private.require_signed_agreement($1)", [ids.late]), /agreement_required/);
    await db.query("select private.require_signed_agreement($1)", [ids.seller]);
  });

  it("asks everyone to sign again when the version changes", async () => {
    await db.exec("alter table seller_agreements disable trigger seller_agreements_no_update");
    await db.exec("update seller_agreements set version = '2020-01-v0'");
    await fails(db.query("select private.require_signed_agreement($1)", [ids.seller]), /agreement_required/);
  });
});
