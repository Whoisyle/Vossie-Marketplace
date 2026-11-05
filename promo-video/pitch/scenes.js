// Scenes 2..end of the Vossie launch film. Film time is seconds; footage windows are picked with F(mark, offset).
export function build(c) {
  const { tl, gsap, mkPhone, seg, F, title, ringBurst, flare, grade, showPhone, hidePhone, hit, BAR, BEAT, T2, hero, mapState, qr, FILM, rnd } = c;
  const $ = s => document.querySelector(s);
  const fx = $('#fx');
  const set = (ph, at, v) => tl.set(ph.pos, v, at);
  const to = (ph, at, v, dur = 1.6, ease = 'power3.inOut') => tl.to(ph.pos, { ...v, duration: dur, ease }, at);
  const pop = (ph, at, from, v, dur = 1.8, ease = 'expo.out') => { tl.set(ph.pos, { opacity: 1 }, at); tl.fromTo(ph.pos, from, { ...v, duration: dur, ease }, at); };
  const out = (ph, at, v = {}, dur = .9) => { tl.to(ph.pos, { ...v, opacity: 0, duration: dur, ease: 'power3.in' }, at); };
  const counter = (at, dur, from, to, fmt, el) => { const o = { v: from }; tl.to(o, { v: to, duration: dur, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v); } }, at); };
  const mkBig = (html, css) => { const e = document.createElement('div'); e.className = 'big'; e.style.cssText = css; e.innerHTML = html; fx.appendChild(e); return e; };

  // ───────────────────────── WATCH (reels) ─────────────────────────
  let t = T2;
  seg(hero, t, t + 14, F('sec:buyer-reels', 1.2), 1);
  to(hero, t, { x: 960, scale: 1.12, rotateY: 360 - 2, rotateX: 0 }, 2.2, 'power3.inOut');
  title('Watch.', t + .6, 6.4, { x: 150, y: 420 });
  hit(t + .6, 'whoosh', .8);
  to(hero, t + 6, { rotateY: 360 + 14, rotateZ: -3, scale: 1.2, duration: 3 }, 3.4, 'sine.inOut');
  const TE = t + 14;

  // ───────────────────────── EARN (points · wallet · subscriptions) ─────────────────────────
  t = TE;
  grade(t, '#14110c', '#2d2113', '#b87a3a', '45%', '50%', 2);
  to(hero, t, { x: 290, y: 20, scale: .9, rotateY: 360 - 28, rotateZ: 0, rotateX: 0 }, 1.8, 'power3.inOut');
  seg(hero, t, t + 30, F('sec:buyer-account', 2.0), 1);
  const e1 = mkPhone('e1', { bob: 12 }), e2 = mkPhone('e2', { bob: 14 });
  seg(e1, t, t + 40, F('sec:buyer-account', 8.0), 1);
  seg(e2, t, t + 40, F('sec:buyer-account', 17.0), 1);
  pop(e1, t + .9, { x: 1500, y: 80, rotateY: 150, rotateZ: 12, scale: .7 }, { x: 960, y: -10, rotateY: 360 - 6, rotateZ: 0, scale: .9 }, 2.4);
  pop(e2, t + 1.4, { x: 1800, y: 200, rotateY: 150, rotateZ: 12, scale: .7 }, { x: 1560 - 960 + 100, y: 40, rotateY: 360 + 18, rotateZ: 0, scale: .84 }, 2.4);
  hit(t + 1.0, 'whoosh', .8); hit(t + 1.5, 'whoosh', .7);
  title('Earn.', t + 1.8, 6.5, { x: 120, y: 700, cls: 'sm' });
  // fan out + float
  to(hero, t + 7, { x: 150, rotateY: 360 - 38 }, 5, 'sine.inOut');
  to(e1, t + 7, { x: 640, y: -30, rotateY: 360 - 8, scale: .95 }, 5, 'sine.inOut');
  to(e2, t + 7, { x: 1150, rotateY: 360 + 28 }, 5, 'sine.inOut');
  title('Save.', t + 9.4, 5.8, { x: 120, y: 700, cls: 'sm' });
  ringBurst(960, 540, t + 8, 900, '#e0a867'); flare(960, 540, t + 8);
  // gather back into hero
  out(e1, t + 15.5, { x: 400, scale: .6, rotateY: 330 }, 1); out(e2, t + 15.5, { x: 1500, scale: .6, rotateY: 400 }, 1);
  const TP = t + 17;

  // ───────────────────────── PAY ─────────────────────────
  t = TP;
  grade(t, '#0b1a22', '#14323f', '#376371', '58%', '48%', 2);
  seg(hero, t, t + 40, F('sec:buyer-checkout', 1.5), 1);
  to(hero, t, { x: 360, y: 0, scale: 1.02, rotateY: 360 - 16, rotateZ: 0 }, 2.4, 'power3.inOut');
  title('Pay.', t + .8, 8, { x: 150, y: 400, cls: 'xl' });
  // push to the sheet when payment is requested
  const paySheet = F('paid', -11) - F('sec:buyer-checkout', 1.5);
  to(hero, t + Math.max(4, paySheet - .5), { scale: 1.45, x: 330, y: 40, rotateY: 360 - 6 }, 2.2, 'power2.inOut');
  const paid = t + Math.max(7, F('paid', -1.5) - F('sec:buyer-checkout', 1.5));
  ringBurst(1330, 540, paid, 820, '#7fd6c4'); ringBurst(1330, 540, paid + .25, 560, '#DFEAF1'); flare(1330, 540, paid); hit(paid, 'success', 1.4);
  to(hero, paid + .4, { scale: 1.05, x: 360, rotateY: 360 - 14 }, 2.4, 'power2.inOut');
  const TT = paid + 5.5;

  // ───────────────────────── TRACK (map) ─────────────────────────
  t = TT;
  seg(hero, t, t + 30, F('sec:buyer-track', 1.0), 1);
  tl.to('#map', { opacity: 1, duration: 1.6 }, t);
  tl.fromTo('#mapwrap', { rotateX: 62, rotateZ: -24, scale: 1.1, x: -150, y: 100 }, { rotateX: 56, rotateZ: -16, scale: 1.0, x: -200, y: 50, duration: 14, ease: 'sine.inOut' }, t);
  to(hero, t, { x: -520, y: 30, scale: .78, rotateY: 360 + 20, rotateX: 4 }, 2.4, 'power3.inOut');
  tl.set('#pinA,#pinB', { opacity: 0 }, t - 1);
  tl.to('#pinA', { opacity: 1, duration: .6 }, t + 1.2); tl.to('#pinB', { opacity: 1, duration: .6 }, t + 1.8);
  tl.to(mapState, { p: 1, duration: 7.6, ease: 'power1.inOut' }, t + 2.4);
  title('Track.', t + .8, 9, { x: 1080, y: 150, cls: 'sm' });
  ringBurst(1100, 480, t + 10.0, 600, '#7fd6c4'); hit(t + 10, 'success', .9);
  tl.to('#map', { opacity: 0, duration: 1.2 }, t + 12.6);
  out(hero, t + 12.6, { x: -900, rotateY: 330 }, 1.2);
  const TS = t + 13.4;

  // ═════════════════════════ SELLER ═════════════════════════
  t = TS;
  grade(t, '#071c1a', '#0f3a37', '#2f8a7a', '40%', '50%', 2.4);
  const sA = mkPhone('sA', { bob: 10 }), sB = mkPhone('sB', { bob: 12 }), sC = mkPhone('sC', { bob: 9 });
  // the hero comes back flipped (back of phone), turns around to the seller app
  pop(hero, t, { x: 360, y: 700, rotateY: 180, rotateX: -10, rotateZ: 10, scale: .8 }, { x: 360, y: 0, rotateY: 180 + 180 - 18, rotateX: 3, rotateZ: 0, scale: 1 }, 3.6, 'expo.out');
  seg(hero, t, t + 40, F('sec:seller-setup', 0.5), 1);
  hit(t + .3, 'whoosh', 1.2); hit(t + 3.2, 'impact', 1);
  title('Sell.', t + 1.6, 6.4, { x: 140, y: 400, cls: 'xl' });
  // set-up montage: verify · store · location
  seg(sA, t, t + 40, F('sec:seller-setup', 14), 1); seg(sB, t, t + 40, F('sec:seller-setup', 24), 1); seg(sC, t, t + 40, F('sec:seller-setup', 34), 1);
  to(hero, t + 7.4, { x: -460, scale: .72, rotateY: 360 - 24 }, 2.2, 'power3.inOut');
  pop(sA, t + 8.2, { x: 200, y: 900, rotateY: 330, scale: .5 }, { x: -40, y: -20, rotateY: 360 - 18, scale: .78 }, 2.2);
  pop(sB, t + 8.9, { x: 700, y: 900, rotateY: 330, scale: .5 }, { x: 420, y: 20, rotateY: 360 - 4, scale: .78 }, 2.2);
  pop(sC, t + 9.6, { x: 1200, y: 900, rotateY: 330, scale: .5 }, { x: 880, y: -20, rotateY: 360 + 14, scale: .78 }, 2.2);
  hit(t + 8.4, 'whoosh', .7); hit(t + 9.1, 'whoosh', .7); hit(t + 9.8, 'whoosh', .7);
  ringBurst(960, 540, t + 14, 1000, '#7fd6c4'); flare(960, 540, t + 14); hit(t + 14, 'success', 1);
  out(sA, t + 16, { y: -200 }, 1); out(sB, t + 16.2, { y: -200 }, 1); out(sC, t + 16.4, { y: -200 }, 1); out(hero, t + 16, { x: -900 }, 1.1);
  const TO = t + 17.4;

  // ───────── orders: buyer phone → seller phone ─────────
  t = TO;
  const buyerP = mkPhone('buyerP', { bob: 10 }), sellerP = mkPhone('sellerP', { bob: 12 });
  seg(buyerP, t, t + 30, F('paid', -2.5), 1);
  seg(sellerP, t, t + 45, F('sec:seller-orders', 0.5), 1);
  pop(buyerP, t, { x: -900, y: 100, rotateY: 150, scale: .6 }, { x: -430, y: 0, rotateY: 360 + 20, scale: .86 }, 2.4);
  pop(sellerP, t + .5, { x: 1900, y: 100, rotateY: 210, scale: .6 }, { x: 430, y: 0, rotateY: 360 - 20, scale: .86 }, 2.4);
  hit(t + .2, 'whoosh', .9);
  title('Fulfil.', t + 1.4, 7, { x: 650, y: 790, cls: 'sm' });
  // glowing handoff dot on an arc between phones
  const arc = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); arc.setAttribute('width', 1920); arc.setAttribute('height', 1080); arc.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  arc.innerHTML = '<path id="arcp" d="M 620 470 C 800 120, 1120 120, 1300 470" stroke="#7fd6c4" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="1200" stroke-dashoffset="1200" opacity=".9"/><circle id="arcdot" r="18" fill="#DFEAF1" cx="620" cy="470" opacity="0"/>';
  fx.appendChild(arc);
  const arcp = arc.querySelector('#arcp'); const arcdot = arc.querySelector('#arcdot'); const aL = arcp.getTotalLength(); const ao = { p: 0 };
  tl.to(ao, { p: 1, duration: 2.2, ease: 'power2.inOut', onUpdate: () => { arcp.style.strokeDashoffset = aL * (1 - ao.p); const q = arcp.getPointAtLength(aL * ao.p); arcdot.setAttribute('cx', q.x); arcdot.setAttribute('cy', q.y); arcdot.style.opacity = ao.p > 0 && ao.p < 1 ? 1 : 0; } }, t + 2.2);
  ringBurst(1300, 470, t + 4.4, 520, '#7fd6c4'); hit(t + 4.4, 'ping', 1);
  tl.to(arc, { opacity: 0, duration: .8 }, t + 6);
  // seller takes over
  out(buyerP, t + 6.2, { x: -900 }, 1.2);
  to(sellerP, t + 6.2, { x: 360, scale: 1.1, rotateY: 360 - 12 }, 2.4);
  title('Accept.', t + 7.4, 5.4, { x: 140, y: 400, cls: 'sm' });
  to(sellerP, t + 13, { scale: 1.45, x: 330, y: 50, rotateY: 360 - 5 }, 2.4, 'power2.inOut');
  to(sellerP, t + 19, { scale: 1.05, x: 360, y: 0, rotateY: 360 - 14 }, 2.4, 'power2.inOut');
  title('Hand over.', t + 19.2, 5.4, { x: 140, y: 400, cls: 'sm' });
  ringBurst(1330, 540, t + 24.5, 700, '#7fd6c4'); hit(t + 24.5, 'success', 1);

  // ───────── payout ─────────
  const TPay = t + 26;
  t = TPay;
  seg(sellerP, t, t + 30, F('sec:seller-payout', 0.5), 1);
  title('Get paid.', t + .6, 8, { x: 140, y: 400, cls: 'sm' });
  const cnt = mkBig('R 1 245', 'left:140px;top:640px;font-size:120px;color:#DFEAF1;opacity:0;letter-spacing:-4px');
  tl.to(cnt, { opacity: 1, duration: .8 }, t + 1.4);
  counter(t + 5.2, 3.2, 1245, 0, v => 'R ' + Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '), cnt);
  to(sellerP, t + 4, { scale: 1.4, x: 330, y: 40 }, 2.4, 'power2.inOut');
  ringBurst(1330, 540, t + 8.6, 740, '#DFEAF1'); hit(t + 8.6, 'success', 1.1);
  tl.to(cnt, { opacity: 0, duration: .8 }, t + 10.2);
  out(sellerP, t + 11, { rotateY: 330, x: -700 }, 1.2);
  const TC = t + 12;

  // ═════════════════════════ COURIER ═════════════════════════
  t = TC;
  grade(t, '#0a1022', '#16224a', '#5a74c4', '42%', '50%', 2.4);
  const cA = mkPhone('cA', { bob: 10 }), cB = mkPhone('cB', { bob: 12 }), cC = mkPhone('cC', { bob: 9 });
  pop(hero, t, { x: 360, y: 760, rotateY: 180, rotateX: -12, rotateZ: -10, scale: .8 }, { x: 360, y: 0, rotateY: 180 + 180 + 16, rotateX: 3, rotateZ: 0, scale: 1 }, 3.6, 'expo.out');
  seg(hero, t, t + 70, F('sec:courier-setup', 0.8), 1);
  hit(t + .3, 'whoosh', 1.2); hit(t + 3.2, 'impact', 1);
  title('Deliver.', t + 1.6, 6.6, { x: 140, y: 400, cls: 'sm' });
  seg(cA, t, t + 40, F('sec:courier-setup', 12), 1); seg(cB, t, t + 40, F('sec:courier-setup', 22), 1); seg(cC, t, t + 40, F('sec:courier-setup', 40), 1);
  to(hero, t + 7.4, { x: -470, scale: .72, rotateY: 360 + 22 }, 2.2, 'power3.inOut');
  pop(cA, t + 8.2, { x: 200, y: 900, rotateY: 330, scale: .5 }, { x: -40, y: -20, rotateY: 360 - 18, scale: .78 }, 2.2);
  pop(cB, t + 8.9, { x: 700, y: 900, rotateY: 330, scale: .5 }, { x: 420, y: 20, rotateY: 360 - 4, scale: .78 }, 2.2);
  pop(cC, t + 9.6, { x: 1200, y: 900, rotateY: 330, scale: .5 }, { x: 880, y: -20, rotateY: 360 + 14, scale: .78 }, 2.2);
  hit(t + 8.4, 'whoosh', .7); hit(t + 9.1, 'whoosh', .7); hit(t + 9.8, 'whoosh', .7);
  ringBurst(960, 540, t + 14, 1000, '#9bb0ec'); flare(960, 540, t + 14); hit(t + 14, 'success', 1);
  out(cA, t + 16, { y: -200 }, 1); out(cB, t + 16.2, { y: -200 }, 1); out(cC, t + 16.4, { y: -200 }, 1); out(hero, t + 16, { x: -900 }, 1.1);
  const TL = t + 17.4;

  // ───────── go live ─────────
  t = TL;
  const cour = mkPhone('cour', { bob: 8 });
  seg(cour, t, t + 60, F('sec:courier-live', 0.5), 1);
  pop(cour, t, { x: 360, y: 900, rotateY: 220, rotateX: 14, scale: .7 }, { x: 360, y: 0, rotateY: 360 - 14, rotateX: 3, scale: 1.05 }, 3);
  title('Go live.', t + 1.4, 6.4, { x: 140, y: 400, cls: 'sm' });
  const livePulse = F('offer', -4.0) - F('sec:courier-live', 0.5);
  ringBurst(1330, 330, t + Math.max(4, livePulse), 600, '#9bb0ec'); ringBurst(1330, 330, t + Math.max(4, livePulse) + .4, 900, '#9bb0ec'); hit(t + Math.max(4, livePulse), 'ping', 1);
  const offerT = t + Math.max(7, F('offer', 0) - F('sec:courier-live', 0.5));
  to(cour, offerT - .5, { scale: 1.3, x: 340, y: 20, rotateY: 360 - 6 }, 2.2, 'power2.inOut');
  ringBurst(1330, 540, offerT + 2.6, 760, '#9bb0ec'); hit(offerT + 2.6, 'success', 1);

  // ───────── pickup with QR scan ─────────
  t = offerT + 5.5;
  const pickup = F('sec:courier-live', 0.5) + (t - TL);   // continue footage from here
  const sP = mkPhone('sP', { bob: 9 });
  seg(sP, t, t + 20, F('sec:seller-orders', 24), 1);
  to(cour, t, { x: 520, scale: .86, rotateY: 360 - 18 }, 2.2, 'power3.inOut');
  pop(sP, t + .4, { x: -900, y: 80, rotateY: 150, scale: .6 }, { x: -520, y: 0, rotateY: 360 + 18, scale: .86 }, 2.4);
  title('Scan.', t + 1.4, 6.4, { x: 700, y: 120, cls: 'sm' });
  tl.set(qr, { left: 810, top: 390, rotate: 0 }, t); tl.to(qr, { opacity: 1, scale: 1, duration: 1, ease: 'back.out(1.6)' }, t + 2.2); tl.fromTo(qr, { scale: .5 }, { scale: 1, duration: 1, ease: 'back.out(1.6)' }, t + 2.2);
  const scanner = qr.querySelector('#qscan');
  tl.set(scanner, { opacity: 1 }, t + 3.4);
  tl.fromTo(scanner, { y: 0 }, { y: 292, duration: 1.4, ease: 'power1.inOut', repeat: 1, yoyo: true }, t + 3.4);
  tl.to(scanner, { opacity: 0, duration: .2 }, t + 6.2);
  tl.to(qr.querySelectorAll('.qc'), { fill: '#7fd6c4', duration: .6, stagger: { amount: .6, from: 'random' } }, t + 6.1);
  ringBurst(960, 540, t + 6.9, 640, '#7fd6c4'); hit(t + 3.4, 'scan', 1); hit(t + 6.9, 'success', 1.2);
  tl.to(qr, { opacity: 0, scale: .6, duration: .8 }, t + 8.4);
  out(sP, t + 8.4, { x: -900 }, 1.1);
  to(cour, t + 8.6, { x: 360, scale: 1.05, rotateY: 360 - 12 }, 2.4);

  // ───────── the ride ─────────
  t = t + 10.6; const TRIDE = t;
  grade(t, '#0a1022', '#16224a', '#5a74c4', '55%', '50%', 1.2);
  tl.to('#map', { opacity: 1, duration: 1.6 }, t);
  tl.fromTo('#mapwrap', { rotateX: 64, rotateZ: -22, scale: 1.1, x: -150, y: 100 }, { rotateX: 54, rotateZ: -14, scale: 1.0, x: -200, y: 40, duration: 16, ease: 'sine.inOut' }, t);
  tl.set('#pinA,#pinB', { opacity: 1 }, t + .5);
  // courier phone: fast-forward the arrival wait
  const rs = F('rampStart', 0), re = F('rampEnd', 0);
  seg(cour, t, t + 20, Math.max(0, rs - 1), 8);
  to(cour, t, { x: -560, y: 20, scale: .74, rotateY: 360 + 20 }, 2.4, 'power3.inOut');
  tl.to(mapState, { p: 0, duration: .001 }, t);
  tl.to(mapState, { p: 1, duration: 9.5, ease: 'power1.inOut' }, t + 1.4);
  title('Ride.', t + .8, 10, { x: 1100, y: 140, cls: 'sm' });
  ringBurst(1100, 480, t + 11.2, 700, '#9bb0ec'); hit(t + 11.2, 'success', 1);
  tl.to('#map', { opacity: 0, duration: 1.2 }, t + 13.4);
  // delivery + earnings
  const dl = t + 12.6;
  seg(cour, dl, dl + 40, re + 0.3, 1);
  to(cour, dl, { x: 360, y: 0, scale: 1.08, rotateY: 360 - 12 }, 2.4);
  title('Delivered.', dl + .8, 7, { x: 140, y: 400, cls: 'sm' });
  const earn = mkBig('+ R 24', 'left:150px;top:660px;font-size:130px;color:#DFEAF1;opacity:0;letter-spacing:-4px');
  tl.to(earn, { opacity: 1, duration: .8 }, dl + 3.2);
  counter(dl + 3.2, 2.2, 0, 24, v => '+ R ' + Math.round(v), earn);
  ringBurst(1330, 540, dl + 5, 760, '#7fd6c4'); hit(dl + 5, 'success', 1.2);
  tl.to(earn, { opacity: 0, duration: .7 }, dl + 8.6);
  title('Cash out.', dl + 9.4, 6.4, { x: 140, y: 400, cls: 'sm' });
  to(cour, dl + 11, { scale: 1.3, x: 340, y: 30 }, 2.4, 'power2.inOut');
  out(cour, dl + 17.2, { x: 1100, rotateY: 400 }, 1.2);

  // ═════════════════════════ FINALE ═════════════════════════
  t = dl + 18.6; const TFIN = t;
  grade(t, '#0b1a22', '#14323f', '#376371', '50%', '50%', 2.6);
  const fa = mkPhone('fa', { bob: 0 }), fb = mkPhone('fb', { bob: 0 }), fc = mkPhone('fc', { bob: 0 });
  seg(fa, t, t + 40, F('sec:buyer-browse', 6), 1); seg(fb, t, t + 40, F('sec:seller-orders', 6), 1); seg(fc, t, t + 40, F('sec:courier-live', 6), 1);
  const orb = { a: 0, r: 1, k: 1 }; const P3 = [fa, fb, fc];
  const place = () => P3.forEach((p, i) => { const a = orb.a + i * (Math.PI * 2 / 3); const R = 520 * orb.r;
    gsap.set(p.pos, { x: Math.sin(a) * R, z: (Math.cos(a) - 1) * R * .9, y: 0, rotateY: -(a * 180 / Math.PI) * 1, scale: .72 * orb.k, opacity: orb.k > 0.01 ? 1 : 0 }); });
  tl.set(orb, { r: 3, k: 0 }, t);
  tl.to(orb, { r: 1, k: 1, a: Math.PI * 2, duration: 8, ease: 'power3.out', onUpdate: place }, t);
  hit(t + .2, 'whoosh', 1.3); hit(t + 3.4, 'impact', 1);
  tl.to(orb, { a: Math.PI * 4, duration: 10, ease: 'none', onUpdate: place }, t + 8);
  title('One campus.', t + 2.4, 7.6, { x: 140, y: 120, cls: '' });
  tl.to(orb, { r: 4, k: 0, duration: 2, ease: 'power3.in', onUpdate: place }, t + 16.2);
  // wordmark returns, dot lands
  const tw = t + 18.4;
  tl.set('#wm', { opacity: 1, scale: 1 }, tw); tl.set('#wm img', { opacity: 0 }, tw); tl.set('#wmdot', { opacity: 0 }, tw);
  tl.to('#wm img', { opacity: 1, duration: 1.6 }, tw);
  tl.fromTo('#wmdot', { y: -900, opacity: 1 }, { y: 0, duration: .9, ease: 'bounce.out' }, tw + .8);
  hit(tw + 1.7, 'logo', 1.5); flare(960, 540, tw + 1.9);
  tl.to('#wm', { scale: 1.06, duration: 6, ease: 'none' }, tw + 1.5);
  tl.to('#fade', { opacity: 1, duration: 2.4, ease: 'power2.in' }, tw + 5.4);
  tl.to({}, { duration: 1 }, tw + 8.5);
  FILM.end = tw + 8.4;
  FILM.scenes = { T1: c.T1, T2, TE, TP, TT, TS, TO, TPay, TC, TL, ride: TRIDE, FIN: TFIN };
}
