// Renders the product pictures for the demo study-notes packs: a printed cover, a sample page and a "what's inside" sheet,
// as 960x960 JPEGs in assets/products. Run: node scripts/render-notes-photos.mjs (needs Chrome and promo-video/node_modules).
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { chromium } = createRequire(path.join(root, "promo-video/package.json"))("playwright-core");

const PACKS = [
  { code: "ITMA101", module: "Mathematics for IT", campus: "Potchefstroom", pages: 42, year: 1, lecturer: "Mr. Naidoo", ink: "#376371", paper: "#EEF3F5", topics: ["Sets and set notation", "Functions", "Matrices", "Logic and truth tables", "Counting", "Exam checklist"], sample: ["A set is a collection of distinct objects.", "Union, intersection and complement, with Venn diagrams.", "Worked example: A = {1, 2, 3}, B = {2, 3, 4}."], sampleHeading: "1. Sets and set notation" },
  { code: "BLAW101", module: "Business Law", campus: "Potchefstroom", pages: 36, year: 1, lecturer: "Ms. Dlamini", ink: "#2B3440", paper: "#F4F1EA", topics: ["The legal system", "Contracts", "Delict", "Company law", "Case summaries", "Exam checklist"], sample: ["A valid contract needs agreement, capacity and lawfulness.", "Offer and acceptance, in four plain steps.", "Case summary: when silence is not acceptance."], sampleHeading: "2. Contracts" },
  { code: "ITPR101", module: "Programming Fundamentals", campus: "Pretoria", pages: 56, year: 1, lecturer: "Mr. Botha", ink: "#244752", paper: "#ECF1F2", topics: ["Variables and types", "Decisions", "Loops", "Functions", "Arrays", "Exam checklist"], sample: ["A loop repeats a block until a condition is false.", "for, while and do-while: when to use which.", "Trace table: follow the values line by line."], sampleHeading: "3. Loops" },
  { code: "FACC101", module: "Financial Accounting 1", campus: "Cape Town", pages: 48, year: 1, lecturer: "Mrs. Adams", ink: "#1E2A38", paper: "#F1F3F6", topics: ["The accounting equation", "Journals", "Ledgers", "Trial balance", "Financial statements", "Exam checklist"], sample: ["Assets = Equity + Liabilities, every time.", "Debit and credit: the rule of thumb that never fails.", "Post a journal entry in three steps."], sampleHeading: "1. The accounting equation" },
  { code: "MKTG101", module: "Marketing Principles", campus: "Cape Town", pages: 30, year: 1, lecturer: "Mr. Jacobs", ink: "#3E6B5C", paper: "#EFF4F0", topics: ["What marketing is", "Segmentation", "The marketing mix", "Consumer behaviour", "Branding", "Exam checklist"], sample: ["Product, price, place and promotion: the four Ps.", "Segment, target, position: the three-step plan.", "Example answer worth 10 marks."], sampleHeading: "3. The marketing mix" },
  { code: "ITDB201", module: "Database Design", campus: "Pretoria", pages: 64, year: 2, lecturer: "Ms. Khumalo", ink: "#1F2F39", paper: "#EDF1F3", topics: ["Entities and keys", "Relationships", "Normalisation", "SQL queries", "Joins", "Exam cheat-sheet"], sample: ["Every table needs a primary key.", "First, second and third normal form in one table.", "SELECT, WHERE, GROUP BY: the query pattern."], sampleHeading: "3. Normalisation" },
];

const base = (body, bg = "radial-gradient(circle at 30% 20%, #F7F4EE, #DDD6CA)") => `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}html,body{width:960px;height:960px;overflow:hidden}
body{font-family:"Segoe UI",Arial,sans-serif;background:${bg};display:flex;align-items:center;justify-content:center;position:relative}
.shadow{box-shadow:0 40px 60px -20px rgba(30,40,50,.45),0 12px 20px rgba(30,40,50,.25)}
</style>${body}`;

const cover = (p) => base(`
<div class="shadow" style="width:560px;height:760px;background:${p.ink};border-radius:10px 22px 22px 10px;position:relative;color:#fff;padding:56px 52px;transform:rotate(-3deg);overflow:hidden">
  <div style="position:absolute;left:0;top:0;bottom:0;width:26px;background:rgba(0,0,0,.28)"></div>
  <div style="position:absolute;right:-120px;top:-120px;width:380px;height:380px;border-radius:50%;background:rgba(255,255,255,.07)"></div>
  <div style="position:absolute;right:30px;bottom:-150px;width:340px;height:340px;border-radius:50%;background:rgba(255,255,255,.06)"></div>
  <div style="margin-left:20px;font-size:20px;letter-spacing:6px;opacity:.85">VOSSIE STUDY NOTES</div>
  <div style="margin:150px 0 0 20px;font-size:92px;font-weight:800;letter-spacing:-2px;line-height:1">${p.code}</div>
  <div style="margin:22px 0 0 20px;font-size:44px;font-weight:600;line-height:1.15;max-width:420px">${p.module}</div>
  <div style="position:absolute;left:72px;bottom:56px;right:52px;border-top:2px solid rgba(255,255,255,.4);padding-top:22px;font-size:22px;line-height:1.5;opacity:.95">${p.campus} campus · Year ${p.year}<br>${p.pages} pages · PDF · Instant download</div>
</div>`);

const page = (p) => base(`
<div class="shadow" style="width:640px;height:820px;background:#fff;border-radius:6px;padding:56px 58px;transform:rotate(2deg);position:relative">
  <div style="display:flex;justify-content:space-between;font-size:15px;color:#7C8B93;border-bottom:2px solid ${p.paper};padding-bottom:12px"><span>${p.code} · ${p.module}</span><span>Page 4</span></div>
  <div style="margin-top:34px;font-size:38px;font-weight:800;color:${p.ink};line-height:1.15">${p.sampleHeading}</div>
  ${p.sample.map((t, i) => `<div style="display:flex;gap:16px;margin-top:30px;font-size:26px;line-height:1.4;color:#27343C"><div style="width:11px;height:11px;border-radius:50%;background:${p.ink};margin-top:14px;flex:none"></div><div style="${i === 0 ? `background:linear-gradient(transparent 55%,#FFE88A 55%)` : ""}">${t}</div></div>`).join("")}
  <div style="position:absolute;left:58px;right:58px;bottom:54px;background:${p.paper};border-left:6px solid ${p.ink};padding:18px 22px;font-size:21px;color:#33424B"><b>Exam tip.</b> This comes up in almost every test. Learn it first.</div>
</div>`, `radial-gradient(circle at 70% 25%, ${p.paper}, #D5DCE0)`);

const inside = (p) => base(`
<div class="shadow" style="width:640px;height:800px;background:#fff;border-radius:22px;padding:54px;position:relative;transform:rotate(-1.5deg)">
  <div style="font-size:18px;letter-spacing:5px;color:${p.ink}">WHAT IS INSIDE</div>
  <div style="font-size:42px;font-weight:800;color:#1F2F39;margin-top:10px;line-height:1.15">${p.module}</div>
  <div style="font-size:20px;color:#7C8B93;margin-top:8px">${p.code} · ${p.campus} · ${p.lecturer}</div>
  <div style="margin-top:34px">${p.topics.map((t, i) => `<div style="display:flex;align-items:center;gap:18px;padding:15px 0;border-bottom:1px solid #E6EDF0;font-size:27px;color:#27343C"><div style="width:38px;height:38px;border-radius:50%;background:${p.ink};color:#fff;font-size:19px;font-weight:700;display:flex;align-items:center;justify-content:center">${i + 1}</div>${t}</div>`).join("")}</div>
  <div style="position:absolute;left:54px;right:54px;bottom:44px;display:flex;justify-content:space-between;font-size:21px;color:${p.ink};font-weight:700"><span>${p.pages} pages</span><span>PDF</span><span>Instant download</span></div>
</div>`, `radial-gradient(circle at 25% 75%, ${p.paper}, #D5DCE0)`);

const out = path.join(root, "assets/products");
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await b.newContext({ viewport: { width: 960, height: 960 }, deviceScaleFactor: 1 });
const pg = await ctx.newPage();
for (const p of PACKS) {
  const id = `notes-${p.code.toLowerCase()}`;
  const views = [[`${id}.jpg`, cover(p)], [`${id}-2.jpg`, page(p)], [`${id}-3.jpg`, inside(p)]];
  for (const [file, html] of views) {
    await pg.setContent(html, { waitUntil: "load" });
    await pg.screenshot({ path: path.join(out, file), type: "jpeg", quality: 88 });
  }
  console.log("rendered", id);
}
await b.close();
fs.writeFileSync(path.join(root, "scripts/.notes-photos-ok"), new Date().toISOString());
