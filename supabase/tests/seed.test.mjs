// The demo seed must load cleanly on top of the migrations and look right to a signed-out visitor.
import assert from "node:assert/strict";
import { it } from "node:test";

import { as, createDb } from "./harness.mjs";

it("loads seed.sql and exposes the demo catalogue publicly", async () => {
  const db = await createDb({ seed: true });
  const cards = await as(db, "anon", (d) => d.query("select * from listing_cards where campus_id = 'potchefstroom'"));
  assert.ok(cards.rows.length >= 15, `expected a full campus catalogue, got ${cards.rows.length}`);
  const services = await as(db, "anon", (d) => d.query("select count(*)::int c from service_slots"));
  assert.ok(services.rows[0].c > 0, "service listings have bookable slots");
  const reels = await as(db, "anon", (d) => d.query("select count(*)::int c from reels"));
  assert.equal(reels.rows[0].c, 4);
  const sellers = await as(db, "anon", (d) => d.query("select count(*)::int c from sellers where status = 'active'"));
  assert.ok(sellers.rows[0].c >= 10);
  // seeding twice is harmless
  await db.exec((await import("node:fs")).readFileSync(new URL("../seed.sql", import.meta.url), "utf8"));
});
