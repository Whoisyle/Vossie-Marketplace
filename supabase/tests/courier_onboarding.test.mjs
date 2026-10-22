// Database tests for courier onboarding: the setup and its checks, the documents, submitting for review, staff approval, hours and zones.
// Run with: npm run test:db
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

const future = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

const setup = (who, over = {}) =>
  rpc(who, "to_jsonb(public.save_courier_onboarding($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date))", [
    over.name ?? "Vumisa Malindi",
    over.phone ?? "082 573 5164",
    over.campus ?? "potchefstroom",
    over.vehicle ?? "bicycle",
    over.make ?? null,
    over.model ?? null,
    over.colour ?? null,
    over.plate ?? null,
    over.licence ?? null,
    over.expires ?? null,
  ]);
const car = { vehicle: "car", make: "Toyota", model: "Corolla", colour: "White", plate: "ca 123-456", licence: "ZA12345678AB", expires: future(400) };
const attach = (who, kind, user = who) => rpc(who, "(public.attach_courier_document($1::courier_doc_kind, $2, $3)).id", [kind, `${user}/${kind}.jpg`, `${kind}.jpg`]);
const docs = (id) => db.query("select kind, status from courier_documents where courier_id = $1 order by kind", [id]).then((r) => Object.fromEntries(r.rows.map((x) => [x.kind, x.status])));
const status = (id) => db.query("select status from courier_profiles where user_id = $1", [id]).then((r) => r.rows[0].status);
const docId = (id, kind) => db.query("select id from courier_documents where courier_id = $1 and kind = $2", [id, kind]).then((r) => r.rows[0].id);

before(async () => {
  db = await createDb();
  for (const name of ["walker", "driver", "other", "ops"]) u[name] = await newUser(db, `${name}@vossie.net`, { display_name: name });
  for (const who of ["walker", "driver", "other"]) await rpc(u[who], "(public.update_my_profile($1, '0712345678', 'potchefstroom')).id", [`Student ${who}`]);
  await db.exec(`insert into memberships (user_id, role, state) values ('${u.ops}', 'operations', 'active')`);
});

describe("saving the setup", () => {
  it("checks the name, number, vehicle and campus", async () => {
    await fails(setup(u.walker, { name: "x" }), /invalid_name/);
    await fails(setup(u.walker, { phone: "123" }), /invalid_phone/);
    await fails(setup(u.walker, { vehicle: "rocket" }), /invalid_vehicle/);
    await fails(setup(u.walker, { campus: "nowhere" }), /invalid_campus/);
  });

  it("needs the make, model, colour, a South African plate and a real licence for a car or a scooter", async () => {
    await fails(setup(u.driver, { ...car, make: null }), /vehicle_incomplete/);
    await fails(setup(u.driver, { ...car, plate: "hello" }), /invalid_plate/);
    await fails(setup(u.driver, { ...car, licence: "123" }), /invalid_licence_number/);
    await fails(setup(u.driver, { ...car, expires: future(-5) }), /licence_expired/);
    await fails(setup(u.driver, { ...car, expires: future(3000) }), /licence_too_far/);
    await fails(setup(u.driver, { ...car, expires: null }), /licence_expired/);
  });

  it("accepts the plates on South African roads and keeps them tidy", async () => {
    for (const plate of ["CA 123-456", "ABC 123 GP", "CA 12 AB GP", "ND 123-456", "CAW 12345"]) {
      const row = await setup(u.driver, { ...car, plate });
      assert.equal(row.plate, plate.toUpperCase().replace(/[^A-Z0-9]/g, ""));
    }
  });

  it("creates a draft courier on the chosen campus, with no licence for a bicycle", async () => {
    const row = await setup(u.walker);
    assert.equal(row.status, "draft");
    assert.equal(row.phone, "0825735164");
    assert.deepEqual(row.campus_ids, ["potchefstroom"]);
    assert.equal(row.plate, null);
    assert.equal(row.online, false);
  });
});

describe("the documents and the review", () => {
  it("asks for the ID and selfie, and for the licence only on a car or a scooter", async () => {
    await setup(u.walker);
    await fails(attach(u.walker, "licence"), /not_required/);
    await fails(rpc(u.walker, "(public.attach_courier_document('id', $1, 'id.jpg')).id", [`${u.other}/id.jpg`]), /invalid_path/);
    await attach(u.walker, "id");
    await fails(rpc(u.walker, "(public.submit_courier_verification()).status"), /documents_missing/);
    await attach(u.walker, "selfie");
    assert.equal(await rpc(u.walker, "(public.submit_courier_verification()).status"), "pending_review");
    assert.deepEqual(await docs(u.walker), { id: "in_review", selfie: "in_review" });
    assert.equal((await db.query("select state from memberships where user_id = $1 and role = 'courier'", [u.walker])).rows[0].state, "pending");
  });

  it("cannot be changed once it is in review", async () => {
    await fails(setup(u.walker), /already_submitted/);
  });

  it("is not approved by the courier, and is by staff when the last document is verified", async () => {
    await fails(rpc(u.walker, "public.staff_review_courier_document($1, 'verified', null)", [await docId(u.walker, "id")]), /forbidden/);
    await rpc(u.ops, "public.staff_review_courier_document($1, 'verified', null)", [await docId(u.walker, "id")]);
    assert.equal(await status(u.walker), "pending_review");
    await rpc(u.ops, "public.staff_review_courier_document($1, 'verified', null)", [await docId(u.walker, "selfie")]);
    assert.equal(await status(u.walker), "active");
    assert.equal((await db.query("select state from memberships where user_id = $1 and role = 'courier'", [u.walker])).rows[0].state, "active");
    // now a real courier: the existing online switch works
    await rpc(u.walker, "public.set_courier_online(true)");
    assert.equal((await db.query("select online from courier_profiles where user_id = $1", [u.walker])).rows[0].online, true);
  });

  it("sends a courier back to fix a document that staff turned down, with the reason", async () => {
    await setup(u.driver, car);
    for (const kind of ["id", "selfie", "licence"]) await attach(u.driver, kind);
    await rpc(u.driver, "(public.submit_courier_verification()).status");
    await rpc(u.ops, "public.staff_review_courier_document($1, 'rejected', 'The licence photo is blurry')", [await docId(u.driver, "licence")]);
    const row = (await db.query("select status, review_note from courier_profiles where user_id = $1", [u.driver])).rows[0];
    assert.deepEqual(row, { status: "rejected", review_note: "The licence photo is blurry" });
    await attach(u.driver, "licence");
    assert.equal((await docs(u.driver)).licence, "uploaded");
    assert.equal(await rpc(u.driver, "(public.submit_courier_verification()).status"), "pending_review");
  });

  it("keeps one courier's documents from another courier but shows them to staff", async () => {
    assert.equal((await q(u.other, "select * from courier_documents")).length, 0);
    assert.ok((await q(u.ops, "select * from courier_documents")).length >= 2);
    assert.equal((await q(u.walker, "select * from courier_documents")).length, 2);
  });
});

describe("hours, zones and the licence", () => {
  it("saves the hours and the longest trip, and refuses nonsense", async () => {
    const ok = { mon: { from: "08:00", to: "17:00" }, sat: { from: "10:00", to: "14:00" } };
    const row = await rpc(u.walker, "to_jsonb(public.set_courier_schedule($1::jsonb, true, 4.5))", [JSON.stringify(ok)]);
    assert.deepEqual(row.schedule, ok);
    assert.equal(Number(row.max_km), 4.5);
    await fails(rpc(u.walker, "public.set_courier_schedule($1::jsonb, true, 4)", [JSON.stringify({ funday: { from: "08:00", to: "17:00" } })]), /invalid_schedule/);
    await fails(rpc(u.walker, "public.set_courier_schedule($1::jsonb, true, 4)", [JSON.stringify({ mon: { from: "17:00", to: "08:00" } })]), /invalid_schedule/);
    await fails(rpc(u.walker, "public.set_courier_schedule($1::jsonb, true, 99)", [JSON.stringify(ok)]), /invalid_distance/);
  });

  it("adds, switches off and removes a zone, but only the courier's own", async () => {
    const zone = await rpc(u.walker, "to_jsonb(public.add_courier_zone('Mooirivier Mall', 'Potchefstroom', -26.7, 27.09, true))");
    await rpc(u.walker, "public.set_courier_zone_active($1, false)", [zone.id]);
    assert.equal((await db.query("select active from courier_zones where id = $1", [zone.id])).rows[0].active, false);
    await fails(rpc(u.other, "public.remove_courier_zone($1)", [zone.id]), /not_found|setup_incomplete/);
    await rpc(u.walker, "public.remove_courier_zone($1)", [zone.id]);
    assert.equal((await db.query("select count(*)::int as n from courier_zones where courier_id = $1", [u.walker])).rows[0].n, 0);
    const campus = await rpc(u.walker, "to_jsonb(public.add_courier_zone('Campus', 'Eduvos', -26.7, 27.09, false))");
    await fails(rpc(u.walker, "public.remove_courier_zone($1)", [campus.id]), /not_found/);
  });

  it("renews a licence on a scooter or a car only, with the same checks", async () => {
    await db.exec(`update memberships set state = 'active' where user_id = '${u.driver}' and role = 'courier'`);
    await fails(rpc(u.driver, "public.update_courier_licence('123', $1::date)", [future(300)]), /invalid_licence_number/);
    await fails(rpc(u.driver, "public.update_courier_licence('ZA12345678AB', $1::date)", [future(-1)]), /licence_expired/);
    const row = await rpc(u.driver, "to_jsonb(public.update_courier_licence('za 12345678 cd', $1::date))", [future(500)]);
    assert.equal(row.licence_number, "ZA12345678CD");
    await fails(rpc(u.walker, "public.update_courier_licence('ZA12345678AB', $1::date)", [future(300)]), /not_required/);
  });
});
