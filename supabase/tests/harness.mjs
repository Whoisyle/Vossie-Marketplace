import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "migrations");

/** Boot an in-memory Postgres with the Supabase stub, then apply every migration in order. */
export async function createDb({ seed = false } = {}) {
  const db = new PGlite();
  await db.exec(readFileSync(join(here, "supabase-stub.sql"), "utf8"));
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    try {
      await db.exec(readFileSync(join(migrationsDir, file), "utf8"));
    } catch (error) {
      error.message = `${file}: ${error.message}`;
      throw error;
    }
  }
  if (seed) await db.exec(readFileSync(join(here, "..", "seed.sql"), "utf8"));
  return db;
}

/** Run fn as a signed-in user (RLS applies), or as service_role / anon. */
export async function as(db, who, fn) {
  const claims = typeof who === "string" && who.length === 36 ? { sub: who, role: "authenticated" } : { role: who };
  await db.exec(
    `select set_config('request.jwt.claim.sub', '${claims.sub ?? ""}', false);` +
      `select set_config('request.jwt.claim.role', '${claims.role}', false);` +
      `set role ${claims.role === "authenticated" ? "authenticated" : claims.role};`,
  );
  try {
    return await fn(db);
  } finally {
    await db.exec("reset role");
  }
}

export async function newUser(db, email, meta = {}) {
  const { rows } = await db.query(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [email, JSON.stringify(meta)],
  );
  return rows[0].id;
}
