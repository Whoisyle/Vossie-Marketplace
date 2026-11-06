// Procedural iPhone Pro Max-style model in burgundy. Units: millimetres. Origin = centre of the phone. +Z = out of the screen.
import * as THREE from 'three';

const W = 77.6, H = 163.0, D = 8.2, R = 12.0;
function rr(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}
function roundedGeo(w, h, r, depth, bevel, curve = 12) {
  const g = new THREE.ExtrudeGeometry(rr(w - bevel * 2, h - bevel * 2, r - bevel), { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 8, curveSegments: curve });
  g.translate(0, 0, -(depth - bevel * 2) / 2); return g;
}

function ringGeo(w, h, r, inset, depth, bevel) {
  const s = rr(w, h, r); s.holes.push(rr(w - inset * 2, h - inset * 2, Math.max(r - inset, 1)));
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * .8, bevelSegments: 4, curveSegments: 20 });
}

export function makePhone({ color = 0x4a0c1c, canvasTex }) {
  const g = new THREE.Group();
  const base = new THREE.Color(color);
  // ---- frame (polished burgundy metal band) ----
  const metal = new THREE.MeshPhysicalMaterial({ color: base.clone().multiplyScalar(1.15), metalness: 1, roughness: .24, clearcoat: .8, clearcoatRoughness: .12, envMapIntensity: 2.6 });
  const body = new THREE.Mesh(roundedGeo(W, H, R, D, 2.2, 20), metal); g.add(body);
  // bright polished rims on both edges (catch light from the front too)
  const rimMat = new THREE.MeshPhysicalMaterial({ color: base.clone().multiplyScalar(2.1).lerp(new THREE.Color(0xc07a86), .25), metalness: 1, roughness: .14, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 3, emissive: 0x4a1020 });
  const rimF = new THREE.Mesh(ringGeo(W - .3, H - .3, R - .15, 1.1, .1, .35), rimMat); rimF.position.z = D / 2 - .45; g.add(rimF);
  const rimB = new THREE.Mesh(ringGeo(W - .3, H - .3, R - .15, 1.1, .1, .35), rimMat); rimB.position.z = -D / 2 + .25; g.add(rimB);
  // ---- back glass (frosted, same hue) ----
  const backGlass = new THREE.MeshPhysicalMaterial({ color: base.clone().multiplyScalar(.62), metalness: .25, roughness: .5, clearcoat: .2, clearcoatRoughness: .5, envMapIntensity: .75 });
  const back = new THREE.Mesh(new THREE.ShapeGeometry(rr(W - 2.2, H - 2.2, R - 1.1), 32), backGlass); back.position.z = -D / 2 - .14; back.rotation.y = Math.PI; g.add(back);
  // ---- front: black bezel glass + screen ----
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x040405, metalness: .1, roughness: .08, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: .9 });
  const bezel = new THREE.Mesh(new THREE.ShapeGeometry(rr(W - 2.6, H - 2.6, R - 1.3), 32), glass); bezel.position.z = D / 2 + .05; g.add(bezel);
  const SW = W - 4.8, SH = SW * 852 / 393;               // screen keeps the 393x852 aspect of the footage
  const SR = 10.4;
  const sg = new THREE.ShapeGeometry(rr(SW, SH, SR), 32);
  const pos = sg.attributes.position, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / SW + .5; uv[i * 2 + 1] = pos.getY(i) / SH + .5; }
  sg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const screenMat = new THREE.MeshBasicMaterial({ map: canvasTex, toneMapped: false });
  const screen = new THREE.Mesh(sg, screenMat); screen.position.z = D / 2 + .12; g.add(screen);
  // thin glass sheen over the screen
  const sheen = new THREE.Mesh(new THREE.ShapeGeometry(rr(SW, SH, SR), 32), new THREE.MeshPhysicalMaterial({ transparent: true, opacity: .05, roughness: 0, metalness: 0, clearcoat: 1, color: 0xffffff, envMapIntensity: 1.8, depthWrite: false }));
  sheen.position.z = D / 2 + .2; g.add(sheen);
  const isl = new THREE.Mesh(new THREE.ShapeGeometry(rr(25, 7.4, 3.7), 24), new THREE.MeshBasicMaterial({ color: 0x000000 })); isl.position.set(0, SH / 2 - 5.8, D / 2 + .16); g.add(isl);
  // ---- camera plateau (viewed from the back: top-left = +x) ----
  const pc = base.clone().multiplyScalar(.8);
  const plate = new THREE.Mesh(roundedGeo(37, 37, 9.5, 1.8, .5), new THREE.MeshPhysicalMaterial({ color: pc, metalness: .2, roughness: .38, clearcoat: .5, clearcoatRoughness: .3, envMapIntensity: 1.1 }));
  plate.position.set(W / 2 - 22.4, H / 2 - 22.4, -D / 2 - .9 - .14); g.add(plate);
  const plateRim = new THREE.Mesh(ringGeo(37.2, 37.2, 9.7, .55, .1, .2), rimMat); plateRim.position.set(plate.position.x, plate.position.y, -D / 2 - 1.95); plateRim.rotation.y = Math.PI; plateRim.position.z = -D / 2 - 1.75; g.add(plateRim);
  const zb = -D / 2 - 1.8;
  const lens = (x, y) => {
    const lg = new THREE.Group(); lg.position.set(plate.position.x + x, plate.position.y + y, zb); lg.rotation.x = Math.PI / 2; lg.rotation.y = 0;
    const mk = (geo, mat, yy) => { const m = new THREE.Mesh(geo, mat); m.position.y = -yy; lg.add(m); return m; };
    // cylinder axis is Y; rotate group so Y -> -Z (outward from the back)
    lg.rotation.x = Math.PI / 2;
    mk(new THREE.CylinderGeometry(8.2, 8.4, .9, 64), new THREE.MeshPhysicalMaterial({ color: 0xcfc8c4, metalness: 1, roughness: .16, envMapIntensity: 1.8 }), .0);
    mk(new THREE.CylinderGeometry(6.6, 6.6, 1.0, 64), new THREE.MeshPhysicalMaterial({ color: 0x0a0b0e, metalness: .5, roughness: .25, envMapIntensity: 1 }), .15);
    mk(new THREE.CylinderGeometry(5.9, 5.9, 1.1, 64), new THREE.MeshPhysicalMaterial({ color: 0x050608, metalness: .3, roughness: .04, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 2.2 }), .25);
    mk(new THREE.CylinderGeometry(3.3, 3.3, 1.2, 48), new THREE.MeshPhysicalMaterial({ color: 0x1a2748, metalness: .7, roughness: .08, clearcoat: 1, envMapIntensity: 2.4 }), .3);
    mk(new THREE.CylinderGeometry(1.3, 1.3, 1.25, 32), new THREE.MeshPhysicalMaterial({ color: 0x3a1f5c, metalness: .5, roughness: .05, envMapIntensity: 2.4 }), .32);
    g.add(lg);
  };
  lens(8.4, 8.6); lens(8.4, -8.6); lens(-8.4, 0);
  const fl = (x, y, r, c) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .6, 32), new THREE.MeshPhysicalMaterial({ color: c, roughness: .3, metalness: .3, emissive: 0x241c0c })); m.rotation.x = Math.PI / 2; m.position.set(plate.position.x + x, plate.position.y + y, zb - .2); g.add(m); };
  fl(-9.6, 12.4, 2.3, 0xf2e6c6); fl(-9.6, -12.4, 1.3, 0x151515);
  // ---- buttons ----
  const btn = (y, h, side = -1) => { const b = new THREE.Mesh(new THREE.BoxGeometry(.9, h, 2.2), metal); b.position.set(side * (W / 2 + .05), y, 0); g.add(b); };
  btn(H / 2 - 34, 7); btn(H / 2 - 50, 13); btn(H / 2 - 68, 13);       // action + volume
  btn(H / 2 - 52, 22, 1);                                              // power
  g.userData = { screenMat };
  return g;
}
