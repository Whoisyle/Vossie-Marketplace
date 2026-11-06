// Vossie launch film engine: fully seekable. Three.js phone + GSAP master timeline + DOM titles.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makePhone } from './phone.js';

const $ = s => document.querySelector(s);
const st = $('#stage');
function fit() { const s = Math.min(innerWidth / 1920, innerHeight / 1080); st.style.transform = `scale(${s})`; st.style.left = (innerWidth - 1920 * s) / 2 + 'px'; st.style.top = (innerHeight - 1080 * s) / 2 + 'px'; }
addEventListener('resize', fit); fit();

// ---------------- WebGL ----------------
const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
R.setPixelRatio(1); R.setSize(1920, 1080); R.setClearColor(0x000000, 0);
R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = .95; R.outputColorSpace = THREE.SRGBColorSpace;
$('#gl').appendChild(R.domElement);
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(), .03).texture;
const cam = new THREE.PerspectiveCamera(24, 1920 / 1080, 1, 3000);
const key = new THREE.DirectionalLight(0xfff3e6, 1.1); key.position.set(-220, 260, 320); scene.add(key);
const rim = new THREE.DirectionalLight(0x9fc4d8, 1.4); rim.position.set(260, 120, -240); scene.add(rim);

// ---------------- screen canvas ----------------
const SC = document.createElement('canvas'); SC.width = 786; SC.height = 1704;
const sx = SC.getContext('2d');
const tex = new THREE.CanvasTexture(SC); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
const phone = makePhone({ canvasTex: tex }); scene.add(phone);

const video = document.createElement('video'); video.muted = true; video.playsInline = true; video.preload = 'auto';
video.src = `/out/${new URLSearchParams(location.search).get('story') || 'story'}/footage.mp4`; video.style.display = 'none'; document.body.appendChild(video);

// ---------------- state tweened by the timeline ----------------
const P = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, o: 1, on: 1 };
const C = { x: 0, y: 0, z: 560, lx: 0, ly: 0, fov: 24, roll: 0 };
const FILM = { hits: [], duration: 0, titles: [], scenes: {} };
const hit = (t, type, g = 1) => FILM.hits.push({ t, type, g });
const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });

// footage + ui segments
const SEGS = [], UIS = [];
const seg = (t0, t1, f0, rate = 1) => SEGS.push({ t0, t1, f0, rate });
const ui = (t0, t1, name, o = {}) => UIS.push({ t0, t1, name, o });
const footT = t => { let s = null; for (const g of SEGS) if (t >= g.t0 && t < g.t1) s = g; if (!s) return null; return Math.max(0, s.f0 + (t - s.t0) * s.rate); };
const uiAt = t => UIS.find(u => t >= u.t0 && t < u.t1);

// ---------------- UI screens drawn on the phone (call screen etc.) ----------------
function handset(c, x, y, k, deg) {
  c.save(); c.translate(x, y); c.rotate(deg * Math.PI / 180); c.scale(k, k);
  c.fillStyle = '#fff'; c.beginPath();
  c.moveTo(-40, -22); c.quadraticCurveTo(-50, -34, -34, -40); c.lineTo(-18, -40); c.quadraticCurveTo(-10, -38, -12, -28);
  c.lineTo(-14, -14); c.quadraticCurveTo(-12, -8, -4, 0); c.quadraticCurveTo(4, 8, 14, 12); c.lineTo(28, 10);
  c.quadraticCurveTo(38, 8, 40, 16); c.lineTo(40, 32); c.quadraticCurveTo(36, 48, 22, 44);
  c.quadraticCurveTo(-34, 30, -40, -22); c.closePath(); c.fill(); c.restore();
}
const UI = {
  call(c, t, o) {
    const W = 786, H = 1704, k = t - o.t0;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2b3a47'); g.addColorStop(1, '#0c1218'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const connected = k > o.answerAt;
    c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '600 34px "Segoe UI",Arial'; c.fillText('Vossie courier', W / 2, 260);
    c.fillStyle = '#fff'; c.font = '600 84px "Segoe UI",Arial'; c.fillText(o.name || 'Tebogo', W / 2, 360);
    c.fillStyle = 'rgba(255,255,255,.65)'; c.font = '400 38px "Segoe UI",Arial';
    const secs = Math.max(0, k - o.answerAt);
    c.fillText(connected ? `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}` : 'mobile', W / 2, 424);
    if (!connected) for (let i = 0; i < 3; i++) { const p = ((k * .8 + i / 3) % 1); c.strokeStyle = `rgba(223,234,241,${.35 * (1 - p)})`; c.lineWidth = 3; c.beginPath(); c.arc(W / 2, 760, 150 + p * 150, 0, 7); c.stroke(); }
    c.fillStyle = '#376371'; c.beginPath(); c.arc(W / 2, 760, 150, 0, 7); c.fill();
    c.fillStyle = '#DFEAF1'; c.font = '700 120px "Segoe UI",Arial'; c.fillText('TK', W / 2, 800);
    c.fillStyle = 'rgba(255,255,255,.8)'; c.font = '500 40px "Segoe UI",Arial';
    c.fillText(connected ? '"I am outside the library."' : 'is at your pickup spot', W / 2, 1060);
    const by = 1400;
    if (!connected) {
      c.fillStyle = '#e5453a'; c.beginPath(); c.arc(220, by, 92, 0, 7); c.fill(); handset(c, 220, by, 1, 135);
      const pulse = 1 + .05 * Math.sin(k * 8); c.fillStyle = '#34c759'; c.beginPath(); c.arc(566, by, 92 * pulse, 0, 7); c.fill(); handset(c, 566, by, 1, 0);
      c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '500 32px "Segoe UI",Arial'; c.fillText('Decline', 220, by + 160); c.fillText('Accept', 566, by + 160);
    } else {
      c.fillStyle = '#e5453a'; c.beginPath(); c.arc(W / 2, by, 92, 0, 7); c.fill(); handset(c, W / 2, by, 1, 135);
    }
    c.fillStyle = '#fff'; c.font = '700 34px "Segoe UI",Arial'; c.textAlign = 'left'; c.fillText('4:12', 70, 70);
  }
};

// ---------------- draw one frame ----------------
async function drawScreen(t) {
  const u = uiAt(t), f = footT(t);
  sx.fillStyle = '#000'; sx.fillRect(0, 0, 786, 1704);
  if (u) UI[u.name](sx, t, { ...u.o, t0: u.t0 });
  else if (f !== null) {
    if (Math.abs(video.currentTime - f) > 0.004) {
      await new Promise(res => { const d = () => { video.removeEventListener('seeked', d); res(); }; video.addEventListener('seeked', d); video.currentTime = f; setTimeout(res, 3000); });
    }
    // leave a status-bar band under the Dynamic Island: fill it with the page's own top colour, then draw the app below it
    const BAND = 64;
    sx.drawImage(video, 0, 0, 786, 1704);
    const px = sx.getImageData(40, 6, 1, 1).data;
    sx.fillStyle = `rgb(${px[0]},${px[1]},${px[2]})`; sx.fillRect(0, 0, 786, 1704);
    sx.drawImage(video, 0, BAND, 786, 1704 - BAND);
  }
  if (P.on < 1) { sx.fillStyle = `rgba(0,0,0,${1 - P.on})`; sx.fillRect(0, 0, 786, 1704); }
  tex.needsUpdate = true;
}
function setOpacity(o) {
  phone.traverse(m => {
    if (!m.material) return;
    if (m.userData.baseOp === undefined) m.userData.baseOp = m.material.opacity ?? 1;
    m.material.transparent = o < .999 || m.userData.baseOp < .999;
    m.material.opacity = m.userData.baseOp * o;
  });
}
function place(t) {
  const sway = Math.sin(t * .8) * .018, bob = Math.sin(t * 1.1) * 1.4;
  phone.position.set(P.x, P.y + bob, P.z); phone.rotation.set(P.rx + sway * .6, P.ry + sway, P.rz); phone.scale.setScalar(P.s); phone.visible = P.o > .01;
  setOpacity(P.o);
  cam.fov = C.fov; cam.updateProjectionMatrix(); cam.position.set(C.x, C.y, C.z); cam.up.set(Math.sin(C.roll), Math.cos(C.roll), 0); cam.lookAt(C.lx, C.ly, 0);
}

// ---------------- ambient dots ----------------
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const D = []; for (let i = 0; i < 40; i++) { const e = document.createElement('i'); const sz = 3 + rnd() * 9; const top = rnd() * 1080; e.style.cssText = `width:${sz}px;height:${sz}px;left:${rnd() * 1920}px;top:${top}px`; $('#dots').appendChild(e); D.push({ e, top, y: rnd() * 1180, v: 6 + rnd() * 16, ph: rnd() * 6 }); }
function tickFx(t) { for (const d of D) { const y = (d.y - t * d.v + 4000) % 1180 - 50; d.e.style.transform = `translate(${Math.sin(t * .3 + d.ph) * 20}px,${y - d.top}px)`; d.e.style.opacity = (.08 + .14 * (.5 + .5 * Math.sin(t * .8 + d.ph))).toFixed(3); } }

// ---------------- helpers for scenes ----------------
function title(text, at, dur, o = {}) {
  const el = document.createElement('div'); el.className = 'title ' + (o.size || 'big');
  el.style.left = (o.x ?? 120) + 'px'; el.style.top = (o.y ?? 400) + 'px'; if (o.w) el.style.width = o.w + 'px';
  el.innerHTML = `<span>${text}</span>`; $('#titles').appendChild(el);
  const sp = el.querySelector('span');
  tl.to(sp, { transform: 'translateY(0%)', duration: 1.0, ease: 'expo.out' }, at);
  tl.to(sp, { transform: 'translateY(-118%)', duration: .65, ease: 'power3.in' }, at + dur - .65);
  if (o.sub) {
    const subEl = document.createElement('div'); subEl.className = 'sub'; subEl.style.left = (o.x ?? 120) + 'px'; subEl.style.top = ((o.y ?? 400) + (o.subDy ?? 130)) + 'px'; subEl.textContent = o.sub; $('#titles').appendChild(subEl);
    tl.fromTo(subEl, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .9 }, at + .35); tl.to(subEl, { opacity: 0, duration: .5 }, at + dur - .6);
  }
  FILM.titles.push({ text, at, dur }); hit(at, 'title', o.g ?? 1); return el;
}
function pill(text, at, dur, o = {}) {
  const el = document.createElement('div'); el.className = 'pill'; el.style.left = (o.x ?? 120) + 'px'; el.style.top = (o.y ?? 300) + 'px'; el.innerHTML = `<i></i>${text}`; $('#titles').appendChild(el);
  tl.fromTo(el, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: .8 }, at); tl.to(el, { opacity: 0, duration: .5 }, at + dur - .5);
}
const flare = (x, y, at) => { const f = document.createElement('div'); f.className = 'flare'; f.style.left = x + 'px'; f.style.top = y + 'px'; $('#fx').appendChild(f); tl.fromTo(f, { opacity: 0, scaleX: .1 }, { opacity: 1, scaleX: 1, duration: .25 }, at).to(f, { opacity: 0, duration: .9 }, at + .25); };
const grade = (at, a, b, glow, gx = '62%', gy = '45%', dur = 2) => { tl.to(':root', { '--a': a, '--b': b, '--glow': glow, duration: dur, ease: 'power2.inOut' }, at); tl.to('#bg', { '--gx': gx, '--gy': gy, duration: dur }, at); };
const camTo = (at, dur, v, ease = 'power3.inOut') => tl.to(C, { ...v, duration: dur, ease }, at);
const phTo = (at, dur, v, ease = 'power3.inOut') => tl.to(P, { ...v, duration: dur, ease }, at);

const ctx = { tl, gsap, P, C, seg, ui, title, pill, flare, grade, camTo, phTo, hit, FILM, rnd, $, BEAT: 60 / 90 };
const scenes = await import('./scenes.js'); await scenes.build(ctx);
FILM.duration = tl.duration();

// ---------------- seek API ----------------
window.FILM = FILM;
window.seek = async t => { tl.time(t, false); tickFx(t); place(t); await drawScreen(t); R.render(scene, cam); };
await new Promise(r => { if (video.readyState >= 2) r(); else { video.addEventListener('loadeddata', r, { once: true }); setTimeout(r, 15000); } });
window.__ready = true;
