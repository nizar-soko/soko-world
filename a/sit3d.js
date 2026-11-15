// Low-poly, low-resolution scene player for the "awkward situation" games.
// Blocky people, chunky pixels, hard camera cuts. One shared renderer.
// mount(host) -> { beat(i) -> seconds before the question, ask(), react(i,k,q), fin(), tick(dt) }
import * as T from './three.min.js';

let R = null;
const NF = t => { t.magFilter = t.minFilter = T.NearestFilter; t.wrapS = t.wrapT = T.RepeatWrapping; t.generateMipmaps = false; return t; };
const tex = (fn, w = 16, h = 16) => { const k = document.createElement('canvas'); k.width = w; k.height = h; fn(k.getContext('2d'), w, h); return NF(new T.CanvasTexture(k)); };
let STYLE = 'pixel', RAMP = null, R2 = null;
const ramp = () => { if (RAMP) return RAMP; const d = new Uint8Array([110, 190, 255]); RAMP = new T.DataTexture(d, 3, 1, T.RedFormat); RAMP.minFilter = RAMP.magFilter = T.NearestFilter; RAMP.needsUpdate = true; return RAMP; };
const M = (col, map) => STYLE === 'toon' ? new T.MeshToonMaterial({ color: col, map: map || null, gradientMap: ramp() }) : new T.MeshLambertMaterial({ color: col, map: map || null, flatShading: true });
// smooth cartoon faces for the toon style
const FT = {};
function faceT(skin, m) {
  const key = skin + m; if (FT[key]) return FT[key];
  const k = document.createElement('canvas'); k.width = k.height = 64; const g = k.getContext('2d');
  g.fillStyle = skin; g.fillRect(0, 0, 64, 64); g.fillStyle = 'rgba(255,120,140,.28)'; g.beginPath(); g.ellipse(13, 40, 6, 4, 0, 0, 7); g.ellipse(51, 40, 6, 4, 0, 0, 7); g.fill();
  g.lineCap = 'round'; g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 3;
  const eye = (x, y, r) => { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, r * 1.1, r * 1.35, 0, 0, 7); g.fill(); g.fillStyle = INK; g.beginPath(); g.ellipse(x, y + 1, r * .62, r * .8, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 1.5, y - 1.5, 1.4, 0, 7); g.fill(); g.fillStyle = INK; };
  const arc = (x, y, r, a0, a1) => { g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke(); };
  const line = (x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  switch (m) {
    case 'smug': line(12, 26, 24, 28); line(40, 25, 52, 22); g.beginPath(); g.ellipse(18, 31, 4, 2, 0, 0, 7); g.ellipse(46, 31, 4, 2, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(24, 46); g.quadraticCurveTo(36, 50, 44, 42); g.stroke(); break;
    case 'love': [[18, 30], [46, 30]].forEach(([x, y]) => { g.fillStyle = RED; g.beginPath(); g.moveTo(x, y + 6); g.bezierCurveTo(x - 9, y - 1, x - 3, y - 8, x, y - 3); g.bezierCurveTo(x + 3, y - 8, x + 9, y - 1, x, y + 6); g.fill(); }); g.strokeStyle = INK; arc(32, 40, 8, .2, Math.PI - .2); break;
    case 'eek': eye(18, 30, 6); eye(46, 30, 6); g.fillStyle = '#fff'; g.fillRect(22, 43, 20, 8); g.strokeRect(22, 43, 20, 8); line(27, 43, 27, 51); line(32, 43, 32, 51); line(37, 43, 37, 51); break;
    case 'laugh': arc(18, 32, 6, Math.PI + .3, -.3); arc(46, 32, 6, Math.PI + .3, -.3); g.fillStyle = '#5a1020'; g.beginPath(); g.moveTo(20, 40); g.quadraticCurveTo(32, 62, 44, 40); g.closePath(); g.fill(); g.fillStyle = '#ff7a8a'; g.beginPath(); g.ellipse(32, 51, 6, 3, 0, 0, 7); g.fill(); break;
    case 'shock': eye(18, 28, 7); eye(46, 28, 7); g.fillStyle = '#5a1020'; g.beginPath(); g.ellipse(32, 47, 5, 7, 0, 0, 7); g.fill(); break;
    case 'wink': eye(18, 30, 5); arc(46, 32, 5, Math.PI + .3, -.3); g.beginPath(); g.moveTo(24, 44); g.quadraticCurveTo(34, 50, 42, 42); g.stroke(); break;
    case 'mad': eye(18, 32, 5); eye(46, 32, 5); g.lineWidth = 4; line(10, 22, 25, 27); line(54, 22, 39, 27); g.lineWidth = 3; arc(32, 52, 8, Math.PI + .5, -.5); break;
    case 'sad': eye(18, 32, 5); eye(46, 32, 5); line(11, 25, 24, 22); line(53, 25, 40, 22); arc(32, 52, 7, Math.PI + .5, -.5); g.fillStyle = '#8bdfff'; g.beginPath(); g.ellipse(14, 42, 2, 4, 0, 0, 7); g.fill(); break;
    default: eye(18, 30, 5); eye(46, 30, 5); arc(32, 38, 8, .4, Math.PI - .4);
  }
  const t = new T.CanvasTexture(k); t.colorSpace = T.SRGBColorSpace; return FT[key] = t;
}
function outline(root, w) {
  const mat = new T.MeshBasicMaterial({ color: '#2a0d16', side: T.BackSide });
  const list = []; root.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === 'BoxGeometry' && !o.userData.ol) list.push(o); });
  list.forEach(o => { const p = o.geometry.parameters, m = Math.min(p.width, p.height, p.depth); if (m < .05) return; const e = new T.Mesh(o.geometry, mat); e.userData.ol = 1; const f = w || .045; e.scale.set(1 + f / p.width * 2, 1 + f / p.height * 2, 1 + f / p.depth * 2); o.add(e); });
}
const INK = '#1a0a0a', RED = '#e0355a';

const FC = {};
function face(skin, m) {
  const key = skin + m; if (FC[key]) return FC[key];
  return FC[key] = tex(g => {
    g.fillStyle = skin; g.fillRect(0, 0, 16, 16);
    const k = (x, y, w, h, c) => { g.fillStyle = c || INK; g.fillRect(x, y, w, h); };
    switch (m) {
      case 'smug': k(3, 7, 3, 1); k(10, 7, 3, 1); k(2, 5, 4, 1); k(10, 3, 4, 1); k(6, 12, 5, 1); k(11, 11, 2, 1); break;
      case 'love': k(3, 5, 3, 3, RED); k(10, 5, 3, 3, RED); k(4, 8, 1, 1, RED); k(11, 8, 1, 1, RED); k(5, 11, 6, 1); k(6, 12, 4, 1); break;
      case 'eek': k(2, 5, 4, 4, '#fff'); k(10, 5, 4, 4, '#fff'); k(4, 7, 1, 1); k(11, 7, 1, 1); k(4, 11, 8, 3); k(5, 12, 6, 1, '#fff'); break;
      case 'laugh': k(3, 6, 3, 1); k(2, 7, 1, 1); k(6, 7, 1, 1); k(10, 6, 3, 1); k(9, 7, 1, 1); k(13, 7, 1, 1); k(4, 10, 8, 4); k(5, 10, 6, 1, '#fff'); k(6, 13, 4, 1, RED); break;
      case 'shock': k(2, 4, 4, 5, '#fff'); k(10, 4, 4, 5, '#fff'); k(3, 6, 2, 2); k(11, 6, 2, 2); k(6, 11, 4, 4); break;
      case 'wink': k(3, 6, 3, 3); k(10, 7, 3, 1); k(5, 12, 6, 1); k(11, 11, 1, 1); break;
      case 'mad': k(3, 7, 3, 2); k(10, 7, 3, 2); k(2, 5, 3, 1); k(4, 6, 2, 1); k(11, 5, 3, 1); k(10, 6, 2, 1); k(6, 12, 4, 1); k(5, 13, 1, 1); k(10, 13, 1, 1); break;
      case 'sad': k(3, 7, 3, 2); k(10, 7, 3, 2); k(4, 5, 2, 1); k(2, 6, 2, 1); k(10, 5, 2, 1); k(12, 6, 2, 1); k(6, 12, 4, 1); k(5, 13, 1, 1); k(10, 13, 1, 1); break;
      default: k(3, 6, 3, 3); k(10, 6, 3, 3); k(6, 12, 5, 1);
    }
  });
}
const EC = {};
function emo(s) {
  if (EC[s]) return EC[s];
  return EC[s] = tex((g) => {
    g.fillStyle = INK; g.fillRect(1, 0, 14, 13); g.fillRect(3, 13, 3, 2);
    g.fillStyle = '#fff'; g.fillRect(2, 1, 12, 11); g.fillRect(4, 12, 1, 2);
    g.fillStyle = s === '♥' ? RED : s === '#' ? '#c9423f' : INK;
    if (s === '♥') { g.fillRect(4, 4, 3, 3); g.fillRect(9, 4, 3, 3); g.fillRect(5, 6, 6, 2); g.fillRect(6, 8, 4, 1); g.fillRect(7, 9, 2, 1); }
    else if (s === '…') { g.fillRect(4, 6, 2, 2); g.fillRect(7, 6, 2, 2); g.fillRect(10, 6, 2, 2); }
    else if (s === '!') { g.fillRect(7, 2, 2, 6); g.fillRect(7, 9, 2, 2); }
    else if (s === '?') { g.fillRect(5, 2, 6, 2); g.fillRect(9, 4, 2, 2); g.fillRect(7, 6, 3, 1); g.fillRect(7, 7, 2, 1); g.fillRect(7, 9, 2, 2); }
    else if (s === '#') { g.fillRect(4, 3, 2, 2); g.fillRect(10, 3, 2, 2); g.fillRect(6, 5, 4, 2); g.fillRect(4, 7, 2, 2); g.fillRect(10, 7, 2, 2); }
    else if (s === '$') { g.fillRect(5, 2, 6, 2); g.fillRect(5, 4, 2, 2); g.fillRect(5, 6, 6, 1); g.fillRect(9, 7, 2, 2); g.fillRect(5, 9, 6, 2); g.fillRect(7, 1, 2, 11); }
  });
}

function bx(w, h, d, c, x, y, z, p, map) { const m = new T.Mesh(new T.BoxGeometry(w, h, d), M(c, map)); m.position.set(x, y, z); p.add(m); return m; }

function person(S, o) {
  const g = new T.Group(), sk = o.skin || '#e8b48a', P = { g, sk, t: Math.random() * 9 };
  const body = new T.Group(); g.add(body); P.body = body;
  P.legs = [-.17, .17].map(x => { const l = new T.Group(); l.position.set(x, .8, 0); bx(.26, .8, .3, o.pants, 0, -.4, 0, l); bx(.28, .12, .38, '#111', 0, -.76, .04, l); g.add(l); return l; });
  bx(.7, .75, .38, o.shirt, 0, 1.18, 0, body); if (o.tie) bx(.1, .45, .05, o.tie, 0, 1.28, .2, body);
  P.arms = [-.47, .47].map(x => { const a = new T.Group(); a.position.set(x, 1.5, 0); bx(.2, .6, .24, o.shirt, 0, -.28, 0, a); bx(.18, .16, .2, sk, 0, -.66, 0, a); body.add(a); return a; });
  const ff = STYLE === 'toon' ? faceT : face;
  const hm = [M(sk), M(sk), M(o.hair), M(sk), M('#fff', ff(sk, '')), M(o.hair)];
  P.head = new T.Group(); P.head.position.set(0, 1.58, 0); const hd = new T.Mesh(new T.BoxGeometry(.5, .5, .46), hm); hd.position.y = .25; P.head.add(hd);
  bx(.54, .16, .5, o.hair, 0, .54, 0, P.head); if (o.long) bx(.54, .62, .14, o.hair, 0, .2, -.25, P.head); body.add(P.head);
  if (o.hat) { bx(.5, .1, .48, '#f4f0e6', 0, .6, 0, P.head); bx(.46, o.hat, .44, '#ffffff', 0, .65 + o.hat / 2, 0, P.head); }
  if (o.guitar) { const gt = new T.Group(); bx(.46, .56, .14, '#b5651d', 0, 0, 0, gt); bx(.2, .2, .15, '#2a1410', 0, .02, 0, gt); bx(.09, .78, .07, '#3a2416', 0, .62, 0, gt); gt.position.set(.02, .98, .3); gt.rotation.z = -1.0; body.add(gt); }
  if (o.mous) { bx(.3, .07, .05, '#2a1410', 0, .12, .25, P.head); }
  if (o.beret) { bx(.56, .12, .54, o.beret, -.04, .6, 0, P.head); bx(.06, .08, .06, o.beret, 0, .69, 0, P.head); }
  if (o.crown) { bx(.5, .14, .48, '#e8b923', 0, .62, 0, P.head); [-.18, 0, .18].forEach(x => bx(.08, .14, .08, '#e8b923', x, .76, .2, P.head)); }
  if (o.sash) { const sh = bx(.12, .9, .04, o.sash, 0, 1.15, .2, body); sh.rotation.z = .7; }
  if (o.veil) { bx(.6, .9, .1, '#ffffff', 0, .2, -.3, P.head); bx(.58, .1, .5, '#ffd0e0', 0, .58, 0, P.head); }
  if (o.glasses) { bx(.46, .1, .04, '#111', 0, .3, .25, P.head); }
  if (o.cap) { bx(.54, .14, .52, o.cap, 0, .58, 0, P.head); bx(.4, .05, .26, o.cap, 0, .54, .36, P.head); }
  if (o.flag) { const f = new T.Group(); bx(.04, 1.3, .04, '#333', 0, .4, 0, f); bx(.5, .32, .03, o.flag, .26, .95, 0, f); f.position.set(0, -.66, 0); P.arms[1].add(f); }
  if (o.pad) { bx(.3, .38, .04, '#f4f0e6', -.05, -.7, .2, P.arms[0]); }
  if (o.mic) { bx(.08, .26, .08, '#222', 0, -.82, .1, P.arms[1]); bx(.12, .12, .12, '#888', 0, -.98, .1, P.arms[1]); }
  P.fm = hm[4];
  P.em = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthTest: false })); P.em.position.set(.46, 2.3, 0); P.em.visible = false; g.add(P.em);
  S.add(g);
  Object.assign(P, { strum: false, armT: [0, 0], lean: 0, hop: 0, shake: 0, nod: 0, et: 0, tgt: null, spd: 2.4, seated: false, baseY: 0, face: 0 });
  P.mood = m => { P.fm.map = ff(sk, m); P.fm.needsUpdate = true; };
  P.emote = s => { P.em.material.map = emo(s); P.em.material.needsUpdate = true; P.em.visible = true; P.et = 1.9; };
  P.sit = v => { P.seated = v; P.baseY = v ? -.3 : 0; P.legs.forEach(l => l.rotation.x = v ? -Math.PI / 2 : 0); };
  P.place = (x, z, ry) => { g.position.set(x, P.baseY, z); g.rotation.y = ry; P.tgt = null; P.face = ry; };
  P.walk = (x, z, ry, spd) => { P.tgt = [x, z]; P.face = ry; P.spd = spd || 2.4; };
  P.reset = () => { P.strum = false; P.armT = [0, 0]; P.lean = 0; P.hop = 0; P.shake = 0; P.nod = 0; P.mood(''); P.em.visible = false; };
  P.tick = dt => {
    P.t += dt; let sw = 0;
    if (P.tgt) {
      const dx = P.tgt[0] - g.position.x, dz = P.tgt[1] - g.position.z, d = Math.hypot(dx, dz), st = P.spd * dt;
      if (d <= st) { g.position.x = P.tgt[0]; g.position.z = P.tgt[1]; P.tgt = null; g.rotation.y = P.face; if (P.onArrive) { const f = P.onArrive; P.onArrive = null; f(); } }
      else { g.position.x += dx / d * st; g.position.z += dz / d * st; g.rotation.y = Math.atan2(dx, dz); sw = Math.sin(P.t * (P.spd > 4 ? 16 : 9)) * .7; }
    }
    if (!P.seated) { P.legs[0].rotation.x = sw; P.legs[1].rotation.x = -sw; }
    const k = Math.min(1, dt * 9);
    P.arms.forEach((a, i) => { const t = P.tgt ? (i ? sw : -sw) : P.armT[i]; a.rotation.x += (t - a.rotation.x) * k; });
    if (P.strum) P.arms[1].rotation.x = -1.1 + Math.sin(P.t * 18) * .35;
    body.rotation.x += (P.lean - body.rotation.x) * k;
    let y = P.baseY + (P.tgt ? Math.abs(sw) * .06 : 0);
    if (P.hop > 0) { P.hop -= dt; y += Math.abs(Math.sin(P.hop * 11)) * .22; }
    g.position.y = y; body.position.y = Math.sin(P.t * 2.1) * .012;
    if (P.shake > 0) { P.shake -= dt; P.head.rotation.y = Math.sin(P.shake * 16) * .45; } else P.head.rotation.y *= .8;
    if (P.nod > 0) { P.nod -= dt; P.head.rotation.x = Math.sin(P.nod * 13) * .22 + .1; } else P.head.rotation.x *= .8;
    if (P.et > 0) { P.et -= dt; const s = Math.min(1, (1.9 - P.et) * 9) * .42; P.em.scale.set(s, s, 1); P.em.position.y = (P.seated ? 2.42 : 2.32) + Math.sin(P.t * 5) * .03; if (P.et <= 0) P.em.visible = false; }
  };
  return P;
}

function buildStreet() {
  const G = new T.Group();
  const f = new T.Mesh(new T.PlaneGeometry(60, 40), M('#3a3a44')); f.rotation.x = -Math.PI / 2; G.add(f);
  bx(60, .12, 3.4, '#8c8577', 0, .06, -2.3, G); for (let i = -8; i < 9; i++) bx(1.2, .02, .14, '#d8d2a0', i * 2.4, .02, 1.6, G);
  const brick = tex(g => { g.fillStyle = '#8a3b2e'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#5e241b'; for (let y = 0; y < 16; y += 4) { g.fillRect(0, y, 16, 1); for (let x = (y / 4 % 2) * 4; x < 16; x += 8) g.fillRect(x, y, 1, 4); } }); brick.repeat.set(5, 4);
  bx(9, 7, 3, '#fff', 0, 3.5, -5.5, G, brick);
  const win = tex(g => { g.fillStyle = '#4c5a78'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#f2d36b'; g.fillRect(2, 2, 5, 6); g.fillStyle = '#22283a'; g.fillRect(9, 2, 5, 6); }); win.repeat.set(3, 4);
  bx(7, 10, 3, '#fff', -8.2, 5, -5.7, G, win); bx(7, 8, 3, '#fff', 8.2, 4, -5.7, G, win); bx(7, 11, 3, '#fff', 15.4, 5.5, -5.7, G, win);
  bx(1.3, 2.3, .1, '#2a1410', 0, 1.15, -3.96, G); bx(2.2, 1.5, .1, '#ffd98a', -2.7, 1.7, -3.96, G); bx(2.2, 1.5, .1, '#ffd98a', 2.7, 1.7, -3.96, G); bx(9.2, .5, .9, '#c9423f', 0, 3, -3.8, G);
  const sg = tex((g, w, h) => { g.fillStyle = '#170408'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffb8cb'; g.font = 'bold 10px monospace'; g.fillText('TASCA DO ZÉ', 3, 11); }, 72, 14);
  bx(4.4, .85, .1, '#fff', 0, 3.9, -3.9, G, sg);
  bx(.5, .3, .5, '#ffe9a0', 4.2, 3.7, -1, G); bx(.14, 3.6, .14, '#222', 4.2, 1.8, -1, G);
  const pl = new T.PointLight(0xffd080, 1.2, 9); pl.position.set(4.2, 3.4, -.8); G.add(pl);
  const car = new T.Group(); bx(3.4, .7, 1.5, '#e0a52b', 0, .65, 0, car); bx(1.8, .6, 1.4, '#2d2d38', -.1, 1.25, 0, car);
  [-1.1, 1.1].forEach(x => [-.76, .76].forEach(z => bx(.6, .6, .2, '#111', x, .3, z, car))); bx(.5, .2, .4, '#111', 0, 1.65, 0, car); car.position.set(-4.8, 0, 1.2); G.add(car);
  return G;
}
function buildRoom(ref) {
  const G = new T.Group();
  const fl = new T.Mesh(new T.PlaneGeometry(40, 40), M('#fff', tex(g => { g.fillStyle = '#e9dfc8'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#7c1f2b'; g.fillRect(0, 0, 8, 8); g.fillRect(8, 8, 8, 8); })));
  fl.material.map.repeat.set(14, 14); fl.rotation.x = -Math.PI / 2; G.add(fl);
  bx(18, 6, .2, '#6d2233', 0, 3, -5, G); bx(.2, 6, 14, '#5a1b2a', -6.5, 3, 0, G); bx(.2, 6, 14, '#5a1b2a', 6.5, 3, 0, G); bx(18, .9, .24, '#3a2416', 0, .45, -4.9, G);
  [-3.5, 0, 3.5].forEach(x => { bx(1.6, 1.2, .1, '#1c2a4a', x, 3, -4.86, G); bx(1.8, 1.4, .06, '#c9a24a', x, 3, -4.9, G); });
  const cloth = tex(g => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#f3ece0' : '#c9423f'; g.fillRect(i * 4, j * 4, 4, 4); } });
  const table = (x, z) => { bx(.12, .7, .12, '#3a2416', x, .35, z, G); bx(1.2, .08, 1.2, '#fff', x, .74, z, G, cloth); bx(.08, .22, .08, '#f4e9c8', x, .9, z, G); bx(.05, .06, .05, '#ffb02e', x, 1.04, z, G); };
  const chair = (x, z, ry) => { const c = new T.Group(); bx(.5, .08, .5, '#5a3a22', 0, .45, 0, c); bx(.5, .6, .08, '#5a3a22', 0, .78, -.22, c); bx(.08, .45, .08, '#3a2416', -.2, .22, .2, c); bx(.08, .45, .08, '#3a2416', .2, .22, .2, c); c.position.set(x, 0, z); c.rotation.y = ry; G.add(c); };
  table(0, 0); chair(-.95, 0, Math.PI / 2); chair(.95, 0, -Math.PI / 2); table(-3.6, -2.6); chair(-3.6, -3.5, 0); table(3.6, -2.8); chair(3.6, -3.7, 0);
  ref.glass = bx(.1, .26, .1, '#5b1030', .28, .91, .22, G); ref.glass2 = bx(.1, .26, .1, '#5b1030', -.28, .91, .22, G);
  const bill = tex((g, w, h) => { g.fillStyle = '#fbf7ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#555'; for (let y = 3; y < 15; y += 3) g.fillRect(2, y, 8 + (y % 2) * 2, 1); g.fillStyle = RED; g.fillRect(2, 17, 10, 2); g.fillRect(2, 21, 6, 1); }, 14, 24);
  ref.bill = new T.Mesh(new T.BoxGeometry(.34, .03, .56), [M('#fbf7ea'), M('#fbf7ea'), M('#fff', bill), M('#fbf7ea'), M('#fbf7ea'), M('#fbf7ea')]); ref.bill.position.set(0, .8, .25); ref.bill.visible = false; G.add(ref.bill);
  bx(.7, .3, .7, '#ede77d', 0, 3.3, 0, G); bx(.04, 2, .04, '#111', 0, 4.4, 0, G);
  const lamp = new T.PointLight(0xffc070, 1.1, 8); lamp.position.set(0, 2.6, .6); G.add(lamp);
  const extra = person(G, { pants: '#444', shirt: '#8bdfff', hair: '#d9c27a' }); extra.sit(true); extra.place(-3.6, -3.5, 0); ref.extra = extra;
  return G;
}

export function mount(host, opt) {
  opt = opt || {}; STYLE = opt.toon ? 'toon' : 'pixel';
  if (!R) { R = new T.WebGLRenderer({ antialias: false }); R.setPixelRatio(1); const c = R.domElement; c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges;display:block;z-index:0'; }
  const b = host.getBoundingClientRect(); let W, H, RR;
  if (STYLE === 'toon') {
    if (!R2) { R2 = new T.WebGLRenderer({ antialias: true }); R2.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0'; }
    RR = R2; RR.setPixelRatio(Math.min(2, devicePixelRatio || 1)); W = Math.round(b.width); H = Math.round(b.height); if (R.domElement.parentNode) R.domElement.parentNode.removeChild(R.domElement);
  } else { RR = R; W = Math.max(60, Math.round(b.width / 3)); H = Math.max(60, Math.round(b.height / 3)); if (R2 && R2.domElement.parentNode) R2.domElement.parentNode.removeChild(R2.domElement); }
  RR.setSize(W, H, false); host.insertBefore(RR.domElement, host.firstChild);
  const S = new T.Scene(), cam = new T.PerspectiveCamera(48, W / H, .1, 120);
  if (STYLE === 'toon') { S.add(new T.HemisphereLight(0xfff4e8, 0x6a4a5a, .9)); const dl = new T.DirectionalLight(0xfff0d0, 1.6); dl.position.set(3, 7, 5); S.add(dl); }
  else { S.add(new T.AmbientLight(0xffffff, .62)); const dl = new T.DirectionalLight(0xfff0d0, .75); dl.position.set(3, 6, 4); S.add(dl); }
  const ref = {}, street = buildStreet(), room = buildRoom(ref); S.add(street); S.add(room);
  // two extra chairs at the far side of the date table, for the waiter and the chef
  const chair = (x, z) => { const c = new T.Group(); bx(.5, .08, .5, '#5a3a22', 0, .45, 0, c); bx(.5, .6, .08, '#5a3a22', 0, .78, -.22, c); bx(.08, .45, .08, '#3a2416', -.2, .22, .2, c); bx(.08, .45, .08, '#3a2416', .2, .22, .2, c); c.position.set(x, 0, z); room.add(c); return c; };
  const ch1 = chair(-.45, -1.0), ch2 = chair(.45, -1.0);
  const you = person(S, { pants: '#2b3a67', shirt: '#b0ef8b', hair: '#2a1a12' }),
    date = person(S, { pants: '#6a2a55', shirt: '#e08efb', hair: '#7a2d1a', long: 1, skin: '#c98a62' }),
    wtr = person(S, { pants: '#16161c', shirt: '#f4f0e6', hair: '#111', tie: '#16161c', skin: '#e3c0a0' }),
    chef = person(S, { pants: '#3a3a3a', shirt: '#ffffff', hair: '#5a3a22', skin: '#d9a07a', hat: .55 }),
    crew = [
      person(S, { pants: '#3a3a3a', shirt: '#ffffff', hair: '#111', skin: '#b87a52', hat: .18, guitar: 1 }),
      person(S, { pants: '#2a2a2a', shirt: '#ede77d', hair: '#c9a24a', long: 1, skin: '#f0c8a0' }),
      person(S, { pants: '#3a3a3a', shirt: '#ffffff', hair: '#3a2416', skin: '#8a5a3a', hat: .18 }),
      person(S, { pants: '#2a2a2a', shirt: '#8bdfff', hair: '#111', skin: '#e3b48a' })];
  const CREW = [[-1.75, -1.7, .6], [1.75, -1.6, -.6], [-.9, -2.2, .15], [.9, -2.25, -.15]];
  const bottle = new T.Group(); bx(.1, .42, .1, '#254a2a', 0, 0, 0, bottle); bx(.05, .14, .05, '#254a2a', 0, .27, 0, bottle); bottle.position.set(0, -.8, .12); bottle.rotation.x = 1.3; chef.arms[1].add(bottle);
  const all = [you, date, wtr, chef, ...crew], room3 = [chef, ...crew];
  if (STYLE === 'toon') { outline(S); S.background = new T.Color('#3a1420'); }
  let look = new T.Vector3(), push = 0, cuts = [], ct = 0, pour = 0, billT = 0, cur = 'table';
  const setOff = v => { if (v) cam.setViewOffset(W, H, 0, Math.round(H * .24), W, H); else cam.clearViewOffset(); };
  const shot = (p, l, fov, ps) => { cam.position.set(p[0], p[1], p[2]); look.set(l[0], l[1], l[2]); cam.fov = fov || 48; cam.updateProjectionMatrix(); cam.lookAt(look); push = ps == null ? .1 : ps; };
  const close = (P, fov) => {
    const x = P.g.position.x, z = P.g.position.z, y = P.baseY + 1.76, ry = P.g.rotation.y, o = (P === wtr || P === chef) ? 0 : .8, a = Math.cos(ry + o) > Math.cos(ry - o) ? ry + o : ry - o;
    shot([x + Math.sin(a) * 3, y + .25, z + Math.cos(a) * 3], [x + .05, y + .06, z], fov || 30, .16);
  };
  const hideRoom = () => room3.forEach(p => { p.g.visible = false; p.tgt = null; });
  const setScene = n => { street.visible = n === 'street'; room.visible = n !== 'street'; S.background = new T.Color(n === 'street' ? '#2a1b4a' : '#3a1420'); S.fog = n === 'street' ? new T.Fog('#2a1b4a', 12, 30) : null; };
  // full table state for a beat: who is already sitting / standing there
  const stage = i => {
    you.sit(true); date.sit(true); you.place(-.95, 0, Math.PI / 2); date.place(.95, 0, -Math.PI / 2);
    wtr.sit(i >= 2); if (i >= 2) wtr.place(-.45, -1.0, 0);
    chef.g.visible = i >= 3; chef.sit(i >= 3); if (i >= 3) chef.place(.45, -1.0, 0);
    crew.forEach((p, k) => { p.g.visible = i >= 4; p.sit(false); if (i >= 4) p.place(CREW[k][0], CREW[k][1], CREW[k][2]); });
    ref.extra.g.visible = i < 3;
  };
  const CAM = { door: [[.2, 2.3, 3.6], [0, 1.5, -2.8], 48], table: [[-1.2, 3.1, 4.6], [.1, 1.25, -.6], 48], wide: [[0, 3.6, 4.4], [0, 1.2, -1.1], 50], bill: [[.1, 4.3, 2.9], [0, .8, -.3], 46] };
  const api = {
    beat(i) {
      all.forEach(p => p.reset()); cuts = []; ct = 0; pour = 0; setOff(false); ref.bill.visible = false;
      if (i === 0) {
        setScene('street'); hideRoom(); cur = 'door'; you.sit(false); date.sit(false); wtr.sit(false);
        wtr.place(0, -3.3, 0); wtr.mood('smug'); wtr.armT = [-.2, -.2];
        date.place(6.2, -1.9, -Math.PI / 2); you.place(7.3, -1.5, -Math.PI / 2); date.walk(-1.1, -2.5, .85, 3.2); you.walk(1.1, -2.4, -.85, 3.2);
        shot([4.5, 4.2, 10.5], [.6, 2.1, -3], 48, .5);
        cuts = [[2.5, () => { shot(...CAM.door, 0); wtr.emote('…'); }], [3.1, () => { wtr.shake = .5; }]];
        return 3.7;
      }
      setScene('room'); stage(i);
      if (i === 1) { // the waiter pulls up a chair and sits with you
        cur = 'table'; wtr.sit(false); wtr.place(4.2, -3.6, 0); wtr.mood('smug'); wtr.walk(-.45, -1.6, 0, 3.6); shot([-3.6, 2.6, 4.4], [.4, 1.3, -1.2], 48, .3);
        date.mood('love');
        cuts = [[1.7, () => { wtr.sit(true); wtr.place(-.45, -1.0, 0); shot(...CAM.table, 0); date.mood('eek'); date.emote('?'); you.mood('shock'); }], [2.4, () => { wtr.armT = [-1.3, 0]; }]];
        return 2.9;
      }
      if (i === 2) { // the chef sits down too and pours for everyone
        cur = 'table'; chef.g.visible = true; chef.sit(false); chef.place(4.6, -3.8, 0); chef.walk(.45, -1.6, 0, 3.6); shot([-3.6, 2.6, 4.4], [.4, 1.3, -1.2], 48, .3);
        wtr.mood('wink'); you.mood('eek');
        cuts = [[1.8, () => { chef.sit(true); chef.place(.45, -1.0, 0); chef.mood('sad'); shot(...CAM.table, 0); pour = 1.6; date.emote('!'); }]];
        return 2.9;
      }
      if (i === 3) { // the whole kitchen arrives, with a guitar
        cur = 'wide'; crew.forEach((p, k) => { p.g.visible = true; p.place(4 + k * .6, -4 - k * .3, 0); p.walk(CREW[k][0], CREW[k][1], CREW[k][2], 4.2); });
        shot([-3.6, 2.8, 4.6], [.3, 1.3, -1.4], 52, .2); chef.mood('laugh'); wtr.mood('laugh');
        cuts = [[1.9, () => { crew[0].strum = true; crew[1].mood('love'); crew[3].hop = 3; shot(...CAM.wide, 0); }], [2.5, () => { date.lean = .42; date.mood('eek'); date.emote('?'); }]];
        return 3.1;
      }
      cur = 'bill'; crew[0].strum = false; all.forEach(p => p.mood('smug')); you.mood('eek'); date.mood('eek'); wtr.armT = [0, -1.1]; billT = .35; ref.bill.visible = true; ref.bill.position.y = 2; shot(...CAM.bill, .25);
      cuts = [[.5, () => { you.mood('shock'); date.mood('shock'); you.emote('$'); }], [1.5, () => { wtr.armT = [0, 0]; }]];
      return 2.2;
    },
    establish() { api.beat(0); cuts = []; [you, date].forEach(p => { p.tgt = null; p.g.rotation.y = -Math.PI / 2; }); shot([5.5, 3.6, 11.5], [1.2, 2.2, -3], 44, .35); },
    ask() { setOff(true); shot(...CAM[cur], .04); },
    react(i, k, q) {
      setOff(false); cuts = []; ct = 0; date.lean = 0;
      const guests = all.filter(p => p !== you && p !== date && p.g.visible);
      if (q === 'good') { guests.forEach(p => { p.mood('laugh'); }); wtr.emote('!'); date.mood('laugh'); date.hop = .9; date.emote('♥'); you.mood('smug'); you.armT = [0, i >= 2 ? -2.2 : 0]; crew.forEach(p => p.hop = .8); }
      else if (q === 'mid') { guests.forEach(p => p.mood('wink')); wtr.mood('mad'); wtr.emote('…'); date.mood('wink'); date.nod = .8; you.mood(''); }
      else if (q === 'bad') { guests.forEach(p => p.mood('smug')); wtr.nod = 1.2; date.mood('eek'); date.emote('…'); you.mood('sad'); you.lean = .3; }
      else { guests.forEach(p => p.mood('eek')); wtr.emote('…'); date.mood('eek'); date.emote('…'); you.mood('eek'); you.emote('…'); }
      if (i === 4 && k === 2) { // you run, the whole kitchen chases you
        you.sit(false); you.place(-1.3, .9, -Math.PI / 2); you.mood('eek'); you.walk(-9, 2.5, -Math.PI / 2, 7);
        [chef, ...crew].forEach((p, n) => { p.sit(false); p.mood('mad'); setTimeout(() => p.walk(-9, 2 + n * .3, -Math.PI / 2, 6.2), 250 + n * 120); });
        crew[0].strum = false; shot([.4, 2.8, 5.6], [-.8, 1.3, -.4], 52, 0);
        cuts = [[1.6, () => { wtr.mood('wink'); wtr.emote('♥'); date.mood('laugh'); close(date); }]]; return;
      }
      const first = i === 3 ? date : i === 2 ? chef : wtr, second = i === 3 ? (k === 0 ? crew[0] : wtr) : date;
      if (q === 'none') { close(you); cuts = [[1.4, () => close(wtr)]]; return; }
      if (i === 4) { shot(...CAM.wide, .1); cuts = [[1.35, () => close(date)]]; return; }
      close(first); cuts = [[1.35, () => close(second)]];
    },
    fin() {
      cuts = []; setScene('room'); stage(4); all.forEach(p => p.reset()); ref.bill.visible = false;
      all.forEach(p => { p.mood('laugh'); p.hop = 3; }); date.mood('love'); wtr.mood('wink'); you.armT = [0, -2.3]; date.armT = [-2.3, 0]; crew[0].strum = true; date.emote('♥'); shot(...CAM.wide, .12);
    },
    tick(dt) {
      ct += dt; while (cuts.length && ct >= cuts[0][0]) cuts.shift()[1]();
      all.forEach(p => { if (p.g.visible) p.tick(dt); }); ref.extra.tick(dt);
      if (pour > 0) { pour -= dt; chef.arms[1].rotation.z = .5 * Math.min(1, (1.6 - pour) * 3) * (pour > .2 ? 1 : pour * 5); chef.armT[1] = -1.4; } else { chef.arms[1].rotation.z *= .8; }
      bottle.visible = chef.g.visible && (pour > 0);
      if (billT > 0) { billT -= dt; ref.bill.position.y = .8 + Math.max(0, billT) * 3.4; }
      if (push) { const d = look.clone().sub(cam.position).normalize(); cam.position.addScaledVector(d, push * dt); cam.lookAt(look); }
      RR.render(S, cam);
    },
    destroy() { if (R.domElement.parentNode) R.domElement.parentNode.removeChild(R.domElement); }
  };
  return api;
}

// ---------------------------------------------------------------------------
// Generic situation stories: sets, cast, crowds and beats described as data.
const LOOK = {
  shirts: ['#8bdfff', '#ede77d', '#b0ef8b', '#ffb8cb', '#e08efb', '#a597ff', '#f4f0e6', '#ff8a5c', '#5ad1a4', '#ffd166'],
  pants: ['#2b3a67', '#3a3a3a', '#5a3a22', '#2a2a2a', '#6a2a55', '#24543a'],
  hair: ['#111', '#2a1a12', '#7a2d1a', '#d9c27a', '#5a3a22', '#c9a24a', '#888'],
  skin: ['#e8b48a', '#c98a62', '#8a5a3a', '#f0c8a0', '#b87a52', '#e3c0a0', '#6b432a']
};
const rl = (i, o) => Object.assign({ shirt: LOOK.shirts[(i * 3) % 10], pants: LOOK.pants[i % 6], hair: LOOK.hair[(i * 5) % 7], skin: LOOK.skin[(i * 2 + 1) % 7], long: i % 3 === 1 }, o || {});
const stripes = (a, b) => tex(g => { for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * 4, 0, 4, 16); } });
const checker = (a, b, n) => { const t = tex(g => { g.fillStyle = a; g.fillRect(0, 0, 16, 16); g.fillStyle = b; g.fillRect(0, 0, 8, 8); g.fillRect(8, 8, 8, 8); }); t.repeat.set(n, n); return t; };
const art = seed => tex(g => { const C = ['#e0355a', '#ede77d', '#8bdfff', '#b0ef8b', '#170408', '#e08efb', '#ff8a5c', '#f9f0f0']; for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x += 4) { g.fillStyle = C[(x * 7 + y * 3 + seed * 5) % 8]; g.fillRect(x, y, 4, 4); } g.fillStyle = C[seed % 8]; g.fillRect(4, 4, 8, 8); });
const sign = (txt, fg, bg, w) => tex((g, W, H) => { g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = fg; g.font = 'bold 10px monospace'; g.fillText(txt, 3, 11); }, w || 72, 14);
function floorP(G, map, col) { const f = new T.Mesh(new T.PlaneGeometry(40, 40), M(col || '#fff', map)); f.rotation.x = -Math.PI / 2; G.add(f); return f; }

const STORIES = {
  museum: () => ({
    bg: { gallery: '#d8d0c4' },
    sets: {
      gallery(G, ref) {
        floorP(G, checker('#c9a77a', '#b8946a', 20)); bx(20, 7, .2, '#f4f0e6', 0, 3.5, -5, G); bx(.2, 7, 16, '#ece6da', -7, 3.5, 0, G); bx(.2, 7, 16, '#ece6da', 7, 3.5, 0, G);
        [[-3.6, 1], [0, 2], [3.6, 3]].forEach(([x, k]) => { bx(2.2, 2.6, .08, '#c9a24a', x, 3, -4.88, G); bx(1.9, 2.3, .1, '#fff', x, 3, -4.84, G, art(k)); bx(.5, .14, .04, '#f4f0e6', x + .7, 1.3, -4.84, G); });
        bx(.9, .8, .9, '#f4f0e6', 4.6, .4, -2.4, G); bx(.4, 1, .4, '#9aa0a6', 4.6, 1.3, -2.4, G); bx(.5, .4, .4, '#9aa0a6', 4.6, 2, -2.4, G);
        ref.plinth = bx(1, .6, 1, '#f4f0e6', -4.4, .3, -2.4, G); bx(2.4, .45, .6, '#6a4a2a', 0, .22, -1.2, G);
        ref.rope = [bx(.08, 1, .08, '#c9a24a', -2.2, .5, -3.6, G), bx(.08, 1, .08, '#c9a24a', 2.2, .5, -3.6, G), bx(4.4, .06, .06, '#a0283c', 0, .9, -3.6, G)];
      }
    },
    cast: {
      you: rl(0, { shirt: '#b0ef8b', pants: '#2b3a67', hair: '#2a1a12', skin: '#e8b48a', long: false }),
      date: rl(1, { shirt: '#e08efb', pants: '#6a2a55', hair: '#7a2d1a', long: true, skin: '#c98a62' }),
      guard: { shirt: '#2b3a67', pants: '#1c2440', hair: '#111', skin: '#b87a52', cap: '#1c2440' },
      guide: rl(4, { shirt: '#ff8a5c', flag: '#ede77d', long: false }),
      curator: { shirt: '#151515', pants: '#151515', hair: '#e8e8e8', skin: '#f0c8a0', long: true, glasses: 1, pad: 1 },
      hat: rl(6, { cap: '#3a2416', shirt: '#5a3a22' })
    },
    crowds: { tour: [8, i => rl(i + 3)] },
    beats: [
      { set: 'gallery', pos: { you: [-.5, -2.4, Math.PI], date: [.5, -2.4, Math.PI], hat: [4.0, -1.0, -2.2] }, cam: [[2.6, 2.4, 2.6], [-.2, 1.6, -2.6], 46],
        at: [[1.2, A => { A.puff(-.5, 1.0, -2.4); A.P.date.mood('shock'); A.P.date.g.rotation.y = -Math.PI / 2; A.P.date.emote('!'); A.P.hat.emote('?'); }], [2.0, A => A.close(A.P.date)]], wait: 2.8, r: ['date', 'hat'] },
      { pos: { guard: [1.4, -1.4, -2.3] }, enter: { guard: [6.5, 1] }, mood: { guard: 'mad', date: 'eek' }, at: [[2.2, A => { A.P.guard.emote('?'); A.close(A.P.guard); }]],
        cam: [[0, 2.4, 3.4], [.2, 1.5, -1.8], 48], wait: 3.0, r: ['guard', 'date'] },
      { pos: { tour: [3.4, -1.6, -1.3, 2.4, 2.6], guide: [1.6, -2.2, -1.2] }, enter: { tour: [7, 1.2], guide: [7, 0] }, mood: { guide: 'smug' },
        cam: [[0, 3.6, 4.6], [0, 1.2, -1.6], 54], at: [[2.4, A => { A.P.guide.emote('…'); A.close(A.P.guide); }]], wait: 3.2, r: ['guide', 'date'] },
      { pos: { curator: [-2.4, -1.3, 1.0] }, enter: { curator: [-6.5, 1.5] }, mood: { curator: 'smug' }, lean: { date: .4 },
        at: [[2.0, A => { A.P.curator.armT = [-1.4, 0]; A.close(A.P.curator); }], [2.8, A => { A.P.date.mood('eek'); A.P.date.emote('?'); A.close(A.P.date); }]], cam: [[0, 3.2, 4.2], [-.6, 1.3, -1.7], 52], wait: 3.5, r: ['curator', 'date'] },
      { pos: { curator: [0, -1.2, Math.PI] }, mood: { curator: 'wink', guard: 'smug', guide: 'eek' }, emote: { curator: '$' }, cam: [[0, 3.6, 4.8], [0, 1.3, -1.8], 56], wait: 2.2, r: ['curator', 'date'],
        react(A, k, pts) { if (pts < 0) { A.P.guard.walk(-.6, -2.0, Math.PI, 3); A.P.guard.mood('mad'); A.P.hat.mood('mad'); A.P.hat.emote('#'); } } }
    ],
    fin(A) { const y = A.P.you; y.place(-4.4, -2.4, 0); y.baseY = .6; y.g.position.y = .6; y.armT = [-2.4, -2.4]; y.mood('smug'); A.all(p => { p.mood('laugh'); p.hop = 3; }); A.P.curator.emote('$'); A.shot([-1.6, 2.8, 3.2], [-3.6, 1.6, -2.4], 46, .1); }
  }),

  karaoke: () => ({
    bg: { room: '#1a0b2e' },
    sets: {
      room(G, ref) {
        floorP(G, checker('#2a1240', '#3a1a58', 16)); bx(20, 7, .2, '#24103a', 0, 3.5, -5, G); bx(.2, 7, 16, '#2a1240', -7, 3.5, 0, G); bx(.2, 7, 16, '#2a1240', 7, 3.5, 0, G);
        bx(6, .4, 3, '#5a2a7a', 0, .2, -3.4, G); bx(6.2, .1, .1, '#ede77d', 0, .42, -1.9, G);
        ref.screen = bx(3.2, 1.8, .1, '#fff', 0, 2.9, -4.85, G, tex(g => { g.fillStyle = '#1c2a6a'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#ede77d'; g.fillRect(2, 5, 12, 2); g.fillStyle = '#ffb8cb'; g.fillRect(3, 9, 10, 2); }));
        bx(.06, 1.4, .06, '#333', -.8, 1.1, -2.4, G); bx(.06, 1.4, .06, '#333', .8, 1.1, -2.4, G);
        const ball = bx(.5, .5, .5, '#e0e0e0', 0, 5, -1, G); ref.ball = ball;
        [[-3.2, 1.2], [3.2, 1.2], [-3.4, 3.4], [3.4, 3.4]].forEach(([x, z]) => { bx(.12, .7, .12, '#111', x, .35, z, G); bx(1, .08, 1, '#3a1a58', x, .74, z, G); bx(.12, .2, .12, '#e0355a', x, .88, z, G); });
        ref.lights = ['#ff4fa3', '#4fd8ff', '#ede77d'].map((c, i) => { const l = new T.PointLight(c, 1.4, 9); l.position.set(-3 + i * 3, 4, -1); G.add(l); return l; });
        bx(4, .9, .2, '#fff', 0, 4.6, -4.8, G, sign('KARAOKE', '#ffb8cb', '#170408', 48));
      }
    },
    cast: {
      you: rl(0, { shirt: '#b0ef8b', pants: '#2b3a67', hair: '#2a1a12', skin: '#e8b48a', long: false }),
      date: rl(1, { shirt: '#e08efb', pants: '#6a2a55', hair: '#7a2d1a', long: true, skin: '#c98a62' }),
      host: rl(5, { shirt: '#ede77d', pants: '#111', hair: '#111', mic: 1, long: false })
    },
    crowds: { fans: [6, i => rl(i + 4)], bach: [8, i => rl(i + 2, { shirt: '#ff7aa8', long: true, veil: i === 0 })] },
    beats: [
      { set: 'room', pos: { you: [-.5, 1.2, Math.PI], date: [.5, 1.2, Math.PI], host: [0, -3.4, 0] }, mood: { host: 'smug', date: 'love' }, arms: { host: [0, -1.4] },
        cam: [[0, 2.4, 4.4], [0, 1.6, -2.4], 50], at: [[1.4, A => { A.P.host.emote('♥'); A.P.date.armT = [-2.4, 0]; }], [2.2, A => A.close(A.P.host)]], wait: 2.9, r: ['host', 'date'] },
      { pos: { you: [-.6, -2.9, 0, 'up'], date: [.6, -2.9, 0, 'up'], host: [-2.6, -3.0, .8, 'up'], fans: [0, 1.6, Math.PI, 6, 1.4] }, mood: { date: 'eek', fans: 'smug' }, emote: { date: '?' }, arms: { you: [0, -1.4] },
        cam: [[0, 2.2, 3.2], [0, 1.8, -2.9], 46], at: [[1.6, A => A.close(A.P.date)]], wait: 2.6, r: ['date', 'host'] },
      { at: [[.2, A => { A.P.you.armT = [-.6, -2.6]; A.P.you.mood('shock'); A.P.date.mood('shock'); A.P.date.emote('!'); A.ref.screen.material.color.set('#ff4fa3'); }], [1.4, A => A.close(A.P.you)]],
        cam: [[1.6, 1.6, 1.6], [0, 2, -2.9], 44], wait: 2.4, r: ['date', 'fans0'] },
      { pos: { bach: [0, -4.2, 0, 5.4, .7, 'up'] }, enter: { bach: [6.5, 1] }, mood: { bach: 'laugh' }, cam: [[0, 3.2, 4.6], [0, 1.6, -2.6], 54],
        at: [[2.3, A => { A.P.bach0.emote('♥'); A.close(A.P.bach0); }]], wait: 3.0, r: ['bach0', 'date'] },
      { pos: { host: [0, -2.2, Math.PI, 'up'] }, mood: { host: 'laugh' }, emote: { host: '?' }, cam: [[0, 3.4, 4.6], [0, 1.6, -2.4], 54], wait: 2.0, r: ['host', 'date'],
        react(A, k, pts) { if (pts < 0) { A.all(p => { if (p !== A.P.you && p !== A.P.date) { p.mood('mad'); p.emote('#'); } }); } } }
    ],
    fin(A) { A.all(p => { p.mood('love'); p.armT = [-.4, -.4]; p.hop = 0; }); A.P.date.lean = .25; A.P.you.mood('laugh'); A.P.date.emote('♥'); A.shot([0, 3, 4.6], [0, 1.6, -2.4], 50, .12); A.sway = true; },
    tick(dt, ref, t) { ref.lights.forEach((l, i) => { l.intensity = 1 + Math.sin(t * 6 + i * 2) * .8; }); ref.ball.rotation.y += dt * 2; }
  }),

  club: () => ({
    bg: { door: '#120818', club: '#0b0410', wc: '#cfe3d8', dawn: '#2a2030' },
    sets: {
      door(G, ref) {
        const f = floorP(G, null, '#2a2a33'); bx(30, .12, 3, '#55505a', 0, .06, -2.6, G);
        bx(14, 7, 2, '#1c1424', 0, 3.5, -5, G); bx(2.2, 2.6, .1, '#05030a', 0, 1.3, -3.98, G);
        bx(4, .9, .12, '#fff', 0, 3.4, -3.98, G, sign('CLUB 404', '#ff4fa3', '#05030a', 56));
        [-1.4, 1.4].forEach(x => { bx(.12, 1, .12, '#c9a24a', x, .5, -2.2, G); }); bx(2.8, .06, .06, '#a0283c', 0, .9, -2.2, G);
        const l = new T.PointLight(0xff4fa3, 1.6, 8); l.position.set(0, 3.4, -2.8); G.add(l);
      },
      club(G, ref) {
        floorP(G, checker('#1a1030', '#2a1a48', 18)); bx(20, 7, .2, '#120a1e', 0, 3.5, -5, G); bx(.2, 7, 16, '#140a22', -7, 3.5, 0, G); bx(.2, 7, 16, '#140a22', 7, 3.5, 0, G);
        bx(4, 1.1, .8, '#3a2416', -4.2, .55, -1.6, G); bx(4.2, .1, 1, '#c9a24a', -4.2, 1.12, -1.6, G); for (let i = 0; i < 6; i++) bx(.12, .32, .12, ['#5ad1a4', '#ffd166', '#ff8a5c'][i % 3], -5.6 + i * .5, 1.33, -1.8, G);
        bx(3, 1.1, 1.2, '#05030a', 2.4, .55, -3.6, G); bx(1, .1, .6, '#888', 2.0, 1.15, -3.6, G); bx(1, .1, .6, '#888', 2.9, 1.15, -3.6, G);
        ref.speaker = bx(1.4, 1.2, 1.2, '#111', 5.2, .6, -3.6, G); bx(.8, .8, .05, '#333', 5.2, .65, -2.98, G);
        ref.lights = ['#ff4fa3', '#4fd8ff', '#b0ef8b', '#ede77d'].map((c, i) => { const l = new T.PointLight(c, 1.5, 10); l.position.set(-4 + i * 2.6, 4.5, -1); G.add(l); return l; });
      },
      wc(G) {
        floorP(G, checker('#e6f2ec', '#9fc7b4', 18)); bx(20, 7, .2, '#cfe3d8', 0, 3.5, -5, G); bx(.2, 7, 16, '#bcd6c9', -7, 3.5, 0, G); bx(.2, 7, 16, '#bcd6c9', 7, 3.5, 0, G);
        bx(6, 1.6, .06, '#a8d8ff', 0, 2.6, -4.88, G); bx(6, .9, .7, '#f4f0e6', 0, .45, -4.5, G);
        [-4.4, 4.4].forEach(x => bx(1.6, 2.6, .1, '#ff8a5c', x, 1.3, -4.86, G));
      }
    },
    cast: {
      you: rl(0, { shirt: '#b0ef8b', pants: '#2b3a67', hair: '#2a1a12', skin: '#e8b48a', long: false }),
      pal: rl(1, { shirt: '#ffd166', pants: '#6a2a55', hair: '#d9c27a', long: true, skin: '#f0c8a0' }),
      bouncer: { shirt: '#111', pants: '#111', hair: '#111', skin: '#6b432a' },
      barman: rl(7, { shirt: '#f4f0e6', tie: '#111' }),
      dj: rl(8, { shirt: '#e08efb', cap: '#111' })
    },
    crowds: { queue: [4, i => rl(i + 5)], dance: [10, i => rl(i + 1)], wcs: [6, i => rl(i + 3, { long: i % 2 === 0 })] },
    beats: [
      { set: 'door', pos: { bouncer: [0, -2.0, 0], pal: [0, -1.4, Math.PI], you: [-1.4, -.6, 2.4], queue: [3.4, -.9, -Math.PI / 2, 3, 1] }, arms: { pal: [-2.6, -2.6], bouncer: [-.3, -.3] }, mood: { pal: 'love', bouncer: 'mad' },
        cam: [[-1.8, 2.4, 3.6], [0, 1.6, -1.6], 48], at: [[1.0, A => A.P.pal.emote('♥')], [1.9, A => { A.close(A.P.bouncer); A.P.bouncer.emote('…'); }]], wait: 2.6, r: ['bouncer', 'pal'] },
      { set: 'club', pos: { you: [-2.4, -.4, -2.2], pal: [-4.6, -.6, Math.PI], barman: [-4.2, -2.4, 0], dj: [2.4, -4.3, 0], dance: [2.4, -.6, -.5, 4, 2.6], bouncer: null, queue: null },
        arms: { pal: [0, -2.6] }, mood: { pal: 'laugh', barman: 'shock' }, emote: { barman: '$' }, cam: [[-1.2, 2.4, 3.2], [-4, 1.5, -1.2], 50], at: [[1.6, A => A.close(A.P.barman)]], wait: 2.4, r: ['barman', 'pal'] },
      { set: 'wc', pos: { pal: [0, -2.2, 0], wcs: [0, -3.9, 0, 5, .8], you: [0, .6, Math.PI], barman: null, dj: null, dance: null }, mood: { pal: 'sad', wcs: 'sad' }, emote: { pal: '♥' },
        cam: [[0, 2.4, 3.4], [0, 1.5, -2.6], 52], at: [[1.6, A => A.close(A.P.pal)]], wait: 2.5, r: ['pal', 'wcs0'] },
      { set: 'club', pos: { pal: [2.0, -4.3, 0], dj: [2.9, -4.3, 0], you: [.4, -1.8, -2.6], dance: [-2.0, -1.0, -.4, 3.6, 3], barman: [-4.2, -2.4, 0], wcs: null }, arms: { pal: [-2.6, -2.6] }, mood: { pal: 'laugh', dj: 'shock' }, emote: { dj: '?' },
        cam: [[1.2, 2.6, 2.6], [2.2, 1.6, -3.6], 46], at: [[1.6, A => A.close(A.P.dj)]], wait: 2.4, r: ['dj', 'pal'],
        react(A, k, pts) { if (pts < 0) { A.dark = 2.5; } } },
      { set: 'club', bright: true, pos: { pal: [5.2, -3.6, 0, 'lay', 'hi'], dj: null, barman: null, dance: null, wcs: [3.6, -2.2, 0, 3, 1.2, 'lay'], bouncer: [3.6, -.6, -Math.PI / 2], you: [1.6, -.4, -1.3] },
        mood: { pal: 'love', bouncer: 'smug', wcs: 'love' }, emote: { pal: '…' }, cam: [[0, 3.2, 3.4], [3.6, 1.0, -2.6], 50], wait: 2.0, r: ['bouncer', 'you'] }
    ],
    fin(A) { A.setSet('club'); A.place('dance', [0, -.6, Math.PI, 6, 3]); A.all(p => { p.mood('laugh'); p.hop = 3; p.armT = [-2.4, -2.4]; }); A.shot([0, 3.2, 4.6], [0, 1.4, -1.6], 56, .1); },
    tick(dt, ref, t, A) { const L = A.sets.club.ref.lights; if (L) L.forEach((l, i) => { l.intensity = A.dark > 0 ? 0 : A.bright ? .2 : 1.1 + Math.sin(t * 8 + i * 1.7) * .9; }); if (A.dark > 0) A.dark -= dt; }
  }),

  flea: () => ({
    bg: { market: '#8fd3f4' },
    sets: {
      market(G, ref) {
        floorP(G, checker('#b9b0a2', '#a39a8c', 26)); bx(30, 5, .2, '#f2c9a0', 0, 2.5, -8, G);
        const stall = (x, z, a, b) => { bx(2.8, .9, 1.1, '#8a5a3a', x, .45, z, G); bx(3.2, .1, 1.8, '#fff', x, 2.4, z - .2, G, stripes(a, b)); [-1.4, 1.4].forEach(dx => bx(.08, 2.4, .08, '#5a3a22', x + dx, 1.2, z + .5, G)); };
        stall(0, -2.6, '#e0355a', '#f9f0f0'); stall(-4.2, -3.4, '#3b6be0', '#f9f0f0'); stall(4.2, -3.4, '#5ad1a4', '#f9f0f0');
        const lamp = new T.Group(); bx(.1, .5, .1, '#c9a24a', 0, .25, 0, lamp); bx(.5, .34, .5, '#ffd98a', 0, .62, 0, lamp); lamp.position.set(-.6, .9, -2.4); G.add(lamp); ref.lamp = lamp;
        const lg = new T.PointLight(0xffd080, 0, 4); lg.position.set(-.6, 1.6, -2.2); G.add(lg); ref.lampLight = lg;
        bx(.3, .26, .24, '#5ad1a4', .3, 1.03, -2.5, G); bx(.12, .06, .12, '#5ad1a4', .5, 1.12, -2.5, G); bx(.4, .03, .1, '#ccc', .9, .92, -2.3, G); bx(.5, .3, .4, '#e08efb', -4.4, 1.05, -3.3, G); bx(.4, .5, .3, '#ede77d', 4.3, 1.15, -3.3, G);
      }
    },
    cast: {
      you: rl(0, { shirt: '#b0ef8b', pants: '#2b3a67', hair: '#2a1a12', skin: '#e8b48a', long: false }),
      seller: { shirt: '#f4f0e6', pants: '#5a3a22', hair: '#888', skin: '#c98a62', cap: '#24543a' },
      woman: rl(3, { shirt: '#e0355a', long: true, glasses: 1 }),
      spoonguy: rl(9, { shirt: '#a597ff' })
    },
    crowds: { crowd: [8, i => rl(i + 2)] },
    beats: [
      { set: 'market', pos: { seller: [0, -3.5, 0], you: [0, -1.4, Math.PI] }, mood: { seller: 'smug' }, emote: { seller: '$' }, arms: { seller: [0, -1.3] },
        cam: [[2.2, 2.2, 1.6], [-.2, 1.3, -2.6], 46], at: [[1.0, A => { A.ref.lampLight.intensity = 1.6; }], [1.8, A => A.close(A.P.seller)]], wait: 2.5, r: ['seller', 'you'] },
      { mood: { seller: 'wink' }, emote: { seller: '?' }, lean: { seller: .35 }, cam: [[-1.8, 2.2, 1.6], [0, 1.4, -2.6], 46], at: [[1.2, A => A.close(A.P.seller)]], wait: 2.0, r: ['seller', 'you'] },
      { pos: { crowd: [-2.8, -.6, .8, 2.6, 2.4], woman: [1.3, -1.2, -1.2] }, enter: { crowd: [-8, 2], woman: [8, 1] }, mood: { woman: 'smug', crowd: 'shock' }, emote: { woman: '$' },
        cam: [[0, 3.2, 4.6], [0, 1.2, -1.6], 54], at: [[2.3, A => A.close(A.P.woman)]], wait: 3.0, r: ['woman', 'you'] },
      { pos: { you: [0, -3.5, 0], seller: null, spoonguy: [0, -1.4, Math.PI] }, enter: { spoonguy: [6, 1] }, at: [[.3, A => { A.P.you.mood('eek'); }], [2.0, A => { A.P.spoonguy.armT = [0, -1.6]; A.P.spoonguy.emote('?'); A.close(A.P.spoonguy); }]],
        cam: [[2.4, 2.2, 1.8], [0, 1.3, -2.6], 46], wait: 2.8, r: ['spoonguy', 'you'] },
      { pos: { seller: [1.4, -1.4, -1.0], spoonguy: null }, enter: { seller: [8, 0] }, mood: { seller: 'laugh' }, emote: { seller: '$' }, cam: [[0, 3.2, 4.4], [0, 1.2, -2], 54], wait: 2.4, r: ['seller', 'you'] }
    ],
    fin(A) { A.all(p => { p.mood('laugh'); p.hop = 3; }); A.P.you.armT = [-2.4, 0]; A.ref.lampLight.intensity = 2; A.shot([0, 3, 4], [0, 1.3, -2.4], 52, .1); }
  })
};

// ---- shared set pieces for the second batch ----
const walls = (G, ft, back, side, h) => { h = h || 7; floorP(G, ft); bx(20, h, .2, back, 0, h / 2, -5, G); bx(.2, h, 16, side, -7, h / 2, 0, G); bx(.2, h, 16, side, 7, h / 2, 0, G); };
const tableC = (G, x, z, top, map) => { bx(.12, .7, .12, '#3a2416', x, .35, z, G); bx(1.3, .08, 1.3, top || '#fff', x, .74, z, G, map); };
const chairC = (G, x, z, ry) => { const c = new T.Group(); bx(.5, .08, .5, '#5a3a22', 0, .45, 0, c); bx(.5, .6, .08, '#5a3a22', 0, .78, -.22, c); bx(.08, .45, .08, '#3a2416', -.2, .22, .2, c); bx(.08, .45, .08, '#3a2416', .2, .22, .2, c); c.position.set(x, 0, z); c.rotation.y = ry; G.add(c); };
const circleTex = (c1, c2) => { const k = document.createElement('canvas'); k.width = k.height = 64; const g = k.getContext('2d'); const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, c1); gr.addColorStop(.6, c2); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(k); };
const ME = { you: rl(0, { shirt: '#b0ef8b', pants: '#2b3a67', hair: '#2a1a12', skin: '#e8b48a', long: false }), date: rl(1, { shirt: '#e08efb', pants: '#6a2a55', hair: '#7a2d1a', long: true, skin: '#c98a62' }), pal: rl(1, { shirt: '#ffd166', pants: '#6a2a55', hair: '#d9c27a', long: true, skin: '#f0c8a0' }) };
const clothT = () => tex(g => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#f3ece0' : '#c9423f'; g.fillRect(i * 4, j * 4, 4, 4); } });

Object.assign(STORIES, {
  tasting: () => ({
    bg: { fine: '#10241c', kebab: '#160c26' },
    sets: {
      fine(G, ref) {
        walls(G, checker('#2a2a2a', '#1c1c1c', 16), '#1f3d32', '#18332a');
        [-3.6, 3.6].forEach(x => { bx(1.6, 2.2, .08, '#c9a24a', x, 3, -4.88, G); bx(1.4, 2, .1, '#fff', x, 3, -4.84, G, art(x > 0 ? 5 : 2)); });
        tableC(G, 0, 0, '#f4f0e6'); chairC(G, -.95, 0, Math.PI / 2); chairC(G, .95, 0, -Math.PI / 2);
        [-.2, .2].forEach(x => { bx(.06, .26, .06, '#f4e9c8', x, .91, -.4, G); bx(.04, .06, .04, '#ffb02e', x, 1.06, -.4, G); });
        const fl = new T.Group(); [['#e0355a', -.12], ['#ede77d', 0], ['#e08efb', .12], ['#ff8a5c', .06]].forEach(([c, x], k) => { bx(.03, .3, .03, '#3a7a3a', x, .93, .1 + k * .02, fl); bx(.1, .1, .1, c, x, 1.1, .1 + k * .02, fl); }); G.add(fl); ref.flowers = fl;
        ref.pea = bx(.07, .07, .07, '#6fcf4a', 0, .82, .25, G); bx(.3, .04, .08, '#d8dde3', 0, .79, .25, G);
        const l = new T.PointLight(0xffc070, 1.2, 7); l.position.set(0, 2.6, .5); G.add(l);
      },
      kebab(G, ref) {
        floorP(G, null, '#2a2a33'); bx(30, .12, 3, '#55505a', 0, .06, -2.6, G); bx(14, 7, 2, '#2a1e3a', 0, 3.5, -5, G);
        bx(3.4, 2.2, .1, '#ffd98a', 0, 1.4, -3.98, G); bx(4, .9, .12, '#fff', 0, 3.1, -3.98, G, sign('24H FOOD', '#ede77d', '#170408', 56));
        const l = new T.PointLight(0xffa040, 1.6, 9); l.position.set(0, 2.8, -2.4); G.add(l);
      }
    },
    cast: { you: ME.you, pal: ME.pal, waiter: { shirt: '#f4f0e6', pants: '#16161c', hair: '#111', tie: '#16161c', skin: '#e3c0a0' }, chef: { shirt: '#ffffff', pants: '#3a3a3a', hair: '#5a3a22', skin: '#d9a07a', hat: .55 } },
    beats: [
      { set: 'fine', pos: { you: [-.95, 0, Math.PI / 2, 'sit'], pal: [.95, 0, -Math.PI / 2, 'sit'], waiter: [.1, -1.1, 0] }, arms: { waiter: [0, -1.3] }, mood: { waiter: 'smug', you: 'shock' }, emote: { you: '?' },
        cam: [[-1.2, 2.6, 3.6], [0, 1.2, -.3], 46], at: [[1.6, A => A.close(A.P.waiter)]], wait: 2.4, r: ['waiter', 'pal'] },
      { pos: { chef: [.5, -1.2, -.2], waiter: [-2.6, -3.2, .4] }, enter: { chef: [5, -4] }, mood: { chef: 'sad', pal: 'eek' }, cam: [[-1.4, 2.4, 3.4], [.2, 1.3, -.6], 46], at: [[2.0, A => { A.P.chef.emote('♥'); A.close(A.P.chef); }]], wait: 2.8, r: ['chef', 'pal'] },
      { mood: { you: 'shock', pal: 'shock' }, arms: { chef: [0, -1.4] }, cam: [[-1.2, 2.2, 3.2], [0, 1.3, -.4], 46], at: [[.1, A => { A.fog = '#dfe6ee'; for (let k = 0; k < 4; k++) A.puff(Math.random() * 2 - 1, .9, Math.random() * 1.5 - 1, '#ffffff', '#e8eef5', 12); }], [1.6, A => A.close(A.P.you)]], wait: 2.4, r: ['chef', 'you'], end: A => { A.fog = null; } },
      { pos: { chef: [2.6, -3.0, -.6] }, mood: { chef: 'smug', pal: 'wink' }, lean: { pal: .4 }, emote: { pal: '♥' }, cam: [[1.2, 2.2, 2.8], [.4, 1.2, -.2], 44], at: [[.1, A => { A.fog = null; }], [1.6, A => A.close(A.P.pal)]], wait: 2.4, r: ['pal', 'chef'],
        react(A, k, pts) { if (pts > 100) A.ref.flowers.visible = false; } },
      { set: 'kebab', pos: { you: [-.8, -1.4, .2], pal: [.2, -1.4, 0], chef: [1.2, -1.6, -.3], waiter: null }, mood: { chef: 'eek', you: 'sad', pal: 'sad' }, emote: { you: '…' }, cam: [[0, 2.2, 3.6], [0, 1.4, -1.6], 48], wait: 2.2, r: ['chef', 'pal'] }
    ],
    fin(A) { A.setSet('kebab'); A.all(p => { p.mood('laugh'); p.hop = 3; p.armT = [0, -2.4]; }); A.shot([0, 2.4, 3.8], [0, 1.4, -1.6], 48, .1); }
  }),

  play: () => ({
    bg: { theatre: '#12060a' },
    sets: {
      theatre(G, ref) {
        floorP(G, checker('#3a2416', '#2e1c10', 18)); bx(20, 8, .2, '#1a0a0e', 0, 4, -5.2, G); bx(.2, 8, 16, '#1a0a0e', -7, 4, 0, G); bx(.2, 8, 16, '#1a0a0e', 7, 4, 0, G);
        bx(9, .6, 3.4, '#5a3a22', 0, .3, -3.4, G); bx(9.2, .08, .1, '#c9a24a', 0, .62, -1.7, G);
        [-4.2, 4.2].forEach(x => bx(1.2, 6, .4, '#a0182c', x, 3, -2, G)); bx(9, 1, .4, '#a0182c', 0, 5.6, -2, G); bx(8, 5, .2, '#7a1020', 0, 2.5, -5, G);
        for (let r = 0; r < 3; r++) bx(8, .5, .6, '#5a1020', 0, .25, 1.4 + r * 1.2, G);
        const sp = new T.SpotLight(0xfff0d0, 3, 14, .45, .5); sp.position.set(0, 7, 2); sp.target.position.set(0, 0, -2.6); G.add(sp); G.add(sp.target); ref.spot = sp;
      }
    },
    cast: { you: ME.you, actor: { shirt: '#3b6be0', pants: '#24314f', hair: '#2a1a12', skin: '#c98a62', cap: '#e8b923' }, lead: { shirt: '#7a2d1a', pants: '#3a1a0a', hair: '#111', skin: '#e3c0a0', crown: 1 }, director: { shirt: '#151515', pants: '#151515', hair: '#888', skin: '#f0c8a0', beret: '#a0182c', glasses: 1 } },
    crowds: { aud: [10, i => rl(i + 2)] },
    beats: [
      { set: 'theatre', pos: { you: [0, 1.6, Math.PI, 'sit'], aud: [0, 2.9, Math.PI, 7, 1.4, 'sit'], actor: [0, -2.6, 0, 'up', .6] }, enter: { actor: [-3, -3] }, mood: { you: 'eek' },
        cam: [[2.6, 2.6, 4.4], [0, 1.4, 0], 48], at: [[1.8, A => { A.P.actor.place(0, .5, Math.PI); A.P.actor.baseY = 0; A.P.actor.g.position.y = 0; A.P.actor.armT = [-1.2, -1.2]; A.P.actor.mood('sad'); A.P.actor.emote('?'); A.close(A.P.actor); }]], wait: 2.8, r: ['actor', 'you'] },
      { pos: { you: [0, -2.4, 0, 'up', .6], actor: [-1.3, -2.8, .5, 'up', .6] }, mood: { actor: 'mad', you: 'eek' }, arms: { actor: [-.4, -2.4] }, cam: [[0, 2.2, 3.4], [0, 1.9, -2.4], 46],
        at: [[.3, A => { A.give(A.P.you, 'sword'); A.P.you.armT = [0, -1.6]; }], [1.6, A => A.close(A.P.you)]], wait: 2.4, r: ['actor', 'you'] },
      { pos: { lead: [-1.2, -2.9, .5, 'up', .6] }, mood: { lead: 'eek', aud: 'shock' }, emote: { lead: '?' }, cam: [[1.4, 2.0, 2.6], [-.4, 2.0, -2.6], 42], at: [[1.6, A => A.close(A.P.lead)]], wait: 2.4, r: ['lead', 'you'] },
      { pos: { director: [2.4, -3.4, -1.0, 'up', .6], you: [1.5, -3.6, 1.0, 'up', .6] }, mood: { director: 'smug' }, arms: { director: [-1.4, -1.4] }, cam: [[4.2, 2.4, -.8], [2, 1.9, -3.4], 44], at: [[.1, A => { A.ref.spot.intensity = .6; }], [1.4, A => A.close(A.P.director)]], wait: 2.2, r: ['director', 'you'] },
      { pos: { you: [0, -2.4, 0, 'up', .6], actor: [-1.2, -2.6, 0, 'up', .6], lead: [1.2, -2.6, 0, 'up', .6], director: [2.3, -2.8, -.2, 'up', .6], aud: [0, 2.9, Math.PI, 7, 1.4] }, mood: { aud: 'laugh' }, arms: { aud: [-2.4, -2.4] },
        cam: [[0, 2.6, 4.6], [0, 1.8, -1.6], 52], at: [[.1, A => { A.ref.spot.intensity = 3; A.puff(0, 3.2, -1.6, '#ff7aa8', '#ffd166', 14); }], [1.4, A => A.close(A.P.aud3)]], wait: 2.2, r: ['aud3', 'you'] }
    ],
    fin(A) { A.all(p => { p.mood('laugh'); p.hop = 3; }); A.P.you.armT = [-2.4, -2.4]; A.puff(0, 3.2, -2, '#ff7aa8', '#ffd166', 16); A.shot([0, 2.4, 4.8], [0, 1.8, -2], 50, .1); }
  }),

  gig: () => ({
    bg: { street: '#150b26', venue: '#07030c' },
    sets: {
      street(G) {
        floorP(G, null, '#2a2a33'); bx(30, .12, 3, '#55505a', 0, .06, -2.6, G); bx(16, 7, 2, '#241634', 0, 3.5, -5, G);
        bx(.9, .9, .1, '#fff', -4.2, 2.6, -3.98, G, sign('M', '#ffffff', '#c9423f', 14)); bx(2.2, 1.3, .3, '#111', -4.2, .65, -3.9, G);
        bx(2.4, 2.6, .1, '#05030a', 2.4, 1.3, -3.98, G); bx(3.6, .9, .12, '#fff', 2.4, 3.3, -3.98, G, sign('LIVE TONIGHT', '#8bdfff', '#05030a', 80));
        const l = new T.PointLight(0x8bdfff, 1.4, 8); l.position.set(2.4, 3, -2.6); G.add(l);
      },
      venue(G, ref) {
        floorP(G, checker('#141020', '#1c1630', 18)); bx(20, 8, .2, '#0c0816', 0, 4, -6, G); bx(.2, 8, 16, '#0c0816', -7, 4, 0, G); bx(.2, 8, 16, '#0c0816', 7, 4, 0, G);
        bx(9, 1, 3, '#2a2040', 0, .5, -4.4, G); bx(1.2, .8, 1, '#c9423f', 0, 1.4, -5.2, G); bx(.6, .4, .6, '#ede77d', -.8, 1.3, -5, G); bx(.6, .4, .6, '#ede77d', .8, 1.3, -5, G);
        [-3.6, 3.6].forEach(x => bx(1.2, 2.4, 1, '#111', x, 2.2, -4.6, G));
        ref.lights = ['#ff4fa3', '#4fd8ff', '#b0ef8b', '#ede77d'].map((c, i) => { const l = new T.PointLight(c, 1.6, 12); l.position.set(-4 + i * 2.6, 5, -3); G.add(l); return l; });
      }
    },
    cast: { you: ME.you, pal: ME.pal, sec: { shirt: '#111', pants: '#111', hair: '#111', skin: '#6b432a', cap: '#111' }, singer: rl(6, { shirt: '#ff4fa3', mic: 1, long: true }), drummer: rl(9, { shirt: '#111' }) },
    crowds: { queue: [4, i => rl(i + 5)], fans: [14, i => rl(i + 1)] },
    beats: [
      { set: 'street', pos: { you: [0, -1.4, .3] }, arms: { you: [0, -1.4] }, mood: { you: 'eek' }, emote: { you: '?' }, cam: [[1.6, 2.2, 3.4], [-.6, 1.6, -2], 50], at: [[.1, A => A.give(A.P.you, 'phone')], [1.6, A => A.close(A.P.you)]], wait: 2.4, r: ['you', 'you'] },
      { pos: { you: [2.4, -1.2, Math.PI], sec: [2.4, -3.0, 0], queue: [5.4, -2.0, -Math.PI / 2, 3, 1] }, arms: { sec: [-1.3, -1.3], you: [0, 0] }, mood: { sec: 'mad' }, emote: { sec: '?' }, cam: [[0, 2.2, 2.6], [2.4, 1.6, -2.4], 46], at: [[1.4, A => A.close(A.P.sec)]], wait: 2.2, r: ['sec', 'you'] },
      { set: 'venue', pos: { you: [0, 3.2, Math.PI], pal: [-.6, -2.0, Math.PI], fans: [0, .4, Math.PI, 7, 3.2], singer: [0, -4.2, 0, 'up', 1], drummer: [0, -5.2, 0, 'up', 1], sec: null, queue: null }, arms: { pal: [-2.4, -2.4], fans: [-2.2, 0] }, mood: { you: 'eek' },
        cam: [[1.4, 3.2, 6.2], [0, 1.6, -1.4], 52], at: [[1.6, A => A.close(A.P.you)]], wait: 2.4, r: ['you', 'pal'] },
      { pos: { pal: [-.6, -2.2, 0, 'top'], you: [.6, -1.6, Math.PI] }, arms: { pal: [-2.4, -2.4] }, mood: { pal: 'laugh', singer: 'shock' }, emote: { singer: '!' }, cam: [[2.2, 2.6, 2.4], [-.2, 2.2, -2.4], 46], at: [[1.4, A => A.close(A.P.pal)]], wait: 2.2, r: ['pal', 'singer'] },
      { pos: { you: [-.6, -3.6, 0, 'up', 1], pal: [.6, -3.6, 0, 'up', 1], singer: [1.6, -3.8, -.6, 'up', 1] }, arms: { singer: [0, -1.4], fans: [-2.4, -2.4] }, mood: { fans: 'laugh', you: 'eek' }, cam: [[0, 2.6, 2.2], [0, 2.4, -3.6], 50], at: [[1.4, A => A.close(A.P.singer)]], wait: 2.2, r: ['singer', 'pal'] }
    ],
    fin(A) { A.all(p => { p.mood('laugh'); p.hop = 3; p.armT = [-2.4, -2.4]; }); A.shot([0, 3, 5], [0, 2, -2.6], 54, .1); },
    tick(dt, ref, t, A) { const L = A.sets.venue.ref.lights; if (L) L.forEach((l, i) => { l.intensity = 1.2 + Math.sin(t * 7 + i * 1.7) * .9; }); }
  }),

  barcrush: () => ({
    bg: { bar: '#1a0c08', bakery: '#f2d9b8' },
    sets: {
      bar(G, ref) {
        walls(G, checker('#3a2416', '#2e1c10', 18), '#3a1a12', '#2e140e');
        bx(5, 1.1, .8, '#5a3a22', -4.2, .55, -1.6, G); bx(5.2, .1, 1, '#c9a24a', -4.2, 1.12, -1.6, G); bx(5, 2.4, .3, '#2a140c', -4.2, 2.4, -4.8, G);
        for (let i = 0; i < 8; i++) bx(.14, .4, .14, ['#5ad1a4', '#ffd166', '#ff8a5c', '#a597ff'][i % 4], -6 + i * .5, 2.2 + (i % 2) * .7, -4.6, G);
        bx(2.6, .9, .1, '#fff', 0, 4, -4.88, G, sign('OPEN LATE', '#ff7aa8', '#170408', 64));
        tableC(G, 3, -1.8, '#5a3a22'); tableC(G, 3.6, 1.2, '#5a3a22');
        const l = new T.PointLight(0xffa060, 1.4, 10); l.position.set(0, 4, 0); G.add(l);
      },
      bakery(G) {
        walls(G, checker('#f4f0e6', '#d9cfc0', 18), '#f6e7d0', '#efdcc2');
        bx(6, 1.1, 1, '#8a5a3a', 0, .55, -3.6, G); bx(6, .8, .9, '#cfefff', 0, 1.5, -3.6, G);
        for (let i = 0; i < 10; i++) bx(.3, .14, .2, ['#e8b04a', '#c9762a', '#f4d48a'][i % 3], -2.4 + i * .52, 1.2, -3.5, G);
        bx(3, .9, .1, '#fff', 0, 3.6, -4.88, G, sign('BAKERY', '#3b0f18', '#ede77d', 48));
      }
    },
    cast: { you: ME.you, crush: rl(4, { shirt: '#ff8a5c', long: true, hair: '#111', skin: '#b87a52' }), bartender: rl(7, { shirt: '#f4f0e6', tie: '#111' }), friend: rl(3, { shirt: '#e0355a', glasses: 1, long: true }), groom: rl(8, { shirt: '#f4f0e6', sash: '#e0355a', cap: '#111' }) },
    crowds: { grp: [4, i => rl(i + 6)], stag: [8, i => rl(i + 2, { shirt: '#2b3a67' })] },
    beats: [
      { set: 'bar', pos: { you: [-2.6, -.4, -1.2], bartender: [-4.0, -2.6, .3], crush: [2.8, -1.0, -1.6] }, mood: { bartender: 'smug', crush: 'wink' }, emote: { crush: '♥' }, cam: [[-1.0, 2.4, 3.8], [0, 1.4, -1.2], 54], at: [[1.6, A => A.close(A.P.bartender)]], wait: 2.4, r: ['bartender', 'crush'] },
      { pos: { you: [1.2, .2, -2.4], friend: [1.8, -.4, 1.0] }, mood: { friend: 'mad' }, arms: { friend: [-1.3, -1.3] }, cam: [[-.6, 2.2, 3], [1.6, 1.5, -.4], 46], at: [[1.4, A => A.close(A.P.friend)]], wait: 2.2, r: ['friend', 'you'] },
      { pos: { grp: [1.4, -1.2, .4, 2.6, 1.4] }, enter: { grp: [6, -3] }, mood: { grp: 'smug', crush: 'laugh' }, emote: { grp0: '?' }, cam: [[-1.4, 2.6, 3.4], [1.4, 1.4, -.6], 50], at: [[2.0, A => A.close(A.P.grp0)]], wait: 2.6, r: ['grp0', 'crush'] },
      { pos: { groom: [-.6, -.8, 1.4], stag: [-2.4, -.4, 1.4, 4, .6], crush: [.2, -.7, 1.4] }, enter: { groom: [-7, 2], stag: [-7, 2] }, arms: { stag: [-1.4, -1.4], groom: [-1.4, -1.4], crush: [-1.4, -1.4] }, mood: { groom: 'laugh', stag: 'laugh', crush: 'shock' },
        cam: [[0, 2.6, 4.4], [-.6, 1.4, -.6], 54], at: [[2.0, A => { A.P.groom.emote('!'); A.close(A.P.groom); }]], wait: 2.6, r: ['groom', 'crush'] },
      { set: 'bakery', pos: { you: [-.6, -1.2, .4], crush: [.6, -1.2, -.4], grp: [-2.4, -2.2, .3, 2, 1.2], stag: [2.6, -1.6, -.4, 2.6, 2], groom: [1.6, -2.6, -.2], friend: [-1.6, -2.6, .2], bartender: null }, arms: { stag: [0, 0], groom: [0, 0], crush: [0, 0] }, mood: { crush: 'love' }, emote: { crush: '?' },
        cam: [[0, 2.2, 3.6], [0, 1.5, -1.4], 50], wait: 2.0, r: ['crush', 'you'] }
    ],
    fin(A) { A.all(p => { p.mood('laugh'); p.hop = 3; }); A.P.crush.emote('♥'); A.shot([0, 2.6, 4.4], [0, 1.4, -1.8], 54, .1); }
  }),

  sunset: () => ({
    bg: { view: '#f4a259' },
    sets: {
      view(G, ref) {
        floorP(G, checker('#d9c7a6', '#cbb894', 22)); bx(18, .7, .5, '#b8a27e', 0, .35, -3, G); bx(18, .08, .6, '#e8d8b8', 0, .74, -3, G);
        const sea = new T.Mesh(new T.PlaneGeometry(200, 80), M('#4f7fae')); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -2, -45); G.add(sea);
        for (let i = 0; i < 9; i++) bx(1.6, 1 + (i % 3) * .8, 1.4, ['#f2c9a0', '#e8a07a', '#f4e1c0'][i % 3], -9 + i * 2.2, -1.6 + (i % 3) * .4, -14 - (i % 2) * 3, G);
        const sun = new T.Sprite(new T.SpriteMaterial({ map: circleTex('#fff6c8', '#ffb35a'), transparent: true, fog: false })); sun.scale.set(9, 9, 1); sun.position.set(-4, 3.5, -40); G.add(sun); ref.sun = sun;
        const bus = new T.Group(); bx(5, 2.2, 2, '#ede77d', 0, 1.3, 0, bus); bx(4.6, .7, 2.05, '#5a7a9a', 0, 1.8, 0, bus); [-1.6, 1.6].forEach(x => bx(.7, .7, 2.1, '#111', x, .35, 0, bus)); bus.position.set(16, 0, 3); bus.rotation.y = Math.PI / 2 * 0; G.add(bus); ref.bus = bus;
        const dr = new T.Group(); bx(.5, .14, .5, '#333', 0, 0, 0, dr); [[-.3, -.3], [.3, -.3], [-.3, .3], [.3, .3]].forEach(([x, z]) => bx(.3, .03, .06, '#888', x, .1, z, dr)); dr.position.set(1.2, 4, -1); dr.visible = false; G.add(dr); ref.drone = dr;
      }
    },
    cast: { you: ME.you, date: ME.date, guitar: rl(5, { shirt: '#5ad1a4', guitar: 1, cap: '#a0182c' }), kneel: rl(2, { shirt: '#f4f0e6' }), she: rl(3, { shirt: '#e0355a', long: true }), guide: rl(4, { shirt: '#ff8a5c', flag: '#ede77d' }) },
    crowds: { ppl: [6, i => rl(i + 1)], tour: [8, i => rl(i + 4, { cap: ['#ede77d', '#8bdfff', '#ff8a5c'][i % 3] })] },
    beats: [
      { set: 'view', pos: { you: [-.4, -2.2, Math.PI], date: [.4, -2.2, Math.PI], guitar: [1.4, -2.2, -2.6, 'sit'] }, mood: { guitar: 'smug' }, arms: { guitar: [-1.0, -1.1] }, cam: [[1.6, 2.0, 2.2], [-.2, 1.4, -2.6], 50], at: [[1.6, A => A.close(A.P.guitar)]], wait: 2.4, r: ['guitar', 'date'] },
      { pos: { ppl: [-2.6, -.8, 2.4, 3, 2], kneel: [0, -.6, Math.PI, 'sit'], she: [0, -1.5, 0] }, enter: { ppl: [-8, 2] }, mood: { she: 'shock', date: 'eek' }, emote: { she: '!' }, cam: [[2.2, 2.2, 2.6], [0, 1.3, -1.2], 50], at: [[.4, A => { A.P.guitar.strum = true; }], [2.0, A => A.close(A.P.date)]], wait: 2.6, r: ['date', 'she'] },
      { mood: { date: 'shock', you: 'eek' }, cam: [[1.8, 1.6, 2.6], [0, 2.6, -1.2], 54], at: [[.1, A => { A.ref.drone.visible = true; A.drone = true; }], [.4, A => A.puff(0, 3.4, -1.6, '#ff7aa8', '#ffd0e0', 14)], [1.0, A => A.puff(-.4, 3.0, -2, '#ff7aa8', '#ffd0e0', 10)], [1.6, A => A.close(A.P.date)]], wait: 2.4, r: ['date', 'you'] },
      { pos: { tour: [3.4, 1.4, -1.6, 3, 2.4], guide: [2.2, .2, -1.6] }, enter: { tour: [9, 3], guide: [9, 3] }, arms: { tour: [0, -1.4] }, mood: { guide: 'smug', tour: 'laugh' }, cam: [[-2.2, 2.6, 4.2], [1.2, 1.4, -1.0], 54],
        at: [[.1, A => { A.busT = 1.6; }], [2.2, A => A.close(A.P.guide)]], wait: 2.8, r: ['guide', 'date'] },
      { arms: { guitar: [0, -1.6] }, mood: { guitar: 'smug' }, emote: { guitar: '$' }, cam: [[-1.2, 2.2, 3.2], [.4, 1.4, -1.6], 52], at: [[.1, A => { A.P.guitar.strum = false; A.give(A.P.guitar, 'hat'); A.sunset = 2.5; }], [1.4, A => A.close(A.P.guitar)]], wait: 2.2, r: ['guitar', 'date'] }
    ],
    fin(A) { A.all(p => { p.mood('laugh'); p.hop = 3; }); A.P.date.emote('♥'); A.puff(0, 3.4, -1.6, '#ff7aa8', '#ffd0e0', 16); A.shot([0, 2.6, 4.6], [0, 1.4, -1.6], 54, .1); },
    tick(dt, ref, t, A) { if (A.drone) { ref.drone.position.x = 1.2 + Math.sin(t * 1.3) * .6; ref.drone.position.y = 3.8 + Math.sin(t * 3) * .1; ref.drone.rotation.y += dt * 2; } if (A.busT > 0) { A.busT -= dt; ref.bus.position.x = 6 + Math.max(0, A.busT) * 6; } if (A.sunset > 0) { A.sunset -= dt; ref.sun.position.y -= dt * .9; } }
  }),

  blinddate: () => ({
    bg: { resto: '#2a1018', out: '#160c26' },
    sets: {
      resto(G, ref) {
        walls(G, checker('#e9dfc8', '#7c1f2b', 14), '#6d2233', '#5a1b2a');
        const cl = clothT(); tableC(G, 0, -.4, '#fff', cl); chairC(G, 0, -1.3, 0); chairC(G, -.5, -1.3, 0); chairC(G, .5, -1.3, 0); chairC(G, 0, .5, Math.PI);
        tableC(G, 2.8, -.6, '#fff', cl); chairC(G, 2.8, .3, Math.PI); tableC(G, -3, -1.2, '#fff', cl); chairC(G, -3.6, -1.2, Math.PI / 2); chairC(G, -2.4, -1.2, -Math.PI / 2); chairC(G, -3, -2.1, 0);
        bx(.7, .3, .7, '#ede77d', 0, 3.3, -.4, G); const l = new T.PointLight(0xffc070, 1.1, 8); l.position.set(0, 2.6, 0); G.add(l);
      },
      out(G) { floorP(G, null, '#2a2a33'); bx(30, .12, 3, '#55505a', 0, .06, -2.6, G); bx(14, 7, 2, '#3a1a22', 0, 3.5, -5, G); bx(4, 1.6, .1, '#ffd98a', 0, 1.6, -3.98, G); const l = new T.PointLight(0xffd080, 1.2, 8); l.position.set(0, 3, -2.4); G.add(l); }
    },
    cast: { you: ME.you, date: ME.date, sib: rl(1, { shirt: '#a597ff', long: false, hair: '#7a2d1a', skin: '#c98a62' }), friend: rl(5, { shirt: '#5ad1a4', mous: 1, cap: '#3a2416', pad: 1 }), waiter: { shirt: '#f4f0e6', pants: '#16161c', hair: '#111', tie: '#16161c', skin: '#e3c0a0' } },
    crowds: { spies: [3, i => rl(i + 7, { glasses: i === 1, long: i === 0, hair: i === 0 ? '#ff4fa3' : LOOK.hair[i] })] },
    beats: [
      { set: 'resto', pos: { you: [0, 1.3, Math.PI], date: [-.5, -1.3, 0, 'sit'], sib: [.5, -1.3, 0, 'sit'] }, arms: { date: [0, -2.4], sib: [-2.4, 0] }, mood: { date: 'laugh', sib: 'laugh' }, cam: [[1.4, 2.4, 3.6], [0, 1.2, -.6], 50], at: [[1.6, A => A.close(A.P.sib)]], wait: 2.4, r: ['date', 'sib'] },
      { pos: { you: [0, .5, Math.PI, 'sit'], date: [0, -1.3, 0, 'sit'], sib: null, friend: [2.8, .3, Math.PI, 'sit'] }, arms: { date: [0, 0], friend: [-1.4, 0] }, mood: { date: 'eek', friend: 'smug' }, emote: { friend: '…' }, cam: [[-1.4, 2.4, 3.2], [.8, 1.2, -.4], 50], at: [[1.6, A => A.close(A.P.friend)]], wait: 2.4, r: ['date', 'friend'] },
      { pos: { spies: [-3, -1.2, Math.PI / 2, 1.4, 1.4, 'sit'] }, mood: { spies: 'smug', date: 'wink' }, emote: { spies1: '!' }, cam: [[-.4, 2.6, 3.6], [-1.6, 1.2, -1.0], 52], at: [[1.6, A => A.close(A.P.spies1)]], wait: 2.4, r: ['date', 'spies1'] },
      { pos: { friend: [2.8, .3, -2.6] }, mood: { friend: 'love', date: 'eek' }, cam: [[-.6, 2.4, 3.4], [1.4, 1.5, -.2], 50], at: [[.1, A => { A.give(A.P.friend, 'glass'); A.P.friend.armT = [0, -2.4]; }], [1.4, A => A.close(A.P.friend)]], wait: 2.2, r: ['friend', 'date'] },
      { set: 'out', pos: { you: [-.5, -1.4, .3], date: [.5, -1.4, -.3], friend: [-1.6, -3.2, .2], spies: [1.6, -3.2, -.2, 2.2, .4], waiter: null }, mood: { date: 'love', friend: 'smug', spies: 'smug' }, cam: [[0, 2.0, 3.2], [0, 1.6, -1.8], 48], wait: 2.0, r: ['date', 'you'] }
    ],
    fin(A) { A.all(p => { p.mood('laugh'); p.hop = 3; }); A.P.date.emote('♥'); A.shot([0, 2.2, 3.6], [0, 1.6, -1.8], 50, .1); }
  }),

  groupchat: () => ({
    bg: { home: '#2a2040', bar: '#1a0c08' },
    sets: {
      home(G, ref) {
        walls(G, checker('#c9a77a', '#b8946a', 16), '#a597ff', '#8a7ae0');
        bx(2.4, .6, 3.4, '#f4f0e6', -4.2, .3, -2.4, G); bx(2.4, .3, .6, '#ffb8cb', -4.2, .75, -3.8, G);
        const k = document.createElement('canvas'); k.width = 128; k.height = 224; const tx = new T.CanvasTexture(k); tx.colorSpace = T.SRGBColorSpace;
        bx(2.6, 4.4, .12, '#151515', 1.4, 2.6, -4.86, G); const scr = bx(2.3, 4.0, .02, '#fff', 1.4, 2.6, -4.79, G, tx); ref.chat = { k, g: k.getContext('2d'), tx, n: 0 };
      },
      bar(G) {
        walls(G, checker('#3a2416', '#2e1c10', 18), '#3a1a12', '#2e140e');
        bx(4, .08, 1.6, '#5a3a22', 0, .74, -.6, G); [-1.6, 1.6].forEach(x => bx(.12, .7, .12, '#3a2416', x, .35, -.6, G)); bx(2.6, .9, .1, '#fff', 0, 4, -4.88, G, sign('OPEN LATE', '#ff7aa8', '#170408', 64));
        const l = new T.PointLight(0xffa060, 1.4, 10); l.position.set(0, 4, 0); G.add(l);
      }
    },
    cast: { you: ME.you, pal: ME.pal, ex: rl(9, { shirt: '#151515', glasses: 1 }), aunt: rl(6, { shirt: '#e08efb', hair: '#888', long: true }) },
    crowds: { gang: [12, i => rl(i + 2)] },
    beats: [
      { set: 'home', pos: { you: [-.4, -1.0, .2] }, arms: { you: [0, -1.4] }, mood: { you: 'eek' }, cam: [[-1.6, 2.2, 3.2], [.6, 2.0, -3], 52], at: [[.1, A => { A.give(A.P.you, 'phone'); A.chat = 1; A.ref.chat.n = 0; }], [1.8, A => { A.P.you.emote('!'); A.close(A.P.you); }]], wait: 2.6, r: ['you', 'you'] },
      { mood: { you: 'shock' }, cam: [[0, 2.4, 2.6], [1.2, 2.6, -4], 46], at: [[.1, A => { A.chat = 2; }], [1.6, A => A.close(A.P.you)]], wait: 2.4, r: ['you', 'you'] },
      { set: 'bar', pos: { you: [0, .4, Math.PI, 'sit'] }, mood: { you: 'sad' }, cam: [[0, 2.6, 3.4], [0, 1.2, -.6], 50], at: [[.1, A => { A.chat = 0; }], [1.4, A => { A.P.you.emote('…'); A.close(A.P.you); }]], wait: 2.2, r: ['you', 'you'] },
      { pos: { gang: [0, -1.8, 0, 5, 1.4], pal: [-1.2, .4, Math.PI, 'sit'], ex: [3.6, 1.8, -2.4] }, enter: { gang: [7, 2], ex: [8, 3] }, mood: { pal: 'eek', gang: 'laugh', you: 'laugh' }, emote: { pal: '!' }, cam: [[-1.8, 2.8, 4], [.6, 1.3, -.8], 54],
        at: [[2.2, A => A.close(A.P.ex)]], wait: 2.8, r: ['pal', 'ex'] },
      { pos: { you: [0, .6, Math.PI], pal: [-1.0, .6, Math.PI], ex: [1.0, .6, Math.PI], gang: [0, -1.4, 0, 6, 1.6] }, arms: { gang: [-2.4, -2.4] }, mood: { gang: 'love' }, emote: { gang2: '?' }, cam: [[0, 2.6, 4.6], [0, 1.4, -.6], 56], wait: 2.0, r: ['pal', 'you'] }
    ],
    fin(A) { A.all(p => { p.mood('laugh'); p.hop = 3; p.armT = [-2.4, -2.4]; }); A.shot([0, 2.6, 4.8], [0, 1.4, -.8], 56, .1); },
    tick(dt, ref, t, A) {
      const c = ref.chat; if (!c) return; if (A.chat && Math.floor(t * 4) !== c.last) { c.last = Math.floor(t * 4); c.n = Math.min(c.n + 1, 30); }
      if (A.chat && c.drawn !== c.n) { c.drawn = c.n; const g = c.g; g.fillStyle = '#f9f0f0'; g.fillRect(0, 0, 128, 224); g.fillStyle = '#3b0f18'; g.fillRect(0, 0, 128, 18); const C = ['#ffb8cb', '#b0ef8b', '#8bdfff', '#ede77d', '#e08efb'];
        for (let i = 0; i < c.n; i++) { const y = 210 - (c.n - i) * 14; if (y < 20) continue; const r = i % 3 === 0, w = 30 + (i * 37) % 60; g.fillStyle = C[i % 5]; g.fillRect(r ? 124 - w : 6, y, w, 10); }
        c.tx.needsUpdate = true; }
    }
  })
});

export function mountStory(host, id, opt) {
  opt = opt || {}; STYLE = opt.toon ? 'toon' : 'pixel';
  if (!R) { R = new T.WebGLRenderer({ antialias: false }); R.setPixelRatio(1); const c = R.domElement; c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges;display:block;z-index:0'; }
  const b = host.getBoundingClientRect(); let W, H, RR;
  if (STYLE === 'toon') {
    if (!R2) { R2 = new T.WebGLRenderer({ antialias: true }); R2.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0'; }
    RR = R2; RR.setPixelRatio(Math.min(2, devicePixelRatio || 1)); W = Math.round(b.width); H = Math.round(b.height); if (R.domElement.parentNode) R.domElement.parentNode.removeChild(R.domElement);
  } else { RR = R; W = Math.max(60, Math.round(b.width / 3)); H = Math.max(60, Math.round(b.height / 3)); if (R2 && R2.domElement.parentNode) R2.domElement.parentNode.removeChild(R2.domElement); }
  RR.setSize(W, H, false); host.insertBefore(RR.domElement, host.firstChild);
  const S = new T.Scene(), cam = new T.PerspectiveCamera(48, W / H, .1, 120);
  const toon = STYLE === 'toon';
  const amb = toon ? new T.HemisphereLight(0xfff4e8, 0x6a4a5a, .9) : new T.AmbientLight(0xffffff, .62); S.add(amb); const dl = new T.DirectionalLight(0xfff0d0, toon ? 1.5 : .75); dl.position.set(3, 7, 5); S.add(dl); const AMB0 = amb.intensity;
  const D = STORIES[id](), ref = {}, sets = {};
  Object.keys(D.sets).forEach(n => { const G = new T.Group(), r = {}; D.sets[n](G, r); Object.assign(ref, r); sets[n] = { G, ref: r }; G.visible = false; S.add(G); });
  const P = {}, names = [];
  Object.keys(D.cast).forEach(n => { P[n] = person(S, D.cast[n]); names.push(n); });
  const crowds = {}; Object.keys(D.crowds || {}).forEach(n => { const [k, lf] = D.crowds[n]; crowds[n] = []; for (let i = 0; i < k; i++) { const p = person(S, lf(i)); P[n + i] = p; names.push(n + i); crowds[n].push(p); } });
  names.forEach(n => P[n].g.visible = false);
  if (toon) outline(S);
  const A = { P, ref, sets, dark: 0, bright: false, sway: false };
  const look = new T.Vector3(); let push = 0, cuts = [], ct = 0, cur = null, pos = {}, puffs = [], T0 = 0;
  A.all = f => names.forEach(n => { if (P[n].g.visible) f(P[n], n); });
  A.shot = (p, l, fov, ps) => { if (typeof unhide === 'function' && !A._inClose) {} cam.position.set(...p); look.set(...l); cam.fov = fov || 48; cam.updateProjectionMatrix(); cam.lookAt(look); push = ps == null ? .1 : ps; };
  let tmpHid = [];
  const unhide = () => { tmpHid.forEach(q => q.g.visible = true); tmpHid = []; };
  A.close = (Q, fov) => {
    unhide();
    if (Q.g.rotation.x === 0 && Math.cos(Q.face) < .2) { Q.face = Q.g.position.x > 0 ? -.4 : .4; Q.g.rotation.y = Q.face; Q.tgt = null; }
    const x = Q.g.position.x, z = Q.g.position.z, y = Q.g.position.y + (Q.g.rotation.x ? .3 : Q.seated ? 1.76 : 2.06), ry = Q.face, o = .3;
    const a = Math.cos(ry + o) > Math.cos(ry - o) ? ry + o : ry - o, cx = x + Math.sin(a) * 2, cz = z + Math.cos(a) * 2;
    A.shot([cx, y + .08, cz], [x, y, z], fov || 34, .12);
    const dx = x - cx, dz = z - cz, L2 = dx * dx + dz * dz;
    names.forEach(n => { const q = P[n]; if (q === Q || !q.g.visible) return; const px = q.g.position.x - cx, pz = q.g.position.z - cz, t = (px * dx + pz * dz) / L2; if (t <= 0 || t >= 1) return; const ex = px - t * dx, ez = pz - t * dz; if (ex * ex + ez * ez < .36) { q.g.visible = false; tmpHid.push(q); } });
  };
  A.puff = (x, y, z, c1, c2, n) => { for (let i = 0; i < (n || 9); i++) { const m = new T.Mesh(new T.BoxGeometry(.22, .22, .22), new T.MeshLambertMaterial({ color: i % 2 ? (c1 || '#9fd36a') : (c2 || '#c8e88a'), transparent: true, opacity: .85 })); m.position.set(x + rnd(-.3, .3), y + rnd(-.2, .2), z + rnd(-.3, .3)); m.userData.v = [rnd(-.4, .4), rnd(.4, .9), rnd(-.4, .4)]; m.userData.t = 1.6; S.add(m); puffs.push(m); } };
  A.give = (Q, what) => { if (Q['_' + what]) return; const g = new T.Group();
    if (what === 'sword') { bx(.08, 1.1, .08, '#d8dde3', 0, -.95, .25, g); bx(.34, .06, .1, '#c9a24a', 0, -.42, .2, g); }
    if (what === 'phone') { bx(.16, .28, .04, '#151515', 0, -.8, .16, g); bx(.13, .22, .01, '#8bdfff', 0, -.8, .185, g); }
    if (what === 'glass') { bx(.1, .2, .1, '#cfefff', 0, -.86, .12, g); }
    if (what === 'mic') { bx(.08, .26, .08, '#222', 0, -.82, .1, g); bx(.12, .12, .12, '#888', 0, -.98, .1, g); }
    if (what === 'hat') { bx(.36, .14, .36, '#3a2416', 0, -.86, .16, g); }
    if (toon) outline(g); Q.arms[1].add(g); Q['_' + what] = g; };
  A.setSet = n => { Object.keys(sets).forEach(k => sets[k].G.visible = k === n); S.background = new T.Color((D.bg || {})[n] || '#222'); cur = n; };
  const one = (Q, e) => { const lay = e.includes('lay'), up = e.includes('up'), top = e.includes('top'); Q.sit(e.includes('sit')); Q.g.rotation.x = 0; Q.baseY = (up ? (typeof e[e.indexOf('up') + 1] === 'number' ? e[e.indexOf('up') + 1] : .4) : 0) + (top ? 1.35 : 0) + (Q.seated ? -.3 : 0); Q.place(e[0], e[1], e[2]); if (lay) { const h = e.includes('hi') ? 1.45 : .25; Q.g.rotation.x = -Math.PI / 2; Q.baseY = h; Q.g.position.y = h; } Q.g.visible = true; };
  A.place = (n, e) => {
    if (crowds[n]) { const [cx, cz, ry, w, d] = e, list = crowds[n], flags = e.slice(5); list.forEach((Q, i) => { const cols = Math.ceil(Math.sqrt(list.length * (w / Math.max(.5, d)))), r = Math.floor(i / cols), c = i % cols; const x = cx - w / 2 + (c + .5) * (w / cols) + ((r % 2) ? .2 : -.1), z = cz + (r - .5 * (Math.ceil(list.length / cols) - 1)) * (d / Math.max(1, Math.ceil(list.length / cols))); one(Q, [x, z, ry + rnd(-.25, .25), ...flags]); }); return; }
    one(P[n], e);
  };
  const hide = n => { (crowds[n] || [P[n]]).forEach(Q => { Q.g.visible = false; Q.tgt = null; }); };
  const each = (n, f) => (crowds[n] || [P[n]]).forEach(f);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const apply = (i) => {
    const B = D.beats[i]; cuts = []; ct = 0; A.dark = 0; A.bright = !!B.bright; A.fog = null;
    unhide(); if (B.set) A.setSet(B.set);
    Object.assign(pos, B.pos || {}); Object.keys(pos).forEach(n => { if (pos[n] == null) { hide(n); delete pos[n]; } });
    names.forEach(n => P[n].reset());
    Object.keys(pos).forEach(n => A.place(n, pos[n]));
    Object.keys(B.enter || {}).forEach(n => { const [fx, fz] = B.enter[n]; each(n, (Q, j) => { const tx = Q.g.position.x, tz = Q.g.position.z, ry = Q.face, y = Q.baseY; Q.g.position.set(fx + (j || 0) * .5, y, fz + (j || 0) * .3); Q.walk(tx, tz, ry, 3.6 + rnd(0, .8)); }); });
    for (const k of ['mood', 'emote', 'arms', 'lean']) Object.keys(B[k] || {}).forEach(n => each(n, Q => { const v = B[k][n]; if (k === 'mood') Q.mood(v); else if (k === 'emote') Q.emote(v); else if (k === 'arms') Q.armT = v.slice(); else Q.lean = v; }));
    A.shot(...B.cam, B.push); cuts = (B.at || []).slice();
  };
  const setOff = v => { if (v) cam.setViewOffset(W, H, 0, Math.round(H * .24), W, H); else cam.clearViewOffset(); };
  let bi = 0;
  const api = {
    beat(i) { bi = i; setOff(false); apply(i); return D.beats[i].wait || 2.5; },
    establish() { setOff(false); apply(0); cuts = []; names.forEach(n => { P[n].tgt = null; }); const c = D.beats[0].cam; A.shot([c[0][0] * 1.4, c[0][1] + .8, c[0][2] * 1.5 + 1], c[1], c[2] + 6, .3); },
    ask() { setOff(true); unhide(); const B = D.beats[bi]; A.shot(...(B.ask || B.cam), .04); },
    react(i, k, q, pts) {
      setOff(false); cuts = []; ct = 0; unhide(); const B = D.beats[i];
      names.forEach(n => { P[n].lean = 0; });
      const you = P.you, comp = P[B.r && B.r[1] && B.r[1] !== 'you' ? B.r[1] : 'you'];
      A.all((Q, n) => { if (n === 'you') return; Q.mood(q === 'good' ? 'laugh' : q === 'mid' ? 'wink' : q === 'bad' ? 'smug' : 'eek'); if (q === 'good' && Math.random() < .5) Q.hop = .8; });
      if (q === 'good') { you.mood('smug'); you.armT = [0, -2.2]; P[B.r[0]].emote('!'); }
      else if (q === 'mid') { you.mood(''); P[B.r[0]].emote('…'); }
      else if (q === 'bad') { you.mood('sad'); you.lean = .3; P[B.r[0]].emote('…'); }
      else { you.mood('eek'); you.emote('…'); }
      if (B.react) B.react(A, k, pts);
      const first = P[B.r[0]], second = P[B.r[1]] || you;
      if (q === 'none') { A.close(you); cuts = [[1.4, () => A.close(first)]]; return; }
      A.close(first); cuts = [[1.35, () => A.close(second === first ? you : second)]];
    },
    fin() { setOff(false); cuts = []; unhide(); D.fin(A); },
    tick(dt) {
      T0 += dt; ct += dt; while (cuts.length && ct >= cuts[0][0]) cuts.shift()[1](A);
      names.forEach(n => { const Q = P[n]; if (Q.g.visible) { Q.tick(dt); if (A.sway) Q.body.rotation.z = Math.sin(T0 * 2 + Q.t) * .12; } });
      puffs = puffs.filter(m => { m.userData.t -= dt; const v = m.userData.v; m.position.x += v[0] * dt; m.position.y += v[1] * dt; m.position.z += v[2] * dt; m.scale.setScalar(1 + (1.6 - m.userData.t) * .8); m.material.opacity = Math.max(0, m.userData.t / 1.6) * .85; if (m.userData.t <= 0) { S.remove(m); return false; } return true; });
      amb.intensity = A.bright ? AMB0 * 1.5 : A.dark > 0 ? .08 : AMB0;
      if (A.fog !== A._fog) { A._fog = A.fog; S.fog = A.fog ? new T.Fog(A.fog, .5, 6) : null; }
      if (D.tick) D.tick(dt, ref, T0, A);
      if (push) { const d = look.clone().sub(cam.position).normalize(); cam.position.addScaledVector(d, push * dt); cam.lookAt(look); }
      RR.render(S, cam);
    }
  };
  return api;
}
