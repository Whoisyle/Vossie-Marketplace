// Scenes for the Vossie launch film. Durations follow the recorded footage windows.
export function build(c) {
  const { tl, gsap, mkPhone, seg, F, title, ringBurst, flare, grade, hit, mapState, qr, FILM, MK, T1 } = c;
  const $ = s => document.querySelector(s);
  const fx = $('#fx');
  const to = (ph, at, v, dur = 1.6, ease = 'power3.inOut') => tl.to(ph.pos, { ...v, duration: dur, ease }, at);
  const pop = (ph, at, from, v, dur = 1.8, ease = 'expo.out') => { tl.set(ph.pos, { opacity: 1 }, at); tl.fromTo(ph.pos, from, { ...v, duration: dur, ease }, at); };
  const out = (ph, at, v = {}, dur = .9) => { tl.to(ph.pos, { ...v, opacity: 0, duration: dur, ease: 'power3.in' }, at); };
  const counter = (at, dur, from, toV, fmt, el) => { const o = { v: from }; tl.to(o, { v: toV, duration: dur, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v); } }, at); };
  const mkBig = (html, css) => { const e = document.createElement('div'); e.className = 'big'; e.style.cssText = css; e.innerHTML = html; fx.appendChild(e); return e; };
  const has = (ep, k) => MK[ep].marks[k] !== undefined;
  // play footage window [a,b] of episode `ep` on phone `ph` starting at film time `t` at `rate`; returns the film duration
  let K = 1;   // section speed multiplier (applied identically in play() and at())
  const play = (ph, t, ep, a, b, rate = 1) => { rate *= K; const d = Math.max(.1, (b - a) / rate); seg(ph, t, t + d, ep, a, rate); return d; };
  // film time at which a footage moment appears, given a window started at film time t0 from footage f0 at rate
  const at = (t0, f0, rate, fm) => t0 + (fm - f0) / (rate * K);

  { const m = MK.buyer.marks; if (m.track !== undefined) { const e = m.end ?? m.track + 25; m.rideStart ??= m.track + 4; m.rideEnd ??= m.track + (e - m.track) * .55; m.delivered ??= m.rideEnd + 2; m.rateSheet ??= e - 5; } }
  const R = { x: 360, y: 0, rotateY: 360 - 14, rotateX: 3, rotateZ: 0, scale: 1.02 };   // phone on the right, titles on the left
  const hero = c.mkPhone('hero', { bob: 9 });

  // ═════════════════════════ JOIN (new student) ═════════════════════════
  let t = T1;
  grade(t, '#0b1a22', '#14323f', '#376371', '62%', '48%', 1.5);
  tl.set(hero.pos, { opacity: 1 }, t);
  tl.fromTo(hero.pos, { x: 360, y: 900, rotateY: 200, rotateX: 18, rotateZ: -8, scale: .75 }, { ...R, rotateY: 360 - 22, duration: 3.4, ease: 'expo.out' }, t);
  hit(t + .3, 'whoosh', 1.2); hit(t + 2.6, 'impact', .8);
  {
    const S = 'signup';
    const a0 = 0.4, aCheck = F(S, 'checking', -0.3), aProf = F(S, 'profile', -0.2), aPhoto = F(S, 'photoSet', 0), aOnb = F(S, 'onboarding', -0.5), aHome = F(S, 'home', 2.4);
    let tt = t + 1.2;
    const rA = 1.7, rB = 1, rC = 1.5, rD = 1.9;
    const tCheck = tt + (aCheck - a0) / rA;
    play(hero, tt, S, a0, aCheck, rA); play(hero, tCheck, S, aCheck, aProf, rB);
    const tProf = tCheck + (aProf - aCheck) / rB;
    play(hero, tProf, S, aProf, aOnb, rC);
    const tOnb = tProf + (aOnb - aProf) / rC;
    const dEnd = play(hero, tOnb, S, aOnb, aHome, rD);
    title('Sign in.', tt + .6, 4.5, { x: 140, y: 380, cls: 'sm' });
    title('Verified.', tCheck + .2, 5.6, { x: 140, y: 380, cls: 'sm' });
    ringBurst(1330, 540, tCheck + 2.6, 760, '#7fd6c4'); hit(tCheck + 2.6, 'success', 1);
    to(hero, tCheck - .3, { scale: 1.3, x: 330, rotateY: 360 - 6 }, 2.2, 'power2.inOut');
    to(hero, tProf - .4, { scale: 1.02, x: 360, rotateY: 360 - 14 }, 2, 'power2.inOut');
    title('Be seen.', tProf + .6, 6.6, { x: 140, y: 380, cls: 'sm' });
    const tPhoto = at(tProf, aProf, rC, aPhoto);
    to(hero, tPhoto - 1.4, { scale: 1.35, x: 310, y: -30, rotateY: 360 - 8 }, 2.2, 'power2.inOut');
    ringBurst(1330, 330, tPhoto + .6, 520, '#DFEAF1'); hit(tPhoto + .6, 'ping', 1);
    to(hero, tPhoto + 3.4, { scale: 1.02, x: 360, y: 0, rotateY: 360 - 14 }, 2, 'power2.inOut');
    title('Welcome.', tOnb + 3.4, 5, { x: 140, y: 380, cls: 'sm' });
    t = tOnb + dEnd + 0.8;
  }
  const J_END = t;

  // ═════════════════════════ BUYER ═════════════════════════
  const B = 'buyer';
  // ---- discover (+ price alert) ----
  {
    K = 1.35;
    const aS = F(B, 'buyer', -0.4), aE = F(B, 'reels', -1.0), r = 1.25;
    const d = play(hero, t, B, aS, aE, r);
    title('Discover.', t + .6, 6.2, { x: 140, y: 380 });
    hit(t + .6, 'whoosh', .8);
    to(hero, t, { ...R, rotateY: 360 - 12 }, 1.4);
    const tAlert = at(t, aS, r, F(B, 'alertOn', 0));
    to(hero, tAlert - 3, { scale: 1.3, x: 330, rotateY: 360 - 6 }, 2.2, 'power2.inOut');
    title('Alert.', tAlert + .5, 5.4, { x: 140, y: 380, cls: 'sm' });
    ringBurst(1330, 300, tAlert + .3, 560, '#e0a867'); hit(tAlert + .3, 'ping', 1);
    to(hero, tAlert + 3.4, { scale: 1.02, x: 360, rotateY: 360 - 14 }, 2, 'power2.inOut');
    t += d;
  }
  // ---- reels ----
  {
    K = 1.3;
    const aS = F(B, 'reels', -0.4), aE = F(B, 'reelAdded', 1.4), r = 1.15;
    const d = play(hero, t, B, aS, aE, r);
    to(hero, t, { x: 960 - 960 + 0, y: 0, scale: 1.12, rotateY: 360 - 3, rotateX: 0 }, 2.2, 'power3.inOut');
    title('Watch.', t + .6, 6.4, { x: 150, y: 420 });
    hit(t + .6, 'whoosh', .8);
    to(hero, t + 6, { rotateY: 360 + 12, rotateZ: -2, scale: 1.18 }, 3.4, 'sine.inOut');
    const tPick = at(t, aS, r, F(B, 'reelPick', 0));
    title('Buy.', tPick + .2, 6.2, { x: 140, y: 420 });
    ringBurst(960, 540, tPick + 1.6, 900, '#DFEAF1'); hit(tPick + 1.6, 'success', .9);
    t += d;
  }
  // ---- rewards: points, wallet, subscriptions, wishlist ----
  const hero2 = c.mkPhone('e1', { bob: 11 }), hero3 = c.mkPhone('e2', { bob: 12 });
  {
    grade(t, '#14110c', '#2d2113', '#b87a3a', '45%', '50%', 2);
    K = 1.5;
    const aS = F(B, 'rewards', -0.2), aE = F(B, 'group', -0.2), r = 1.7;
    const d = play(hero, t, B, aS, aE, r);
    to(hero, t, { x: 270, y: 20, scale: .9, rotateY: 360 - 28, rotateX: 0, rotateZ: 0 }, 1.8, 'power3.inOut');
    // two more phones show other account screens from the same tour
    play(hero2, t, B, aS + 9, aE, r); play(hero3, t, B, aS + 18, aE, r);
    pop(hero2, t + 1.0, { x: 1500, y: 80, rotateY: 150, rotateZ: 12, scale: .7 }, { x: 640, y: -20, rotateY: 360 - 6, rotateZ: 0, scale: .9 }, 2.4);
    pop(hero3, t + 1.5, { x: 1800, y: 200, rotateY: 150, rotateZ: 12, scale: .7 }, { x: 1150, y: 30, rotateY: 360 + 22, rotateZ: 0, scale: .86 }, 2.4);
    hit(t + 1.0, 'whoosh', .8); hit(t + 1.5, 'whoosh', .7);
    title('Earn.', t + 1.8, 6.5, { x: 120, y: 700, cls: 'sm' });
    title('Save.', t + 9.4, Math.max(4, d - 9.6 - 4), { x: 120, y: 700, cls: 'sm' });
    to(hero, t + 7, { x: 150, rotateY: 360 - 38 }, 4, 'sine.inOut');
    to(hero2, t + 7, { x: 640, y: -30, rotateY: 360 - 8, scale: .95 }, 4, 'sine.inOut');
    to(hero3, t + 7, { x: 1150, rotateY: 360 + 28 }, 4, 'sine.inOut');
    ringBurst(960, 540, t + 8, 900, '#e0a867'); flare(960, 540, t + 8);
    out(hero2, t + d - 1.6, { x: 400, scale: .6, rotateY: 330 }, 1); out(hero3, t + d - 1.6, { x: 1500, scale: .6, rotateY: 400 }, 1);
    t += d;
  }
  // ---- group order, checkout, pay ----
  {
    grade(t, '#0b1a22', '#14323f', '#376371', '58%', '48%', 2);
    K = 1.2;
    const aG = F(B, 'group', -0.3), aGE = F(B, 'checkout', -0.2), r1 = 1.4;
    to(hero, t, { ...R }, 2.2, 'power3.inOut');
    const d1 = play(hero, t, B, aG, aGE, r1);
    title('Together.', t + .6, Math.max(4.5, d1 - .5), { x: 140, y: 380, cls: 'sm' });
    t += d1;
    const aC = F(B, 'checkout', -0.2), aPS = F(B, 'paySheet', 0), aP = F(B, 'paid', 3.0), r2 = 1.0;
    K = 1; const dPre = play(hero, t, B, aC, aPS - 3, 1.8);        // cart + address: quick
    const tS0 = t + dPre; const d2b = play(hero, tS0, B, aPS - 3, aP, r2); const d2 = dPre + d2b;   // pay: real speed
    title('Pay.', t + .6, 6, { x: 150, y: 400, cls: 'xl' });
    const tSheet = at(tS0, aPS - 3, r2, aPS), tPaid = at(tS0, aPS - 3, r2, F(B, 'paid', 0));
    to(hero, tSheet - 1.4, { scale: 1.45, x: 330, y: 40, rotateY: 360 - 6 }, 2.2, 'power2.inOut');
    ringBurst(1330, 540, tPaid + .2, 820, '#7fd6c4'); ringBurst(1330, 540, tPaid + .45, 560, '#DFEAF1'); flare(1330, 540, tPaid); hit(tPaid + .2, 'success', 1.4);
    to(hero, tPaid + .6, { scale: 1.05, x: 360, rotateY: 360 - 14 }, 2.4, 'power2.inOut');
    t += d2;
  }
  // ---- track on the map (the ride is time-lapsed) ----
  {
    const aT = F(B, 'track', -0.2), aRS = F(B, 'rideStart', 0), aRE = F(B, 'rideEnd', 0), aDel = F(B, 'delivered', 0), aRate = F(B, 'rateSheet', 3.2);
    K = 1.25; const rN = 1.5, rRide = 7;
    const d1 = play(hero, t, B, aT, aRS, rN);
    const tR = t + d1; const dRide = (aRE - aRS) / rRide;
    seg(hero, tR, tR + dRide, B, aRS, rRide);
    const d3 = play(hero, tR + dRide, B, aRE, aRate, 1.3);
    grade(t, '#0a1620', '#13303d', '#4aa39a', '45%', '50%', 2);
    title('Track.', t + .6, d1 + 1.6, { x: 1080, y: 140, cls: 'sm' });
    tl.to('#map', { opacity: 1, duration: 1.6 }, tR - .6);
    tl.fromTo('#mapwrap', { rotateX: 62, rotateZ: -24, scale: 1.1, x: -150, y: 100 }, { rotateX: 56, rotateZ: -16, scale: 1.0, x: -200, y: 50, duration: dRide + 6, ease: 'sine.inOut' }, tR - .6);
    to(hero, tR - .6, { x: -520, y: 30, scale: .78, rotateY: 360 + 20, rotateX: 4 }, 2.4, 'power3.inOut');
    tl.to('#pinA', { opacity: 1, duration: .6 }, tR); tl.to('#pinB', { opacity: 1, duration: .6 }, tR + .4);
    tl.to(mapState, { p: 1, duration: dRide, ease: 'none' }, tR);
    ringBurst(1100, 480, tR + dRide, 600, '#7fd6c4'); hit(tR + dRide, 'success', .9);
    tl.to('#map', { opacity: 0, duration: 1.2 }, tR + dRide + 1.2);
    to(hero, tR + dRide + 1.4, { ...R, rotateY: 360 - 14 }, 2.4, 'power3.inOut');
    title('Delivered.', tR + dRide + 1.8, 5, { x: 140, y: 380, cls: 'sm' });
    title('Rate. Tip.', tR + dRide + 7, Math.max(4, d3 - 5), { x: 140, y: 380, cls: 'sm' });
    ringBurst(1330, 540, tR + dRide + 7.6, 700, '#e0a867');
    t = tR + dRide + d3 + 0.4;
  }
  const BUYER_END = t;

  // ═════════════════════════ SELLER ═════════════════════════
  const S = 'seller';
  const sA = mkPhone('sA', { bob: 10 }), sB = mkPhone('sB', { bob: 12 }), sC = mkPhone('sC', { bob: 9 });
  {
    grade(t, '#071c1a', '#0f3a37', '#2f8a7a', '40%', '50%', 2.4);
    // the phone flips to show its back, then turns around to the seller app
    tl.set(hero.pos, { opacity: 1 }, t);
    tl.fromTo(hero.pos, { x: 360, y: 0, rotateY: 360 - 14 }, { x: 360, y: 0, rotateY: 360 + 180 + 162, rotateX: 3, scale: 1, duration: 3.8, ease: 'expo.inOut' }, t);
    hit(t + .3, 'whoosh', 1.2); hit(t + 3.4, 'impact', 1);
    title('Sell.', t + 2.0, 6.4, { x: 140, y: 380, cls: 'xl' });
    t += 2.0;
    const aS = F(S, 'seller', 0.2), aV = F(S, 'verified', -0.3), aStore = F(S, 'storeForm', -0.3), aLogo = F(S, 'logoSet', 0), aBan = F(S, 'bannerSet', 0), aOrd = F(S, 'orders', -2.0);
    K = 1.4; const rSet = 2.3;
    const d1 = play(hero, t, S, aS, aV, rSet);
    const tV = t + d1;
    const d2 = play(hero, tV, S, aV, aStore, 1.4);
    const tStore = tV + d2;
    const d3 = play(hero, tStore, S, aStore, aBan + 2.6, 1.2);
    title('Your shop.', tStore + .6, d3 - .4, { x: 140, y: 380, cls: 'sm' });
    ringBurst(1330, 540, tV + 1.2, 760, '#7fd6c4'); hit(tV + 1.2, 'success', 1);
    const tLogo = at(tStore, aStore, 1.2, aLogo), tBan = at(tStore, aStore, 1.2, aBan);
    to(hero, tStore - .4, { scale: 1.28, x: 330, y: -10 }, 2.2, 'power2.inOut');
    ringBurst(1330, 420, tLogo + .5, 420, '#DFEAF1'); hit(tLogo + .5, 'ping', .9);
    ringBurst(1330, 300, tBan + .5, 520, '#DFEAF1'); hit(tBan + .5, 'ping', .9);
    t = tStore + d3;
    const d4 = play(hero, t, S, F(S, 'storeForm', 2.6) + 12, aOrd, 3.2);   // choose the pickup place, save, dashboard
    to(hero, t, { scale: 1.02, x: 360, y: 0 }, 2, 'power2.inOut');
    t += d4;
  }
  // ---- orders: accept, prepare, ready, hand over ----
  {
    K = 1.1;
    const aS = F(S, 'orders', -2.0), aA = F(S, 'accepted', -2.2), aE = F(S, 'handover', 2.0);
    const dA = play(hero, t, S, aS, aA, 1.5);
    title('Orders.', t + .6, 5.4, { x: 140, y: 380 });
    hit(t + .6, 'whoosh', .8);
    t += dA;
    const dB = play(hero, t, S, aA, aE, 1.2);
    title('Accept.', t + .4, 4.4, { x: 140, y: 380, cls: 'sm' });
    title('Hand over.', t + dB * .55, 5, { x: 140, y: 380, cls: 'sm' });
    to(hero, t + 2, { scale: 1.35, x: 330, y: 20 }, 2.2, 'power2.inOut');
    ringBurst(1330, 540, t + dB * .55 + 1, 700, '#7fd6c4'); hit(t + dB * .55 + 1, 'success', 1);
    to(hero, t + dB - 2.8, { ...R, rotateY: 360 - 14 }, 2, 'power2.inOut');
    t += dB;
  }
  // ---- payout ----
  {
    K = 1.2;
    const aS = F(S, 'payout', -0.2), aE = F(S, 'product', -0.8);
    const d = play(hero, t, S, aS, aE, 1.1);
    title('Get paid.', t + .6, d - .3, { x: 140, y: 380, cls: 'sm' });
    const cnt = mkBig('R 1 245', 'left:140px;top:640px;font-size:120px;color:#DFEAF1;opacity:0;letter-spacing:-4px');
    tl.to(cnt, { opacity: 1, duration: .8 }, t + 1.2);
    counter(t + d * .62, 2.6, 1245, 0, v => 'R ' + Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '), cnt);
    to(hero, t + d * .4, { scale: 1.3, x: 330, y: 30 }, 2.2, 'power2.inOut');
    ringBurst(1330, 540, t + d * .62 + 2.6, 740, '#DFEAF1'); hit(t + d * .62 + 2.6, 'success', 1.1);
    tl.to(cnt, { opacity: 0, duration: .8 }, t + d - 1.0);
    to(hero, t + d - 1.6, { ...R, rotateY: 360 - 14 }, 1.6, 'power2.inOut');
    t += d;
  }
  // ---- add a product, post a reel, promotions, returns ----
  {
    K = 1.5;
    const aP = F(S, 'product', -0.8), aPE = F(S, 'published', 1.6);
    const d1 = play(hero, t, S, aP, aPE, 1.9);
    title('List it.', t + .6, d1 - .4, { x: 140, y: 380, cls: 'sm' });
    ringBurst(1330, 540, t + d1 - 1.8, 640, '#7fd6c4'); hit(t + d1 - 1.8, 'success', .9);
    t += d1;
    K = 1.6;
    const aR = F(S, 'reel', -0.3), aRE = F(S, 'promos', -0.3);
    const d2 = play(hero, t, S, aR, aRE, 1.8);
    title('Post a Reel.', t + .6, d2 - .4, { x: 140, y: 380, cls: 'sm' });
    t += d2;
    const aM = F(S, 'promos', -0.3), aME = F(S, 'refund', 2.2);
    const d3 = play(hero, t, S, aM, aME, 1.7);
    title('Promote.', t + .6, Math.min(5, d3 * .5), { x: 140, y: 380, cls: 'sm' });
    title('Resolve.', t + d3 * .55, Math.max(4, d3 * .4), { x: 140, y: 380, cls: 'sm' });
    t += d3;
  }
  const SELLER_END = t;

  // ═════════════════════════ COURIER ═════════════════════════
  const C = 'courier';
  const cA = mkPhone('cA', { bob: 10 }), cB = mkPhone('cB', { bob: 12 }), cC = mkPhone('cC', { bob: 9 });
  {
    grade(t, '#0a1022', '#16224a', '#5a74c4', '42%', '50%', 2.4);
    tl.set(hero.pos, { opacity: 1 }, t);
    tl.fromTo(hero.pos, { x: 360, y: 0, rotateY: 360 - 14 }, { x: 360, y: 0, rotateY: 360 - 180 - 196, rotateX: 3, scale: 1, duration: 3.8, ease: 'expo.inOut' }, t);
    hit(t + .3, 'whoosh', 1.2); hit(t + 3.4, 'impact', 1);
    title('Deliver.', t + 2.0, 6.4, { x: 140, y: 380, cls: 'xl' });
    t += 2.0;
    const aS = F(C, 'courier', 1.0), aCar = F(C, 'carDetails', 0), aVer = F(C, 'verify', 0), aSelfie = F(C, 'selfieSet', 0), aCarPh = F(C, 'carPhotoSet', 0), aLic = F(C, 'licenceSet', 0), aApp = F(C, 'profile', -0.5);
    K = 1.4; const rF = 2.1;
    const d1 = play(hero, t, C, aS, aVer, rF);
    const tCar = at(t, aS, rF, aCar);
    title('Your car.', t + 1.2, d1 - .6, { x: 140, y: 380, cls: 'sm' });
    to(hero, tCar - 2.6, { scale: 1.25, x: 330, y: 0 }, 2.2, 'power2.inOut');
    t += d1;
    K = 1.3;
    const d2 = play(hero, t, C, aVer, aLic + 1.6, 1.25);
    const tSelf = at(t, aVer, 1.25, aSelfie), tCph = at(t, aVer, 1.25, aCarPh);
    title('You.', tSelf - .4, 5, { x: 140, y: 380, cls: 'xl' });
    title('Your car.', tCph - .2, 5, { x: 140, y: 380, cls: 'sm' });
    ringBurst(1330, 330, tSelf + .4, 520, '#9bb0ec'); hit(tSelf + .4, 'ping', 1);
    ringBurst(1330, 330, tCph + .4, 520, '#9bb0ec'); hit(tCph + .4, 'ping', 1);
    to(hero, t, { scale: 1.3, x: 330, y: -20 }, 2, 'power2.inOut');
    t += d2;
    K = 1.6;
    const d3 = play(hero, t, C, aLic + 1.6, aApp + 5.0, 2.0);   // submit, availability, approved
    title('Approved.', t + 1.0, Math.min(5, d3 - .5), { x: 140, y: 380, cls: 'sm' });
    ringBurst(1330, 540, t + d3 - 1.4, 760, '#9bb0ec'); hit(t + d3 - 1.4, 'success', 1);
    to(hero, t, { ...R, rotateY: 360 - 14 }, 2, 'power2.inOut');
    t += d3;
  }
  // ---- profile: driver photo + car photo ----
  {
    K = 1.2;
    const aS = F(C, 'profile', 0), aE = F(C, 'live', -0.5);
    const d = play(hero, t, C, aS, aE, 1.1);
    title('Meet your courier.', t + .5, d - .3, { x: 140, y: 380, cls: 'sm', w: 900 });
    to(hero, t + 1, { scale: 1.2, x: 330, y: 20 }, 2, 'power2.inOut');
    ringBurst(1330, 330, t + 2.2, 520, '#9bb0ec'); hit(t + 2.2, 'ping', 1);
    t += d;
  }
  // ---- go live, offer, pickup (QR) ----
  {
    const aS = F(C, 'live', -0.5), aOf = F(C, 'offer', 0), aAc = F(C, 'accepted', 0), aPC = F(C, 'pickupCode', 0), aCol = F(C, 'collected', 0.6);
    K = 1.1; const rL = 1.4;
    const dA = play(hero, t, C, aS, aOf + 3.4, rL);
    title('Go live.', t + .6, dA - .4, { x: 140, y: 380, cls: 'sm' });
    const tOn = t + 2.4;
    ringBurst(1330, 330, tOn, 600, '#9bb0ec'); ringBurst(1330, 330, tOn + .4, 900, '#9bb0ec'); hit(tOn, 'ping', 1);
    to(hero, at(t, aS, rL, aOf) - .6, { scale: 1.3, x: 330, y: 20 }, 2, 'power2.inOut');
    ringBurst(1330, 540, at(t, aS, rL, aOf) + 1, 760, '#9bb0ec'); hit(at(t, aS, rL, aOf) + 1, 'success', 1);
    t += dA;
    const dB = play(hero, t, C, aOf + 3.4, aCol, 1.3);
    title('Scan.', t + .4, 5, { x: 700, y: 120, cls: 'sm' });
    // the seller's code becomes a QR that gets scanned
    tl.set(qr, { left: 810, top: 390 }, t);
    const tq = t + 1.6;
    tl.fromTo(qr, { opacity: 0, scale: .5 }, { opacity: 1, scale: 1, duration: 1, ease: 'back.out(1.6)' }, tq);
    const scanner = qr.querySelector('#qscan');
    tl.set(scanner, { opacity: 1 }, tq + 1.2);
    tl.fromTo(scanner, { y: 0 }, { y: 292, duration: 1.4, ease: 'power1.inOut', repeat: 1, yoyo: true }, tq + 1.2);
    tl.to(scanner, { opacity: 0, duration: .2 }, tq + 4.0);
    tl.to(qr.querySelectorAll('.qc'), { fill: '#7fd6c4', duration: .6, stagger: { amount: .6, from: 'random' } }, tq + 3.9);
    ringBurst(960, 540, tq + 4.7, 640, '#7fd6c4'); hit(tq + 1.2, 'scan', 1); hit(tq + 4.7, 'success', 1.2);
    tl.to(qr, { opacity: 0, scale: .6, duration: .8 }, tq + 6.2);
    to(hero, t, { x: 520, scale: .9, rotateY: 360 - 18 }, 2.2, 'power3.inOut');
    to(hero, tq + 6.2, { ...R, rotateY: 360 - 14 }, 2.2, 'power3.inOut');
    t += dB;
  }
  // ---- the ride (time-lapsed), a problem report, delivery ----
  {
    const aRS = F(C, 'rampStart', 0), aRE = F(C, 'rampEnd', 0), aCf = F(C, 'confirmScreen', 0), aFail = F(C, 'failedScreen', 0), aDel = F(C, 'delivered', 2.6);
    K = 1.2; const rRide = 9; const dRide = (aRE - aRS) / rRide;
    grade(t, '#0a1022', '#16224a', '#5a74c4', '55%', '50%', 1.2);
    tl.to('#map', { opacity: 1, duration: 1.6 }, t);
    tl.fromTo('#mapwrap', { rotateX: 64, rotateZ: -22, scale: 1.1, x: -150, y: 100 }, { rotateX: 54, rotateZ: -14, scale: 1.0, x: -200, y: 40, duration: dRide + 5, ease: 'sine.inOut' }, t);
    tl.set('#pinA,#pinB', { opacity: 1 }, t + .5);
    seg(hero, t, t + dRide, C, aRS, rRide);
    to(hero, t, { x: -560, y: 20, scale: .74, rotateY: 360 + 20 }, 2.4, 'power3.inOut');
    tl.to(mapState, { p: 0, duration: .001 }, t);
    tl.to(mapState, { p: 1, duration: dRide, ease: 'none' }, t);
    title('Ride.', t + .6, dRide + .6, { x: 1100, y: 140, cls: 'sm' });
    ringBurst(1100, 480, t + dRide, 700, '#9bb0ec'); hit(t + dRide, 'success', 1);
    tl.to('#map', { opacity: 0, duration: 1.2 }, t + dRide + .8);
    t += dRide + .6;
    to(hero, t, { ...R, rotateY: 360 - 14 }, 2.4, 'power3.inOut');
    const dA = play(hero, t, C, aRE, aFail + 2.6, 1.4);
    title('Problem?', at(t, aRE, 1.4, aFail) - .4, 4.6, { x: 140, y: 380, cls: 'sm' });
    t += dA;
    const dB = play(hero, t, C, aFail + 2.6, aDel, 1.4);
    title('Delivered.', t + .4, 4.6, { x: 140, y: 380, cls: 'sm' });
    const earn = mkBig('+ R 24', 'left:150px;top:640px;font-size:130px;color:#DFEAF1;opacity:0;letter-spacing:-4px');
    tl.to(earn, { opacity: 1, duration: .8 }, t + dB - 3.4);
    counter(t + dB - 3.4, 2.2, 0, 24, v => '+ R ' + Math.round(v), earn);
    tl.to(earn, { opacity: 0, duration: .7 }, t + dB + .8);
    ringBurst(1330, 540, t + dB - 2.6, 760, '#7fd6c4'); hit(t + dB - 2.6, 'success', 1.2);
    t += dB;
  }
  // ---- earnings, cash out, performance, statements, documents ----
  {
    K = 1.5;
    const aS = F(C, 'earnings', -0.1), aCash = F(C, 'cashout', 0), aE = F(C, 'documents', 3.0);
    const d = play(hero, t, C, aS, aE, 1.5);
    title('Cash out.', t + .6, 5.4, { x: 140, y: 380, cls: 'sm' });
    to(hero, t + 1, { scale: 1.25, x: 330 }, 2.2, 'power2.inOut');
    ringBurst(1330, 540, at(t, aS, 1.5, aCash) + .8, 740, '#7fd6c4'); hit(at(t, aS, 1.5, aCash) + .8, 'success', 1.1);
    title('Your numbers.', at(t, aS, 1.5, F(C, 'performance', 0)) - .2, 6, { x: 140, y: 380, cls: 'sm', w: 900 });
    to(hero, t + d - 3, { ...R, rotateY: 360 - 14 }, 2, 'power2.inOut');
    t += d;
  }

  // ═════════════════════════ FINALE ═════════════════════════
  grade(t, '#0b1a22', '#14323f', '#376371', '50%', '50%', 2.6);
  const fa = mkPhone('fa', { bob: 0 }), fb = mkPhone('fb', { bob: 0 }), fc = mkPhone('fc', { bob: 0 });
  seg(fa, t, t + 40, B, F(B, 'buyer', 6), 1); seg(fb, t, t + 40, S, F(S, 'orders', 2), 1); seg(fc, t, t + 40, C, F(C, 'live', 6), 1);
  const orb = { a: 0, r: 1, k: 1 }; const P3 = [fa, fb, fc];
  const place = () => P3.forEach((p, i) => { const a = orb.a + i * (Math.PI * 2 / 3); const Rr = 520 * orb.r;
    gsap.set(p.pos, { x: Math.sin(a) * Rr, z: (Math.cos(a) - 1) * Rr * .9, y: 0, rotateY: -(a * 180 / Math.PI), scale: .72 * orb.k, opacity: orb.k > 0.01 ? 1 : 0 }); });
  tl.fromTo(hero.pos, { opacity: 1 }, { opacity: 0, duration: .8 }, t);
  tl.set(orb, { r: 3, k: 0 }, t);
  tl.to(orb, { r: 1, k: 1, a: Math.PI * 2, duration: 8, ease: 'power3.out', onUpdate: place }, t);
  hit(t + .2, 'whoosh', 1.3); hit(t + 3.4, 'impact', 1);
  tl.to(orb, { a: Math.PI * 4, duration: 10, ease: 'none', onUpdate: place }, t + 8);
  title('One campus.', t + 2.4, 7.6, { x: 140, y: 120 });
  tl.to(orb, { r: 4, k: 0, duration: 2, ease: 'power3.in', onUpdate: place }, t + 16.2);
  const tw = t + 18.4;
  tl.set('#wm', { opacity: 1, scale: 1 }, tw); tl.set('#wm img', { opacity: 0 }, tw); tl.set('#wmdot', { opacity: 0 }, tw);
  tl.to('#wm img', { opacity: 1, duration: 1.6 }, tw);
  tl.fromTo('#wmdot', { y: -900, opacity: 1 }, { y: 0, duration: .9, ease: 'bounce.out' }, tw + .8);
  hit(tw + 1.7, 'logo', 1.5); flare(960, 540, tw + 1.9);
  tl.to('#wm', { scale: 1.06, duration: 6, ease: 'none' }, tw + 1.5);
  tl.to('#fade', { opacity: 1, duration: 2.4, ease: 'power2.in' }, tw + 5.4);
  tl.to({}, { duration: 1 }, tw + 8.5);
  FILM.end = tw + 8.4;
  FILM.scenes = { T1, TE: J_END, TP: J_END + 40, TT: BUYER_END - 40, TS: BUYER_END, TO: BUYER_END + 40, TC: SELLER_END, TL: SELLER_END + 40, ride: SELLER_END + 100, FIN: t };
}
