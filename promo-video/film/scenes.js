// Scenes of the Vossie launch film. One consistent story: Kamo Threads lists a denim jacket, a buyer finds it,
// chats, pays, the seller packs it, a courier delivers it and calls on arrival. Times are film seconds.
export async function build(c) {
  const { tl, P, C, seg, ui, title, pill, flare, grade, camTo, phTo, hit, FILM, $ } = c;
  const PI = Math.PI;
  const SRC = new URLSearchParams(location.search).get('story') || 'story';
  const MK = (await (await fetch(`/out/${SRC}/marks.json`)).json()).marks;
  const M = (k, d = 0) => { if (MK[k] === undefined) console.warn('missing mark', k); return (MK[k] ?? 0) + d; };
  // play footage between two marks (or seconds) from film time t at `rate`; returns the film duration
  const play = (t, a, b, rate = 1) => { const f0 = typeof a === 'number' ? a : M(a); const f1 = typeof b === 'number' ? b : M(b); const d = (f1 - f0) / rate; seg(t, t + d, f0, rate); return d; };
  const HERO = { x: 0, y: -6, z: 0, s: 1.0 };
  const RIGHT = { x: 92, y: -4, s: 1.22, rx: .04, ry: -.30, rz: 0 };    // phone on the right, text on the left

  // ===================================================================================
  //  INTRO  0 - 20 : the dot bounces, the wordmark lands, the burgundy phone rises and turns
  // ===================================================================================
  Object.assign(P, { x: 0, y: -330, z: 0, rx: .1, ry: PI + .5, rz: 0, s: .92, o: 1, on: 0 });
  Object.assign(C, { x: 0, y: 0, z: 640, lx: 0, ly: 0, fov: 24 });
  tl.set('#fade', { opacity: 1 }, 0);
  tl.to('#fade', { opacity: 0, duration: 1.2 }, .5);
  const bd = $('#bd'); tl.set(bd, { opacity: 1 }, 1.0);
  const bounce = (t, peak, dur) => {
    tl.to(bd, { y: -peak, duration: dur / 2, ease: 'power2.out' }, t).to(bd, { y: 0, duration: dur / 2, ease: 'power2.in' }, t + dur / 2);
    tl.to(bd, { scaleX: 1.25, scaleY: .75, duration: .08 }, t + dur - .02).to(bd, { scaleX: 1, scaleY: 1, duration: .25, ease: 'elastic.out(1,.5)' }, t + dur + .06);
    hit(t + dur, 'bounce', .6 + peak / 700);
  };
  bounce(1.4, 150, .75); bounce(2.5, 260, .95); bounce(3.9, 400, 1.15);
  tl.to(bd, { y: -700, duration: .7, ease: 'power2.out' }, 5.4); tl.set(bd, { opacity: 0 }, 6.1);
  tl.set('#wmdot', { opacity: 0 }, 0);
  tl.fromTo('#wm', { opacity: 0, scale: .92 }, { opacity: 1, scale: 1, duration: 1.6 }, 6.0);
  tl.fromTo('#wmdot', { y: -900, opacity: 1 }, { y: 0, duration: .9, ease: 'bounce.out' }, 6.5);
  hit(6.9, 'logo', 1.4); flare(960, 540, 7.1);
  tl.to('#wm', { scale: 1.05, duration: 4, ease: 'none' }, 7.2);
  // wordmark moves to the top so the phone never covers it
  tl.to('#wm', { y: -400, scale: .36, duration: 1.8, ease: 'power3.inOut' }, 11.0);
  hit(11.0, 'whoosh', 1.2);
  // phone rises from below, turning from its back (camera lenses) round to the screen
  tl.to(P, { y: -4, duration: 4.2, ease: 'power3.out' }, 11.2);
  tl.to(P, { ry: -.30, duration: 5.0, ease: 'power2.inOut' }, 11.2);
  tl.to(P, { rx: .04, s: 1.0, duration: 5, ease: 'power2.inOut' }, 11.2);
  tl.to(P, { on: 1, duration: 1.2 }, 15.2);
  hit(15.6, 'impact', 1);
  const W3 = [['Buy.', 14.4], ['Sell.', 15.4], ['Deliver.', 16.4]];
  W3.forEach(([w, at], i) => title(w, at, 20.2 - at, { x: 130, y: 330 + i * 130, size: 'big', g: .7 }));
  // slide the phone to the right to start chapter one
  const T1 = 20.4;
  tl.to(P, { x: RIGHT.x, y: RIGHT.y, s: RIGHT.s, ry: RIGHT.ry, rx: RIGHT.rx, duration: 2.0, ease: 'power3.inOut' }, T1 - .6);
  tl.to(C, { z: 560, duration: 2, ease: 'power3.inOut' }, T1 - .6);
  tl.to('#wm', { opacity: 0, duration: .8 }, T1 - .6);

  // ===================================================================================
  //  The rest is filled in once the story is recorded (see chapters below).
  // ===================================================================================
  let t = T1;
  t = await chapters({ ...c, M, play, RIGHT, t: T1, PI });
  FILM.scenes = {}; FILM.end = t;
  tl.to('#fade', { opacity: 1, duration: 2.0, ease: 'power2.in' }, t - 2.0);
  tl.to({}, { duration: 1 }, t + 1);
}

async function chapters(c) {
  const { tl, seg, ui, title, pill, flare, grade, camTo, phTo, hit, RIGHT, PI, $, rnd } = c;
  const SRC = new URLSearchParams(location.search).get('story') || 'story';
  let MK = {}; try { MK = (await (await fetch(`/out/${SRC}/marks.json`)).json()).marks || {}; } catch (e) { console.warn('no marks'); }
  const has = k => typeof MK[k] === 'number';
  const R = x => { if (x === undefined) return undefined; if (typeof x === 'number') return x; for (const k of [].concat(x)) if (has(k)) return MK[k]; return undefined; };
  const E = (name, d) => ({ plus: name, d });               // mark + seconds
  const RE = x => (x && x.plus !== undefined) ? (R(x.plus) === undefined ? undefined : R(x.plus) + x.d) : R(x);
  const FLIP = 2.6, CALL = 7, OUTRO = 21.5, BUDGET = 297;
  const items = [];
  const S = (a, b, rate = 1) => items.push({ k: 'seg', a, b, rate });
  const F = fn => items.push({ k: 'fn', fn });
  const FL = (next, o = {}) => items.push({ k: 'flip', next, o });

  let lastTitleEnd = 0, rolePill = null, ry = RIGHT.ry;
  const T = (t, text, dur = 3.4, o = {}) => { const at = Math.max(t, lastTitleEnd); lastTitleEnd = at + dur + .2; title(text, at, dur, { size: 'mid', w: 800, y: 400, ...o }); };
  const role = (t, text) => { if (rolePill) pill(rolePill.text, rolePill.at, Math.max(1.2, t - rolePill.at + .3)); rolePill = text ? { text, at: t } : null; };
  const G = { signup: ['#050b10', '#0e2230', '#376371'], seller: ['#12060b', '#3a1220', '#a03a5a'], buyer: ['#050b10', '#0e2230', '#376371'], courier: ['#05110d', '#0f2a22', '#2f7a5f'], call: ['#06090e', '#1b2a38', '#4a7b95'], earn: ['#120d05', '#2e2209', '#b0892f'] };
  const gr = (t, k, gx) => grade(t, G[k][0], G[k][1], G[k][2], gx || '62%', '45%', 2.2);
  const drift = (t, z, x) => camTo(t, 9, { z, x, lx: x * .3 }, 'sine.inOut');

  // 1 sign in
  F(t => { role(t, 'Student sign-in'); gr(t, 'signup'); T(t + .2, 'Sign in with your student card.'); drift(t, 540, -10); hit(t + .2, 'impact', .8); });
  S(['signup', 'checking'], 'home', 1.6);
  // 2 sell
  F(t => { role(t, 'Seller · Kamo Threads'); gr(t, 'seller'); hit(t, 'swipe'); flare(1400, 540, t); T(t + .3, 'Open a shop in minutes.'); drift(t, 520, 14); phTo(t, 1.2, { ry: RIGHT.ry + .25 }, 'power2.out'); phTo(t + 1.2, 1.6, { ry: RIGHT.ry }, 'power2.inOut'); });
  S('seller', 'verified', 3);
  F(t => hit(t, 'ding', .8));
  S('verified', 'storeForm', 1.6);
  S('storeForm', 'logoSet', 3);
  F(t => hit(t, 'tap', .7));
  S('logoSet', 'bannerSet', 2.2);
  S('bannerSet', 'product', 3);
  F(t => { T(t, 'List it in seconds.'); drift(t, 560, -14); });
  S('product', 'productForm', 3);
  S('productForm', 'photo1', 3);
  S('photo1', 'photo2', 1.6);
  S('photo2', 'published', 3);
  F(t => { hit(t, 'ding', 1); flare(1400, 540, t); });
  S('published', E('published', 2.5), 1);
  // 3 buy
  F(t => { role(t, 'Buyer'); gr(t, 'buyer', '58%'); hit(t, 'swipe'); T(t + .3, 'Find it.', 3.0); drift(t, 530, 10); phTo(t, 1.0, { s: RIGHT.s + .05 }); phTo(t + 1, 1.6, { s: RIGHT.s }, 'power2.inOut'); });
  S('shop', 'reelsOpen', 2);
  S('reelsOpen', 'storeOpen', 2.4);
  S('storeOpen', 'listing', 2);
  S('listing', 'added', 2);
  F(t => { hit(t, 'tap'); T(t, 'Pay in a tap.'); drift(t, 560, -10); });
  S('added', 'checkout', 2);
  S('checkout', 'paySheet', 2);
  S('paySheet', 'paid', 1);
  F(t => { hit(t, 'cash', 1.2); flare(1400, 540, t); });
  S('paid', 'orderPlaced', 1.6);
  S('orderPlaced', 'orderDetail', 2);
  // 4 chat, flip, reply
  F(t => { T(t, 'Ask anything.'); });
  S('orderDetail', 'thread', 2);
  S('thread', 'typed', 1.3);
  F(t => hit(t, 'tap', .6));
  S('typed', 'sent', 1);
  F(t => hit(t, 'swipe', .7));
  S('sent', E('sent', 1.2), 1);
  FL('toSeller', { role: 'Seller · Kamo Threads', grade: 'seller' });
  S('toSeller', 'sellerHome', 2);
  F(t => hit(t, 'ding', 1));
  S('sellerHome', 'sellerThread', 2);
  S('sellerThread', 'sellerTyped', 1.5);
  S('sellerTyped', 'sellerSent', 1);
  F(t => hit(t, 'swipe', .7));
  S('sellerSent', E('sellerSent', 1), 1);
  // 5 fulfil
  F(t => { T(t, 'Packed. Ready.'); hit(t, 'ding', 1); drift(t, 540, 8); });
  S('orders', 'accepted', 2);
  F(t => hit(t, 'tap'));
  S('accepted', 'preparing', 2);
  S('preparing', 'ready', 2.5);
  F(t => hit(t, 'ding', .8));
  S('ready', 'handover', 2.5);
  // 6 courier
  FL('courier', { role: 'Courier', grade: 'courier' });
  F(t => { T(t + .2, 'Deliver. Earn.'); drift(t, 540, -12); });
  S('courier', 'carDetails', 3.5);
  S('carDetails', 'verify', 3.5);
  S('verify', 'cLive', 3.5);
  S('cLive', 'offer', 3);
  F(t => { hit(t, 'ding', 1); flare(1400, 540, t); });
  S('offer', 'cAccepted', 1.4);
  F(t => hit(t, 'tap'));
  S('cAccepted', 'pickupCode', 2.5);
  S('pickupCode', 'collected', 1.6);
  S('collected', 'rampStart', 1.5);
  let rampT = 0;
  F(t => { rampT = t; hit(t, 'whoosh', 1.3); camTo(t, 1.2, { z: 460, x: 40, roll: .03 }, 'power2.out'); phTo(t, 1.2, { ry: RIGHT.ry - .12, rx: .09 }, 'power2.out'); });
  S('rampStart', 'rampEnd', 10);
  F(t => {
    const d = Math.max(.5, t - rampT);
    for (let i = 0; i < 16; i++) {
      const l = document.createElement('div'); const y = 80 + rnd() * 920, w = 260 + rnd() * 520, x0 = 1920 + rnd() * 400, sp = .55 + rnd() * .5;
      l.style.cssText = `position:absolute;left:${x0}px;top:${y}px;width:${w}px;height:${2 + rnd() * 2}px;background:linear-gradient(90deg,transparent,rgba(223,234,241,.55));opacity:0`;
      $('#fx').appendChild(l);
      const n = Math.max(1, Math.round(d / 1.1)), dd = 1.0 * sp + .5;
      for (let j = 0; j < n; j++) { const a = rampT + .4 + j * (d / n) + rnd() * .3; tl.set(l, { x: 0, opacity: 0 }, a); tl.to(l, { x: -(x0 + w + 200), opacity: .8, duration: dd, ease: 'none' }, a); tl.set(l, { opacity: 0 }, a + dd); }
    }
    camTo(t, 1.4, { z: 540, x: 0, roll: 0 }, 'power2.inOut'); phTo(t, 1.4, { ry: RIGHT.ry, rx: RIGHT.rx }, 'power2.inOut'); hit(t, 'impact', .8);
  });
  S('rampEnd', ['deliveryCode', 'confirmScreen'], 1.2);
  // 7 the call
  FL(null, { role: 'Buyer', grade: 'call', call: true });
  S('toBuyer2', 'track', 2);
  S('track', 'callBtn', 2);
  S('callBtn', 'chatBtn', 1.5);
  // 8 earn
  FL('confirmScreen', { role: 'Courier', grade: 'earn' });
  F(t => { T(t, 'Delivered.', 3.2, { w: 760 }); hit(t, 'ding', 1); flare(1400, 540, t); });
  S('confirmScreen', 'cDelivered', 2);
  F(t => { T(t, 'Get paid.', 3.4); hit(t, 'cash', 1.2); drift(t, 530, 10); });
  S('cDelivered', 'earnings', 2);
  F(t => hit(t, 'cash', 1));
  S('earnings', E('earnings', 7), 1);

  // plan: resolve marks, choose speed factor K so the film fits
  let lastF = 0, base = 0, fixed = 0;
  for (const it of items) {
    if (it.k === 'seg') { const a = RE(it.a) ?? lastF; let b = RE(it.b); if (b === undefined || b < a) b = a; it.a = a; it.b = b; lastF = b; base += (b - a) / it.rate; }
    else if (it.k === 'flip') { it.nf = RE(it.next); it.pf = lastF; if (it.nf !== undefined) lastF = it.nf; fixed += FLIP + (it.o.call ? CALL : 0); }
  }
  const avail = BUDGET - c.t - OUTRO - fixed;
  const K = Math.max(1, base / Math.max(10, avail));
  console.log('film plan: footage-at-rate', base.toFixed(1), 's, fixed', fixed.toFixed(1), ', speed factor K', K.toFixed(2));

  // place on the timeline
  let t = c.t;
  for (const it of items) {
    if (it.k === 'fn') it.fn(t);
    else if (it.k === 'seg') { const d = (it.b - it.a) / (it.rate * K); if (d > .01) seg(t, t + d, it.a, it.rate * K); t += d; }
    else if (it.k === 'flip') {
      const o = it.o, h = FLIP / 2;
      hit(t, 'swipe', 1); hit(t + .2, 'whoosh', .8);
      if (it.pf !== undefined) seg(t, t + h, it.pf, 0);
      if (it.nf !== undefined) seg(t + h, t + FLIP, it.nf, 0);
      phTo(t, FLIP, { ry: ry + 2 * PI }, 'power2.inOut'); ry += 2 * PI;
      phTo(t, h, { z: 90 }, 'sine.inOut'); phTo(t + h, h, { z: 0 }, 'sine.inOut');
      camTo(t, FLIP, { z: 600 }, 'sine.inOut');
      role(t + h, o.role); if (o.grade) gr(t + h - .5, o.grade);
      t += FLIP;
      if (o.call) {
        ui(t - h, t + CALL + h, 'call', { answerAt: h + 3.2, name: 'Tebogo' });
        hit(t - h + .3, 'ring', 1); hit(t - h + 1.6, 'ring', 1); hit(t - h + 2.9, 'ring', 1);
        hit(t + 3.2, 'tap', 1);
        T(t - h + .4, 'Your courier is outside.', 3.8, { w: 760 });
        camTo(t, 5.5, { z: 430, x: 30, lx: 12 }, 'power2.inOut');
        camTo(t + CALL - .4, 1.4, { z: 540, x: 0, lx: 0 }, 'power2.inOut');
        t += CALL;
      }
    }
  }
  if (rolePill) role(t, null);

  // OUTRO: phone turns to its back, camera pulls back, closing lines, wordmark
  const o = t;
  gr(o, 'seller', '70%');
  phTo(o, 4.6, { ry: ry + PI + .15, x: 150, y: -4, s: 1.12, rx: .06 }, 'power2.inOut');
  camTo(o, 4.6, { z: 600, x: 0, lx: 0, roll: 0 }, 'sine.inOut');
  hit(o + .2, 'whoosh', 1);
  ['Buy.', 'Sell.', 'Deliver.'].forEach((w, i) => title(w, o + 1.4 + i * .9, 11.0 - (1.4 + i * .9), { x: 130, y: 330 + i * 130, size: 'big', g: .8 }));
  camTo(o + 4.8, 5.6, { z: 900, x: -30 }, 'sine.inOut');
  phTo(o + 10.2, 1.8, { y: -720 }, 'power3.in'); phTo(o + 11.2, .6, { o: 0 }, 'none');
  hit(o + 10.2, 'whoosh', 1);
  tl.set('#wm', { y: 0, scale: .92, opacity: 0 }, o + 11.8);
  tl.set('#wmdot', { y: -900, opacity: 1 }, o + 11.8);
  tl.to('#wm', { opacity: 1, duration: 1.4 }, o + 12);
  tl.to('#wmdot', { y: 0, duration: .9, ease: 'bounce.out' }, o + 12.5);
  hit(o + 12.9, 'logo', 1.4); flare(960, 540, o + 13.1);
  tl.to('#wm', { scale: 1.05, duration: 8, ease: 'none' }, o + 13.2);
  const tg = title('Campus commerce, delivered.', o + 14.6, 6.4, { x: 0, y: 760, w: 1920, size: 'sm' }); tg.style.textAlign = 'center';
  const fl = title('Eduvos Potchefstroom - coming soon', o + 16.4, 4.6, { x: 0, y: 850, w: 1920, size: 'sm', g: .4 }); fl.style.textAlign = 'center'; fl.style.opacity = .75;
  const end = o + OUTRO;
  console.log('film total', end.toFixed(1), 's');
  return end;
}
