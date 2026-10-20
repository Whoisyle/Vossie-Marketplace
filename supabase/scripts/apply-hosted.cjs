// Applies the new schema to the hosted Supabase project. Run by the owner, not by Claude.
// Usage (PowerShell):  $env:PW='<db password>'; node supabase/scripts/apply-hosted.cjs
// Step 1 lists old tables, step 2 drops them after you type DROP, step 3 applies migrations in order.
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { Client } = require("pg");

const host = process.env.DB_HOST || "db.elrqoyiegcnnjmjnjlja.supabase.co";
const migrations = path.join(__dirname, "..", "migrations");

const ask = (q) =>
  new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (a) => { rl.close(); res(a.trim()); });
  });

(async () => {
  if (!process.env.PW) throw new Error("Set $env:PW to the database password first.");
  const c = new Client({ host, port: Number(process.env.DB_PORT || 5432), user: process.env.DB_USER || "postgres", password: process.env.PW, database: "postgres", ssl: { rejectUnauthorized: false } });
  await c.connect();

  const tables = (await c.query("select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1")).rows;
  console.log(`Old tables in public (${tables.length}):`);
  for (const t of tables) {
    const n = await c.query(`select count(*) from public."${t.table_name}"`);
    console.log(`  ${t.table_name}: ${n.rows[0].count} rows`);
  }

  if (tables.length) {
    const a = await ask("\nType DROP to delete all of these tables (anything else cancels): ");
    if (a !== "DROP") { console.log("Cancelled. Nothing changed."); await c.end(); return; }
    await c.query("drop schema public cascade; create schema public; grant usage on schema public to postgres, anon, authenticated, service_role; grant all on schema public to postgres, service_role; alter default privileges in schema public grant all on tables to postgres, service_role;");
    console.log("Old schema dropped.");
  }

  for (const f of fs.readdirSync(migrations).filter((x) => x.endsWith(".sql")).sort()) {
    process.stdout.write(`Applying ${f} ... `);
    try {
      await c.query("begin");
      await c.query(fs.readFileSync(path.join(migrations, f), "utf8"));
      await c.query("commit");
      console.log("ok");
    } catch (e) {
      await c.query("rollback");
      console.log("FAILED\n" + e.message);
      await c.end();
      process.exit(1);
    }
  }

  const after = (await c.query("select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'")).rows[0].count;
  const rls = (await c.query("select count(*) from pg_tables where schemaname='public' and not rowsecurity")).rows[0].count;
  console.log(`\nDone. ${after} tables in public; ${rls} without row level security.`);
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
