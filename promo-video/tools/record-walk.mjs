// Records the cinematic walkthrough: stage page (pitch/walk.html) with the live demo app inside the phone.
// usage: node tools/record-walk.mjs [--nostage]   (nostage = debug run on a bare phone viewport, no video)
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const DEBUG = process.argv.includes('--debug');
const APP = 'http://localhost:8092/';
const STAGE = 'http://localhost:8090/walk.html?app=' + encodeURIComponent(APP);
const IMG = 'C:/Users/PABAL/Vossie Marketplace Build/projects/Vossie-Marketplace-1/promo-video/shots/s_1acct.png';
const t0 = Date.now();
const now = () => ((Date.now() - t0) / 1000).toFixed(1);
const K = 0.68;
const sleep = ms => new Promise(r => setTimeout(r, ms * K));

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: DEBUG ? undefined : { dir: 'out/rawwalk', size: { width: 1920, height: 1080 } } });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 120)));
await page.goto(STAGE);
await page.waitForFunction(() => window.__ready);
await sleep(300);

const frame = () => page.frames().find(f => f.url().startsWith(APP));
const fr = () => frame();
let shotN = 0;
const log = (...a) => console.log(`[${now()}s]`, ...a);

// -------- helpers --------
async function ripple(loc) {
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
async function section(name, fn) { log('>>', name); try { await fn(); } catch (e) { log('SECTION FAIL', name, e.message.slice(0, 300).split(String.fromCharCode(10)).join(' ')); await page.screenshot({ path: 'shots/fail_' + name + '.png' }); } await shot(name); }

// =============== INTRO (0:00 - 0:14) ===============
await section('intro', async () => {
  await page.evaluate(() => window.full(`<div class="wm"><img src="wordmark-nodot.svg"><i style="opacity:0" id="wmdot"></i></div><div class="sm" id="tag" style="opacity:0;transition:opacity 1.2s">Good things. Brighter campus.</div>`));
  await sleep(900);
  await page.evaluate(() => { window.full(null); });
  await sleep(100);
  await page.evaluate(() => { const f = document.querySelector('#full'); f.innerHTML = `<div class="wm"><img src="wordmark-nodot.svg" style="opacity:0;transition:opacity 1.4s" id="wmi"><i style="opacity:0;transition:none" id="wmdot"></i></div><div class="sm" id="tag" style="opacity:0;transition:opacity 1.2s">Good things. Brighter campus.</div>`; f.classList.add('on'); });
  await sleep(700);
  // dot bounces, then lands above the i
  const bounce = (y, ms) => page.evaluate(([y, ms]) => window.dotTo(925, y, 1, ms, 1), [y, ms]);
  await bounce(505, 10); await sleep(600);
  await bounce(380, 500); await sleep(550); await bounce(505, 450); await sleep(500);
  await bounce(250, 650); await sleep(700); await bounce(505, 500); await sleep(550);
  await bounce(110, 800); await sleep(850);
  await page.evaluate(() => { document.querySelector('#wmi').style.opacity = 1; });
  await sleep(500);
  // drop onto the i
  await page.evaluate(() => { const i = document.querySelector('#wmdot'); const r = i.getBoundingClientRect(); window.dotTo(r.left + r.width / 2 - 35, r.top + r.height / 2 - 35, 1, 700, 1); });
  await sleep(750);
  await page.evaluate(() => { const i = document.querySelector('#wmdot'); i.style.opacity = 1; window.dotTo(0, 0, 0, 10); document.querySelector('#tag').style.opacity = 1; });
  await sleep(3400);
});

// =============== SIGN IN (0:14 - 0:26) ===============
await section('signin', async () => {
  await cam({ x: 0, ry: -9, rx: 3, s: 1, ms: 10 });
  await page.evaluate(() => window.full(null));
  await cam({ x: 0, ry: -9, rx: 3, s: 1, ms: 2200 });
  await cap('One identity', 'Sign in.', 'Your student email is your Vossie account. Verified, then ready.');
  await sleep(2600);
  await tap('Sign In with Eduvos', { wait: 1200 });
  await fill(0, 'eduv230953@vossie.net');
  await tap('Next', { wait: 4200 });
});

// =============== BUYER (0:26 - 0:58) ===============
await section('buyer', async () => {
  await cam({ x: 0, ry: -8, rx: 2, s: 1, ms: 2000 });
  await cap('Buyer', 'Your campus,\nin one feed.', 'Deals, categories and the best sellers near you.');
  await sleep(3500);
  await scroll(420, 2000); await sleep(600);
  await scroll(-420, 1200);
  await tap('Food', { wait: 1800 });
  await cap('Discover', 'Find it.\nFast.', 'Browse food, books, fashion, electronics and services.');
  await sleep(1500);
  await tap('Burger & Chips', { exact: false, wait: 2600 });
  await scroll(350, 1800); await sleep(900);
  await scroll(-350, 1000);
  await cap('Listing', 'Every detail.', 'Photos, ratings, price drops, collection time.');
  await tap(/Add to Cart/i, { exact: false, wait: 1800 });
});

// =============== REELS (0:58 - 1:12) ===============
await section('reels', async () => {
  await cam({ x: 0, ry: 6, rx: 2, s: 1, ms: 2000 });
  await cap('Reels', 'Watch.\nTap. Buy.', 'Sellers post short videos. Every one links straight to the product.');
  await tap('Reels', { wait: 3500 });
  await sleep(2500);
  await tap('View listing', { wait: 2200 });
  await sleep(1800);
});

// =============== ACCOUNT: points, wallet, subscriptions (1:58 - 2:18) ===============
await section('account', async () => {
  await cam({ x: 0, ry: -6, rx: 2, s: 1, ms: 2000 });
  await cap('Rewards', 'Earn as|you spend.', 'Vossie Points, vouchers, wallet and subscriptions.');
  await tap('Account', { wait: 2800, last: true });
  await sleep(1400);
  log('account rows:', JSON.stringify((await visibleText()).slice(0, 24)));
  await tryTap(/Vossie Points/i, { exact: false, wait: 2800, mouse: true });
  await sleep(2200);
  await scroll(350, 1600); await sleep(1400);
  await back();
  log('points page:', JSON.stringify((await visibleText()).slice(0, 12)));
  log('after back:', JSON.stringify((await visibleText()).slice(0, 20)));
  await scroll(500, 1500); await sleep(500);
  log('account lower:', JSON.stringify((await visibleText()).slice(0, 24)));
  await cap('Plans', 'Subscribe.|Save more.', 'Recurring plans and wallet top-ups, managed in one place.');
  if (await tryTap('Subscriptions', { wait: 3200 })) { await sleep(2200); await back(); }
  await tryTap('Wallet', { wait: 3000 });
  await sleep(2000);
});

// =============== CHECKOUT (1:12 - 1:46) ===============
await section('checkout', async () => {
  await cam({ x: 0, ry: -8, rx: 2, s: 1, ms: 2000 });
  await cap('Checkout', 'Pay in\nseconds.', 'Cart, delivery or pickup, then a secure demo payment.');
  await tap('Cart', { wait: 2500, last: true });
  await sleep(1500);
  await tap(/Checkout · R/, { exact: false, wait: 3200 });
  await cap('Delivery', 'Courier or|collect.', 'A Vossie student courier brings it, or collect it yourself.');
  await sleep(1800);
  await tap('Vossie courier', { exact: false, wait: 1500 });
  await scroll(260, 1600);
  await cap('Payment', 'Demo|payment.', 'Cards, wallet and vouchers. Sandbox only, no real money moves.');
  await sleep(2600);
  await scroll(-260, 900);
  await tap(/Pay Now/, { exact: false, wait: 2500 });
  await cap('Confirm', 'Double-click|to pay.', 'The same sheet buyers know. Demo only: no money moves.');
  await sleep(2200);
  for (let attempt = 0; attempt < 3; attempt++) {
    const l = fr().getByText(/tap here to double-click|Tap anywhere to simulate|Hold Here/).locator('visible=true').first();
    try { await l.waitFor({ state: 'visible', timeout: 5000 }); } catch { break; }
    const label = await l.innerText(); log('pay sheet:', label);
    await ripple(l); await sleep(300);
    if (/double-click/.test(label)) { await l.dblclick(); }
    else { const bx = await l.boundingBox(); await page.mouse.move(bx.x + bx.width / 2, bx.y - 120); await page.mouse.down(); await sleep(2600); await page.mouse.up(); }
    await sleep(5000);
    if ((await fr().getByText(/Payment received/).locator('visible=true').count()) > 0) break;
    if ((await fr().getByText(/Pay Now/).locator('visible=true').count()) > 0) { await tryTap(/Pay Now/, { exact: false, wait: 2500 }); }
  }
  await shot('afterpay');
  const t = await visibleText(); log('after pay:', JSON.stringify(t.slice(0, 16)));
  await sleep(2500);
});

// =============== ORDER + TRACKING (1:46 - 1:58) ===============
await section('activity', async () => {
  await cap('Track it', 'Know where|it is.', 'Live order status from kitchen to your door.');
  const t = await visibleText(); log('confirmation:', JSON.stringify(t.slice(0, 16)));
  for (const c of ['Track order', 'View order', 'Done', 'Back to home']) { if (t.some(x => x === c)) { await tap(c, { wait: 2800 }); break; } }
  await sleep(2200);
  await tap('Activity', { wait: 2500, last: true });
  await sleep(2200);
});

// =============== SELLER (2:18 - 3:00) ===============
await section('seller-setup', async () => {
  await cam({ x: 0, ry: 8, rx: 2, s: 1, ms: 2000 });
  await cap('Seller', 'Open a shop\nin minutes.', 'Verify, add your store, collect where you choose.');
  await tap('Account', { wait: 1800, last: true });
  await scroll(500, 1400);
  await tap('Switch role', { exact: false, wait: 1400 });
  await tap('Seller', { wait: 4500 });
  await tap('Set up my shop', { wait: 3200 });
  await tap('Student seller', { wait: 900 });
  await fill(0, 'Vumisa Threads'); await fill(1, '0821234567');
  await tap('Continue', { wait: 3000 });
  await upload('ID document'); await upload('Proof of address');
  await tap('Submit for review', { wait: 4500 });
  await cap('Verified', 'Approved.', 'Documents reviewed. Your shop is ready.');
  await tap('Continue', { wait: 3200 });
  const tas = fr().locator('textarea:visible, input:visible'); const n = await tas.count();
  for (let k = 0; k < n; k++) { const v = await tas.nth(k).inputValue(); if (!v) await tas.nth(k).fill('Thrifted and upcycled fashion from campus').catch(() => {}); }
  await tap('Choose', { wait: 2800 });
  await tap('Use this place', { wait: 2500 });
  await tap('Save & continue', { wait: 5000 });
  await slide('Go to dashboard');
});
await section('seller-dash', async () => {
  await cap('Orders', 'Orders\nfind you.', 'New orders arrive live, with a weekly goal and your earnings.');
  await sleep(3200);
  await scroll(500, 2200); await sleep(1000);
  await scroll(-500, 1000);
  await tap('Orders', { wait: 2600, last: true });
  await sleep(1500);
  await cap('Catalogue', 'Your products.', 'Add listings and Reels, track stock.');
  await tap('Products', { wait: 2600, last: true });
  await sleep(1500);
  await cap('Payouts', 'Get paid.', 'Earnings, statements and withdrawals.');
  await tap('Payouts', { wait: 2600, last: true });
  await sleep(1600);
});

// =============== COURIER (3:00 - 3:38) ===============
await section('courier-setup', async () => {
  await cam({ x: 0, ry: -8, rx: 2, s: 1, ms: 2000 });
  await cap('Courier', 'Deliver.\nEarn.', 'Students deliver on campus, on their own hours.');
  await tap('Account', { wait: 1800, last: true });
  await scroll(900, 1600);
  log('seller account lower:', JSON.stringify((await visibleText()).slice(0, 40)));
  for (const c of ['Switch to buying', 'Back to buying', 'Switch role', 'Switch workspace']) { if (await tryTap(c, { exact: false, wait: 3000 })) break; }
  await tap('Account', { wait: 2200, last: true });
  await tap('Switch role', { exact: false, wait: 1600 });
  await tap('Courier', { wait: 4500 });
  await tap('Become a courier', { wait: 2800 });
  await fill(0, 'Vumisa Dlamini'); await fill(1, '0821234567');
  await tap('Continue', { wait: 3000 });
  await upload('ID document'); await upload('Selfie check', 'Photo library');
  await tap('Submit for review', { wait: 4000 });
  await tap('Finish', { wait: 3000 });
  await fr().getByText('Go to dashboard', { exact: true }).locator('visible=true').first().waitFor({ timeout: 25000 });
  await slide('Go to dashboard');
});
await section('courier-live', async () => {
  await cap('On duty', 'Go online.\nGet jobs.', 'Offers arrive with pay, distance and pickup.');
  await sleep(2500);
  const t = await visibleText(); log('courier home:', JSON.stringify(t.slice(0, 20)));
  { const sw = fr().locator('[role=switch]').locator('visible=true').first(); try { await ripple(sw); await sleep(300); await sw.click({ timeout: 6000 }); await sleep(3500); } catch (e) { log('switch miss', e.message.slice(0,200).slice(0, 60)); } }
  await sleep(2500);
  const t2 = await visibleText(); log('courier online:', JSON.stringify(t2.slice(0, 20)));
  await sleep(5000); await tryTap(/Accept/i, { exact: false, wait: 3200 });
  await sleep(2500);
  const t3 = await visibleText(); log('courier job:', JSON.stringify(t3.slice(0, 20)));
});

// =============== OUTRO (3:38 - 4:00) ===============
await section('outro', async () => {
  await page.evaluate(() => window.hideCap());
  await cam({ x: 700, ry: -40, rx: 0, s: .8, op: 0, ms: 1600 });
  await sleep(1200);
  await page.evaluate(() => window.full(`<div class="big">One campus.<br>One marketplace.</div><div class="chips"><span>Buyers</span><span>Sellers</span><span>Couriers</span><span>Reels</span><span>Points</span><span>Subscriptions</span></div>`));
  await sleep(2600);
  for (let i = 0; i < 6; i++) { await page.evaluate(i => window.chips(i), i); await sleep(520); }
  await sleep(2200);
  await page.evaluate(() => window.full(`<div class="wm"><img src="wordmark.svg"></div><div class="sm">Good things. Brighter campus.</div>`));
  await sleep(4500);
  await page.evaluate(() => window.fadeBlack(true));
  await sleep(1500);
});

log('done');
await ctx.close(); await b.close();
