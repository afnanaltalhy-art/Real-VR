// أصدقاء الشمس — عالم ثلاثي الأبعاد: حيوانات كرتونية تُبنى بالكود + صحراء فوق الكاميرا
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const INK = 0x3b1e5c;
const GRAD = (() => { const t = new THREE.DataTexture(new Uint8Array([110, 185, 255]), 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const mats = {};
const M = c => mats[c] || (mats[c] = new THREE.MeshToonMaterial({ color: c, gradientMap: GRAD }));
const OUT = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const S = r => new THREE.SphereGeometry(r, 28, 18);
const Cap = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 14);
const Cone = (r, h) => new THREE.ConeGeometry(r, h, 18);
const PI = Math.PI;

function part(parent, geo, color, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0], outline = true) {
  const m = new THREE.Mesh(geo, M(color));
  m.position.set(...p); m.scale.set(...s); m.rotation.set(...r); m.castShadow = true;
  if (outline) { const o = new THREE.Mesh(geo, OUT); o.scale.setScalar(1.07); m.add(o); }
  parent.add(m); return m;
}
function grp(parent, p = [0, 0, 0]) { const g = new THREE.Group(); g.position.set(...p); parent.add(g); return g; }
function eye(parent, x, y, z, r, side) {
  const g = grp(parent, [x, y, z]);
  part(g, S(r), 0xffffff);
  part(g, S(r * 0.62), 0x1a1030, [r * 0.48, 0, side * r * 0.3], [1, 1, 1], [0, 0, 0], false);
  part(g, S(r * 0.22), 0xffffff, [r * 0.82, r * 0.32, side * r * 0.42], [1, 1, 1], [0, 0, 0], false);
  return g;
}
function leg(parent, p, len, r, color, foot, footScale = [1.25, .7, 1.25]) {
  const pv = grp(parent, p);
  part(pv, Cap(r, len), color, [0, -len / 2 - r * 0.5, 0]);
  if (foot) part(pv, S(r * 1.25), foot, [0.03, -len - r * 0.6, 0], footScale);
  return pv;
}
const swing = (legs, t, amp, sp) => legs.forEach((l, i) => l.rotation.z = Math.sin(t * sp + (i % 2 === (i < 2 ? 0 : 1) ? 0 : PI)) * amp);

/* ------------------ builders: each faces +X, stands on y=0 ------------------ */
const BUILD = {
  camel() {
    const g = new THREE.Group(), C = 0xD9A066, D = 0xB98045, L = 0xF3D29C;
    part(g, S(.5), C, [0, 1.05, 0], [1.15, .72, .72]);
    part(g, S(.36), D, [-.08, 1.47, 0], [1.1, .95, .9]);
    part(g, Cap(.15, .55), C, [.6, 1.42, 0], [1, 1, 1], [0, 0, -.6]);
    const head = grp(g, [.88, 1.82, 0]);
    part(head, S(.24), C, [0, 0, 0], [1.25, 1, 1]);
    part(head, S(.17), L, [.22, -.07, 0], [1.1, .85, 1]);
    [1, -1].forEach(s => {
      part(head, S(.03), 0x6b3d1f, [.38, -.03, s * .07], [1, 1, 1], [0, 0, 0], false);
      part(head, Cone(.07, .16), D, [-.12, .22, s * .13], [1, 1, 1], [s * .45, 0, 0]);
      eye(head, .12, .08, s * .17, .08, s);
      part(head, S(.05), 0xF4A3A3, [.16, -.06, s * .19], [1, .6, .4], [0, 0, 0], false);
    });
    const legs = [[.4, .22], [-.4, -.22], [.4, -.22], [-.4, .22]].map(([x, z]) => leg(g, [x, .68, z], .55, .085, C, D));
    const tail = grp(g, [-.6, 1.12, 0]);
    part(tail, Cap(.04, .3), D, [-.05, -.18, 0], [1, 1, 1], [0, 0, -.3]);
    part(tail, S(.07), 0x7a4a22, [-.11, -.38, 0]);
    return { g, legs, head, tail, h: 2.15, speed: .55, sp: 7, amp: .35 };
  },
  fox() {
    const g = new THREE.Group(), C = 0xF2C27E, W = 0xFFF4E2, P = 0xF7A8B8;
    part(g, S(.34), C, [0, .55, 0], [1.3, .85, .8]);
    part(g, S(.28), W, [.08, .5, 0], [1.1, .72, .72], [0, 0, 0], false);
    const head = grp(g, [.5, .88, 0]);
    part(head, S(.28), C, [0, 0, 0], [1, .95, .95]);
    part(head, Cone(.11, .24), W, [.3, -.08, 0], [1, 1, 1], [0, 0, -PI / 2]);
    part(head, S(.05), 0x2a1a10, [.43, -.08, 0], [1, 1, 1], [0, 0, 0], false);
    const ears = [];
    [1, -1].forEach(s => {
      part(head, S(.13), W, [.12, -.1, s * .12], [1, .8, .8], [0, 0, 0], false);
      const e = grp(head, [-.03, .26, s * .15]); e.rotation.x = s * .38; ears.push(e);
      part(e, Cone(.14, .46), C, [0, .2, 0]);
      part(e, Cone(.09, .32), P, [.06, .17, 0], [1, 1, .5], [0, 0, 0], false);
      eye(head, .19, .07, s * .13, .09, s);
    });
    const legs = [[.28, .15], [-.28, -.15], [.28, -.15], [-.28, .15]].map(([x, z]) => leg(g, [x, .36, z], .24, .06, C, W));
    const tail = grp(g, [-.42, .62, 0]);
    part(tail, S(.17), C, [-.24, .06, 0], [1.7, .8, .8]);
    part(tail, S(.11), 0x4a2a14, [-.5, .1, 0], [1.2, .9, .9]);
    return { g, legs, head, tail, ears, h: 1.35, speed: .8, sp: 11, amp: .45 };
  },
  lizard() {
    const g = new THREE.Group(), C = 0xB5BE5E, D = 0x7E8C3A, B = 0xEADCA2;
    part(g, S(.3), C, [0, .24, 0], [1.5, .55, .85]);
    [[.1, .37, .08], [-.15, .36, -.1], [-.02, .38, -.02], [.25, .33, -.1], [-.3, .32, .06]].forEach(p => part(g, S(.05), D, p, [1, .5, 1], [0, 0, 0], false));
    const head = grp(g, [.52, .3, 0]);
    part(head, S(.18), C, [0, 0, 0], [1.3, .8, 1]);
    part(head, S(.12), B, [.08, -.06, 0], [1.3, .5, .9], [0, 0, 0], false);
    [1, -1].forEach(s => eye(head, .05, .11, s * .11, .07, s));
    const tail = grp(g, [-.42, .22, 0]);
    [[-.08, .13], [-.3, .105], [-.5, .08], [-.67, .055], [-.8, .035]].forEach(([x, r], i) => {
      part(tail, S(r), i % 2 ? D : C, [x, -i * .025, 0], [1.4, .8, 1]);
      part(tail, Cone(r * .45, r * .9), D, [x, r * .7 - i * .025, 0], [1, 1, 1], [0, 0, 0], false);
    });
    const legs = [];
    [[.3, 1], [.3, -1], [-.28, 1], [-.28, -1]].forEach(([x, s]) => {
      const pv = grp(g, [x, .18, s * .2]); pv.rotation.order = 'YXZ'; pv.rotation.x = -s * .95;
      part(pv, Cap(.05, .14), C, [0, -.1, 0]); part(pv, S(.06), D, [.02, -.2, 0], [1.3, .6, 1.3]); legs.push(pv);
    });
    return { g, legs, head, tail, h: .6, speed: .9, sp: 14, amp: .5, sprawl: true, scale: 1.7 };
  },
  snake() {
    const g = new THREE.Group(), C = 0x7CC65A, D = 0x4E9A3A;
    const segs = [], N = 24;
    let px = -.06, pr = .15;
    for (let i = 0; i < N; i++) { const r = .14 - i * .0046; px -= (pr + r) * .5; pr = r; segs.push(part(g, S(r), i % 3 === 1 ? D : C, [px, r, 0])); }
    const head = grp(g, [.05, .15, 0]);
    part(head, S(.17), C, [0, 0, 0], [1.35, .8, 1.05]);
    [1, -1].forEach(s => eye(head, .06, .1, s * .1, .075, s));
    const tongue = grp(head, [.22, -.04, 0]);
    part(tongue, new THREE.BoxGeometry(.14, .015, .02), 0xE2394B, [.07, 0, 0], [1, 1, 1], [0, 0, 0], false);
    [1, -1].forEach(s => part(tongue, new THREE.BoxGeometry(.06, .015, .015), 0xE2394B, [.16, 0, s * .02], [1, 1, 1], [0, s * .5, 0], false));
    return { g, legs: [], head, segs, tongue, h: .55, speed: .6, scale: 1.5 };
  },
  scorpion() {
    const g = new THREE.Group(), C = 0xD58F45, D = 0x9A5A22;
    part(g, S(.25), C, [0, .26, 0], [1.3, .55, .9]);
    const head = grp(g, [.32, .27, 0]);
    part(head, S(.17), C, [0, 0, 0], [1, .65, .9]);
    [1, -1].forEach(s => eye(head, .1, .08, s * .07, .055, s));
    const legs = [];
    [.15, .03, -.09, -.21].forEach((x, i) => [1, -1].forEach(s => {
      const pv = grp(g, [x, .22, s * .17]); pv.rotation.order = 'YXZ'; pv.rotation.x = -s * 1.05;
      part(pv, Cap(.028, .22), D, [0, -.13, 0]); legs.push(pv);
    }));
    const claws = [];
    [1, -1].forEach(s => {
      const pv = grp(g, [.4, .24, s * .13]); pv.rotation.y = -s * .35; claws.push(pv);
      part(pv, Cap(.045, .2), C, [.13, 0, 0], [1, 1, 1], [0, 0, -PI / 2]);
      part(pv, S(.1), D, [.32, .01, 0], [1.4, .7, 1]);
      part(pv, Cone(.035, .12), D, [.46, .03, s * .03], [1, 1, 1], [0, 0, -PI / 2]);
    });
    const tail = grp(g, [-.28, .3, 0]);
    const pts = [.35, .85, 1.35, 1.85, 2.3];
    pts.forEach((a, i) => part(tail, S(.1 - i * .01), i % 2 ? D : C, [-.28 * Math.sin(a), .28 * (1 - Math.cos(a)), 0]));
    const tip = part(tail, Cone(.05, .16), 0x3B1E5C, [-.28 * Math.sin(2.65) + .06, .28 * (1 - Math.cos(2.65)) - .02, 0], [1, 1, 1], [0, 0, 2.1], false);
    return { g, legs, head, tail, claws, h: .8, speed: .7, sp: 16, amp: .35, sprawl: true, scale: 1.6 };
  },
  falcon() {
    const g = new THREE.Group(), C = 0x8B5A2B, W = 0xF5E6C8, Y = 0xF4B400, T = 0x5C3A1A;
    part(g, S(.3), C, [0, 0, 0], [1.35, .85, .85]);
    part(g, S(.24), W, [.12, -.04, 0], [1, .85, .8], [0, 0, 0], false);
    const head = grp(g, [.4, .22, 0]);
    part(head, S(.21), C);
    part(head, S(.15), W, [.08, -.04, 0], [1, 1, 1.05], [0, 0, 0], false);
    part(head, Cone(.065, .17), Y, [.24, -.05, 0], [1, 1, 1], [0, 0, -PI / 2 - .25]);
    [1, -1].forEach(s => eye(head, .11, .06, s * .12, .07, s));
    const wings = [];
    [1, -1].forEach(s => {
      const pv = grp(g, [-.02, .1, s * .2]); wings.push(pv);
      part(pv, S(.3), C, [-.06, 0, s * .36], [.85, .12, 1.4]);
      part(pv, S(.16), T, [-.14, 0, s * .72], [1.1, .12, 1.2]);
    });
    part(g, S(.16), T, [-.42, -.02, 0], [1.4, .16, .9]);
    [1, -1].forEach(s => part(g, S(.05), Y, [.05, -.26, s * .08], [1.2, .7, 1]));
    return { g, legs: [], head, wings, h: .8, fly: true, speed: .9 };
  },
  cactus() {
    const g = new THREE.Group(), G = 0x46B05A, D = 0x2F8A45;
    part(g, Cap(.28, 1.0), G, [0, .78, 0]);
    part(g, Cap(.12, .3), G, [.3, .82, 0], [1, 1, 1], [0, 0, PI / 2]);
    part(g, Cap(.12, .34), G, [.47, 1.06, 0]);
    part(g, Cap(.11, .26), G, [-.28, .58, 0], [1, 1, 1], [0, 0, PI / 2]);
    part(g, Cap(.11, .3), G, [-.43, .8, 0]);
    for (let i = 0; i < 18; i++) { const a = i * 2.4, y = .35 + (i % 6) * .2; part(g, Cone(.02, .07), 0xFFF6D8, [Math.cos(a) * .29, y, Math.sin(a) * .29], [1, 1, 1], [Math.sin(a) * 1.5, 0, -Math.cos(a) * 1.5], false); }
    const top = grp(g, [0, 1.42, 0]);
    for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; part(top, S(.07), 0xFF6FA8, [Math.cos(a) * .08, 0, Math.sin(a) * .08], [1, .6, 1]); }
    part(top, S(.05), 0xFFD23F, [0, .03, 0]);
    const head = grp(g, [0, 1.05, 0]); head.rotation.y = -PI / 2; // face +Z (towards the viewer)
    const face = grp(head, [.26, 0, 0]);
    [1, -1].forEach(s => { eye(face, 0, .05, s * .1, .065, s); part(face, S(.04), 0xF79AB5, [-.02, -.06, s * .16], [.5, .6, 1], [0, 0, 0], false); });
    part(face, new THREE.TorusGeometry(.06, .014, 8, 18, PI), 0x3B1E5C, [0, -.08, 0], [1, 1, 1], [0, PI / 2, PI], false);
    return { g, legs: [], head: top, h: 1.6, still: true };
  },
};

/* ------------------ per-frame animation ------------------ */
function animate(k, t, moving) {
  const m = moving ? 1 : 0;
  if (k.legs.length && !k.sprawl) k.legs.forEach((l, i) => l.rotation.z = Math.sin(t * k.sp + (i % 2) * PI) * k.amp * m);
  if (k.sprawl) k.legs.forEach((l, i) => l.rotation.y = Math.sin(t * k.sp + (i % 2) * PI) * k.amp * m);
  if (k.tail) k.tail.rotation.y = Math.sin(t * (moving ? 6 : 2.5)) * (k.claws ? .08 : .35);
  if (k.ears) k.ears.forEach((e, i) => e.rotation.z = Math.sin(t * 2 + i) * .08);
  if (k.claws) k.claws.forEach((c, i) => c.rotation.z = Math.max(0, Math.sin(t * 3 + i * 1.5)) * .25);
  if (k.segs) {
    const amp = moving ? .14 : .06;
    k.segs.forEach((s, i) => { s.position.z = Math.sin(t * 5 - i * .34) * amp * Math.min(1, (i + 2) / 6); });
    k.head.position.z = Math.sin(t * 5 + .55) * amp * .3; k.head.rotation.y = Math.cos(t * 5) * .15;
    k.tongue.scale.x = (Math.sin(t * 9) > .55) ? 1 : .01;
  }
  if (k.wings) k.wings.forEach((w, i) => w.rotation.x = (i ? -1 : 1) * Math.sin(t * 7) * .55);
  if (k.still) k.g.rotation.z = Math.sin(t * 1.6) * .03;
}

/* ------------------ ground ------------------ */
function groundH(x, z) {
  let h = .12 * Math.sin(x * .7 + 1) * Math.cos(z * .55) + .05 * Math.sin(x * 1.9 + z * 1.3);
  if (z < -2.6) h += (-z - 2.6) ** 2 * .1;
  return Math.max(-.05, h) - .06;
}
function buildGround() {
  const geo = new THREE.PlaneGeometry(16, 11.5, 80, 58); geo.rotateX(-PI / 2); geo.translate(0, 0, 2);
  const pos = geo.attributes.position, col = [], c1 = new THREE.Color(0xF0C27A), c2 = new THREE.Color(0xD99A4A), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = groundH(x, z); pos.setY(i, h);
    tmp.copy(c2).lerp(c1, THREE.MathUtils.clamp(.5 + h * 1.6, 0, 1)); col.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: GRAD }));
  m.receiveShadow = true; return m;
}

/* ------------------ world ------------------ */
const easeBounce = x => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + .75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + .9375; return n * (x -= 2.625 / d) * x + .984375; };
const lerpA = (a, b, k) => { let d = ((b - a + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI; return a + d * Math.min(1, k); };

const World = { ok: false, onTap: null };
let R, scene, cam, envGroup, shadowPlane, host, tags, animals = [], running = false, last = 0, bounds = { x: 3, z0: -1.4, z1: 2.4 };

function setupLights(sc) {
  sc.add(new THREE.HemisphereLight(0xFFF6DD, 0xD9A066, 1.25));
  const sun = new THREE.DirectionalLight(0xFFF0C8, 2.3); sun.position.set(-4, 9, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 }); sun.shadow.bias = -.002;
  sc.add(sun);
}
function toonify(obj) {
  obj.traverse(o => { if (o.isMesh) { const old = o.material; o.material = new THREE.MeshToonMaterial({ color: old.color ? old.color.clone() : 0xffffff, map: old.map || null, gradientMap: GRAD }); o.castShadow = true; o.receiveShadow = true; } });
}
function placeModel(url, x, z, height, yaw = 0) {
  new GLTFLoader().load(url, gltf => {
    const o = gltf.scene; toonify(o);
    const box = new THREE.Box3().setFromObject(o), size = box.getSize(new THREE.Vector3());
    const s = height / size.y; o.scale.setScalar(s); o.rotation.y = yaw;
    const b2 = new THREE.Box3().setFromObject(o); o.position.set(x, groundH(x, z) - b2.min.y - .02, z); envGroup.add(o);
  }, undefined, () => {});
}

World.init = (container, tagLayer) => {
  try {
    host = container; tags = tagLayer;
    R = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    R.outputColorSpace = THREE.SRGBColorSpace; R.setClearColor(0x000000, 0);
    R.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block';
    host.prepend(R.domElement);
    scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(42, 1, .1, 100);
    setupLights(scene);
    envGroup = new THREE.Group(); scene.add(envGroup); envGroup.add(buildGround());
    shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(30, 30).rotateX(-PI / 2), new THREE.ShadowMaterial({ opacity: .3 }));
    shadowPlane.receiveShadow = true; shadowPlane.visible = false; scene.add(shadowPlane);
    placeModel('models/PalmTree_1.glb', -3.6, -2.4, 3.4, .4);
    placeModel('models/PalmTree_1.glb', 3.9, -2.9, 2.8, 2.1);
    placeModel('models/Cactus_1.glb', 3.0, -1.2, 1.3, 1);
    placeModel('models/CactusFlowers_2.glb', -2.6, 1.6, .9, .5);
    placeModel('models/Cactus_3.glb', -1.2, -2.6, 1.1, 2);
    placeModel('models/Rock_1.glb', 2.3, 2.0, .45, .3);
    placeModel('models/Rock_3.glb', -3.2, 0.2, .55, 1.2);
    placeModel('models/Rock_1.glb', .8, -2.2, .35, 2.5);
    resize(); addEventListener('resize', resize);
    bindPointer();
    World.ok = true;
  } catch (e) { World.ok = false; }
  return World.ok;
};
function resize() {
  if (!R) return; const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight, a = w / h;
  R.setSize(w, h, false); cam.aspect = a;
  if (a < 1) { cam.fov = 66; cam.position.set(0, 3.2, 8.2); bounds = { x: 1.5, z0: .2, z1: 3.4 }; }
  else { cam.fov = 42; cam.position.set(0, 2.8, 7.6); bounds = { x: 3.3, z0: -1.4, z1: 2.4 }; }
  cam.lookAt(0, a < 1 ? 1.0 : 1.25, 0); cam.updateProjectionMatrix();
}

function newAnimal(id) {
  const k = BUILD[id](); const sc = k.scale || 1; k.g.scale.setScalar(sc * (id === 'camel' ? .95 : 1.05));
  const root = new THREE.Group(); root.add(k.g); root.userData.aid = id; scene.add(root);
  const a = { id, k, root, x: (Math.random() * 2 - 1) * bounds.x * .8, z: bounds.z0 + Math.random() * (bounds.z1 - bounds.z0) * .8, yaw: Math.random() * PI * 2, tx: 0, tz: 0, wait: .8, drop: 0, hop: 0, face: 0, fh: (k.h || 1) * (k.g.scale.x) };
  if (k.fly) { a.cx = a.x * .5; a.cz = -.5; a.ang = Math.random() * 6; a.alt = 2.5; }
  if (k.still) a.yaw = 0;
  pick(a);
  const tag = document.createElement('span'); tag.className = 'tag3d'; tag.textContent = ''; tags.appendChild(tag); a.tag = tag;
  animals.push(a); return a;
}
function pick(a) { a.tx = (Math.random() * 2 - 1) * bounds.x; a.tz = bounds.z0 + Math.random() * (bounds.z1 - bounds.z0); }

World.spawn = (id, name) => { if (!World.ok) return; const a = newAnimal(id); a.name = name; a.tag.textContent = name; a.drop = .0001; World.start(); return a; };
World.clear = () => { animals.forEach(a => { scene.remove(a.root); a.tag.remove(); }); animals = []; };
World.setEnv = on => { if (!envGroup) return; envGroup.visible = on; shadowPlane.visible = !on; };
World.talk = a => { a.hop = .6; a.face = 3; a.tag.classList.add('on'); clearTimeout(a.tt); a.tt = setTimeout(() => a.tag.classList.remove('on'), 5000); };

/* ---- pointer: tap to talk, drag to move ---- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
function setNdc(e) { const r = R.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam); }
function bindPointer() {
  let drag = null, sx = 0, sy = 0, moved = false;
  R.domElement.addEventListener('pointerdown', e => {
    setNdc(e); const hits = ray.intersectObjects(animals.map(a => a.root), true);
    if (!hits.length) return;
    let o = hits[0].object; while (o && !o.userData.aid) o = o.parent;
    drag = animals.find(a => a.root === o); if (!drag) return;
    R.domElement.setPointerCapture(e.pointerId); sx = e.clientX; sy = e.clientY; moved = false; drag.dragging = true;
  });
  R.domElement.addEventListener('pointermove', e => {
    if (!drag) return; if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 8) moved = true; if (!moved) return;
    setNdc(e); plane.constant = drag.k.fly ? -drag.alt : 0;
    if (ray.ray.intersectPlane(plane, hit)) {
      const x = THREE.MathUtils.clamp(hit.x, -bounds.x - .5, bounds.x + .5), z = THREE.MathUtils.clamp(hit.z, bounds.z0 - .8, bounds.z1 + .6);
      if (drag.k.fly) { drag.cx = x; drag.cz = z; } else { drag.x = x; drag.z = z; drag.tx = x; drag.tz = z; }
    }
  });
  const up = () => { if (!drag) return; const a = drag; drag = null; a.dragging = false; if (!moved && World.onTap) World.onTap(a.id, a); };
  R.domElement.addEventListener('pointerup', up); R.domElement.addEventListener('pointercancel', up);
}

const v = new THREE.Vector3();
function frame(now) {
  if (!running) return; requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000 || .016); last = now; const t = now / 1000;
  const w = host.clientWidth, h = host.clientHeight;
  for (const a of animals) {
    const k = a.k; let moving = false;
    if (k.fly) {
      if (!a.dragging) a.ang += dt * .45;
      a.x = a.cx + Math.cos(a.ang) * 1.8; a.z = a.cz + Math.sin(a.ang) * 1.1;
      a.yaw = Math.atan2(-Math.cos(a.ang) * 1.1, -Math.sin(a.ang) * 1.8);
      moving = true;
    } else if (!k.still && !a.dragging) {
      if (a.face > 0) { a.face -= dt; a.yaw = lerpA(a.yaw, Math.atan2(-(cam.position.z - a.z), cam.position.x - a.x), dt * 5); }
      else if (a.wait > 0) a.wait -= dt;
      else {
        const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
        if (d < .12) { a.wait = 1 + Math.random() * 2.5; pick(a); }
        else { a.yaw = lerpA(a.yaw, Math.atan2(-dz, dx), dt * 3); a.x += Math.cos(a.yaw) * k.speed * dt; a.z -= Math.sin(a.yaw) * k.speed * dt; moving = true; }
      }
    }
    let y = k.fly ? a.alt + Math.sin(t * 2) * .15 : groundH(a.x, a.z);
    if (a.drop > 0) { a.drop += dt; const q = Math.min(1, a.drop / .9); y += 5 * (1 - easeBounce(q)); if (q >= 1) a.drop = 0; }
    if (a.hop > 0) { a.hop = Math.max(0, a.hop - dt); y += Math.sin(PI * (1 - a.hop / .6)) * .45; }
    a.root.position.set(a.x, y, a.z); a.root.rotation.y = a.yaw;
    if (k.fly) a.root.rotation.z = Math.sin(t * 2) * .08;
    animate(k, t + a.x, moving);
    v.set(a.x, y + a.fh + .15, a.z).project(cam);
    a.tag.style.transform = `translate(${(v.x + 1) / 2 * w}px,${(1 - v.y) / 2 * h}px) translate(-50%,-100%)`;
  }
  R.render(scene, cam);
}
World.start = () => { if (!World.ok || running) return; running = true; last = performance.now(); resize(); requestAnimationFrame(frame); };
World.stop = () => { running = false; };

/* ------------------ turntable for the concept cards ------------------ */
let cardR, cardScene, cardCam, cardK, cardRun = false, cardHost;
World.card = (el, id) => {
  try {
    if (!cardR) {
      cardR = new THREE.WebGLRenderer({ alpha: true, antialias: true }); cardR.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); cardR.outputColorSpace = THREE.SRGBColorSpace; cardR.shadowMap.enabled = true;
      cardScene = new THREE.Scene(); setupLights(cardScene); cardCam = new THREE.PerspectiveCamera(32, 1, .1, 50);
      const sp = new THREE.Mesh(new THREE.CircleGeometry(1.4, 40).rotateX(-PI / 2), new THREE.ShadowMaterial({ opacity: .25 })); sp.receiveShadow = true; cardScene.add(sp);
      cardR.domElement.style.cssText = 'width:100%;height:100%;display:block';
    }
    if (cardK) cardScene.remove(cardK.root);
    const k = BUILD[id](); const root = new THREE.Group(); root.add(k.g); cardScene.add(root); k.root = root; cardK = k;
    const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    if (k.fly) root.position.y = .5;
    const r = Math.max(size.x, size.y, size.z);
    cardCam.position.set(0, c.y + r * .45 + (k.fly ? .5 : 0), r * 2.6); cardCam.lookAt(0, c.y + (k.fly ? .5 : 0), 0);
    root.position.x = -c.x; root.position.z = -c.z;
    cardHost = el; el.innerHTML = ''; el.appendChild(cardR.domElement);
    const s = el.clientWidth || 300; cardR.setSize(s, s, false); cardCam.aspect = 1; cardCam.updateProjectionMatrix();
    if (!cardRun) { cardRun = true; requestAnimationFrame(cardFrame); }
    return true;
  } catch (e) { return false; }
};
function cardFrame(now) {
  if (!cardRun) return; requestAnimationFrame(cardFrame);
  if (!cardK || !cardHost || !cardHost.isConnected) return;
  const t = now / 1000; cardK.root.rotation.y = (cardK.still ? 0 : -.65) + Math.sin(t * .7) * .45;
  animate(cardK, t, true); cardR.render(cardScene, cardCam);
}
World.cardStop = () => { cardRun = false; };

/* ------------------ still image of one animal (for slides) ------------------ */
World.snapshot = (id, size = 800) => {
  const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); r.setSize(size, size, false); r.outputColorSpace = THREE.SRGBColorSpace; r.setClearColor(0, 0);
  const sc = new THREE.Scene(); setupLights(sc); const k = BUILD[id](); const root = new THREE.Group(); root.add(k.g); sc.add(root);
  root.rotation.y = id === 'cactus' ? 0 : -.55; animate(k, .3, true);
  if (k.segs) { k.segs.forEach((g, i) => g.position.z = Math.sin(i * .5 + .6) * .32); k.head.position.z = Math.sin(.1) * .3; k.tongue.scale.x = 1; }
  const box = new THREE.Box3().setFromObject(root), sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const cm = new THREE.PerspectiveCamera(30, 1, .1, 50), rr = Math.max(sz.x, sz.y, sz.z);
  cm.position.set(c.x, c.y + rr * (sz.y < rr * .4 ? .9 : .35), c.z + rr * 2.35); cm.lookAt(c); r.render(sc, cm);
  const url = r.domElement.toDataURL('image/png'); r.dispose(); return url;
};

World._dbg = () => ({ cam: cam.position.toArray(), fov: cam.fov, an: animals.map(a => [a.id, +a.x.toFixed(2), +a.root.position.y.toFixed(2), +a.z.toFixed(2)]) });
window.World = World;
window.dispatchEvent(new Event('world-ready'));
