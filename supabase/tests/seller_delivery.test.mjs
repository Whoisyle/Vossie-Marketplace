// Database tests for the seller's campus and delivery answers in the setup.
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
  await assert.rejects(promise, (e) => pattern.test(e.message), `expected failure ${pattern}`);
};

const save = (who, { campus = "potchefstroom", delivery } = {}) =>
  delivery === undefined
    ? rpc(who, "(public.save_seller_onboarding('student', 'Vumisa Books', '082 573 5164', 'Books', 'Library', $1, array['mon','tue'], '08:00', '17:00')).id", [campus])
    : rpc(who, "(public.save_seller_onboarding('student', 'Vumisa Books', '082 573 5164', 'Books', 'Library', $1, array['mon','tue'], '08:00', '17:00', null, $2)).id", [campus, delivery]);

const row = (id) => db.query("select campus_id, delivery_mode from sellers where id = $1", [id]).then((r) => r.rows[0]);

before(async () => {
  db = await createDb();
  for (const name of ["a", "b", "c", "ops"]) u[name] = await newUser(db, `${name}@vossie.net`, { display_name: name });
  await db.exec(`insert into memberships (user_id, role, state) values ('${u.ops}', 'operations', 'active')`);
  for (const who of ["a", "b", "c"]) await rpc(u[who], "(public.update_my_profile($1, '0712345678', 'potchefstroom')).id", [`Student ${who}`]);
});

describe("seller campus and delivery", () => {
  it("defaults to courier and collection when the app does not say", async () => {
    const id = await save(u.a);
    assert.deepEqual(await row(id), { campus_id: "potchefstroom", delivery_mode: "both" });
  });

  it("stores the campus and the delivery choice, and changes them on a second save", async () => {
    const id = await save(u.b, { campus: "pretoria", delivery: "collection" });
    assert.deepEqual(await row(id), { campus_id: "pretoria", delivery_mode: "collection" });
    await save(u.b, { campus: "bloemfontein", delivery: "courier" });
    assert.deepEqual(await row(id), { campus_id: "bloemfontein", delivery_mode: "courier" });
  });

  it("refuses a delivery choice that is not one of the three", async () => {
    await fails(save(u.c, { delivery: "drone" }), /invalid_delivery/);
  });

  it("treats a missing choice as both and cannot be saved straight into the table", async () => {
    const id = await rpc(u.c, "(public.save_seller_onboarding('student', 'Vumisa Books', '082 573 5164', '', '', 'potchefstroom', array['mon'], '08:00', '17:00', null, null)).id");
    assert.equal((await row(id)).delivery_mode, "both");
    await fails(db.query("update sellers set delivery_mode = 'drone' where id = $1", [id]), /sellers_delivery_mode_valid/);
  });
});

describe("the back of an ID", () => {
  const attach = (who, back) =>
    back === undefined
      ? rpc(who, "(public.attach_seller_document('id', $1, 'id-front.jpg')).id", [`${who}/id-front.jpg`])
      : rpc(who, "(public.attach_seller_document('id', $1, 'id-front.jpg', $2)).id", [`${who}/id-front.jpg`, back]);
  const backOf = (who) => db.query("select back_storage_path from seller_documents where kind = 'id' and seller_id = (select id from sellers where user_id = $1)", [who]).then((r) => r.rows[0]?.back_storage_path);

  it("is kept next to the front, and an earlier call without it still works", async () => {
    await attach(u.a);
    assert.equal(await backOf(u.a), null);
    await attach(u.a, `${u.a}/id-back.jpg`);
    assert.equal(await backOf(u.a), `${u.a}/id-back.jpg`);
  });

  it("can be read by staff for review, and not by another student", async () => {
    const seen = (who) => q(who, "select back_storage_path from seller_documents where kind = 'id' and back_storage_path is not null");
    assert.equal((await seen(u.ops)).length, 1);
    assert.equal((await seen(u.b)).length, 0);
    assert.equal((await seen(u.a)).length, 1);
  });

  it("must sit in the seller's own folder", async () => {
    await fails(attach(u.a, `${u.b}/id-back.jpg`), /invalid_path/);
  });
});
