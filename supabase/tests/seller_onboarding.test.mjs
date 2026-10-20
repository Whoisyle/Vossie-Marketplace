// Database tests for seller onboarding: the setup, the documents, submitting for review and staff approval.
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
  await assert.rejects(promise, (e) => (pattern ? pattern.test(e.message) : true), `expected failure ${pattern ?? ""}`);
};

const setup = (who, over = {}) =>
  rpc(who, "(public.save_seller_onboarding($1::seller_kind, $2, $3, $4, $5, 'potchefstroom', $6::text[], $7::time, $8::time, $9)).id", [
    over.kind ?? "campus_business",
    over.name ?? "CampusBites",
    over.phone ?? "082 573 5164",
    over.bio ?? "Fast-food joint",
    over.location ?? "Eduvos Potchefstroom, Res Block B",
    over.days ?? ["mon", "tue", "wed", "thu", "fri"],
    over.opens ?? "08:00",
    over.closes ?? "17:00",
    over.logo ?? null,
  ]);
const attach = (who, kind, user = who) => rpc(who, "(public.attach_seller_document($1::seller_doc_kind, $2, $3)).id", [kind, `${user}/${kind}.jpg`, `${kind}.jpg`]);
const docs = (sellerId) => db.query("select kind, status from seller_documents where seller_id = $1 order by kind", [sellerId]).then((r) => Object.fromEntries(r.rows.map((x) => [x.kind, x.status])));
const sellerStatus = (sellerId) => db.query("select status from sellers where id = $1", [sellerId]).then((r) => r.rows[0].status);

before(async () => {
  db = await createDb();
  for (const name of ["seller", "company", "other", "ops"]) u[name] = await newUser(db, `${name}@vossie.net`, { display_name: name });
  for (const who of ["seller", "company", "other"]) await rpc(u[who], "(public.update_my_profile($1, '0712345678', 'potchefstroom')).id", [`Student ${who}`]);
  await db.exec(`insert into memberships (user_id, role, state) values ('${u.ops}', 'operations', 'active')`);
});

describe("saving the setup", () => {
  it("checks the number, the days and the hours", async () => {
    await fails(setup(u.seller, { phone: "123" }), /invalid_phone/);
    await fails(setup(u.seller, { days: [] }), /invalid_days/);
    await fails(setup(u.seller, { days: ["mon", "funday"] }), /invalid_days/);
    await fails(setup(u.seller, { opens: "17:00", closes: "08:00" }), /invalid_hours/);
    await fails(setup(u.seller, { name: "x" }), /invalid_name/);
    await fails(setup(u.seller, { logo: `${u.other}/logo.png` }), /invalid_path/);
  });

  it("creates a draft seller with the kind, number, location and opening days", async () => {
    ids.seller = await setup(u.seller, { logo: `${u.seller}/logo.png` });
    const row = (await db.query("select * from sellers where id = $1", [ids.seller])).rows[0];
    assert.equal(row.status, "draft");
    assert.equal(row.kind, "campus_business");
    assert.equal(row.contact_phone, "0825735164");
    assert.deepEqual(row.open_days, ["mon", "tue", "wed", "thu", "fri"]);
    assert.equal(row.logo_path, `${u.seller}/logo.png`);
  });

  it("keeps the logo when the setup is saved again without one", async () => {
    await setup(u.seller, { name: "Campus Bites" });
    assert.equal((await db.query("select logo_path, display_name from sellers where id = $1", [ids.seller])).rows[0].logo_path, `${u.seller}/logo.png`);
  });
});

describe("documents", () => {
  it("only accepts a file in the seller's own folder, and a CIPC document only from a registered business", async () => {
    await fails(rpc(u.seller, "(public.attach_seller_document('id', $1, 'id.jpg')).id", [`${u.other}/id.jpg`]), /invalid_path/);
    await fails(attach(u.seller, "cipc"), /not_required/);
    await fails(rpc(u.other, "(public.attach_seller_document('id', $1, 'id.jpg')).id", [`${u.other}/id.jpg`]), /not_a_seller/);
  });

  it("are private: the seller and staff read them, other students do not", async () => {
    await attach(u.seller, "id");
    assert.equal((await q(u.seller, "select * from seller_documents")).length, 1);
    assert.equal((await q(u.ops, "select * from seller_documents")).length, 1);
    assert.equal((await q(u.other, "select * from seller_documents")).length, 0);
    assert.equal((await q("anon", "select * from seller_documents").catch(() => [])).length, 0);
  });

  it("cannot be written directly", async () => {
    await fails(q(u.seller, "update seller_documents set status = 'verified'"), /permission denied/);
    await fails(q(u.seller, "insert into seller_documents (seller_id, kind, storage_path) values ($1, 'address', 'x')", [ids.seller]), /permission denied/);
  });
});

describe("submitting for review", () => {
  it("refuses until every required document is given", async () => {
    await fails(rpc(u.seller, "(public.submit_seller_verification()).id"), /documents_missing/);
    assert.equal(await sellerStatus(ids.seller), "draft");
  });

  it("accepts the student card on its own when the Eduvos record matched, and moves the rest to in review", async () => {
    await db.exec(`update profiles set student_status = 'verified' where id = '${u.seller}'`);
    await attach(u.seller, "address");
    await rpc(u.seller, "(public.submit_seller_verification()).id");
    assert.deepEqual(await docs(ids.seller), { address: "in_review", id: "in_review", student_card: "verified" });
    assert.equal(await sellerStatus(ids.seller), "pending_review");
  });

  it("asks a registered business for its CIPC registration too", async () => {
    ids.company = await setup(u.company, { kind: "registered", name: "Plato Foods" });
    await db.exec(`update profiles set student_status = 'verified' where id = '${u.company}'`);
    await attach(u.company, "id");
    await attach(u.company, "address");
    await fails(rpc(u.company, "(public.submit_seller_verification()).id"), /documents_missing: \{cipc\}/);
    await attach(u.company, "cipc");
    await rpc(u.company, "(public.submit_seller_verification()).id");
    assert.equal(await sellerStatus(ids.company), "pending_review");
  });
});

describe("staff review", () => {
  it("is for staff only", async () => {
    const doc = (await db.query("select id from seller_documents where seller_id = $1 and kind = 'id'", [ids.seller])).rows[0].id;
    await fails(rpc(u.other, "public.staff_review_seller_document($1, 'verified')", [doc]), /forbidden/);
    await fails(rpc(u.seller, "public.staff_review_seller_document($1, 'verified')", [doc]), /forbidden/);
  });

  it("approves the seller once the last required document is verified, and not before", async () => {
    const rows = (await db.query("select id, kind from seller_documents where seller_id = $1 and status = 'in_review' order by kind", [ids.seller])).rows;
    await rpc(u.ops, "public.staff_review_seller_document($1, 'verified')", [rows[0].id]);
    assert.equal(await sellerStatus(ids.seller), "pending_review");
    await rpc(u.ops, "public.staff_review_seller_document($1, 'verified')", [rows[1].id]);
    assert.equal(await sellerStatus(ids.seller), "active");
    assert.equal((await db.query("select state from memberships where user_id = $1 and role = 'seller'", [u.seller])).rows[0].state, "active");
  });

  it("lets an approved seller start listing", async () => {
    const listing = { type: "goods", category_id: "food", title: "Burger", description: "A long enough description for checks", condition: "good", weight_grams: 500 };
    const id = await rpc(u.seller, "public.upsert_listing($1::jsonb, $2::jsonb, $3::jsonb)", [JSON.stringify(listing), JSON.stringify([{ label: "Standard", price_cents: 6000, on_hand: 10 }]), JSON.stringify([{ storage_path: `${u.seller}/burger.jpg` }])]);
    assert.ok(id);
  });

  it("turns the seller down when a document is rejected, and lets them upload it again and resubmit", async () => {
    const rows = (await db.query("select id, kind from seller_documents where seller_id = $1 and status = 'in_review' order by kind", [ids.company])).rows;
    await rpc(u.ops, "public.staff_review_seller_document($1, 'rejected', 'The ID photo is blurry.')", [rows[0].id]);
    assert.equal(await sellerStatus(ids.company), "rejected");
    assert.equal((await db.query("select review_note from sellers where id = $1", [ids.company])).rows[0].review_note, "The ID photo is blurry.");
    await attach(u.company, rows[0].kind);
    assert.equal((await docs(ids.company))[rows[0].kind], "uploaded");
    await rpc(u.company, "(public.submit_seller_verification()).id");
    assert.equal(await sellerStatus(ids.company), "pending_review");
  });

  it("cannot review a document that is not in review", async () => {
    const doc = (await db.query("select id from seller_documents where seller_id = $1 and kind = 'id'", [ids.seller])).rows[0].id;
    await fails(rpc(u.ops, "public.staff_review_seller_document($1, 'verified')", [doc]), /not_in_review/);
  });
});
