/**
 * Contract tests: the TypeScript service layer must only call database functions that exist,
 * with argument names the SQL declares, and must supply every argument that has no default.
 * This catches drift between supabase/migrations and src/services without needing a live database.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { handoffMessages, ServiceError, toServiceError } from "./errors";
import { isDemoEmail, isDemoStudentNumber } from "./auth";
import { safeSearchText } from "./catalog";
import { newIdempotencyKey } from "./commerce";

const root = join(__dirname, "..", "..");

type SqlArg = { name: string; hasDefault: boolean };

function readSqlFunctions(): Map<string, SqlArg[]> {
  const dir = join(root, "supabase", "migrations");
  const sql = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
  const functions = new Map<string, SqlArg[]>();
  const pattern = /create function public\.(\w+)\s*\(/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql))) {
    let depth = 1;
    let i = pattern.lastIndex;
    const start = i;
    while (depth > 0 && i < sql.length) {
      if (sql[i] === "(") depth += 1;
      if (sql[i] === ")") depth -= 1;
      i += 1;
    }
    const body = sql.slice(start, i - 1);
    const parts: string[] = [];
    let level = 0;
    let current = "";
    for (const ch of body) {
      if (ch === "(") level += 1;
      if (ch === ")") level -= 1;
      if (ch === "," && level === 0) {
        parts.push(current);
        current = "";
      } else current += ch;
    }
    parts.push(current);
    functions.set(
      match[1]!,
      parts.map((p) => p.trim()).filter(Boolean).map((p) => ({ name: p.split(/\s+/)[0]!, hasDefault: /\sdefault\s/i.test(p) })),
    );
  }
  return functions;
}

type Call = { name: string; keys: string[]; file: string };

function readRpcCalls(): Call[] {
  const dir = __dirname;
  const calls: Call[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
    const text = readFileSync(join(dir, file), "utf8");
    const pattern = /rpc(?:<[^>]*(?:<[^>]*>[^>]*)*>)?\(\s*"(\w+)"\s*(?:,\s*\{)?/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
      const name = match[1]!;
      const hasObject = match[0].trimEnd().endsWith("{");
      let keys: string[] = [];
      if (hasObject) {
        let depth = 1;
        let i = pattern.lastIndex;
        const start = i;
        while (depth > 0 && i < text.length) {
          if (text[i] === "{") depth += 1;
          if (text[i] === "}") depth -= 1;
          i += 1;
        }
        keys = [...text.slice(start, i - 1).matchAll(/\b(p_[a-z_0-9]+)\s*:/g)].map((m) => m[1]!);
      }
      calls.push({ name, keys, file });
    }
  }
  return calls;
}

describe("service layer matches the database", () => {
  const sql = readSqlFunctions();
  const calls = readRpcCalls().filter((c) => c.file !== "client.ts");

  it("finds the functions and the calls", () => {
    expect(sql.size).toBeGreaterThan(60);
    expect(calls.length).toBeGreaterThan(60);
  });

  it.each(calls.map((c) => [`${c.file}: ${c.name}`, c] as const))("%s", (_label, call) => {
    const declared = sql.get(call.name);
    expect(declared).toBeDefined();
    const names = declared!.map((a) => a.name);
    for (const key of call.keys) expect(names).toContain(key);
    for (const arg of declared!.filter((a) => !a.hasDefault)) expect(call.keys).toContain(arg.name);
  });
});

describe("error mapping", () => {
  it("turns database codes into stable errors with readable messages", () => {
    expect(toServiceError({ message: "insufficient_stock: Burger" })).toMatchObject({ code: "unavailable" });
    expect(toServiceError({ message: "permission denied for table orders" })).toMatchObject({ code: "forbidden" });
    expect(toServiceError({ message: "invalid_voucher" }).message).toMatch(/voucher/i);
    expect(toServiceError({ message: "Failed to fetch" })).toMatchObject({ code: "network" });
    expect(toServiceError({ message: "Demo accounts need an @vossie.net email address." })).toMatchObject({ code: "invalid_input" });
  });

  it("never leaks raw SQL text for unknown errors", () => {
    const error = toServiceError({ message: 'relation "x" does not exist' });
    expect(error).toBeInstanceOf(ServiceError);
    expect(error.code).toBe("unknown");
    expect(error.message).not.toMatch(/relation/);
  });

  it("has a message for every handoff code failure", () => {
    for (const key of ["wrong_code", "locked", "expired", "no_code"]) expect(handoffMessages[key]).toBeTruthy();
  });
});

describe("client-side helpers", () => {
  it("checks the demo email and student number the same way the server does", () => {
    expect(isDemoEmail(" Student@Vossie.net ")).toBe(true);
    expect(isDemoEmail("student@gmail.com")).toBe(false);
    expect(isDemoEmail("a b@vossie.net")).toBe(false);
    expect(isDemoStudentNumber("EDUV230953")).toBe(true);
    expect(isDemoStudentNumber("eduv")).toBe(false);
    expect(isDemoStudentNumber("abc230953")).toBe(false);
  });

  it("strips filter syntax from search text", () => {
    expect(safeSearchText("burger),seller_name.eq.x")).not.toMatch(/[(),]/);
    expect(safeSearchText("  a   b  ")).toBe("a b");
    expect(safeSearchText("x".repeat(200))).toHaveLength(60);
  });

  it("makes unique idempotency keys", () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
    expect(newIdempotencyKey().length).toBeGreaterThanOrEqual(8);
  });
});
