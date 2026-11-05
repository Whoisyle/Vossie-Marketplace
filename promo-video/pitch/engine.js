// Engine for the Vossie launch film: GSAP master timeline + 3D phones playing recorded app footage.
const $ = s => document.querySelector(s);
const st = $('#stage');
function fit() { const s = Math.min(innerWidth / 1920, innerHeight / 1080); st.style.transform = `scale(${s})`; st.style.left = (innerWidth - 1920 * s) / 2 + 'px'; st.style.top = (innerHeight - 1080 * s) / 2 + 'px'; }
addEventListener('resize', fit); fit();

const EPS = ['signup', 'buyer', 'seller', 'courier'];
const MK = {};
for (const ep of EPS) MK[ep] = (await (await fetch(`marks-${ep}.json`)).json());
// footage time of a recorded moment: F('buyer','paid',-2)
const F = (ep, key, dt = 0) => { const v = MK[ep].marks[key]; if (v === undefined) console.warn('missing mark', ep, key); return (v ?? 0) + dt; };

const FILM = { hits: [], duration: 0 };
const hit = (t, type, g = 1) => FILM.hits.push({ t, type, g });

const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L3 = $('#L3');
const phones = [];
const BEAT = 60 / 90, BAR = BEAT * 4;

function mkPhone(id, opts = {}) {
  const bob = document.createElement('div'); bob.className = 'bob';
  bob.innerHTML = `<div class="pos"><div class="body">
    ${Array.from({ length: 8 }, (_, i) => `<div class="slab" style="transform:translateZ(${-i * 1.8}px)"></div>`).join('')}
    <div class="front"><div class="screen"><div class="vids"></div><div class="glare"></div></div><div class="island"></div></div>
    <div class="back"><div class="cam"><b style="left:16px;top:16px"></b><b style="left:78px;top:16px"></b><b style="left:47px;top:78px"></b></div><img class="mark" src="wordmark.svg"></div>
  </div></div>`;
  L3.appendChild(bob);
  const pos = bob.querySelector('.pos'), body = bob.querySelector('.body'), vids = bob.querySelector('.vids');
  const ph = { id, bob, pos, body, vids, vid: {}, segs: [], bobAmp: opts.bob ?? 8, bobPh: rnd() * 6, home: { x: 960, y: 540 } };
  gsap.set(bob, { x: 960, y: 540 });
  gsap.set(pos, { opacity: 0, scale: opts.scale ?? 1, transformPerspective: 2600 });
  phones.push(ph);
  return ph;
}
function vidFor(ph, ep) {
  if (!ph.vid[ep]) {
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = `footage-${ep}.mp4`; v.style.display = 'none';
    ph.vids.appendChild(v); ph.vid[ep] = v;
  }
  return ph.vid[ep];
}
// footage segment: film time t0..t1 plays footage of episode ep from f0 at `rate`
const seg = (ph, t0, t1, ep, f0, rate = 1) => { ph.segs.push({ t0, t1, ep, f0, rate }); vidFor(ph, ep); };
function footAt(ph, t) {
  if (!ph.segs.length) return null;
  let s = null;
  for (const g of ph.segs) if (t >= g.t0) s = g;
  if (!s) s = ph.segs[0];
  const tt = Math.min(t, s.t1);
  return { ep: s.ep, t: Math.max(0, s.f0 + (tt - s.t0) * s.rate) };
}

const TITLES = [];
function title(text, at, dur, o = {}) {
  const el = document.createElement('div');
  el.className = 'title ' + (o.cls || '');
  el.style.left = (o.x ?? 140) + 'px'; el.style.top = (o.y ?? 380) + 'px';
  if (o.w) el.style.width = o.w + 'px';
  el.innerHTML = `<span>${text}</span>`;
  $('#titles').appendChild(el);
  const sp = el.querySelector('span');
  tl.to(sp, { transform: 'translateY(0%)', duration: 1.1, ease: 'expo.out' }, at);
  const ex = tl.to(sp, { transform: 'translateY(-115%)', duration: 0.7, ease: 'power3.in' }, at + dur - 0.7);
  // never let two headlines overlap: pull the previous one's exit forward
  const prev = TITLES[TITLES.length - 1];
  if (prev && prev.at + prev.dur > at + .05) {
    const nd = Math.max(1.5, at - prev.at + .05); prev.ex.startTime(prev.at + nd - .7); prev.dur = nd;
    if (nd < 2.5) console.warn('SHORT TITLE', prev.text, nd.toFixed(2), 'at', prev.at.toFixed(1));
  }
  const rec = { text, at, dur, ex }; TITLES.push(rec); (FILM.titles ||= []).push(rec);
  hit(at, 'title', o.g ?? 1);
  return el;
}
const ringBurst = (x, y, at, size = 700, col) => {
  const r = document.createElement('div'); r.className = 'ring'; r.style.cssText = `left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;${col ? 'border-color:' + col : ''}`;
  $('#fx').appendChild(r);
  tl.fromTo(r, { scale: .15, opacity: .9 }, { scale: 1.4, opacity: 0, duration: 1.5, ease: 'power2.out' }, at);
  tl.fromTo(r, { borderWidth: 14 }, { borderWidth: 1, duration: 1.5, ease: 'power2.out' }, at);
};
const flare = (x, y, at) => { const f = document.createElement('div'); f.className = 'flare'; f.style.left = x + 'px'; f.style.top = y + 'px'; $('#fx').appendChild(f);
  tl.fromTo(f, { opacity: 0, scaleX: .1 }, { opacity: 1, scaleX: 1, duration: .25, ease: 'power2.out' }, at).to(f, { opacity: 0, duration: .9 }, at + .25); };
const grade = (at, a, b, glow, gx = '60%', gy = '45%', dur = 2) => {
  tl.to(':root', { '--a': a, '--b': b, '--glow': glow, duration: dur, ease: 'power2.inOut' }, at);
  tl.to('#bg', { '--gx': gx, '--gy': gy, duration: dur }, at);
};
const showPhone = (ph, at, o = {}) => {
  tl.set(ph.pos, { opacity: 1 }, at);
  if (o.from) tl.fromTo(ph.pos, o.from, { ...o.to, duration: o.dur ?? 1.6, ease: o.ease ?? 'expo.out' }, at);
};
const hidePhone = (ph, at, dur = .6) => tl.to(ph.pos, { opacity: 0, duration: dur, ease: 'power2.in' }, at);

// ambient dots
const dotsEl = $('#dots'); const D = [];
for (let i = 0; i < 46; i++) { const e = document.createElement('i'); const s = 4 + rnd() * 12; e.style.cssText = `width:${s}px;height:${s}px;left:${rnd() * 1920}px;top:${rnd() * 1080}px`; dotsEl.appendChild(e); D.push({ e, x: rnd() * 1920, y: rnd() * 1080, v: 8 + rnd() * 22, ph: rnd() * 6, s }); }
function tickFx(t) {
  for (const d of D) { const y = (d.y - t * d.v + 3000) % 1180 - 50; d.e.style.transform = `translate(${Math.sin(t * .3 + d.ph) * 24}px,${y - d.y}px)`; d.e.style.opacity = (.12 + .2 * (.5 + .5 * Math.sin(t * .8 + d.ph))).toFixed(3); }
  for (const p of phones) gsap.set(p.bob, { y: 540 + (p.home.y - 540) + Math.sin(t * .9 + p.bobPh) * p.bobAmp, overwrite: false });
}

// ---------------- map scene (SVG) ----------------
const map = $('#mapwrap');
{
  const W = 2400, H = 1500; let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><defs>
  <filter id="gl"><feGaussianBlur stdDeviation="9"/></filter><radialGradient id="pk"><stop offset="0" stop-color="#2f6a62"/><stop offset="1" stop-color="#1d4a47"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="#0c1b24"/>`;
  for (let gx = 0; gx < 12; gx++) for (let gy = 0; gy < 8; gy++) { const x = 90 + gx * 190 + (gy % 2) * 24, y = 70 + gy * 180; const w = 140 + rnd() * 20, h = 125 + rnd() * 20; const c = rnd() < .12 ? 'url(#pk)' : (rnd() < .5 ? '#13293a' : '#16303f'); svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${c}"/>`; }
  svg += `<g stroke="#1e3b4c" stroke-width="22" fill="none" stroke-linecap="round"><path d="M0 330 L2400 380"/><path d="M0 870 L2400 820"/><path d="M520 0 L560 1500"/><path d="M1300 0 L1260 1500"/><path d="M1900 0 L1950 1500"/></g>`;
  svg += `<path d="M0 1180 C500 1080 900 1300 1500 1180 S2200 1100 2400 1150" stroke="#133a52" stroke-width="64" fill="none" opacity=".8"/>`;
  svg += `<path id="route" d="M420 1040 L560 1038 L556 868 L1262 840 L1268 540 L1300 380 L1900 392" stroke="#7fd6c4" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0"/>`;
  svg += `<path id="routeGlow" d="M420 1040 L560 1038 L556 868 L1262 840 L1268 540 L1300 380 L1900 392" stroke="#7fd6c4" stroke-width="30" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#gl)" opacity="0"/>`;
  svg += `<g id="pinA" opacity="0"><circle cx="420" cy="1040" r="46" fill="#29475B" stroke="#DFEAF1" stroke-width="5"/><path d="M402 1030h36l-4 24h-28z M410 1030v-8a8 8 0 0116 0v8" stroke="#DFEAF1" stroke-width="5" fill="none"/></g>`;
  svg += `<g id="pinB" opacity="0"><circle cx="1900" cy="392" r="46" fill="#376371" stroke="#DFEAF1" stroke-width="5"/><path d="M1878 396l22-20 22 20v22h-44z" stroke="#DFEAF1" stroke-width="5" fill="none"/></g>`;
  svg += `<circle id="runner" cx="420" cy="1040" r="20" fill="#DFEAF1" opacity="0"/><circle id="runnerGlow" cx="420" cy="1040" r="44" fill="#DFEAF1" opacity="0" filter="url(#gl)"/></svg>`;
  map.innerHTML = svg;
}
const route = document.getElementById('route'); const routeLen = route.getTotalLength();
const mapState = { p: 0 };
function mapTick() {
  const p = mapState.p; route.style.opacity = p > 0 ? 1 : 0; const g = document.getElementById('routeGlow'); g.style.opacity = p > 0 ? .75 : 0;
  const dash = `${routeLen * p} ${routeLen}`; route.style.strokeDasharray = dash; g.style.strokeDasharray = dash;
  const pt = route.getPointAtLength(routeLen * p); const r = document.getElementById('runner'), rg = document.getElementById('runnerGlow');
  for (const e of [r, rg]) { e.setAttribute('cx', pt.x); e.setAttribute('cy', pt.y); e.style.opacity = p > 0 && p < 1.001 ? 1 : 0; }
}

// ---------------- QR graphic ----------------
const qr = $('#qr'); { const n = 25; let s = `<svg width="300" height="300" viewBox="0 0 ${n} ${n}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">`;
  const fin = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#DFEAF1"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#0b1a22"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#DFEAF1"/>`;
  s += fin(0, 0) + fin(n - 7, 0) + fin(0, n - 7);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { if ((x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)) continue; if (rnd() < .48) s += `<rect class="qc" x="${x}" y="${y}" width="1" height="1" fill="#DFEAF1"/>`; }
  s += `</svg><div id="qscan" style="position:absolute;left:-30px;right:-30px;top:0;height:10px;border-radius:5px;background:linear-gradient(90deg,transparent,#7fd6c4,transparent);box-shadow:0 0 30px 8px rgba(127,214,196,.7);opacity:0"></div>`; qr.innerHTML = s; }

// ====================================================================
//  0 ── ident: the dot bounces, then lands on the i
// ====================================================================
tl.set('#fade', { opacity: 1 }, 0);
{
  const bd = document.createElement('div'); bd.style.cssText = 'position:absolute;width:76px;height:76px;border-radius:50%;background:#DFEAF1;box-shadow:0 0 90px rgba(223,234,241,.7);left:922px;top:502px;opacity:0;z-index:30'; $('#fx').appendChild(bd);
  tl.set(bd, { opacity: 1 }, 1.0);
  tl.to('#fade', { opacity: 0, duration: 1.2 }, .6);
  const bounce = (t, peak, dur) => { tl.to(bd, { y: -peak, duration: dur / 2, ease: 'power2.out' }, t).to(bd, { y: 0, duration: dur / 2, ease: 'power2.in' }, t + dur / 2);
    tl.to(bd, { scaleX: 1.25, scaleY: .75, duration: .08, ease: 'power1.out' }, t + dur - .02).to(bd, { scaleX: 1, scaleY: 1, duration: .25, ease: 'elastic.out(1,.5)' }, t + dur + .06); hit(t + dur, 'bounce', .6 + peak / 700); };
  bounce(1.4, 150, .75); bounce(2.5, 260, .95); bounce(3.9, 400, 1.15);
  tl.to(bd, { y: -700, duration: .7, ease: 'power2.out' }, 5.4);
  tl.set(bd, { opacity: 0 }, 6.1);
  tl.set('#wm', { opacity: 1 }, 6.0);
  tl.set('#wmdot', { opacity: 0 }, 0);
  tl.fromTo('#wm img', { opacity: 0, scale: .9 }, { opacity: 1, scale: 1, duration: 1.6, ease: 'power3.out' }, 6.0);
  tl.fromTo('#wmdot', { y: -900, opacity: 1 }, { y: 0, duration: .9, ease: 'bounce.out' }, 6.5);
  hit(6.9, 'logo', 1.4); flare(960, 540, 7.1);
  tl.to('#wm', { scale: 1.05, duration: 5, ease: 'none' }, 7);
  tl.to('#wm', { opacity: 0, duration: .9 }, 11.4);
}
const T1 = 12.4;

const scenes = await import('./scenes2.js');
scenes.build({ T1, tl, gsap, mkPhone, seg, F, title, ringBurst, flare, grade, showPhone, hidePhone, hit, BAR, BEAT, mapState, route, routeLen, qr, FILM, rnd, MK });

FILM.duration = tl.duration();
for (const r of TITLES) if (r.dur < 2.5) console.warn('SHORT TITLE', r.text, r.dur.toFixed(2), 'at', r.at.toFixed(1));
window.FILM = FILM;

// ---------------- seek API ----------------
window.seek = async (t) => {
  tl.time(t, false); tickFx(t); mapTick();
  const waits = [];
  for (const p of phones) {
    const op = parseFloat(getComputedStyle(p.pos).opacity);
    const a = footAt(p, t);
    if (!a || op < .01) continue;
    for (const [ep, v] of Object.entries(p.vid)) v.style.display = ep === a.ep ? 'block' : 'none';
    const v = p.vid[a.ep];
    if (Math.abs(v.currentTime - a.t) > 0.01) { v.currentTime = a.t; waits.push(new Promise(r => { const f = () => { v.removeEventListener('seeked', f); r(); }; v.addEventListener('seeked', f); setTimeout(r, 2500); })); }
  }
  await Promise.all(waits);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
};
const all = phones.flatMap(p => Object.values(p.vid));
await Promise.all(all.map(v => new Promise(r => { if (v.readyState >= 2) r(); else v.addEventListener('loadeddata', r, { once: true }); setTimeout(r, 6000); })));
window.__ready = true;
