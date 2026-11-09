// Records the cinematic walkthrough: stage page (pitch/walk.html) with the live demo app inside the phone.
// usage: node tools/record-walk.mjs [--nostage]   (nostage = debug run on a bare phone viewport, no video)
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const DEBUG = process.argv.includes('--debug');
const APP = 'http://localhost:8092/';
const OUT = process.env.OUT || 'out/tour';

const IMG = 'C:/Users/PABAL/Vossie Marketplace Build/projects/Vossie-Marketplace-1/promo-video/shots/s_1acct.png';
let t0 = Date.now();
const now = () => ((Date.now() - t0) / 1000).toFixed(1);
const K = Number(process.env.K || 1.8);
const sleep = ms => new Promise(r => setTimeout(r, ms * K));

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { if (window.__fk) return; window.__fk = 1; const R = Date; const n = new R(); const off = new R(n.getFullYear(), n.getMonth(), n.getDate(), 14, 5, 0) - n; if (n.getHours() >= 7 && n.getHours() < 21) return; window.Date = class extends R { constructor(...a) { if (a.length === 0) super(R.now() + off); else super(...a); } static now() { return R.now() + off; } }; });
await ctx.addInitScript(() => { window.full = window.hideCap = window.phone = window.cap = window.dotTo = window.chips = window.fadeBlack = () => {}; });
await ctx.addInitScript(() => { const st = window.setTimeout.bind(window); window.setTimeout = (fn, ms, ...a) => (ms === 40000 || ms === 110000 || ms === 200000) ? 0 : st(fn, ms, ...a); });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 120)));
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const cdp = await ctx.newCDPSession(page);
const frameTimes = []; let t0Epoch = null; let running = true; let nFrames = 0;
await page.goto(APP);
let ackQ = Promise.resolve();
cdp.on('Page.screencastFrame', async ev => {
  const ts = ev.metadata.timestamp * 1000;
  if (t0Epoch === null) { t0Epoch = ts; t0 = ts; }
  const i = nFrames++; frameTimes.push((ts - t0Epoch) / 1000);
  if (!process.env.NOFRAMES) fs.writeFile(`${OUT}/f${String(i).padStart(6, '0')}.jpg`, Buffer.from(ev.data, 'base64'), () => {});
  cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 786, maxHeight: 1704, everyNthFrame: 1 });
const capLoop = Promise.resolve();
while (t0Epoch === null) await new Promise(r => setTimeout(r, 30));
const frame = () => page.mainFrame();
const fr = () => frame();
// random demo "new order" popups on the seller side must never block the story: decline them as they appear
await page.addLocatorHandler(page.getByText(/NEW ORDER · #VM-/), async () => {
  console.log('[handler] declining demo order popup');
  await page.getByText('Decline', { exact: true }).locator('visible=true').first().click({ timeout: 4000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  await page.getByText('Too busy right now', { exact: true }).locator('visible=true').first().click({ timeout: 3000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 900));
}, { times: 20 });
let shotN = 0;
const marks = {};
const taps = [];
const log = (...a) => console.log(`[${now()}s]`, ...a);

// -------- helpers --------
async function ripple(loc) {
  taps.push(Number(now())); return;
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
  if (mouse) { await loc.scrollIntoViewIfNeeded().catch(() => {}); await sleep(500); const bx = await loc.boundingBox(); await page.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); }
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
  const fb = { x: 0, y: 0, width: 393, height: 852 };
  const sc = fb.width / 393;
  const cx = bx.x + bx.width / 2, y = bx.y + bx.height / 2;
  const x0 = fb.x + 48 * sc, x1 = fb.x + 345 * sc;
  await page.mouse.move(x0, y); await page.mouse.down(); await sleep(150);
  for (let i = 0; i <= 30; i++) { await page.mouse.move(x0 + (x1 - x0) * i / 30, y); await sleep(28); }
  await page.mouse.up(); await sleep(3200);
  const left = await fr().getByText(label, { exact: true }).locator('visible=true').count();
  log('slide', label, left ? 'STILL THERE' : 'ok');
}
async function back() { try { await fr().evaluate(() => history.back()); } catch {} await sleep(1400); }
async function fill(i, v) { const el = fr().locator('input:visible, textarea:visible').nth(i); await ripple(el); await el.fill(v); await sleep(500); }
const cap = async () => {};
const cam = async () => {};
const shot = async n => { if (DEBUG) await page.screenshot({ path: `shots/walk_${String(shotN++).padStart(2, '0')}_${n}.png` }); };
async function section(name, fn) { if (process.env.ONLY && !(name === 'signin' || name.startsWith(process.env.ONLY))) return; log('>>', name); marks['sec:' + name] = Number(now()); try { await fn(); } catch (e) { log('SECTION FAIL', name, e.message.slice(0, 300).split(String.fromCharCode(10)).join(' ')); await page.screenshot({ path: 'shots/fail_' + name + '.png' }); } await shot(name); if (process.env.STOP === name) { log('STOP after', name); await ctx.close(); await b.close(); process.exit(0); } }









// ================= extra helpers =================
const SMP = 'C:/Users/PABAL/Vossie Marketplace Build/projects/Vossie-Marketplace-1/promo-video/samples/';
async function upload(label, via = 'Files', file = IMG) {
  // a button that opens the file picker straight away (profile photo, logo), or one that shows a sheet of sources first
  const loc = typeof label === 'string' ? T(label, { exact: true }).first() : label;
  await loc.waitFor({ state: 'visible', timeout: 8000 });
  await ripple(loc); await sleep(250);
  const bx = await loc.boundingBox();
  const direct = page.waitForEvent('filechooser', { timeout: 2800 }).catch(() => null);
  await page.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
  let fc = await direct;
  if (!fc) {
    const viaSheet = page.waitForEvent('filechooser', { timeout: 6000 }).catch(() => null);
    const ok = await tryTap(via, { wait: 300 }) || await tryTap('Photo library', { wait: 300 }) || await tryTap('Files', { wait: 300 });
    fc = await viaSheet;
  }
  if (fc) await fc.setFiles(file); else log('NO FILE CHOOSER for', String(label));
  await sleep(1600);
}
const EP = 'story';
let pickupCode = '3091', deliveryCode = '7387';
async function findCodes(tag) {
  const vt = await visibleText(); const all = await fr().evaluate(() => document.body.innerText).catch(() => '');
  const m = all.match(/(?:code|PIN)[^\d]{0,40}(\d{4})/i); const loose = vt.filter(t => /^\d{4}$/.test(t));
  log('codes@' + tag, JSON.stringify({ m: m && m[1], loose, vt: vt.slice(0, 30) }));
  return { m: m && m[1], loose };
}
const mark = n => { marks[n] = Number(now()); };
async function reveal(loc) {
  const bx = await loc.boundingBox(); if (!bx) return;
  if (bx.y > 110 && bx.y < 690) return;
  await loc.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await sleep(1100);
}
async function mc(loc, wait = 2200, rv = false) {
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
  const y = bx.y + bx.height / 2, x0 = 48, x1 = 345;
  await page.mouse.move(x0, y); await page.mouse.down(); await sleep(150);
  for (let i = 0; i <= 30; i++) { await page.mouse.move(x0 + (x1 - x0) * i / 30, y); await sleep(28); }
  await page.mouse.up(); await sleep(2600);
  log('slid', label || String(re));
}
async function scrollTo(re, tries = 6, by = 450) {
  for (let i = 0; i < tries; i++) { if (await has(re)) return true; await scroll(by, 900); }
  return await has(re);
}
async function inView(re) {
  const all = await T(re).all();
  for (const l of all) { const b = await l.boundingBox().catch(() => null); if (b && b.y > 60 && b.y < 800 && b.x >= 0 && b.x < 393) return l; }
  return T(re).first();
}
async function rippleAt(x, y) {
  return;
  await fr().evaluate(([x, y]) => { const d = document.createElement('div'); d.style.cssText = `position:fixed;left:${x - 28}px;top:${y - 28}px;width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.55);border:3px solid rgba(55,99,113,.9);z-index:99999;pointer-events:none;transition:all .55s ease-out;transform:scale(.4);opacity:1`; document.body.appendChild(d); requestAnimationFrame(() => requestAnimationFrame(() => { d.style.transform = 'scale(1.6)'; d.style.opacity = '0'; })); setTimeout(() => d.remove(), 800); }, [x, y]);
  taps.push(Number(now()));
}
async function pickAt(x, y, via = 'Photo library', file = IMG) {
  await rippleAt(x, y); await sleep(250);
  await page.mouse.click(x, y); await sleep(1400);
  const fcP = page.waitForEvent('filechooser', { timeout: 6000 }).catch(() => null);
  await tryTap(via, { wait: 300 });
  const fc = await fcP; if (fc) await fc.setFiles(file); else log('NO FILE CHOOSER at', x, y);
  await sleep(1800);
}
async function wheel(dy, wait = 1800) { await page.mouse.move(196, 420); await page.mouse.wheel(0, dy); await sleep(wait); }
async function switchRole(to) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { await switchRoleOnce(to); } catch (e) { log('switchRole retry', attempt, e.message.split(String.fromCharCode(10)).join(' ').slice(0, 260)); await sleep(1200); continue; }
    if (to !== 'Buyer' || !(await has(/Seller mode|Courier mode/))) return;
    log('still in other mode, retry switch'); await sleep(1000);
  }
}
async function switchRoleOnce(to) {
  const row = /Switch role|Switch to buy|Back to buy|Buying mode/i;
  await accountRoot();
  await scrollTo(row, 8, 500);
  await tap(row, { exact: false, wait: 2200, mouse: true });
  for (let w = 0; w < 8 && !(await has(new RegExp('^' + to + '$'))); w++) await sleep(500);
  if (!(await has(new RegExp('^' + to + '$')))) {
    await accountRoot();
    await scrollTo(/Switch role/, 8, 500);
    await tap(/Switch role/, { exact: false, wait: 1800, mouse: true });
  }
  await tap(to, { wait: 4500, mouse: true, last: true });
  if (await has(/^Switch role$/)) { const c = fr().getByLabel('Close').locator('visible=true').first(); if (await c.count()) await c.click().catch(() => {}); await sleep(800); }
}
async function signInDemo() {
  await section('signin', async () => {
    await sleep(1800);
    await tap('Sign In with Eduvos', { wait: 1200 });
    await fill(0, 'eduv230953@vossie.net');
    await tap('Next', { wait: 4200 });
  });
}
async function payNow() {
  await tap(/Pay Now/, { exact: false, wait: 2500 });
  for (let attempt = 0; attempt < 3; attempt++) {
    const l = T(/tap here to double-click|Tap anywhere to simulate|Hold Here/).first();
    try { await l.waitFor({ state: 'visible', timeout: 5000 }); } catch { break; }
    const label = await l.innerText(); log('pay sheet:', label); marks['paySheet'] = Number(now());
    await ripple(l); await sleep(300);
    if (/double-click/.test(label)) { await l.dblclick(); }
    else { const bx = await l.boundingBox(); await page.mouse.move(bx.x + bx.width / 2, bx.y - 120); await page.mouse.down(); await sleep(2600); await page.mouse.up(); }
    await sleep(4500);
    if (await has(/Payment received/)) break;
    if (await has(/Pay Now/)) await tryTap(/Pay Now/, { exact: false, wait: 2500 });
  }
  mark('paid');
  await sleep(1500);
}

  await section('signup', async () => {
    await sleep(1800);
    await tap('Sign In with Eduvos', { wait: 1500 });
    await fill(0, 'eduv123451@vossie.net');
    await tap('Next', { wait: 1500 });
    mark('checking');
    await fr().getByText('Add photo', { exact: true }).locator('visible=true').first().waitFor({ timeout: 25000 });
    mark('profile');
    await sleep(1500);
    await upload(fr().getByLabel('Add photo').first(), 'Photo library', SMP + 'portrait.jpg');
    mark('photoSet'); await sleep(1500);
    await fill(0, 'Vumisa Dlamini');
    { const ph = fr().locator('input[placeholder="071 234 5678"]'); if (await ph.count()) { await ripple(ph.first()); await ph.first().fill('082 123 4567'); await sleep(600); } }
    await mc(T(/I agree to the/).first(), 900);
    await tap('Continue', { wait: 4000 });
    mark('onboarding');
    await sleep(1500);
    for (const c of ['Food', 'Books', 'Fashion']) await tryTap(c, { wait: 700 });
    await sleep(1200);
    await tap('Start exploring', { wait: 4500 });
    mark('home');
    await sleep(2500);
  });
  await section('seller-setup', async () => {
    mark('seller');
    await tap('Account', { wait: 1800, last: true });
    await scrollTo(/Switch role/, 8, 500);
    await tap('Switch role', { exact: false, wait: 1400 });
    await tap('Seller', { wait: 4500 });
    await tap('Set up my shop', { wait: 3000 });
    await tap('Student seller', { wait: 800 });
    await fill(0, 'Kamo Threads'); await fill(1, '0821234567');
    await tap('Continue', { wait: 2800 });
    await upload('ID document'); await upload('Proof of address');
    await tap('Submit for review', { wait: 4200 });
    mark('verified');
    await tap('Continue', { wait: 3000 });
    mark('storeForm');
    await upload('Add photo', 'Photo library', SMP + 'logo.jpg'); mark('logoSet');       // store logo
    await upload('Add a store banner', 'Photo library', SMP + 'banner.jpg'); mark('bannerSet');
    const tas = fr().locator('textarea:visible, input:visible'); const n = await tas.count();
    for (let k = 0; k < n; k++) { const v = await tas.nth(k).inputValue(); if (!v) await tas.nth(k).fill('Thrifted and upcycled fashion from campus').catch(() => {}); }
    await tap('Choose', { wait: 2600 });
    log('place screen:', JSON.stringify((await visibleText()).slice(0, 24)));
    await tryTap(/^Mooirivier Mall$/, { wait: 1800 });
    await tap('Use this place', { wait: 2200 });
    await tap('Save & continue', { wait: 4500 });
    await slideTo(/Go to dashboard/, 'dashboard');
  });
  await section('seller-product', async () => {
    mark('product');
    await tap('Products', { wait: 2600, last: true });
    await sleep(1200);
    await tap('Add product', { exact: false, wait: 2600 });
    mark('productForm');
    await pickAt(52, 145, 'Photo library', SMP + 'product1.jpg'); mark('photo1');                              // product photos
    await pickAt(132, 145, 'Photo library', SMP + 'product2.jpg').catch(() => {}); mark('photo2');
    { const ins = fr().locator('input:visible, textarea:visible'); const n = await ins.count(); log('product inputs', n);
      if (n >= 3) { await ripple(ins.nth(0)); await ins.nth(0).fill('Vintage denim jacket'); await sleep(500); await ripple(ins.nth(1)); await ins.nth(1).fill('Thrifted and upcycled, size M, great condition.'); await sleep(500); await ripple(ins.nth(2)); await ins.nth(2).fill('180'); await sleep(500); } }
    await mc(T('Fashion', { exact: true }).first(), 900).catch(() => log('MISS Fashion'));
    await sleep(900);
    await mc(T('Publish', { exact: true }).first(), 3200, true).catch(() => log('MISS Publish'));
    mark('published');
    await sleep(1500);
    await page.screenshot({ path: 'shots/story_pub.png' });
    log('after publish:', JSON.stringify((await visibleText()).slice(0, 24)));
  });
await section('to-buyer', async () => { mark('toBuyer'); await switchRole('Buyer'); await sleep(1500); });

await section('buyer-shop', async () => {
  mark('shop');
  await sleep(1800);
  await tap('Reels', { wait: 3200, last: true });
  mark('reelsOpen');
  await sleep(2500);
  log('reel:', JSON.stringify((await visibleText()).slice(0, 12)));
  await mc(await inView(/^Kamo Threads$/), 3200);
  mark('storeOpen');
  log('store:', JSON.stringify((await visibleText()).slice(0, 30)));
  await page.screenshot({ path: 'shots/story_store.png' });
  for (let k = 0; k < 14; k++) {
    let l = T(/Vintage denim jacket/i).first(); let bx0 = null;
    for (const c of await T(/Vintage denim jacket/i).all()) { const b2 = await c.boundingBox().catch(() => null); if (b2 && b2.x >= 0 && b2.x < 393 && b2.y > 120 && b2.y < 650) { l = c; break; } }
    if (await l.count()) {
      let bx = await l.boundingBox().catch(() => null);
      if (bx && bx.y > 120 && bx.y < 650) {
        await sleep(900); bx = await l.boundingBox().catch(() => null);
        if (bx) {
          const mode = k % 2;
          if (mode === 0) await page.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
          else if (mode === 1) await page.mouse.click(bx.x + bx.width / 2, Math.max(130, bx.y - 70));
          await sleep(3000);
        }
        if (await has(/Add to Cart/i)) break;
        log('jacket click did not open, retry', k, 'mode', k % 2);
        continue;
      }
    }
    await wheel(380, 1400);
  }
  mark('listing');
  log('listing:', JSON.stringify((await visibleText()).slice(0, 20)));
  await sleep(1500); await scroll(300, 1800); await sleep(700); await scroll(-300, 900);
  for (let k = 0; k < 4; k++) {
    try {
      const a = T(/Add to Cart/i).first(); await a.waitFor({ state: 'visible', timeout: 6000 });
      await a.scrollIntoViewIfNeeded().catch(() => {}); await sleep(500);
      const bx = await a.boundingBox();
      await page.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
      // the toast is short-lived, so poll for it right after the click
      let ok = false;
      for (let w = 0; w < 8 && !ok; w++) { await sleep(150); ok = await has(/added to cart/i); }
      if (ok) { await sleep(1400); break; }
    } catch (e) { log('add miss', e.message.slice(0, 60)); }
    log('retry add to cart'); await sleep(600);
  }
  mark('added');
});
  await section('buyer-checkout', async () => {
    mark('checkout');
    await tap('Cart', { wait: 2600, last: true });
    await sleep(900);
    await tap(/Checkout · R/, { exact: false, wait: 3000 });
    await sleep(1200);
    await tap('Vossie courier', { exact: false, wait: 1300 });
    await scroll(260, 1400);
    await sleep(1800);
    await scroll(-260, 800);
    await payNow();
  });

await section('buyer-msg', async () => {
  mark('orderPlaced');
  await tap('Activity', { wait: 2600, last: true });
  await sleep(1000);
  await tap('Orders', { wait: 1800, last: true });
  log('orders tab:', JSON.stringify((await visibleText()).slice(0, 40)));
  await page.screenshot({ path: 'shots/story_orders_tab.png' });
  await scrollTo(/Kamo Threads|Vintage denim|denim jacket/i, 6, 400);
  await mc(await inView(/Kamo Threads|Vintage denim|denim jacket/i), 2600, true);
  mark('orderDetail');
  log('order detail:', JSON.stringify((await visibleText()).slice(0, 40)));
  { const c = await findCodes('buyerOrder'); if (c.m) deliveryCode = c.m; else if (c.loose[0]) deliveryCode = c.loose[0]; }
  await sleep(1200);
  await mc(T(/Message seller/).first(), 2600, true);
  mark('thread');
  const box = fr().locator('input:visible, textarea:visible').last();
  await box.waitFor({ state: 'visible', timeout: 8000 });
  await box.click(); await sleep(400);
  await page.keyboard.type('Hi! Is the denim jacket still available in size M? I can collect at 4.', { delay: 55 });
  await sleep(700);
  mark('typed');
  await fr().getByLabel('Send message').locator('visible=true').first().click();
  mark('sent');
  await sleep(2600);
});
await section('seller-reply', async () => {
  mark('toSeller'); await switchRole('Seller'); await sleep(1800);
  mark('sellerHome');
  await sleep(1500);
  log('seller home:', JSON.stringify((await visibleText()).slice(0, 30)));
  if (!(await has(/denim jacket still available|Hi! Is/i))) {
    await mc(fr().getByLabel(/^Notifications/).locator('visible=true').first(), 2400);
    log('notifications:', JSON.stringify((await visibleText()).slice(0, 20)));
  }
  await scrollTo(/denim jacket still available|Hi! Is/i, 8, 450);
  await mc(T(/denim jacket still available|Hi! Is/i).first(), 2600, true);
  mark('sellerThread');
  const box = fr().locator('input:visible, textarea:visible').last();
  await box.waitFor({ state: 'visible', timeout: 8000 });
  await box.click(); await sleep(400);
  await page.keyboard.type('Yes it is! Packing it now, ready in 10 minutes.', { delay: 55 });
  await sleep(600);
  mark('sellerTyped');
  await fr().getByLabel('Send message').locator('visible=true').first().click();
  mark('sellerSent');
  await sleep(2600);
});

    await section('courier-setup', async () => {
    mark('courier');
    await switchRole('Courier');
    await tap('Become a courier', { wait: 2600 });
    await fill(0, 'Vumisa Dlamini'); await fill(1, '0821234567');
    await tap('Car', { wait: 1200 });
    await tap('Choose', { wait: 1200 }); await tap('Toyota', { wait: 900 });
    await tap('Choose', { wait: 1200 }); await tap('Corolla', { wait: 900 });
    await tap('Choose', { wait: 1200 }); await tap('White', { wait: 900 });
    { const i2 = fr().locator('input:visible'); await i2.nth(2).fill('CA 123 456'); await sleep(300); await i2.nth(3).fill('8012345678'); await sleep(500); }
    mark('carDetails');
    await tap('Continue', { wait: 2800 });
    mark('verify');
    await upload('ID document'); mark('idSet');
    await upload('Selfie check', 'Photo library', SMP + 'portrait.jpg'); mark('selfieSet');     // driver photo
    await upload('Car photo', 'Photo library', SMP + 'car.jpg'); mark('carPhotoSet');      // car photo
    await upload('Driving licence'); mark('licenceSet');
    { const d = fr().locator('input:visible'); if (await d.count()) { await ripple(d.first()); await d.first().fill('30/06/2031'); await sleep(500); } }
    await tap('Submit for review', { wait: 3800 });
    await tap('Finish', { wait: 3000 });
    mark('approvedWait');
    await fr().getByText('Go to dashboard', { exact: true }).locator('visible=true').first().waitFor({ timeout: 25000 });
    await slideTo(/Go to dashboard/, 'courier dashboard');
  });
  await section('seller-orders', async () => {
    await switchRole('Seller'); mark('toSellerOrders'); await sleep(1500);
    mark('orders');
    await sleep(1800);
    await tap('Orders', { wait: 2600, last: true });
    await sleep(900);
    // demo-order timers are off, so the newest order (our jacket) is the first card in New: tap its Accept
    if (await has(/^Decline #/)) { const c = fr().getByLabel('Close').locator('visible=true').first(); if (await c.count()) await c.click().catch(() => {}); await sleep(900); }
    await sleep(800);
    log('orders top:', JSON.stringify((await visibleText()).slice(0, 12)));
    { await T(/^Accept$/).first().waitFor({ state: 'visible', timeout: 8000 });
      const all = await T(/^Accept$/).all(); const boxes = [];
      for (const a of all) { const b = await a.boundingBox().catch(() => null); if (b && b.y > 150 && b.x < 220 && b.width > 20) boxes.push(b); }
      boxes.sort((p, q) => p.y - q.y); log('accept boxes', JSON.stringify(boxes.slice(0, 3)));
      const bx = boxes[0]; await page.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); }
    await sleep(2800);
    log('after open:', JSON.stringify((await visibleText()).slice(0, 14)));
    log('order page:', JSON.stringify((await visibleText()).slice(0, 14)));
    if (await has(/Slide to accept/)) await slideTo(/Slide to accept/, 'accept order');
    mark('accepted');
    await sleep(1500);
    // the card's Accept accepts at once; open the accepted order from the Accepted tab
    if (!(await has(/Prepare order/))) {
      await mc(T(/^Accepted/).first(), 2200);
      log('accepted tab:', JSON.stringify((await visibleText()).slice(0, 14)));
      await mc(T(/Vintage denim jacket/i).first(), 2800, true);
      log('order opened:', JSON.stringify((await visibleText()).slice(0, 14)));
    }
    await mc(T('Prepare order', { exact: true }).first(), 2600);
    mark('preparing');
    for (const re of [/Vintage denim jacket × 1/, /Add receipt and order label/]) await mc(T(re).first(), 900, true).catch(() => log('MISS tick', String(re)));
    await sleep(800);
    await mc(T(/Mark ready for pickup/).first(), 3200);
    mark('ready');
    await sleep(1500);
    mark('handover');
    { const code = await fr().evaluate(() => { const el = document.querySelector('[data-testid="handover-code-card"]'); return el ? el.innerText : ''; }).catch(() => ''); const d = (code.match(/\d/g) || []).join(''); log('handover code text', JSON.stringify(code), d); if (d.length >= 4) pickupCode = d; }
    log('handover screen:', JSON.stringify((await visibleText()).slice(0, 20)));
    await sleep(3000);
  });

  await section('to-courier', async () => { mark('toCourier'); await switchRole('Courier'); await sleep(1500); });

  await section('courier-live', async () => {
    mark('cLive');
    await sleep(1800);
    { const sw = fr().locator('[role=switch]').locator('visible=true').first(); await ripple(sw); await sleep(300); await sw.click({ timeout: 6000 }); await sleep(2600); }
    for (let k = 0; k < 20 && !(await has(/Slide to accept/)); k++) await page.waitForTimeout(1500);
    mark('offer');
    log('offer sheet:', JSON.stringify((await visibleText()).slice(0, 24)));
    // the offer must be OUR jacket order (pickup Kamo Threads); decline demo offers that arrive first
    for (let k = 0; k < 4 && (await has(/Slide to accept/)) && !(await has(/Kamo Threads/)); k++) {
      log('demo offer shown, declining');
      await tryTap('Decline', { wait: 2500 });
    }
    if (await has(/Slide to accept/)) {
      await sleep(2400);
      await slideTo(/Slide to accept/, 'accept job');
    } else {
      log('no sheet for our job: opening it from Jobs');
      await tap('Jobs', { wait: 2600, last: true });
      log('jobs:', JSON.stringify((await visibleText()).slice(0, 30)));
      if (await has(/outside your zones/)) {
        { const hb = fr().getByTestId('hidden-offers').locator('visible=true').first(); await hb.scrollIntoViewIfNeeded().catch(() => {}); await hb.click({ force: true, timeout: 6000 }).catch(e => log('banner click err', e.message.slice(0, 60))); await sleep(2800); }
        log('availability:', JSON.stringify((await visibleText()).slice(0, 30)));
        await wheel(900, 1400); await sleep(500);
        log('availability bottom:', JSON.stringify((await visibleText()).slice(0, 40)));
        await page.screenshot({ path: 'shots/story_avail.png' });
        const sw = fr().locator('[role=switch]').locator('visible=true'); const n = await sw.count();
        for (let i = 0; i < n; i++) { const on = await sw.nth(i).getAttribute('aria-checked').catch(() => null); if (on === 'false') { await sw.nth(i).scrollIntoViewIfNeeded().catch(() => {}); await sw.nth(i).click().catch(() => {}); await sleep(400); } }
        const chips = T(/^\d+ km$/); const cn = await chips.count();
        if (cn) await mc(chips.nth(cn - 1), 900, true).catch(() => {});
        await sleep(800);
        await page.goBack().catch(() => {}); await sleep(1500);
        await tap('Jobs', { wait: 2600, last: true });
        log('jobs after widen:', JSON.stringify((await visibleText()).slice(0, 30)));
      }
      if (await has(/Kamo Threads/)) {
        await mc(T(/Kamo Threads/).first(), 2800, true);
        await mc(T(/Accept delivery/).first(), 3000, true);
      } else {
        log('OUR JOB NOT VISIBLE: accepting a demo job so the run completes');
        const acc = await T(/^Accept$/).all(); const bs = [];
        for (const a of acc) { const b = await a.boundingBox().catch(() => null); if (b && b.y > 150 && b.width > 20) bs.push(b); }
        bs.sort((p, q) => p.y - q.y);
        if (bs[0]) { await page.mouse.click(bs[0].x + bs[0].width / 2, bs[0].y + bs[0].height / 2); await sleep(3000); }
      }
    }
    mark('cAccepted');
    await sleep(1600);
    log('active job:', JSON.stringify((await visibleText()).slice(0, 24)));
    { const d = fr().locator('input:visible'); if (await d.count()) { await ripple(d.first()); await d.first().fill(pickupCode); await sleep(600); } }
    mark('pickupCode');
    await upload('Take a photo of the parcel', 'Photo library', SMP + 'product1.jpg').catch(() => {});
    await mc(T(/Order label matches/).first(), 900);
    await mc(T(/Parcel sealed/).first(), 900);
    await mc(T(/Confirm collection/).first(), 3000);
    mark('collected');
  });
  await section('courier-deliver', async () => {
    mark('rampStart');
    await sleep(2500);
    log('ride screen:', JSON.stringify((await visibleText()).slice(0, 24)));
    // the buyer, meanwhile, follows the same order live: courier card with Call and Chat, and the delivery code to read out
    try {
      await switchRole('Buyer'); mark('toBuyer2'); await sleep(1200);
      await tap('Activity', { wait: 2600, last: true });
      await tap('Orders', { wait: 1800, last: true });
      await scrollTo(/Kamo Threads|Vintage denim|denim jacket/i, 6, 400);
      await mc(await inView(/Kamo Threads|Vintage denim|denim jacket/i), 2600, true);
      mark('rideStart');
      await mc(T(/Track on map/).first(), 3200, true);
      mark('track');
      await sleep(2500);
      mark('callBtn');
      log('track screen:', JSON.stringify((await visibleText()).slice(0, 30)));
      { const t = await fr().evaluate(() => { const el = document.querySelector('[data-testid="delivery-code"]'); return el ? el.innerText : ''; }).catch(() => ''); const d = (t.match(/\d/g) || []).join(''); log('buyer delivery code', JSON.stringify(t), d); if (d.length === 4) deliveryCode = d; }
      await sleep(1800);
      mark('chatBtn');
      await switchRole('Courier'); await sleep(2200);
      log('back on courier:', JSON.stringify((await visibleText()).slice(0, 24)));
    } catch (e) { log('buyer peek failed', e.message.slice(0, 120)); }
    if (!(await has(/Keep going|Slide to confirm arrival/))) {
      for (const re of [/Kamo Threads/, /In progress|Active|Continue|Resume/i]) { if (await tryTap(re, { exact: false, wait: 2400 })) { if (await has(/Keep going|Slide to confirm arrival/)) break; } }
      log('job screen:', JSON.stringify((await visibleText()).slice(0, 24)));
    }
    for (let k = 0; k < 60 && (await has(/Keep going/)); k++) await page.waitForTimeout(1500);
    mark('rampEnd'); mark('rideEnd');
    await slideTo(/Slide to confirm arrival/, 'arrival');
    await sleep(1400);
    mark('confirmScreen');
    // a problem on the way: the report screen
    await tryTap(/Can't deliver/, { exact: false, wait: 2800 });
    mark('failedScreen');
    log('failed screen:', JSON.stringify((await visibleText()).slice(0, 20)));
    await sleep(2400);
    await page.goBack().catch(() => {}); await sleep(1800);
    log('code', deliveryCode);
    { const d = fr().locator('input:visible'); if (await d.count()) { await ripple(d.first()); await d.first().fill(deliveryCode); } else { const h = await T(/delivery code/i).first().boundingBox(); await page.mouse.click(h.x + h.width / 2 - 126, h.y + 62); await page.keyboard.type(deliveryCode, { delay: 260 }); } }
    await sleep(1400);
    await mc(T('Confirm delivery', { exact: true }).last(), 3800);
    mark('cDelivered');
    log('delivered:', JSON.stringify((await visibleText()).slice(0, 14)));
  });

await section('buyer-rate', async () => {
  mark('toBuyer3'); await switchRole('Buyer'); await sleep(1500);
  await tap('Activity', { wait: 2600, last: true });
  await scrollTo(/Order Updates/, 6, 450);
  await tryTap(/View all/, { exact: false, wait: 2400, last: true, mouse: true });
  await tryTap('Complete', { wait: 1800 });
  await sleep(1200);
  await scrollTo(/Vintage denim jacket/i, 6, 400);
  await mc(T('Kamo Threads', { exact: true }).first(), 2800, true);
  log('after card tap:', JSON.stringify((await visibleText()).slice(0, 20)));
  mark('delivered');
  log('delivered order:', JSON.stringify((await visibleText()).slice(0, 30)));
  await sleep(1800);
  await mc(T(/Rate courier and tip|Rate and tip/).first(), 2800, true);
  mark('rateSheet');
  log('rate sheet:', JSON.stringify((await visibleText()).slice(0, 30)));
  await sleep(2600);
  await back(); await back();
});

  await section('courier-cash', async () => {
    await switchRole('Courier'); await sleep(1800);
    mark('earnings');
    await sleep(1200);
    await tryTap(/Done|Back to home|Finish/, { exact: false, wait: 1800 });
    await tap('Earnings', { wait: 2800, last: true });
    await sleep(2200);
    await scroll(300, 1400); await sleep(1500);
    // the cash out screen is shown from the courier Account menu (Wallet), so the Account tab never starts on a stale page
    mark('cashout');
    await sleep(1800);
    await accountRoot();
    await scrollTo(/Performance/, 6, 400); await mc(T('Performance', { exact: false }).first(), 2600, true); mark('performance'); await sleep(2200);
    await accountRoot();
    await scrollTo(/Statements/, 6, 400); await mc(T('Statements', { exact: false }).first(), 2600, true); mark('statements'); await sleep(2000);
    await accountRoot();
    await scrollTo(/Documents/, 6, 400); await mc(T('Documents', { exact: false }).first(), 2600, true); mark('documents'); await sleep(2200);
  });


// ================= extra screens for the full tour (appended after the story) =================
async function accountRoot() {
  await tap('Account', { wait: 1400, last: true });
  const root = /Performance|Switch role|Operating times|Business details/;
  await T(root).first().waitFor({ state: 'visible', timeout: 3500 }).catch(() => {});
  
  for (let i = 0; i < 6 && !(await has(root)); i++) {
    const b = fr().getByLabel('Back', { exact: true }).locator('visible=true').first();
    if (!(await b.count())) break;
    await b.click({ timeout: 4000 }).catch(() => {}); await sleep(1100);
  }
}
const HOLD = 2000; // sleep() multiplies by K, so this is about 3.6 s at the default pace
const hold = (n = 1) => sleep(HOLD * n);
async function openAccountRow(label, { scrollBy = 0 } = {}) {
  await accountRoot();
  await scrollTo(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 8, 500);
  const ok = await tryTap(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), { exact: false, wait: 1800, mouse: true });
  if (!ok) return false;
  mark('row:' + label);
  await hold();
  if (scrollBy) { await scroll(scrollBy, 2200); await hold(0.6); }
  return true;
}
async function logAccount(tag) {
  await accountRoot();
  for (let i = 0; i < 6; i++) { log(tag, 'texts@' + i, JSON.stringify((await visibleText()).slice(0, 40))); await scroll(420, 800); }
}

await section('x-buyer', async () => {
  await switchRole('Buyer'); await sleep(1500);
  await tap('Explore', { wait: 1800, last: true }); mark('x:explore'); await hold(); await scroll(420, 2200); await hold(0.8); await scroll(420, 2200); await hold(0.8);
  await tap('Reels', { wait: 1800, last: true }); mark('x:reels'); await hold(2); await wheel(600, 2500); await hold(1.4);
  await tap('Activity', { wait: 1800, last: true }); mark('x:activity'); await hold(); await scroll(300, 1800); await hold(0.6);
  await scrollTo(/Order Updates/, 6, 450); await tryTap(/View all/, { exact: false, wait: 2400, last: true, mouse: true }); mark('x:myOrders'); await hold(); await scroll(300, 1800); await hold(0.6); await back();
  await tap('Cart', { wait: 1800, last: true }); mark('x:cart'); await hold();
  await tap('Home', { wait: 1800, last: true }); mark('x:home'); await hold(); await scroll(450, 2400); await hold(0.8); await scroll(450, 2400); await hold(0.8);
  for (const row of ['Edit Profile', 'Wallet', 'Vossie Points', 'Coupons and offers', 'Refer friends', 'Subscriptions', 'Wishlist and saved searches', 'Campus extras', 'Safety', 'Security and Settings', 'Help', 'Terms and conditions']) {
    try { await openAccountRow(row, { scrollBy: 380 }); } catch (e) { log('row fail', row, e.message.split(String.fromCharCode(10))[0].slice(0, 80)); await back(); await sleep(800); }
  }
});

await section('x-seller', async () => {
  await switchRole('Seller'); await sleep(2000);
  mark('x:sellerHome'); await hold(); await scroll(420, 2200); await hold(0.8); await scroll(420, 2200); await hold(0.8);
  await tap('Products', { wait: 1800, last: true }); mark('x:products'); await hold(); await scroll(300, 1800); await hold(0.6);
  await tap('Orders', { wait: 1800, last: true }); mark('x:orders'); await hold(); await scroll(300, 1800); await hold(0.6);
  await tap('Payouts', { wait: 1800, last: true }); mark('x:payouts'); await hold(); await scroll(420, 2200); await hold(0.8);
  for (const row of ['Store profile', 'Operating times', 'Order rules', 'Weekly goal', 'Documents and verification', 'Wallet', 'Messages', 'Store preview', 'Reels', 'Reviews', 'Promotions', 'Returns and disputes', 'Analytics', 'Plans', 'Team members', 'Notifications', 'Security', 'Help and support', 'Settings']) {
    try { await openAccountRow(row, { scrollBy: 380 }); } catch (e) { log('row fail', row, e.message.split(String.fromCharCode(10))[0].slice(0, 80)); await back(); await sleep(800); }
  }
});

await section('x-courier', async () => {
  await switchRole('Courier'); await sleep(2000);
  mark('x:courierHome'); await hold(); await scroll(420, 2200); await hold(0.8);
  await tap('Jobs', { wait: 1800, last: true }); mark('x:jobs'); await hold(); await scroll(300, 1800); await hold(0.6);
  await tap('Active', { wait: 1800, last: true }); mark('x:active'); await hold();
  await tap('Earnings', { wait: 1800, last: true }); mark('x:earnings'); await hold(); await scroll(420, 2200); await hold(0.8);
  for (const row of ['Wallet', 'Documents', 'Availability and zones', 'Job alerts', 'Performance', 'Statements', 'History', 'Notifications', 'Help & support']) {
    try { await openAccountRow(row, { scrollBy: 380 }); } catch (e) { log('row fail', row, e.message.split(String.fromCharCode(10))[0].slice(0, 80)); await back(); await sleep(800); }
  }
});

await section('x-ops', async () => {
  await switchRole('Buyer'); await sleep(1500);
  await accountRoot();
  await scrollTo(/Vossie Operations/, 8, 500);
  await tap(/Vossie Operations/, { exact: false, wait: 2400, mouse: true }); mark('x:opsHub'); await hold(1.4); await scroll(420, 2200); await hold(0.8);
  await tap('Transfers', { wait: 2000, last: true }); mark('x:opsTransfers'); await hold(1.4);
  await tap('Incubation', { wait: 2000, last: true }); mark('x:opsIncubation'); await hold(1.4);
  await tap('Log', { wait: 2000, last: true }); mark('x:opsLog'); await hold(1.4); await scroll(380, 2200); await hold(0.8);
  await tryTap('Leave', { wait: 2600, mouse: true }); mark('x:opsLeft'); await sleep(1200);
});


const PDF = 'C:/Users/PABAL/Vossie Marketplace Build/projects/Vossie-Marketplace-1/promo-video/samples/BLAW101-notes.pdf';
async function typeInto(testId, value) {
  const el = fr().getByTestId(testId).locator('visible=true').first();
  await el.waitFor({ state: 'visible', timeout: 8000 });
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await el.click(); await page.keyboard.type(value, { delay: 35 }); await sleep(500);
}

await section('x-notes-seller', async () => {
  await switchRole('Seller'); await sleep(1800);
  await tap('Products', { wait: 2200, last: true }); mark('x:notesProducts'); await hold();
  // the Free plan holds 10 products and the demo store has 10: archive one to make room
  await mc(T(/TI-30XS Calculator/).first(), 2400, true); mark('x:notesArchiveForm'); await hold(0.6);
  await mc(fr().getByTestId('listing-archive').locator('visible=true').first(), 2600, true); mark('x:notesArchived'); await hold(0.6);
  await tap('Add product', { exact: false, wait: 2400 }); mark('x:notesForm'); await hold(0.6);
  await mc(T('Books', { exact: true }).last(), 1400, true); mark('x:notesBooks'); await hold(0.6);
  await fr().getByLabel('Digital study notes').locator('visible=true').first().click(); await sleep(1500); mark('x:notesSwitch'); await hold(0.6);
  await typeInto('listing-title', 'BLAW101 Business Law notes');
  await typeInto('listing-price', '25');
  await typeInto('notes-module', 'Business Law');
  await typeInto('notes-code', 'BLAW101');
  mark('x:notesFilled'); await hold(0.8);
  await tryTap('Cape Town', { wait: 1200, mouse: true }); await hold(0.6);
  await upload(fr().getByTestId('notes-pdf').locator('visible=true').first(), 'Files', PDF); mark('x:notesPdf'); await hold(0.8);
  await mc(T('Publish', { exact: true }).first(), 3200, true); mark('x:notesPublished'); await hold();
});

await section('x-notes-buyer', async () => {
  await switchRole('Buyer'); await sleep(1500);
  await tap('Home', { wait: 2000, last: true });
  await tryTap('Books', { wait: 1800 }); mark('x:notesHomeBooks'); await hold();
  await fr().getByTestId('notes-banner').locator('visible=true').first().click(); await sleep(2400); mark('x:notesBrowse'); await hold(1.4);
  await tryTap('Pretoria', { wait: 1800 }); await hold(); await tryTap('All campuses', { wait: 1800 }); await scroll(380, 2200); await hold(0.8);
  await mc(fr().getByTestId('notes-row-notes-itma101').locator('visible=true').first(), 2600, true); mark('x:notesListing'); await hold(1.4);
  await scroll(420, 2200); await hold(0.8);
  await tap(/Read the first/, { exact: false, wait: 2200 }); mark('x:notesPreview'); await hold();
  await fr().getByTestId('notes-next').locator('visible=true').last().click(); await sleep(1500); await hold(0.6);
  await fr().getByTestId('notes-next').locator('visible=true').last().click(); await sleep(1500); mark('x:notesLocked'); await hold();
  await fr().getByTestId('notes-unlock').locator('visible=true').last().click(); await sleep(2400); await hold(0.6);
  await fr().getByTestId('notes-buy').locator('visible=true').last().click(); await sleep(1800); mark('x:notesPaySheet'); await hold(1.2);
  await fr().getByTestId('notes-pay').locator('visible=true').last().click(); await sleep(3200); mark('x:notesReader'); await hold(1.2);
  for (let i = 0; i < 3; i++) { await fr().getByTestId('notes-next').locator('visible=true').last().click(); await sleep(1500); await hold(0.6); }
  await back(); await sleep(1200);
  await accountRoot();
  await scrollTo(/My study notes/, 8, 500);
  await tryTap(/My study notes/, { exact: false, wait: 2200, mouse: true }); mark('x:myNotes'); await hold(1.2);
});

log('done');
marks.end = Number(now());
running = false; await cdp.send('Page.stopScreencast').catch(() => {}); await capLoop; await new Promise(r => setTimeout(r, 800));
const rel = frameTimes;
fs.writeFileSync(`${OUT}/marks.json`, JSON.stringify({ marks, taps, frames: rel.length, duration: rel[rel.length - 1] }, null, 1));
let list = '';
for (let i = 0; i < rel.length; i++) { const d = i < rel.length - 1 ? rel[i + 1] - rel[i] : 0.04; list += `file 'f${String(i).padStart(6, '0')}.jpg'\nduration ${Math.max(d, 0.001).toFixed(4)}\n`; }
list += `file 'f${String(rel.length - 1).padStart(6, '0')}.jpg'\n`;
fs.writeFileSync(`${OUT}/list.txt`, list);
await ctx.close(); await b.close();
