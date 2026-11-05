// Records the cinematic walkthrough: stage page (pitch/walk.html) with the live demo app inside the phone.
// usage: node tools/record-walk.mjs [--nostage]   (nostage = debug run on a bare phone viewport, no video)
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const DEBUG = process.argv.includes('--debug');
const APP = 'http://localhost:8092/';
const STAGE = 'http://localhost:8090/walk.html?app=' + encodeURIComponent(APP);
const IMG = 'C:/Users/PABAL/Vossie Marketplace Build/projects/Vossie-Marketplace-1/promo-video/shots/s_1acct.png';
let t0 = Date.now();
const now = () => ((Date.now() - t0) / 1000).toFixed(1);
const K = 0.68;
const sleep = ms => new Promise(r => setTimeout(r, ms * K));

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: DEBUG ? undefined : { dir: 'out/rawwalk', size: { width: 1920, height: 1080 } } });
const page = await ctx.newPage();
t0 = Date.now();
page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 120)));
await page.goto(STAGE);
await page.waitForFunction(() => window.__ready);
await sleep(300);

const frame = () => page.frames().find(f => f.url().startsWith(APP));
const fr = () => frame();
let shotN = 0;
const taps = [];
const log = (...a) => console.log(`[${now()}s]`, ...a);

// -------- helpers --------
async function ripple(loc) {
  taps.push(Number(now()));
  try {
    await loc.evaluate(el => {
      const r = el.getBoundingClientRect();
      const d = document.createElement('div');
      d.style.cssText = `position:fixed;left:${r.left + r.width / 2 - 28}px;top:${r.top + r.height / 2 - 28}px;width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.55);border:3px solid rgba(55,99,113,.9);z-index:99999;pointer-events:none;transition:all .55s ease-out;transform:scale(.4);opacity:1`;
      document.body.appendChild(d);
      requestAnimationFrame(() => requestAnimationFrame(() => { d.style.transform = 'scale(1.6)'; d.style.opacity = '0'; }));
      setTimeout(() => d.remove(), 800);
    });
  } catch {}
}
async function tap(text, { exact = true, wait = 1800, last = false, force = false, mouse = false } = {}) {
  const f = fr();
  let loc = typeof text === 'string' ? f.getByText(text, { exact }) : f.getByText(text);
  loc = loc.locator('visible=true');
  loc = last ? loc.last() : loc.first();
  await loc.waitFor({ state: 'visible', timeout: 8000 });
  await ripple(loc); await sleep(250);
  if (mouse) { const bx = await loc.boundingBox(); await page.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); }
  else await loc.click({ timeout: 8000, force });
  await sleep(wait);
}
async function tryTap(text, opts) { try { await tap(text, opts); return true; } catch (e) { log('MISS', String(text), e.message.split('\n')[0].slice(0, 70)); return false; } }
async function visibleText() {
  try { return await fr().evaluate(() => { const o = []; for (const el of document.querySelectorAll('div,span')) { if (el.children.length) continue; const t = (el.textContent || '').trim(); if (!t) continue; const r = el.getBoundingClientRect(); if (r.width && r.top >= 0 && r.bottom <= innerHeight + 2 && r.left >= 0 && r.right <= innerWidth + 2) { const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (top && (top === el || el.contains(top) || top.contains(el))) o.push(t); } } return [...new Set(o)]; }); } catch { return []; }
}
async function scroll(by = 500, ms = 1500) {
  try {
    await fr().evaluate(async ([by, ms]) => {
      const els = [...document.querySelectorAll('div')].filter(e => e.scrollHeight > e.clientHeight + 40 && ['auto', 'scroll'].includes(getComputedStyle(e).overflowY) && e.getBoundingClientRect().width > 300);
      const el = els.sort((a, b) => b.scrollHeight - a.scrollHeight)[0]; if (!el) return;
      const start = el.scrollTop, t0 = performance.now();
      await new Promise(res => { const step = n => { const k = Math.min(1, (n - t0) / ms); const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; el.scrollTop = start + by * e; k < 1 ? requestAnimationFrame(step) : res(); }; requestAnimationFrame(step); });
    }, [by, ms]);
  } catch (e) { log('scroll fail', e.message.slice(0, 60)); }
  await sleep(300);
}
async function slide(label) {
  const loc = fr().getByText(label, { exact: true }).locator('visible=true').first();
  await loc.waitFor({ state: 'visible', timeout: 8000 });
  const bx = await loc.boundingBox();
  const fb = await page.locator('#app').boundingBox();
  const sc = fb.width / 393;
  const cx = bx.x + bx.width / 2, y = bx.y + bx.height / 2;
  const x0 = cx - 176 * sc + 30 * sc, x1 = cx + 150 * sc;
  await page.mouse.move(x0, y); await page.mouse.down(); await sleep(150);
  for (let i = 0; i <= 30; i++) { await page.mouse.move(x0 + (x1 - x0) * i / 30, y); await sleep(28); }
  await page.mouse.up(); await sleep(3200);
  const left = await fr().getByText(label, { exact: true }).locator('visible=true').count();
  log('slide', label, left ? 'STILL THERE' : 'ok');
}
async function back() { try { await fr().evaluate(() => history.back()); } catch {} await sleep(1400); }
async function fill(i, v) { const el = fr().locator('input:visible, textarea:visible').nth(i); await ripple(el); await el.fill(v); await sleep(500); }
async function upload(label, via = 'Files') {
  await tap(label, { wait: 900 });
  const [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null), tap(via, { wait: 400 })]);
  if (fc) await fc.setFiles(IMG);
  await sleep(1600);
}
const cap = (k, h, s) => page.evaluate(([k, h, s]) => window.cap(k, h, s), [k, h, s]);
const cam = o => page.evaluate(o => window.phone(o), o);
const shot = async n => { if (DEBUG) await page.screenshot({ path: `shots/walk_${String(shotN++).padStart(2, '0')}_${n}.png` }); };
async function section(name, fn) { log('>>', name); try { await fn(); } catch (e) { log('SECTION FAIL', name, e.message.slice(0, 300).split(String.fromCharCode(10)).join(' ')); await page.screenshot({ path: 'shots/fail_' + name + '.png' }); } await shot(name); if (process.env.STOP === name) { log('STOP after', name); await ctx.close(); await b.close(); process.exit(0); } }
