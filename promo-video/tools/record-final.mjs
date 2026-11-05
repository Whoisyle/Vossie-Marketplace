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

// ================= extra helpers =================
const marks = {};
const mark = n => { marks[n] = Number(now()); };
async function reveal(loc) {
  const fb = await page.locator('#app').boundingBox(); const sc = fb.width / 393;
  const bx = await loc.boundingBox(); if (!bx) return;
  const rel = (bx.y - fb.y) / sc;
  if (rel > 110 && rel < 650) return;
  await loc.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await sleep(1100);
}
async function mc(loc, wait = 2200, rv = false) { // mouse click at element centre (bypasses overlay checks)
  await loc.waitFor({ state: 'visible', timeout: 8000 });
  if (rv) await reveal(loc);
  await ripple(loc); await sleep(250);
  const bx = await loc.boundingBox();
  await page.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
  await sleep(wait);
}
const T = (re, o = {}) => fr().getByText(re, o).locator('visible=true');
async function has(re) { try { return (await T(re).count()) > 0; } catch { return false; } }
async function slideTo(re, label) {
  const loc = T(re).first();
  await loc.waitFor({ state: 'visible', timeout: 10000 });
  const bx = await loc.boundingBox();
  const fb = await page.locator('#app').boundingBox();
  const sc = fb.width / 393;
  const cx = bx.x + bx.width / 2, y = bx.y + bx.height / 2;
  const x0 = cx - 176 * sc + 30 * sc, x1 = cx + 150 * sc;
  await page.mouse.move(x0, y); await page.mouse.down(); await sleep(150);
  for (let i = 0; i <= 30; i++) { await page.mouse.move(x0 + (x1 - x0) * i / 30, y); await sleep(28); }
  await page.mouse.up(); await sleep(2600);
  log('slid', label || String(re));
}
async function scrollTo(re, tries = 6, by = 450) {
  for (let i = 0; i < tries; i++) { if (await has(re)) return true; await scroll(by, 900); }
  return await has(re);
}
async function switchRole(to) {
  const row = /Switch role|Switch to buy|Back to buy|Buying mode/i;
  await tap('Account', { wait: 2200, last: true });
  const found = await scrollTo(row, 8, 500);
  if (!found) { log('no switch row; rows:', JSON.stringify((await visibleText()).slice(0, 30))); }
  await tap(row, { exact: false, wait: 2200 });
  if (!(await has(new RegExp('^' + to + '$')))) {
    await tap('Account', { wait: 2200, last: true });
    await scrollTo(/Switch role/, 8, 500);
    await tap(/Switch role/, { exact: false, wait: 1800 });
  }
  await tap(to, { wait: 4500 });
}

// =============== INTRO ===============
await section('intro', async () => {
  await page.evaluate(() => { const f = document.querySelector('#full'); f.innerHTML = '<div class="wm"><img src="wordmark-nodot.svg" style="opacity:0;transition:opacity 1.4s" id="wmi"><i style="opacity:0;transition:none" id="wmdot"></i></div><div class="sm" id="tag" style="opacity:0;transition:opacity 1.2s">Good things. Brighter campus.</div>'; f.classList.add('on'); });
  await sleep(700);
  const bounce = (y, ms) => page.evaluate(([y, ms]) => window.dotTo(925, y, 1, ms, 1), [y, ms]);
  await bounce(505, 10); await sleep(600);
  await bounce(380, 500); await sleep(550); await bounce(505, 450); await sleep(500);
  await bounce(250, 650); await sleep(700); await bounce(505, 500); await sleep(550);
  await bounce(110, 800); await sleep(850);
  await page.evaluate(() => { document.querySelector('#wmi').style.opacity = 1; });
  await sleep(500);
  await page.evaluate(() => { const i = document.querySelector('#wmdot'); const r = i.getBoundingClientRect(); window.dotTo(r.left + r.width / 2 - 35, r.top + r.height / 2 - 35, 1, 700, 1); });
  await sleep(750);
  mark('logoLand');
  await page.evaluate(() => { const i = document.querySelector('#wmdot'); i.style.opacity = 1; window.dotTo(0, 0, 0, 10); document.querySelector('#tag').style.opacity = 1; });
  await sleep(3000);
});

// =============== SIGN IN ===============
await section('signin', async () => {
  mark('signin');
  await cam({ x: 0, ry: -9, rx: 3, s: 1, ms: 10 });
  await page.evaluate(() => window.full(null));
  await cam({ x: 0, ry: -9, rx: 3, s: 1, ms: 2200 });
  await cap('One identity', 'Sign in.', 'Your student email is your Vossie account.');
  await sleep(2000);
  await tap('Sign In with Eduvos', { wait: 1200 });
  await fill(0, 'eduv230953@vossie.net');
  await tap('Next', { wait: 4200 });
});

// =============== BUYER ===============
await section('buyer-browse', async () => {
  mark('buyer');
  await cam({ x: 0, ry: -8, rx: 2, s: 1, ms: 2000 });
  await cap('Buyer', 'Your campus,|in one feed.', 'Deals, categories and the best sellers near you.');
  await sleep(2800);
  await scroll(420, 1800); await sleep(400);
  await scroll(-420, 1000);
  await tap('Food', { wait: 1500 });
  await tap('Burger & Chips', { exact: false, wait: 2400 });
  await cap('Listing', 'Every detail.', 'Photos, ratings, price drops, collection time.');
  await scroll(320, 1600); await sleep(600);
  await scroll(-320, 900);
  await tap(/Add to Cart/i, { exact: false, wait: 1500 });
});
await section('buyer-reels', async () => {
  await cam({ x: 0, ry: 6, rx: 2, s: 1, ms: 2000 });
  await cap('Reels', 'Watch.|Tap. Buy.', 'Sellers post short videos. Every one links to the product.');
  await tap('Reels', { wait: 3200 });
  await sleep(2200);
  await tap('View listing', { wait: 2000 });
  await sleep(1200);
});
await section('buyer-account', async () => {
  await cam({ x: 0, ry: -6, rx: 2, s: 1, ms: 2000 });
  await cap('Rewards', 'Earn as|you spend.', 'Vossie Points, wallet, vouchers and subscriptions.');
  await tap('Account', { wait: 2600, last: true });
  await sleep(800);
  await mc(T(/Vossie Points/).first(), 2600, true);
  await sleep(1000); await scroll(300, 1400); await sleep(600);
  await tap('Account', { wait: 1800, last: true });
  await cap('Wallet', 'Your money,|your way.', 'Wallet balance, cards, vouchers and subscriptions in one place.');
  for (const [label, hold] of [['Wallet', 2600], ['Coupons and offers', 2000], ['Subscriptions', 2400], ['Inbox', 1800]]) {
    try { const L = T(label, { exact: true }).first(); log('row', label, JSON.stringify(await L.boundingBox())); await mc(L, 2200, true); log('row opened?', JSON.stringify((await visibleText()).slice(0, 5))); await shot('row_' + label.replace(/\W/g, '')); await sleep(hold - 1200); await tap('Account', { wait: 1600, last: true }); }
    catch (e) { log('MISS account row', label, e.message.slice(0, 60)); }
  }
});
await section('buyer-checkout', async () => {
  await cam({ x: 0, ry: -8, rx: 2, s: 1, ms: 2000 });
  await cap('Checkout', 'Pay in|seconds.', 'A Vossie student courier brings it, or collect it yourself.');
  await tap('Cart', { wait: 2400, last: true });
  await sleep(900);
  await tap(/Checkout · R/, { exact: false, wait: 3000 });
  await sleep(1200);
  await tap('Vossie courier', { exact: false, wait: 1300 });
  await scroll(260, 1400);
  await cap('Payment', 'Demo|payment.', 'Cards, wallet and vouchers. Sandbox only: no real money moves.');
  await sleep(2200);
  await scroll(-260, 800);
  await tap(/Pay Now/, { exact: false, wait: 2500 });
  for (let attempt = 0; attempt < 3; attempt++) {
    const l = T(/tap here to double-click|Tap anywhere to simulate|Hold Here/).first();
    try { await l.waitFor({ state: 'visible', timeout: 5000 }); } catch { break; }
    const label = await l.innerText(); log('pay sheet:', label);
    await ripple(l); await sleep(300);
    if (/double-click/.test(label)) { await l.dblclick(); }
    else { const bx = await l.boundingBox(); await page.mouse.move(bx.x + bx.width / 2, bx.y - 120); await page.mouse.down(); await sleep(2600); await page.mouse.up(); }
    await sleep(4500);
    if (await has(/Payment received/)) break;
    if (await has(/Pay Now/)) await tryTap(/Pay Now/, { exact: false, wait: 2500 });
  }
  mark('paid');
  await sleep(1500);
});
await section('buyer-track', async () => {
  await cap('Track it', 'Follow it|on the map.', 'Live order status from the kitchen to your door.');
  await sleep(1800);
  if (!(await tryTap(/Track order/i, { exact: false, wait: 3200 }))) {
    await tap('Activity', { wait: 2400, last: true });
    await sleep(900);
  }
  await scrollTo(/Track on map/, 8, 500);
  await sleep(500);
  await mc(T(/Track on map/).first(), 3800);
  await cap('Live', 'Watch it|arrive.', 'The courier moves across campus on a live map.');
  await sleep(5000);
});

// =============== SELLER ===============
await section('seller-setup', async () => {
  mark('seller');
  await cam({ x: 0, ry: 8, rx: 2, s: 1, ms: 2000 });
  await cap('Seller', 'Open a shop|in minutes.', 'Verify, add your store, choose where buyers collect.');
  await tap('Account', { wait: 1800, last: true });
  await scrollTo(/Switch role/, 8, 500);
  await tap('Switch role', { exact: false, wait: 1400 });
  await tap('Seller', { wait: 4500 });
  await tap('Set up my shop', { wait: 3000 });
  await tap('Student seller', { wait: 800 });
  await fill(0, 'Vumisa Threads'); await fill(1, '0821234567');
  await tap('Continue', { wait: 2800 });
  await upload('ID document'); await upload('Proof of address');
  await tap('Submit for review', { wait: 4200 });
  await cap('Verified', 'Approved.', 'Documents reviewed. Your shop is ready.');
  await tap('Continue', { wait: 3000 });
  const tas = fr().locator('textarea:visible, input:visible'); const n = await tas.count();
  for (let k = 0; k < n; k++) { const v = await tas.nth(k).inputValue(); if (!v) await tas.nth(k).fill('Thrifted and upcycled fashion from campus').catch(() => {}); }
  await tap('Choose', { wait: 2600 });
  await tap('Use this place', { wait: 2200 });
  await tap('Save & continue', { wait: 4500 });
  await slideTo(/Go to dashboard/, 'dashboard');
});
await section('seller-orders', async () => {
  await cap('Orders', 'Orders|find you.', 'New orders arrive live. Accept, prepare, hand over.');
  await sleep(2600);
  await scroll(450, 1800); await sleep(700);
  await scroll(-450, 900);
  await tap('Orders', { wait: 2600, last: true });
  await sleep(900);
  await mc(T('Accept', { exact: true }).first(), 2800);   // opens the order
  await slideTo(/Slide to accept/, 'accept order');
  await cap('Fulfil', 'Prepare.|Hand over.', 'Mark it preparing, then ready, then hand it to the buyer or courier.');
  await mc(T('Start preparing', { exact: true }).first(), 2200);
  await mc(T('Mark ready', { exact: true }).first(), 2200);
  await scroll(500, 1200); await sleep(500);
  await tryTap(/Hand over the order/, { exact: false, wait: 2800, mouse: true });
  log('handover screen:', JSON.stringify((await visibleText()).slice(0, 20)));
  await sleep(1600);
});
await section('seller-payout', async () => {
  await cap('Get paid', 'Cash out.', 'Earnings land in your balance. Withdraw to your bank.');
  await tap('Payouts', { wait: 2600, last: true });
  await sleep(1400);
  await mc(T('Request payout', { exact: true }).first(), 2200);
  await sleep(1200);
  await mc(T('FNB', { exact: true }).first(), 700);
  { const acc = fr().locator('input:visible'); const n = await acc.count(); log('payout inputs', n); const el = acc.nth(n - 2); await ripple(el); await el.fill('62012345678'); await sleep(600); }
  await mc(T(/^All R/).first(), 800);
  await mc(T('Withdraw', { exact: true }).last(), 3800);
  log('payout result:', JSON.stringify((await visibleText()).slice(0, 12)));
  await sleep(1800);
  if (await fr().locator('[aria-label=Close]').locator('visible=true').count()) { await mc(fr().locator('[aria-label=Close]').locator('visible=true').first(), 1200); }
});

// =============== COURIER ===============
await section('courier-setup', async () => {
  mark('courier');
  await cam({ x: 0, ry: -8, rx: 2, s: 1, ms: 2000 });
  await cap('Courier', 'Deliver.|Earn.', 'Students deliver on campus, in their own car, bike or on foot.');
  await switchRole('Courier');
  await tap('Become a courier', { wait: 2600 });
  await fill(0, 'Vumisa Dlamini'); await fill(1, '0821234567');
  await cap('Your car', 'Add your|vehicle.', 'Make, model, colour and number plate are verified.');
  await tap('Car', { wait: 1200 });
  await tap('Choose', { wait: 1200 }); await tap('Toyota', { wait: 900 });
  await tap('Choose', { wait: 1200 }); await tap('Corolla', { wait: 900 });
  await tap('Choose', { wait: 1200 }); await tap('White', { wait: 900 });
  { const i2 = fr().locator('input:visible'); await i2.nth(2).fill('CA 123 456'); await sleep(300); await i2.nth(3).fill('8012345678'); await sleep(500); }
  await tap('Continue', { wait: 2800 });
  await upload('ID document'); await upload('Selfie check', 'Photo library'); await upload('Driving licence');
  { const d = fr().locator('input:visible'); if (await d.count()) { await ripple(d.first()); await d.first().fill('30/06/2031'); await sleep(500); } }
  await tap('Submit for review', { wait: 3800 });
  await tap('Finish', { wait: 3000 });
  await fr().getByText('Go to dashboard', { exact: true }).locator('visible=true').first().waitFor({ timeout: 25000 });
  await slideTo(/Go to dashboard/, 'courier dashboard');
});
await section('courier-live', async () => {
  await cap('Go live', 'Go online.|Get jobs.', 'Flip the switch and offers arrive with pay, distance and pickup.');
  await sleep(1800);
  { const sw = fr().locator('[role=switch]').locator('visible=true').first(); await ripple(sw); await sleep(300); await sw.click({ timeout: 6000 }); await sleep(2600); }
  for (let k = 0; k < 20 && !(await has(/Slide to accept/)); k++) await page.waitForTimeout(1500);
  mark('offer');
  await sleep(2400);
  await slideTo(/Slide to accept/, 'accept job');
  await cap('Pickup', 'Scan.|Collect.', 'Enter the seller\'s handover code, photograph the parcel, confirm.');
  await sleep(1600);
  { const d = fr().locator('input:visible'); if (await d.count()) { await ripple(d.first()); await d.first().fill('3091'); await sleep(600); } }
  await upload('Take a photo of the parcel', 'Photo library').catch(() => {});
  await mc(T(/Order label matches/).first(), 900);
  await mc(T(/Parcel sealed/).first(), 900);
  await mc(T(/Confirm collection/).first(), 3000);
});
await section('courier-deliver', async () => {
  await cap('Deliver', 'Follow the|route.', 'Live map to the buyer. The slide unlocks when you arrive.');
  mark('rampStart');
  for (let k = 0; k < 60 && (await has(/Keep going/)); k++) await page.waitForTimeout(1500);
  mark('rampEnd');
  await slideTo(/Slide to confirm arrival/, 'arrival');
  await cap('Handoff', 'Confirm with|a code.', 'The buyer shares a delivery code. Proof of delivery, every time.');
  await sleep(1400);
  { const d = fr().locator('input:visible'); if (await d.count()) { await ripple(d.first()); await d.first().fill('7387'); }
    else { const h = await T(/delivery code/i).first().boundingBox(); const fb = await page.locator('#app').boundingBox(); const sc = fb.width / 393; await page.mouse.click(h.x + h.width / 2 - 126 * sc, h.y + 62 * sc); await page.keyboard.type('7387', { delay: 260 }); } }
  await sleep(1400);
  await mc(T('Confirm delivery', { exact: true }).last(), 3800);
  log('delivered:', JSON.stringify((await visibleText()).slice(0, 14)));
});
await section('courier-cash', async () => {
  await cap('Earnings', 'Get paid.|Cash out.', 'Every delivery adds to your earnings. Withdraw any time.');
  await sleep(1200);
  await tryTap(/Done|Back to home|Finish/, { exact: false, wait: 1800 });
  await tap('Earnings', { wait: 2800, last: true });
  await sleep(1400);
  log('earnings:', JSON.stringify((await visibleText()).slice(0, 24)));
  await scroll(250, 1200);
  for (const re of [/Cash out/i, /Withdraw/i, /Request payout/i]) { if (await tryTap(re, { exact: false, wait: 2400, mouse: true })) break; }
  await sleep(1800);
  log('cashout:', JSON.stringify((await visibleText()).slice(0, 16)));
});

// =============== OUTRO ===============
await section('outro', async () => {
  mark('outro');
  await page.evaluate(() => window.hideCap());
  await cam({ x: 700, ry: -40, rx: 0, s: .8, op: 0, ms: 1600 });
  await sleep(1000);
  await page.evaluate(() => window.full('<div class="big">One campus.<br>One marketplace.</div><div class="chips"><span>Buyers</span><span>Sellers</span><span>Couriers</span><span>Reels</span><span>Points</span><span>Wallet</span></div>'));
  await sleep(2200);
  for (let i = 0; i < 6; i++) { await page.evaluate(i => window.chips(i), i); await sleep(450); }
  await sleep(1800);
  await page.evaluate(() => window.full('<div class="wm"><img src="wordmark.svg"></div><div class="sm">Good things. Brighter campus.</div>'));
  await sleep(3800);
  await page.evaluate(() => window.fadeBlack(true));
  mark('end');
  await sleep(1200);
});

log('done');
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/walk-marks.json', JSON.stringify({ marks, taps }, null, 1));
await ctx.close(); await b.close();
