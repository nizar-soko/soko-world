// Soko newspaper reader, rebuilt in 3D (toon shaded, ink outlines).
// He climbs up behind the card, rests his newspaper on the card's top edge,
// peeks over it, looks around, then ducks back down. y = 0 is the card edge.
import * as THREE from './three.min.js';

const INK = 0x3b0f18, PAPER = 0xf9f0f0, PINK = 0xffb8cb, PINKM = 0xef8ea8, CREAM = 0xfff4e8;

function toonRamp() {
  const d = new Uint8Array([90, 170, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
function paperTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 340; const x = c.getContext('2d');
  x.fillStyle = '#ffb8cb'; x.fillRect(0, 0, 512, 340);
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(59,15,24,${Math.random() * .05})`; x.fillRect(Math.random() * 512, Math.random() * 340, 2, 2); }
  x.fillStyle = '#3b0f18';
  for (const ox of [0, 256]) {
    x.fillRect(ox + 22, 22, 212, 30);                       // headline bar
    x.fillStyle = '#f9f0f0'; x.fillRect(ox + 22, 66, 96, 74); x.fillStyle = '#3b0f18'; // photo box
    x.strokeStyle = '#3b0f18'; x.lineWidth = 4; x.strokeRect(ox + 22, 66, 96, 74);
    for (let r = 0; r < 4; r++) x.fillRect(ox + 132, 70 + r * 18, 102 - (r % 2) * 22, 7);
    for (let r = 0; r < 8; r++) for (let k = 0; k < 2; k++) x.fillRect(ox + 22 + k * 112, 160 + r * 20, 96 - ((r + k) % 3) * 14, 6);
  }
  x.fillStyle = 'rgba(59,15,24,.35)'; x.fillRect(254, 0, 4, 340);  // centre fold
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function outline(mesh, s = 1.06) {
  const o = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }));
  o.scale.setScalar(s); mesh.add(o); return mesh;
}

export function mountPeek(host, { onTap, onBubble } = {}) {
  const W = host.clientWidth || 210, H = host.clientHeight || 190;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace; host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(26, W / H, .1, 50); cam.position.set(0, 1.05, 9.2); cam.lookAt(0, 1.05, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe9c6cf, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(-3, 5, 6); scene.add(sun);
  const ramp = toonRamp(), M = c => new THREE.MeshToonMaterial({ color: c, gradientMap: ramp });

  // ---------- character ----------
  const root = new THREE.Group(); scene.add(root);

  // newspaper: a slightly cupped spread, held at the bottom edge on the card
  const pg = new THREE.PlaneGeometry(2.7, 1.8, 24, 8); const pos = pg.attributes.position;
  for (let i = 0; i < pos.count; i++) { const px = pos.getX(i), py = pos.getY(i); pos.setZ(i, -Math.abs(px) * .42 + Math.cos(px * 2.2) * .07 + Math.sin(py * 1.7) * .06); }
  pg.computeVertexNormals(); pg.translate(0, .9, 0);                 // bottom edge at y=0
  const paperM = new THREE.MeshToonMaterial({ map: paperTex(), gradientMap: ramp, side: THREE.DoubleSide });
  const paper = new THREE.Group(); const sheet = new THREE.Mesh(pg, paperM); paper.add(sheet);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(pg, 30), new THREE.LineBasicMaterial({ color: INK })); paper.add(edge);
  paper.position.set(0, 0, .55); paper.rotation.x = -.05; root.add(paper);

  // hands gripping both sides of the paper, ink mittens with a thumb over the front
  const hands = [];
  for (const sx of [-1, 1]) {
    const h = new THREE.Group();
    const palm = outline(new THREE.Mesh(new THREE.SphereGeometry(.19, 20, 14), M(INK)), 1.08); palm.scale.set(1, 1.2, .8); h.add(palm);
    const thumb = outline(new THREE.Mesh(new THREE.CapsuleGeometry(.07, .16, 4, 10), M(INK)), 1.12); thumb.position.set(-sx * .1, .02, .16); thumb.rotation.z = sx * .9; h.add(thumb);
    h.position.set(sx * 1.34, .78, .12); root.add(h); hands.push(h);
  }

  // head (behind the paper, peeks over the top)
  const head = new THREE.Group(); root.add(head);
  const skull = outline(new THREE.Mesh(new THREE.SphereGeometry(.56, 32, 24), M(PAPER)), 1.045); skull.scale.set(1, 1.08, .95); head.add(skull);
  const nose = outline(new THREE.Mesh(new THREE.ConeGeometry(.13, .5, 18), M(PINKM)), 1.1); nose.rotation.x = Math.PI / 2 + .25; nose.position.set(0, -.04, .66); head.add(nose);
  const eyes = [], brows = [];
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(.075, 14, 10), new THREE.MeshBasicMaterial({ color: INK })); e.scale.set(1, 1.35, .6); e.position.set(sx * .2, .12, .5); head.add(e); eyes.push(e);
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(.03, .16, 4, 8), new THREE.MeshBasicMaterial({ color: INK })); b.rotation.z = Math.PI / 2 - sx * .22; b.position.set(sx * .21, .32, .49); head.add(b); brows.push(b);
  }
  const cheekM = new THREE.MeshBasicMaterial({ color: PINK, transparent: true, opacity: .8 });
  for (const sx of [-1, 1]) { const ck = new THREE.Mesh(new THREE.CircleGeometry(.08, 16), cheekM); ck.position.set(sx * .33, -.08, .5); ck.rotation.y = sx * .45; head.add(ck); }
  // beret: squashed disc + little stalk, cream with ink rim, tilted like the 2D one
  const beret = new THREE.Group(); head.add(beret);
  const cap = outline(new THREE.Mesh(new THREE.SphereGeometry(.62, 28, 16), M(CREAM)), 1.05); cap.scale.set(1.08, .32, 1); beret.add(cap);
  const stalk = outline(new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, .14, 10), M(INK)), 1.1); stalk.position.y = .22; beret.add(stalk);
  beret.position.set(-.12, .5, -.02); beret.rotation.set(-.12, 0, .28);
  // coat collar (only ever seen when he's mid-climb)
  const coat = outline(new THREE.Mesh(new THREE.CylinderGeometry(.45, .7, 1.2, 24), M(INK)), 1.04); coat.position.set(0, -.75, -1.0); root.add(coat);

  // ---------- motion ----------
  const ease = t => t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3);
  const back = t => { t = Math.min(1, Math.max(0, t)); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const LOOP = 7.2; let t0 = performance.now(), raf = 0, alive = true, tapT = -9, bubble = false, hidden = false;
  function frame(now) {
    if (!alive) return; raf = requestAnimationFrame(frame);
    if (hidden) return;
    const T = (now - t0) / 1000, t = T % LOOP, k = T - tapT;
    // body: climb up (0.4-1.2s), hold, sink (6.2-7s)
    const up = t < 6.2 ? back((t - .4) / .8) : 1 - ease((t - 6.2) / .8);
    root.position.y = -2.9 + up * 2.9;
    // the thunk when the paper lands on the edge
    const land = Math.max(0, 1 - Math.abs(t - 1.2) / .18);
    paper.scale.set(1 + land * .04, 1 - land * .06, 1);
    // head: hidden behind the paper, then peeks over it (1.4-1.9s), ducks at 5.6s
    const peek = t < 5.6 ? back((t - 1.4) / .55) : 1 - ease((t - 5.6) / .45);
    head.position.set(Math.sin(T * .7) * .05, .7 + peek * 1.5, -1.0);
    // look around: left, right, at you
    let yaw = 0; if (t > 2 && t < 2.8) yaw = -.55 * ease((t - 2) / .3); else if (t >= 2.8 && t < 3.6) yaw = -.55 + 1.1 * ease((t - 2.8) / .35); else if (t >= 3.6 && t < 4.2) yaw = .55 - .55 * ease((t - 3.6) / .3);
    head.rotation.y = yaw; head.rotation.z = Math.sin(T * 1.3) * .05 - yaw * .08; head.rotation.x = -.08 + Math.sin(T * 2.1) * .03;
    // blink + brow raise when he looks at you
    const bl = (t > 3.0 && t < 3.12) || (t > 5.0 && t < 5.1) ? .12 : 1; eyes.forEach(e => e.scale.y = 1.35 * bl);
    const br = t > 4.2 && t < 5.4 ? .07 : 0; brows.forEach(b => b.position.y = .32 + br);
    // hands squeeze the paper a little, paper breathes
    hands.forEach((h, i) => { h.position.y = .78 + Math.sin(T * 2 + i) * .03; h.rotation.z = Math.sin(T * 1.5 + i) * .1; });
    paper.rotation.z = Math.sin(T * .9) * .025; paper.rotation.y = yaw * .12;
    // tap: happy hop
    if (k < .6) { const h = Math.sin(Math.min(1, k / .6) * Math.PI); root.position.y += h * .35; head.position.y += h * .2; }
    const show = t > 1.9 && t < 5.5; if (show !== bubble) { bubble = show; onBubble && onBubble(show); }
    renderer.render(scene, cam);
  }
  raf = requestAnimationFrame(frame);
  return {
    el: renderer.domElement,
    hop() { tapT = (performance.now() - t0) / 1000; },
    setHidden(v) { hidden = v; },
    destroy() { alive = false; cancelAnimationFrame(raf); renderer.domElement.remove(); renderer.dispose(); }
  };
}
