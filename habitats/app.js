import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HABITATS, ANIMALS, CHALLENGES } from './data.js';
import * as S from './sound.js';
import { openGame, GAME_LIST } from './games.js';

// ───────────────────────── أدوات عامة ─────────────────────────
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
let seed = 1; const srand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
export function toast(t, ms = 1600) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), ms); }
export function confetti(icons = ['⭐', '🌟', '✨', '🎉']) {
  const box = $('confetti');
  for (let i = 0; i < 26; i++) { const e = document.createElement('i'); e.textContent = icons[i % icons.length]; e.style.left = rand(0, 100) + 'vw'; e.style.animationDelay = rand(0, .5) + 's'; e.style.fontSize = rand(18, 34) + 'px'; box.appendChild(e); setTimeout(() => e.remove(), 2600); }
}
const Q = new URLSearchParams(location.search);

// ───────────────────────── المحرّك ─────────────────────────
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: Q.has('shot') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
const camera = new THREE.PerspectiveCamera(62, 1, 0.02, 60);
scene.add(camera);

const hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: 0.1, far: 8 });
sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

// المجسّم يوضع أمام المستخدمة على الأرض
const anchor = new THREE.Group(); scene.add(anchor);   // يُحرَّك بالسحب/الواقع المعزز
const PLACE = new THREE.Vector3(0, -1.15, -2.1);
anchor.position.copy(PLACE);
let root = null;   // محتوى الموطن الحالي

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ───────────────────────── الكاميرا الحقيقية ─────────────────────────
const video = $('cam');
let stream = null, camOn = false;
async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) { setCam(false); return false; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    video.srcObject = stream; await video.play().catch(() => {});
    setCam(true); return true;
  } catch (e) { setCam(false); return false; }
}
function stopCamera() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; video.srcObject = null; setCam(false); }
function setCam(on) {
  camOn = on; video.hidden = !on; $('sky').style.opacity = on ? 0 : 1;
  $('camBtn').classList.toggle('on', on);
}
$('camBtn').onclick = () => { S.unlock(); camOn ? stopCamera() : startCamera(); };

// ───────────────────────── مستشعر اتجاه الجوال ─────────────────────────
let ori = null, oriOK = false, yaw0 = null, screenOri = 0;
const zee = new THREE.Vector3(0, 0, 1), q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
const eul = new THREE.Euler(), q0 = new THREE.Quaternion();
addEventListener('orientationchange', () => { screenOri = (screen.orientation?.angle ?? window.orientation ?? 0); });
let useGyro = false;   // تتبّع حركة الجوال اختياري؛ الافتراضي: المشهد ثابت في منتصف الشاشة
const sensor = () => useGyro && oriOK && camOn && !xrOn;
function onOri(e) { if (e.alpha == null) return; ori = e; if (!oriOK) { oriOK = true; yaw0 = e.alpha; } }
async function enableOrientation() {
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
      const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') return;
    }
    addEventListener('deviceorientation', onOri);
  } catch (e) {}
}
let needCenter = true;
// شاشة الجوال الطولية أضيق، فنبعد الكاميرا حتى يظهر الموطن كاملًا
const fitK = () => Math.max(1, 0.62 / Math.min(camera.aspect, 0.62));
// يضع الموطن في منتصف ما تراه الكاميرا الآن (مهما كانت زاوية الجوال)
function centerInView() {
  camera.updateMatrixWorld(true);
  const f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const dist = 2.6 * fitK() * anchor.scale.x;
  anchor.position.copy(camera.position).addScaledVector(f, dist);
  anchor.position.y -= 0.3 * anchor.scale.x;           // مركز المجسّم (لا قاعدته) في وسط الشاشة
  anchor.rotation.set(0, Math.atan2(-f.x, -f.z), 0);    // واجهة الموطن مقابلة للمستخدمة
}
function recenter() {
  if (sensor() && ori) centerInView(); else { anchor.position.copy(PLACE); anchor.rotation.set(0, 0, 0); anchor.scale.setScalar(1); Object.assign(orbit, orbit0); }
  toast('تم توسيط الموطن أمامك');
}
function applyOrientation() {
  const a = THREE.MathUtils.degToRad(ori.alpha - (yaw0 ?? 0)), b = THREE.MathUtils.degToRad(ori.beta), g = THREE.MathUtils.degToRad(ori.gamma);
  eul.set(b, a, -g, 'YXZ'); camera.quaternion.setFromEuler(eul); camera.quaternion.multiply(q1);
  camera.quaternion.multiply(q0.setFromAxisAngle(zee, -THREE.MathUtils.degToRad(screenOri)));
}

// وضع المدار عند غياب المستشعر (حاسوب أو جهاز بلا مستشعر)
const orbit = { az: 0, pol: 1.0, r: 3.0 }; const orbit0 = { ...orbit };
function applyOrbit() {
  const c = anchor.position.clone().add(new THREE.Vector3(0, 0.25 * anchor.scale.x, 0));
  camera.position.set(c.x + orbit.r * Math.sin(orbit.pol) * Math.sin(orbit.az), c.y + orbit.r * Math.cos(orbit.pol), c.z + orbit.r * Math.sin(orbit.pol) * Math.cos(orbit.az));
  camera.lookAt(c);
}

// ───────────────────────── تحميل النماذج ─────────────────────────
const loader = new GLTFLoader();
const cache = {};
function loadModel(name) { return cache[name] ||= loader.loadAsync(`models/${name}.glb`); }

function tintMaterials(obj, map) {
  obj.traverse(o => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const out = mats.map(m => {
      const key = m.name in map ? m.name : (map['*'] ? '*' : null);
      if (!key) return m;
      const v = map[key]; const c = m.clone();
      if (typeof v === 'function') return v(c, o); c.color.set(v); return c;
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
}
// نقوش (خطوط الحمار الوحشي، بقع الزرافة، رأس نقار الخشب) بالاعتماد على موضع الرأس في وضع الربط
function patternMat(m, mesh, kind) {
  const geo = mesh.geometry; geo.computeBoundingBox();
  const bb = geo.boundingBox, size = new THREE.Vector3(); bb.getSize(size);
  m = m.clone(); m.vertexColors = kind === 'woodpecker' ? false : m.vertexColors;
  m.color.set(0xffffff);
  m.onBeforeCompile = sh => {
    sh.uniforms.uMin = { value: bb.min }; sh.uniforms.uSize = { value: size };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
    let body = '';
    if (kind === 'zebra') body = `
      vec3 p = (vOP - uMin) / max(uSize.x, max(uSize.y, uSize.z));
      float s = sin(p.z * 46.0 + sin(p.y * 14.0) * 1.6 + p.y * 6.0);
      float legs = step(p.y, 0.33);
      float sl = sin(p.y * 70.0);
      float st = mix(s, sl, legs);
      vec3 col = mix(vec3(0.96,0.95,0.92), vec3(0.06), smoothstep(0.05, 0.25, st));
      diffuseColor.rgb = col;`;
    if (kind === 'giraffe') body = `
      vec3 p = (vOP - uMin) / max(uSize.x, max(uSize.y, uSize.z)) * 16.0;
      vec3 ip = floor(p); vec3 fp = fract(p); float d1 = 8.0, d2 = 8.0;
      for (int x=-1;x<=1;x++) for (int y=-1;y<=1;y++) for (int z=-1;z<=1;z++) {
        vec3 g = vec3(float(x),float(y),float(z));
        vec3 o = fract(sin(vec3(dot(ip+g,vec3(127.1,311.7,74.7)),dot(ip+g,vec3(269.5,183.3,246.1)),dot(ip+g,vec3(113.5,271.9,124.6))))*43758.5453);
        float d = length(g + o - fp); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      float edge = smoothstep(0.06, 0.16, d2 - d1);
      diffuseColor.rgb = mix(vec3(0.97,0.88,0.66), vec3(0.62,0.33,0.12), edge);`;
    if (kind === 'woodpecker') body = `
      vec3 p = (vOP - uMin) / uSize;
      vec3 col = mix(vec3(0.42,0.52,0.16), vec3(0.78,0.82,0.45), smoothstep(0.55, 0.2, p.y));
      col = mix(col, vec3(0.85,0.08,0.06), step(0.8, p.z) * step(0.45, p.y));
      diffuseColor.rgb = col;`;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;\nuniform vec3 uMin;\nuniform vec3 uSize;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + body);
  };
  m.customProgramCacheKey = () => 'pat_' + kind;
  return m;
}

const MODS = {
  camel(obj) { tintMaterials(obj, { Main: 0xc8955a, Main_Light: 0xe0b87f, Main_Dark: 0xa06d3c, Muzzle: 0x7d5230 }); },
  fennec(obj) { tintMaterials(obj, { Main: 0xe7c08a, Main_Light: 0xfbf0db, Grey: 0xd9b58a }); },
  sandy(obj) { tintMaterials(obj, { '*': 0xd2a465 }); },
  gazelle(obj) { tintMaterials(obj, { Main: 0xc98a4a, Main_Light: 0xf6eadb, Main_Dark: 0x8a5a2e }); },
  zebra(obj) { tintMaterials(obj, { Main: (m, o) => patternMat(m, o, 'zebra'), Main_Light: (m, o) => patternMat(m, o, 'zebra'), Main_Dark: (m, o) => patternMat(m, o, 'zebra'), Hair: 0x111111, Muzzle: 0x222222 }); },
  giraffe(obj) {
    tintMaterials(obj, { Main: (m, o) => patternMat(m, o, 'giraffe'), Main_Light: (m, o) => patternMat(m, o, 'giraffe'), Main_Dark: (m, o) => patternMat(m, o, 'giraffe'), Hair: 0x6b3e17, Muzzle: 0xd8a45c });
  },
  woodpecker(obj) { obj.traverse(o => { if (o.isMesh) o.material = patternMat(o.material, o, 'woodpecker'); }); },
  frog() {},
};

// إطالة رقبة الزرافة وأرجلها: تحريك عظام الرقبة وحذف مسارات موضعها من الحركات
const NECK = ['Neck2', 'Neck3', 'Head'];
function giraffeBones(obj, clips) {
  obj.traverse(o => { if (o.isBone && NECK.includes(o.name)) o.position.multiplyScalar(2.7); });
  return clips.map(c => { c = c.clone(); c.tracks = c.tracks.filter(t => !NECK.some(n => t.name.startsWith(n + '.position'))); return c; });
}

// ───────────────────────── نماذج مصنوعة يدويًا ─────────────────────────
const std = (c, r = 0.7) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
function ell(geo, mat, s, p) { const m = new THREE.Mesh(geo, mat); m.scale.set(...s); m.position.set(...p); m.castShadow = true; return m; }
const SPH = new THREE.SphereGeometry(1, 24, 16);
const PROC = {
  rabbit() {
    const g = new THREE.Group(), fur = std(0xa88a6c, 0.9), lite = std(0xf3ede4, 0.9), eye = std(0x111111, 0.3), pink = std(0xe8a3a3);
    g.add(ell(SPH, fur, [0.45, 0.42, 0.62], [0, 0.42, 0]));
    g.add(ell(SPH, fur, [0.3, 0.3, 0.32], [0, 0.78, 0.45]));
    g.add(ell(SPH, lite, [0.18, 0.18, 0.18], [0, 0.48, -0.62]));
    for (const s of [-1, 1]) {
      const ear = ell(SPH, fur, [0.07, 0.34, 0.12], [s * 0.12, 1.15, 0.38]); ear.rotation.z = -s * 0.18; ear.rotation.x = -0.25; g.add(ear);
      g.add(ell(SPH, pink, [0.035, 0.26, 0.05], [s * 0.12, 1.13, 0.43]));
      g.add(ell(SPH, eye, [0.05, 0.06, 0.05], [s * 0.2, 0.84, 0.66]));
      g.add(ell(SPH, fur, [0.12, 0.1, 0.3], [s * 0.25, 0.1, 0.28]));
    }
    g.add(ell(SPH, pink, [0.05, 0.04, 0.04], [0, 0.76, 0.76]));
    return g;
  },
  swan() {
    const g = new THREE.Group(), white = std(0xfafafa, 0.6), orange = std(0xe86a18, 0.5), black = std(0x111111, 0.4);
    g.add(ell(SPH, white, [0.42, 0.3, 0.7], [0, 0.25, -0.05]));
    const wingL = ell(SPH, white, [0.12, 0.2, 0.55], [0.3, 0.38, -0.1]); wingL.rotation.z = -0.3; g.add(wingL);
    const wingR = ell(SPH, white, [0.12, 0.2, 0.55], [-0.3, 0.38, -0.1]); wingR.rotation.z = 0.3; g.add(wingR);
    g.add(ell(SPH, white, [0.12, 0.12, 0.25], [0, 0.42, -0.72]));
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.35, 0.45), new THREE.Vector3(0, 0.75, 0.5), new THREE.Vector3(0, 1.05, 0.32), new THREE.Vector3(0, 1.22, 0.42)]);
    const neck = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.08, 10), white); neck.castShadow = true; g.add(neck);
    g.add(ell(SPH, white, [0.12, 0.11, 0.17], [0, 1.25, 0.48]));
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 12), orange); beak.rotation.x = Math.PI / 2 + 0.25; beak.position.set(0, 1.2, 0.68); g.add(beak);
    for (const s of [-1, 1]) g.add(ell(SPH, black, [0.025, 0.03, 0.03], [s * 0.1, 1.28, 0.55]));
    return g;
  },
  turtle() {
    const g = new THREE.Group(), shell = std(0x5a6b2e, 0.6), skin = std(0x8fa36a, 0.8), dark = std(0x2f3a18, 0.7), eye = std(0x111111, 0.3);
    const sh = ell(SPH, shell, [0.55, 0.22, 0.7], [0, 0, 0]); g.add(sh);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; g.add(ell(SPH, dark, [0.13, 0.04, 0.13], [Math.sin(a) * 0.3, 0.17, Math.cos(a) * 0.38])); }
    g.add(ell(SPH, dark, [0.15, 0.05, 0.15], [0, 0.21, 0]));
    g.add(ell(SPH, skin, [0.16, 0.14, 0.2], [0, 0.02, 0.8]));
    for (const s of [-1, 1]) g.add(ell(SPH, eye, [0.03, 0.03, 0.03], [s * 0.1, 0.07, 0.92]));
    g.userData.flip = [];
    for (const [s, z, big] of [[1, 0.35, 1], [-1, 0.35, 1], [1, -0.45, 0], [-1, -0.45, 0]]) {
      const piv = new THREE.Group(); piv.position.set(s * 0.45, -0.02, z);
      const f = ell(SPH, skin, big ? [0.42, 0.05, 0.16] : [0.2, 0.05, 0.12], [s * (big ? 0.35 : 0.15), 0, 0]); f.rotation.y = s * 0.4; piv.add(f);
      g.add(piv); g.userData.flip.push([piv, s, big]);
    }
    g.userData.tick = t => g.userData.flip.forEach(([p, s, big], i) => { p.rotation.z = s * Math.sin(t * 3 + (big ? 0 : 1.5)) * (big ? 0.5 : 0.25); });
    return g;
  },
};

function findClip(clips, ...names) {
  for (const n of names) { const c = clips.find(c => c.name.toLowerCase().endsWith('|' + n.toLowerCase()) || c.name.toLowerCase() === n.toLowerCase()); if (c) return c; }
  for (const n of names) { const c = clips.find(c => c.name.toLowerCase().includes(n.toLowerCase())); if (c) return c; }
  return null;
}

// بناء حيوان: غلاف (موضع/اتجاه) ← نموذج (تحجيم) + كرة لمس غير مرئية
async function makeAnimal(id) {
  const d = ANIMALS[id];
  const wrap = new THREE.Group(); wrap.name = id;
  let obj, clips = [], mixer = null, act = {};
  if (d.proc) { obj = PROC[d.proc](); }
  else {
    const gltf = await loadModel(d.real ? 'real/' + d.real : d.model);
    obj = SkeletonUtils.clone(gltf.scene); clips = gltf.animations;
    if (d.tint) tintMaterials(obj, { '*': (m) => { m.color.multiply(new THREE.Color(d.tint)); return m; } });
    if (d.mod && MODS[d.mod]) MODS[d.mod](obj);
    if (d.mod === 'giraffe') clips = giraffeBones(obj, clips);
  }
  obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; } });
  // ابدأ بوضع الوقوف لقياس الحجم
  if (clips.length) {
    mixer = new THREE.AnimationMixer(obj);
    const list = { idle: findClip(clips, 'Idle', 'Frog_Idle', 'Snake_Idle', 'Spider_Idle', 'Swimming_Normal', 'Swim'), walk: findClip(clips, 'Walk', 'Snake_Walk', 'Spider_Walk', 'Swimming_Normal', 'Swim'),
      eat: findClip(clips, 'Eating', 'Idle_Headlow', 'Idle_2'), run: findClip(clips, 'Gallop', 'Swimming_Fast'), happy: findClip(clips, 'Jump_toIdle', 'Frog_Jump', 'Spider_Jump', 'Snake_Jump', 'Yes', 'Dance', 'Gallop_Jump', 'Idle_2', 'Swimming_Impulse'),
      jump: findClip(clips, 'Frog_Jump', 'Jump'), fly: clips[0] };
    if (!list.idle) list.idle = clips[0];
    for (const k in list) if (list[k]) act[k] = mixer.clipAction(list[k]);
    const first = act.idle || act.fly; if (first) { first.play(); mixer.update(0.01); }
  }
  const mdl = new THREE.Group(); const yawG = new THREE.Group(); yawG.rotation.y = d.yaw || 0; yawG.add(obj); mdl.add(yawG);
  mdl.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mdl, true), size = new THREE.Vector3(); box.getSize(size);
  const BIG = mode === 'lost' ? 1 : (d.beh === 'swim' ? (d.len > 0.4 ? 1.25 : 1.6) : d.beh === 'fly' ? 1.4 : 1.7);
  const s = (d.len ? d.len / Math.max(size.x, size.z) : d.h / size.y) * BIG;
  mdl.scale.multiplyScalar(s);
  mdl.updateMatrixWorld(true);
  box.setFromObject(mdl, true); const c = new THREE.Vector3(); box.getCenter(c); box.getSize(size);
  const onGround = !d.len || d.ground;
  mdl.position.x -= c.x; mdl.position.z -= c.z; mdl.position.y -= onGround ? box.min.y : c.y;
  wrap.add(mdl); obj.userData.base = mdl.position.clone();
  if (d.mod === 'camel') addHump(obj, wrap, size);
  const r = Math.max(size.x, size.y, size.z) * 0.62;
  const hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(r, 0.07), 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = onGround ? size.y * 0.5 : 0; hit.userData.pick = { kind: 'animal', id }; wrap.add(hit);
  const a = { id, d, wrap, obj, mdl, mixer, act, cur: null, size, t: rand(0, 5), state: 'idle', timer: rand(1, 4), target: new THREE.Vector3(), phase: rand(0, 6.28), hit };
  play(a, a.act.idle ? 'idle' : 'fly');
  return a;
}
function addHump(obj, wrap, size) {
  const hump = new THREE.Mesh(SPH, std(0xc08a50, 0.85));
  hump.scale.set(size.x * 0.3, size.y * 0.16, size.z * 0.17); hump.castShadow = true;
  let body = null; obj.traverse(o => { if (o.isBone && o.name === 'Body') body = o; });
  const pos = new THREE.Vector3(0, size.y * 0.62, -size.z * 0.12);
  if (body) { wrap.updateMatrixWorld(true); const w = wrap.localToWorld(pos.clone()); body.add(hump); body.updateMatrixWorld(true); hump.position.copy(body.worldToLocal(w)); const sc = new THREE.Vector3(); body.getWorldScale(sc); hump.scale.divide(sc); }
  else { hump.position.copy(pos); wrap.add(hump); }
}
function play(a, name, fade = 0.35) {
  const next = a.act[name] || a.act.idle || a.act.fly; if (!next || a.cur === next) return;
  next.reset().setEffectiveWeight(1).fadeIn(fade).play(); if (a.cur) a.cur.fadeOut(fade); a.cur = next;
}

// ───────────────────────── بيئة الموطن ─────────────────────────
function noiseTex(base, spots, n = 2600, size = 512, blobs = 3) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const x = cv.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  for (let i = 0; i < n; i++) { x.fillStyle = spots[i % spots.length]; x.globalAlpha = rand(0.15, 0.55); const r = rand(1, blobs); x.beginPath(); x.arc(rand(0, size), rand(0, size), r, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const GROUND = {
  desert: () => noiseTex('#e3b574', ['#f0c88b', '#c9955a', '#d8a868', '#b98450'], 5000, 512, 2.2),
  grass: () => noiseTex('#7cae3e', ['#8fc24a', '#5d8f2c', '#a3c95a', '#6a9a33'], 5000, 512, 3),
  forest: () => noiseTex('#4a5a2a', ['#5d4a2c', '#3a4a22', '#6a7a33', '#7a5a33'], 5000, 512, 3.5),
  lake: () => noiseTex('#7aa846', ['#8fbf55', '#5f8f35', '#9a8a5a'], 4500, 512, 3),
  ocean: () => noiseTex('#e8d29e', ['#f3e2b8', '#d4b97f', '#c9ab70', '#fff1cf'], 5000, 512, 2),
};
const SIDE = { desert: 0xb98450, grass: 0x6b4a2c, forest: 0x4a3420, lake: 0x5b4228, ocean: 0xc4a46c };
const R = 0.95;  // نصف قطر المجسّم

function heightAt(h, x, z) {
  if (h === 'desert') return 0.035 * Math.sin(x * 3.1 + 0.5) * Math.cos(z * 2.4) + 0.015 * Math.sin(x * 7 + z * 5) + 0.02;
  if (h === 'lake') { const r = Math.hypot(x, z); return r < 0.58 ? -0.07 * (1 - THREE.MathUtils.smoothstep(r, 0.35, 0.58)) : 0; }
  return 0;
}

function buildGround(h) {
  const g = new THREE.Group();
  const geo = new THREE.CircleGeometry(R, 96, 0, Math.PI * 2);
  // تقسيم أدق لتشكيل الكثبان وحوض البحيرة
  const fine = new THREE.PlaneGeometry(2 * R, 2 * R, 110, 110); fine.rotateX(-Math.PI / 2);
  const p = fine.attributes.position, keep = [];
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); const k = r > R ? R / r : 1; p.setXYZ(i, x * k, heightAt(h, x * k, z * k), z * k); }
  fine.computeVertexNormals();
  const tex = GROUND[h](); tex.repeat.set(2.5, 2.5);
  const top = new THREE.Mesh(fine, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  top.receiveShadow = true; top.userData.pick = { kind: 'ground' }; g.add(top);
  const side = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.97, 0.12, 96, 1, true), new THREE.MeshStandardMaterial({ color: SIDE[h], roughness: 1, side: THREE.DoubleSide }));
  side.position.y = -0.04; g.add(side);
  const bottom = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: SIDE[h], roughness: 1 })); bottom.rotation.x = Math.PI / 2; bottom.position.y = -0.1; g.add(bottom);
  geo.dispose();
  return g;
}

// عشب متمايل (مثيلات كثيرة لنموذج واحد)
async function buildGrass(h, count, region) {
  const gl = await loadModel('Grass_Short');
  let src = null; gl.scene.traverse(o => { if (o.isMesh && !src) src = o; });
  const geo = src.geometry.clone(); geo.computeBoundingBox(); const s = 0.045 / (geo.boundingBox.max.y - geo.boundingBox.min.y); geo.scale(s, s, s);
  const mat = src.material.clone(); mat.color.set(h === 'forest' ? 0x4f8a2a : 0x7fbf3a);
  const uni = { uT: { value: 0 }, uW: { value: 1 } };
  mat.onBeforeCompile = sh => { Object.assign(sh.uniforms, uni); sh.vertexShader = 'uniform float uT; uniform float uW;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wp = instanceMatrix * vec4(0.,0.,0.,1.);
      float k = max(position.y, 0.0) * 9.0;
      transformed.x += sin(uT*2.2 + wp.x*6.0 + wp.z*4.0) * 0.012 * k * uW;
      transformed.z += cos(uT*1.7 + wp.x*5.0) * 0.008 * k * uW;`); };
  const im = new THREE.InstancedMesh(geo, mat, count); im.receiveShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    let x, z; do { const a = srand() * 6.283, r = Math.sqrt(srand()) * (R - 0.1); x = Math.cos(a) * r; z = Math.sin(a) * r; } while (region && !region(x, z));
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), srand() * 6.28); const k = 0.6 + srand() * 0.9; sc.set(k, k * (0.8 + srand() * 0.6), k);
    m.compose(v.set(x, heightAt(h, x, z), z), q, sc); im.setMatrixAt(i, m);
  }
  im.userData.uni = uni; return im;
}

async function placeModel(name, height, x, z, h, rot = srand() * 6.28, tint) {
  const gl = await loadModel(name); const o = gl.scene.clone(true);
  if (tint) tintMaterials(o, tint);
  o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  const b = new THREE.Box3().setFromObject(o); const sz = new THREE.Vector3(); b.getSize(sz);
  o.scale.multiplyScalar(height / sz.y); o.rotation.y = rot;
  o.position.set(x, heightAt(h, x, z) - b.min.y * height / sz.y, z); return o;
}

// ───────────────────────── الطقس ─────────────────────────
function makeParticles(n, color, size, opacity = 0.8) {
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * R; pos.set([Math.cos(a) * r, Math.random() * 1.4, Math.sin(a) * r], i * 3); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: new THREE.CanvasTexture(cv), transparent: true, opacity, depthWrite: false, sizeAttenuation: true }));
  pts.frustumCulled = false; return pts;
}
function makeRain(n) {
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array(n * 6);
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * R, y = Math.random() * 1.6; const x = Math.cos(a) * r, z = Math.sin(a) * r; pos.set([x, y, z, x + 0.01, y + 0.07, z], i * 6); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.55 })); l.frustumCulled = false; return l;
}
function makeLeaves(n) {
  const geo = new THREE.PlaneGeometry(0.03, 0.02); const cols = [0xd98a2b, 0xb5541f, 0xe0b23a, 0x7a9a2a];
  const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), n);
  const data = []; const c = new THREE.Color();
  for (let i = 0; i < n; i++) { im.setColorAt(i, c.set(cols[i % 4])); data.push({ x: rand(-0.8, 0.8), y: rand(0, 1.4), z: rand(-0.8, 0.8), s: rand(0.08, 0.16), p: rand(0, 6) }); }
  im.userData.leaves = data; im.frustumCulled = false; return im;
}
function makeButterflies(n) {
  const g = new THREE.Group(); const cols = [0xffc93a, 0xff7ab8, 0x8fd3ff, 0xffffff];
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: cols[i % 4], side: THREE.DoubleSide, roughness: 0.6 });
    const w = new THREE.CircleGeometry(0.018, 10);
    const l = new THREE.Mesh(w, m), r = new THREE.Mesh(w, m); l.position.x = 0.016; r.position.x = -0.016;
    const pl = new THREE.Group(), pr = new THREE.Group(); pl.add(l); pr.add(r); b.add(pl, pr);
    b.userData = { pl, pr, a: rand(0, 6), r: rand(0.25, 0.75), y: rand(0.12, 0.45), sp: rand(0.3, 0.6) }; g.add(b);
  }
  return g;
}

// الماء
function buildWater(h) {
  if (h === 'lake') {
    const geo = new THREE.CircleGeometry(0.6, 64, 0, Math.PI * 2); geo.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0x3f8fa8, roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.72, clearcoat: 1 }));
    water.position.y = 0.006; water.renderOrder = 2; water.userData.base = geo.attributes.position.array.slice();
    return water;
  }
  if (h === 'ocean') {
    const g = new THREE.Group();
    const vol = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.78, 64, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x1d7fc4, transparent: true, opacity: 0.28, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
    vol.position.y = 0.39; vol.renderOrder = 3; g.add(vol);
    const top = new THREE.PlaneGeometry(2 * R, 2 * R, 64, 64); top.rotateX(-Math.PI / 2);
    const p = top.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); if (r > R) { p.setX(i, x * R / r); p.setZ(i, z * R / r); } }
    const surf = new THREE.Mesh(top, new THREE.MeshPhysicalMaterial({ color: 0x2a8fd0, transparent: true, opacity: 0.55, roughness: 0.05, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }));
    surf.position.y = 0.78; surf.renderOrder = 4; surf.userData.base = top.attributes.position.array.slice(); g.add(surf);
    g.userData.surf = surf; return g;
  }
}

// ───────────────────────── الإضاءة لكل موطن ─────────────────────────
const LIGHT = {
  desert: { sun: 0xfff1d6, si: 3.2, sky: 0xfff3dd, gnd: 0xc8955a, hi: 1.1, dir: [1.2, 2.6, 0.8], exp: 1.1 },
  grass: { sun: 0xfff7e6, si: 2.6, sky: 0xdff1ff, gnd: 0x6a8a3a, hi: 1.0, dir: [1.4, 2.4, 1], exp: 1.05 },
  forest: { sun: 0xe6ffe8, si: 1.6, sky: 0xbfe0cc, gnd: 0x2a3a1a, hi: 0.9, dir: [0.6, 2.8, 0.4], exp: 1.0 },
  lake: { sun: 0xf4fbff, si: 2.0, sky: 0xdceef5, gnd: 0x4d6a3a, hi: 1.0, dir: [1, 2.5, 1.2], exp: 1.05 },
  ocean: { sun: 0xffffff, si: 2.4, sky: 0xd5ecff, gnd: 0x2a5a7a, hi: 1.05, dir: [1, 3, 0.8], exp: 1.05 },
  lost: { sun: 0xfffaf0, si: 2.6, sky: 0xeaf6ff, gnd: 0x6a7a4a, hi: 1.0, dir: [1, 2.6, 1], exp: 1.05 },
};
function setLight(h) {
  const L = LIGHT[h]; sun.color.set(L.sun); sun.intensity = L.si; hemi.color.set(L.sky); hemi.groundColor.set(L.gnd); hemi.intensity = L.hi;
  renderer.toneMappingExposure = L.exp;
}
function updateSun() { const L = LIGHT[cur || 'lost'] || LIGHT.lost; const w = anchor.position; sun.position.set(w.x + L.dir[0], w.y + L.dir[1], w.z + L.dir[2]); sun.target.position.copy(w); }

// ───────────────────────── بناء الموطن ─────────────────────────
let cur = null, animals = [], fx = {}, trees = [], storm = false, labelsOn = false;
const clock = new THREE.Clock();

function clearWorld() {
  if (root) anchor.remove(root);
  root = null; animals = []; fx = {}; trees = []; storm = false;
}

async function buildHabitat(h) {
  const H = HABITATS[h]; seed = h.length * 977 + 3;
  const g = new THREE.Group(); g.add(buildGround(h));
  const jobs = [];
  // النباتات
  const occupied = [];
  const free = (x, z, d) => occupied.every(([a, b, r]) => Math.hypot(a - x, b - z) > r + d);
  const spot = (rmin, rmax, d, tries = 40) => { for (let i = 0; i < tries; i++) { const a = srand() * 6.283, r = rmin + srand() * (rmax - rmin), x = Math.cos(a) * r, z = Math.sin(a) * r; if (free(x, z, d)) { occupied.push([x, z, d]); return [x, z]; } } return null; };
  if (h === 'forest') {
    const ring = [[0.7, 0.25], [0.74, 1.35], [0.66, 2.45], [0.74, 3.5], [0.68, 4.55], [0.72, 5.6]];
    H.plants.forEach(([m, ht, info], i) => {
      let x, z;
      if (info === 'tree') { const [r, a] = ring[i % ring.length]; x = Math.cos(a) * r; z = Math.sin(a) * r; occupied.push([x, z, 0.12]); trees.push(new THREE.Vector3(x, 0, z)); }
      else { const s = spot(0.2, 0.85, 0.08); if (!s) return; [x, z] = s; }
      jobs.push(placeModel(m, ht, x, z, h).then(o => { if (info === 'tree') { o.scale.x *= 0.7; o.scale.z *= 0.7; } if (info) o.traverse(c => { if (c.isMesh) c.userData.pick = { kind: 'plant', info }; }); g.add(o); }));
    });
  } else {
    H.plants.forEach(([m, ht, info]) => {
      const n = (h === 'lake' && info === 'reed') ? 6 : (h === 'ocean' && info === 'seaweed') ? 9 : (h === 'desert' && info === 'cactus') ? 2 : 1;
      for (let k = 0; k < n; k++) {
        let s;
        if (h === 'lake') s = info === 'reed' ? spot(0.56, 0.68, 0.04) : spot(0.7, 0.9, 0.1);
        else if (h === 'ocean') s = spot(0.15, 0.88, 0.06);
        else if (m === 'PalmTree_1') s = spot(0.75, 0.82, 0.1);
        else s = spot(0.28, 0.88, ht > 0.4 ? 0.14 : 0.07);
        if (!s) continue;
        const tint = info === 'dry' ? { Green: 0x9a8a4a } : info === 'seaweed' ? { Green: k % 2 ? 0x2e8a5a : 0x6a8a2a } : info === 'reed' ? { Green: 0x6f9a3a } : info === 'acacia' ? { Green: 0x6f9a34, DarkGreen: 0x587f2a } : null;
        const sc = info === 'acacia' ? 1 : (0.75 + srand() * 0.5);
        jobs.push(placeModel(m, ht * sc, s[0], s[1], h, undefined, tint).then(o => {
          if (info === 'acacia') { o.scale.y *= 0.75; o.scale.x *= 1.25; o.scale.z *= 1.25; trees.push(o.position.clone()); }
          if (info) o.traverse(c => { if (c.isMesh) c.userData.pick = { kind: 'plant', info }; });
          if (info === 'seaweed') o.userData.sway = srand() * 6;
          g.add(o);
        }));
      }
    });
  }
  if (H.grassCount) jobs.push(buildGrass(h, H.grassCount, h === 'forest' ? null : (x, z) => true).then(im => { g.add(im); fx.grass = im; }));
  if (h === 'lake') {
    jobs.push(buildGrass(h, 90, (x, z) => Math.hypot(x, z) > 0.64).then(im => { g.add(im); fx.grass = im; }));
    const w = buildWater(h); g.add(w); fx.lake = w;
    fx.pads = [];
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3, r = 0.3 + (i % 3) * 0.08; jobs.push(placeModel('Lilypad', 0.02, Math.cos(a) * r, Math.sin(a) * r, 'grass').then(o => { o.scale.multiplyScalar(2.6); o.position.y = 0.012; o.traverse(c => { if (c.isMesh) c.userData.pick = { kind: 'plant', info: 'lily' }; }); g.add(o); fx.pads.push(o); })); }
    const bed = new THREE.Mesh(new THREE.CircleGeometry(0.58, 48), std(0x3a5a4a, 1)); bed.rotation.x = -Math.PI / 2; bed.position.y = -0.068; g.add(bed);
  }
  if (h === 'ocean') { const w = buildWater(h); g.add(w); fx.ocean = w; }

  // الطقس
  if (h === 'desert') { fx.dust = makeParticles(420, 0xe8c48a, 0.022, 0.75); g.add(fx.dust); }
  if (h === 'grass') { fx.bflies = makeButterflies(7); g.add(fx.bflies); fx.pollen = makeParticles(120, 0xfff6c0, 0.012, 0.6); g.add(fx.pollen); }
  if (h === 'forest') { fx.leaves = makeLeaves(70); g.add(fx.leaves); fx.rain = makeRain(260); fx.rain.visible = false; g.add(fx.rain); fx.mist = makeParticles(90, 0xe8f4ee, 0.22, 0.12); g.add(fx.mist); }
  if (h === 'lake') { fx.rain = makeRain(320); g.add(fx.rain); fx.rings = []; }
  if (h === 'ocean') { fx.bubbles = makeParticles(160, 0xe6f6ff, 0.016, 0.7); g.add(fx.bubbles); }

  // الحيوانات
  const list = H.animals.flatMap(id => (id === 'zebra' ? [id, id] : id === 'clownfish' || id === 'tang' ? [id, id, id] : id === 'gazelle' ? [id, id] : [id]));
  jobs.push(...list.map(id => makeAnimal(id).then(a => { animals.push(a); g.add(a.wrap); })));
  await Promise.all(jobs);
  animals.forEach((a, i) => initPos(a, h, i));
  return g;
}

function landSpot(h) {
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 0.78, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (h === 'lake' && Math.hypot(x, z) < 0.66) continue;
    if (trees.some(t => Math.hypot(t.x - x, t.z - z) < 0.1)) continue;
    return new THREE.Vector3(x, 0, z);
  }
  return new THREE.Vector3(0.75, 0, 0);
}
function initPos(a, h, i) {
  const b = a.d.beh;
  if (b === 'swim' || b === 'float' || b === 'fly') { a.orbit = { r: h === 'lake' ? rand(0.2, 0.45) : rand(0.3, 0.75), y: 0, sp: (a.d.speed || 0.14) / 0.5 * rand(0.8, 1.2) * (Math.random() < 0.5 ? -1 : 1), ph: rand(0, 6.28), bob: rand(0, 6) };
    if (b === 'swim') a.orbit.y = h === 'lake' ? -0.035 : rand(0.15, 0.6);
    if (a.id === 'whale') { a.orbit.r = 0.55; a.orbit.y = 0.45; }
    if (b === 'fly') { a.orbit.y = rand(0.55, 0.85); a.orbit.r = rand(0.35, 0.65); }
    if (b === 'float') { a.orbit.y = 0.008; a.orbit.r = 0.4; }
    if (a.id === 'woodpecker' && trees.length) { a.perch = 0; a.state = 'perch'; a.timer = rand(3, 6); }
  } else if (b === 'frog') { const p = fx.pads?.[i % (fx.pads.length || 1)]; a.wrap.position.copy(p ? p.position : landSpot(h)); a.wrap.position.y = 0.014; a.timer = rand(2, 5); }
  else { const p = landSpot(h); a.wrap.position.set(p.x, heightAt(h, p.x, p.z), p.z); a.wrap.rotation.y = rand(0, 6.28); if (b === 'floor') a.wrap.position.y = 0; }
}

// ───────────────────────── حركة الحيوانات ─────────────────────────
const tmp = new THREE.Vector3();
function faceTo(a, dx, dz, dt, k = 4) {
  const want = Math.atan2(dx, dz); let d = want - a.wrap.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
  a.wrap.rotation.y += d * Math.min(1, dt * k);
}
function stepAnimal(a, dt, t) {
  a.mixer?.update(dt * (a.speedMul || 1));
  a.obj.userData.tick?.(t);
  const b = a.d.beh, w = a.wrap.position;
  if (a.held) return;
  if (b === 'stand') {
    a.timer -= dt;
    if (!a.mixer) a.mdl.scale.y = a.mdl.scale.x * (1 + Math.sin(t * 2 + a.phase) * 0.012);
    if (a.turning != null) { faceTo(a, Math.sin(a.turning), Math.cos(a.turning), dt, 1.2); if (Math.abs(Math.atan2(Math.sin(a.turning - a.wrap.rotation.y), Math.cos(a.turning - a.wrap.rotation.y))) < 0.05) a.turning = null; }
    if (a.timer < 0) { a.timer = rand(5, 10); a.turning = a.wrap.rotation.y + rand(-1.2, 1.2); }
    return;
  }
  if (b === 'roam' || b === 'floor') {
    a.timer -= dt;
    if (a.state === 'walk') {
      tmp.subVectors(a.target, w); tmp.y = 0; const dist = tmp.length();
      const sp = (a.d.speed || 0.1) * (b === 'floor' ? 0.6 : 1);
      if (dist < 0.03 || a.timer < 0) { a.state = Math.random() < 0.5 ? 'eat' : 'idle'; a.timer = rand(2, 5); play(a, a.state === 'eat' && a.act.eat ? 'eat' : 'idle'); }
      else { tmp.normalize(); if (b === 'floor') { w.addScaledVector(tmp, sp * dt); } else { faceTo(a, tmp.x, tmp.z, dt); const f = new THREE.Vector3(Math.sin(a.wrap.rotation.y), 0, Math.cos(a.wrap.rotation.y)); w.addScaledVector(f, sp * dt); } }
      w.y = b === 'floor' ? 0 : heightAt(cur, w.x, w.z);
    } else if (a.timer < 0) {
      a.target.copy(b === 'floor' ? new THREE.Vector3(rand(-0.6, 0.6), 0, rand(-0.6, 0.6)) : landSpot(cur)); a.state = 'walk'; a.timer = 9; play(a, 'walk');
    }
  } else if (b === 'hop') {
    a.timer -= dt;
    if (a.state === 'hop') { a.hopT += dt * 2.6; const k = Math.min(1, a.hopT); w.lerpVectors(a.from, a.target, k); w.y = Math.sin(k * Math.PI) * 0.06; a.mdl.rotation.x = -Math.sin(k * Math.PI) * 0.25; if (k >= 1) { a.hops--; if (a.hops > 0) { a.from = w.clone(); a.target = w.clone().add(new THREE.Vector3(Math.sin(a.wrap.rotation.y), 0, Math.cos(a.wrap.rotation.y)).multiplyScalar(0.07)); if (a.target.length() > 0.8) a.hops = 0; a.hopT = 0; } else { a.state = 'idle'; a.timer = rand(1.5, 4); } } }
    else {  if (a.timer < 0) { a.state = 'hop'; a.hops = 3 + (Math.random() * 3 | 0); a.wrap.rotation.y = Math.atan2(-w.x, -w.z) + rand(-1.4, 1.4); a.from = w.clone(); a.target = w.clone().add(new THREE.Vector3(Math.sin(a.wrap.rotation.y), 0, Math.cos(a.wrap.rotation.y)).multiplyScalar(0.07)); a.hopT = 0; } }
  } else if (b === 'frog') {
    a.timer -= dt;
    if (a.state === 'jump') { a.hopT += dt * 1.4; const k = Math.min(1, a.hopT); w.lerpVectors(a.from, a.target, k); w.y = 0.014 + Math.sin(k * Math.PI) * 0.12; if (k >= 1) { a.state = 'idle'; a.timer = rand(2.5, 6); play(a, 'idle'); S.play('splash'); ripple(w.x, w.z); } }
    else if (a.timer < 0 && fx.pads?.length) { const p = fx.pads[Math.random() * fx.pads.length | 0]; a.from = w.clone(); a.target = p.position.clone(); a.target.y = 0.014; faceTo(a, a.target.x - w.x, a.target.z - w.z, 1, 10); a.state = 'jump'; a.hopT = 0; play(a, 'jump', 0.1); }
  } else if (a.id === 'woodpecker' && trees.length) {
    a.timer -= dt;
    const tr = trees[a.perch % trees.length];
    if (a.state === 'perch') {
      const dir = tmp.set(-tr.x, 0, -tr.z).normalize(); const pos = tr.clone().addScaledVector(dir, 0.045); pos.y = 0.36;
      w.lerp(pos, Math.min(1, dt * 3)); faceTo(a, -dir.x, -dir.z, dt, 6);
      a.mixer && (a.speedMul = 0.05);
      a.obj.rotation.x = Math.max(0, Math.sin(t * 22)) * 0.25 * (Math.sin(t * 1.3) > 0.3 ? 1 : 0);
      if (a.timer < 0) { a.state = 'fly'; a.perch = (a.perch + 1 + (Math.random() * (trees.length - 1) | 0)) % trees.length; a.timer = 3; a.speedMul = 1; a.obj.rotation.x = 0; }
    } else {
      const t2 = trees[a.perch]; const goal = tmp.set(t2.x, 0.55, t2.z); const d = goal.clone().sub(w); faceTo(a, d.x, d.z, dt, 5);
      w.addScaledVector(d.normalize(), 0.45 * dt); w.y += Math.sin(t * 5) * 0.002;
      if (w.distanceTo(goal) < 0.12 || a.timer < 0) { a.state = 'perch'; a.timer = rand(4, 7); if (Math.random() < 0.6) S.play('woodpecker'); }
    }
  } else if (b === 'swim' || b === 'fly' || b === 'float') {
    const o = a.orbit; o.ph += dt * o.sp / Math.max(o.r, 0.2);
    const x = Math.cos(o.ph) * o.r, z = Math.sin(o.ph) * o.r * (b === 'swim' && cur === 'ocean' ? 0.8 : 1);
    const y = o.y + (b === 'float' ? Math.sin(t * 1.5 + o.bob) * 0.003 : Math.sin(t * 0.9 + o.bob) * (b === 'fly' ? 0.06 : 0.04));
    const nx = Math.cos(o.ph + 0.01 * Math.sign(o.sp)) * o.r, nz = Math.sin(o.ph + 0.01 * Math.sign(o.sp)) * o.r * (b === 'swim' && cur === 'ocean' ? 0.8 : 1);
    w.set(x, y, z); a.wrap.rotation.y = Math.atan2(nx - x, nz - z);
    if (b === 'fly') a.wrap.rotation.z = -Math.sign(o.sp) * 0.25;
  }
}

// تموّجات على سطح البحيرة
function ripple(x, z) {
  if (!fx.lake || !root) return;
  const m = new THREE.Mesh(new THREE.RingGeometry(0.01, 0.014, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.01, z); m.userData.life = 0; root.add(m); fx.rings.push(m);
}

function stepFx(dt, t) {
  const k = storm ? 2.6 : 1;
  if (fx.grass) { fx.grass.userData.uni.uT.value = t; fx.grass.userData.uni.uW.value = storm ? 2.5 : 1; }
  if (fx.dust) { const p = fx.dust.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let x = p.getX(i) + dt * (0.12 + (i % 7) * 0.02) * k, y = p.getY(i) + Math.sin(t * 2 + i) * 0.0012, z = p.getZ(i); if (x > R) x = -R; if (Math.hypot(x, z) > R) { x = -Math.sqrt(Math.max(0, R * R - z * z)); } p.setXYZ(i, x, storm ? Math.min(y, 0.9) : (y > 0.6 ? 0.02 : y), z); } p.needsUpdate = true; fx.dust.material.opacity = storm ? 0.95 : 0.6; fx.dust.material.size = storm ? 0.035 : 0.02; }
  if (fx.rain) { const p = fx.rain.geometry.attributes.position; const sp = (storm ? 2.6 : 1.3) * dt; for (let i = 0; i < p.count; i += 2) { let y = p.getY(i) - sp; if (y < 0) { y += 1.6; if (fx.lake && Math.random() < 0.15 && fx.rings.length < 25) { const x = p.getX(i), z = p.getZ(i); if (Math.hypot(x, z) < 0.56) ripple(x, z); } } p.setY(i, y); p.setY(i + 1, y + 0.07); } p.needsUpdate = true; fx.rain.material.opacity = storm ? 0.75 : 0.45; }
  if (fx.rings) fx.rings = fx.rings.filter(m => { m.userData.life += dt; const s = 1 + m.userData.life * 4; m.scale.set(s, s, s); m.material.opacity = 0.7 * (1 - m.userData.life / 1.2); if (m.userData.life > 1.2) { root?.remove(m); return false; } return true; });
  if (fx.leaves) { const im = fx.leaves, m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); im.userData.leaves.forEach((L, i) => { L.y -= dt * L.s * k; L.x += Math.sin(t + L.p) * dt * 0.05 * k; if (L.y < 0.005) { L.y = rand(1.1, 1.5); L.x = rand(-0.8, 0.8); L.z = rand(-0.8, 0.8); } e.set(t * 2 + L.p, t * 1.3 + L.p, 0); q.setFromEuler(e); m.compose(tmp.set(L.x, L.y, L.z), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m); }); im.instanceMatrix.needsUpdate = true; }
  if (fx.mist) { fx.mist.rotation.y = t * 0.02; fx.mist.position.y = Math.sin(t * 0.3) * 0.02; }
  if (fx.bflies) fx.bflies.children.forEach(b => { const u = b.userData; u.a += dt * u.sp; b.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * 2 + u.a) * 0.05, Math.sin(u.a * 1.3) * u.r); b.rotation.y = -u.a; const f = Math.sin(t * 22 + u.a * 10) * 1.1; u.pl.rotation.y = f; u.pr.rotation.y = -f; });
  if (fx.pollen) fx.pollen.rotation.y = t * 0.05 * k;
  if (fx.bubbles) { const p = fx.bubbles.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) + dt * (0.08 + (i % 5) * 0.02) * k; if (y > 0.76) y = 0.02; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t * 3 + i) * 0.0005); } p.needsUpdate = true; }
  const wave = (mesh, amp, fr) => { const p = mesh.geometry.attributes.position, b = mesh.userData.base; for (let i = 0; i < p.count; i++) { const x = b[i * 3], z = b[i * 3 + 2]; p.setY(i, Math.sin(x * fr + t * 1.6) * amp + Math.cos(z * fr * 0.8 + t * 1.2) * amp * 0.8); } p.needsUpdate = true; mesh.geometry.computeVertexNormals(); };
  if (fx.lake) wave(fx.lake, storm ? 0.006 : 0.0025, 14);
  if (fx.ocean) wave(fx.ocean.userData.surf, storm ? 0.04 : 0.016, 6);
  if (root && cur === 'ocean') root.traverse(o => { if (o.userData.sway != null) o.rotation.z = Math.sin(t * 1.2 + o.userData.sway) * 0.12; });
}

// ───────────────────────── الملصقات (الأسماء) ─────────────────────────
function label(text, emo) {
  const cv = document.createElement('canvas'); const x = cv.getContext('2d'); const font = '700 44px "IBM Plex Sans Arabic", sans-serif';
  x.font = font; const w = Math.ceil(x.measureText(text).width) + 120; cv.width = w; cv.height = 84;
  x.font = font; x.fillStyle = 'rgba(255,255,255,.95)'; x.beginPath(); x.roundRect(2, 2, w - 4, 80, 40); x.fill();
  x.fillStyle = '#16241d'; x.direction = 'rtl'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText((emo ? emo + ' ' : '') + text, w / 2, 45);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.renderOrder = 10;
  s.scale.set(0.11 * w / 84, 0.11, 1); return s;
}
function showLabel(a, ms = 3500) {
  if (!a.lbl) { a.lbl = label(a.d.name, a.d.emo); a.lbl.position.y = ((a.d.len && !a.d.ground) ? a.size.y / 2 : a.size.y) + 0.09; a.wrap.add(a.lbl); }
  a.lbl.visible = true; clearTimeout(a.lblT); if (ms && !labelsOn) a.lblT = setTimeout(() => { if (!labelsOn && a.lbl) a.lbl.visible = false; }, ms);
}

// ───────────────────────── اللمس والسحب ─────────────────────────
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const ptrs = new Map(); let gesture = null;
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); if (mode === 'lost' && !xrOn && ptrs.size === 0) { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); if (tryGrab()) { grab.id = e.pointerId; return; } } ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now() }); S.unlock(); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; gesture = { d: Math.hypot(a.x - b.x, a.y - b.y), s: anchor.scale.x, r: orbit.r }; } });
canvas.addEventListener('pointermove', e => {
  if (grab && grab.id === e.pointerId) { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); dragTo(); return; }
  const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2 && gesture) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const k = d / gesture.d; if (sensor()) { const s = THREE.MathUtils.clamp(gesture.s * k, 0.3, 4); anchor.scale.setScalar(s); } else orbit.r = THREE.MathUtils.clamp(gesture.r / k, 0.6, 6); return; }
  if (ptrs.size === 1) { if (sensor() || xrOn) anchor.rotation.y += dx * 0.01; else { orbit.az -= dx * 0.008; orbit.pol = THREE.MathUtils.clamp(orbit.pol - dy * 0.006, 0.25, 1.45); } }
});
const end = e => { if (grab && grab.id === e.pointerId) { drop(); return; } const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (ptrs.size < 2) gesture = null; if (p && Math.hypot(p.x - p.x0, p.y - p.y0) < 10 && performance.now() - p.t < 400 && !xrOn) tap(e.clientX, e.clientY); };
canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', e => { if (grab && grab.id === e.pointerId) drop(); ptrs.delete(e.pointerId); gesture = null; });
canvas.addEventListener('wheel', e => { e.preventDefault(); if (sensor()) anchor.scale.setScalar(THREE.MathUtils.clamp(anchor.scale.x * (e.deltaY > 0 ? 0.92 : 1.08), 0.3, 4)); else orbit.r = THREE.MathUtils.clamp(orbit.r * (e.deltaY > 0 ? 1.08 : 0.92), 0.6, 6); }, { passive: false });

function tap(x, y) { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); pickRay(); }
function pickRay() {
  if (!root) return;
  const hits = ray.intersectObject(root, true).filter(h => h.object.userData.pick || h.object.parent?.userData.pick);
  const h = hits.find(h => h.object.userData.pick?.kind === 'animal' || h.object.userData.pick?.kind === 'spot') || hits.find(h => h.object.userData.pick?.kind === 'plant');
  if (!h) return;
  const pk = h.object.userData.pick;
  if (mode === 'lost') { if (pk.kind === 'spot') lostChoose(pk.id); return; }
  if (pk.kind === 'animal') onAnimal(animals.find(a => a.hit === h.object));
  else if (pk.kind === 'plant') { const info = HABITATS[cur].plantInfo?.[pk.info]; if (info) { showSheet(info.emo, info.name, info.fact, info.tags); S.play('pop'); } }
}

// ───────────────────────── بطاقة المعلومات ─────────────────────────
let sheetText = '';
function showSheet(emo, name, fact, tags = []) {
  $('sheetIco').textContent = emo; $('sheetName').textContent = name; $('sheetFact').textContent = fact;
  $('sheetTags').innerHTML = tags.map(t => `<span>${t}</span>`).join(''); $('sheet').hidden = false; sheetText = name + '. ' + fact;
}
$('sheetX').onclick = () => { $('sheet').hidden = true; };
$('speakBtn').onclick = () => { S.unlock(); const txt = !$('sheet').hidden ? sheetText : HABITATS[cur].intro; if (!S.speak(txt)) toast('القراءة الصوتية غير متاحة في هذا المتصفح'); };

function onAnimal(a) {
  if (!a) return;
  S.play(a.d.sound);
  showLabel(a);
  if (a.act.happy && a.d.beh !== 'swim' && a.d.beh !== 'fly') { const h = a.act.happy; h.reset().setLoop(THREE.LoopOnce, 1); h.clampWhenFinished = false; h.fadeIn(0.15).play(); if (a.cur) a.cur.fadeOut(0.15); const prev = a.state === 'walk' ? 'walk' : 'idle'; a.cur = h; setTimeout(() => { a.cur = null; play(a, prev); }, (h.getClip().duration * 1000) || 900); }
  if (quest) return questAnswer(a);
  showSheet(a.d.emo, a.d.name, a.d.fact, a.d.tags);
}

// ───────────────────────── تحدّي الموطن ─────────────────────────
let quest = null;
$('challengeBtn').onclick = () => { S.unlock(); startQuest(); };
function startQuest() {
  const items = shuffle(CHALLENGES[cur]); quest = { items, i: 0, stars: 0, tries: 0 };
  $('sheet').hidden = true; $('quest').hidden = false; $('hint').style.opacity = 0; nextQuest();
}
function nextQuest() {
  if (quest.i >= quest.items.length) { const s = quest.stars, n = quest.items.length; endQuest(); confetti(); S.play('win'); toast(`أحسنتِ! جمعتِ ${s} من ${n} نجوم ⭐`, 2600); return; }
  $('questQ').textContent = quest.items[quest.i][0]; $('questStars').textContent = '⭐'.repeat(quest.stars) + '☆'.repeat(quest.items.length - quest.stars);
}
function questAnswer(a) {
  const want = quest.items[quest.i][1];
  if (a.id === want) { if (quest.tries === 0) quest.stars++; quest.tries = 0; quest.i++; S.play('good'); toast('إجابة صحيحة ✓ ' + a.d.name); showLabel(a, 2500); setTimeout(nextQuest, 900); }
  else { quest.tries++; S.play('bad'); toast('هذا ' + a.d.name + '، حاولي مرة أخرى'); }
}
function endQuest() { quest = null; $('quest').hidden = true; $('hint').style.opacity = 1; }
$('questEnd').onclick = endQuest;

// ───────────────────────── الطقس (عاصفة) ─────────────────────────
$('weatherBtn').onclick = () => {
  S.unlock(); storm = !storm; const W = HABITATS[cur].weather;
  $('weatherBtn').classList.toggle('on', storm);
  if (cur === 'forest') fx.rain.visible = storm;
  const stormTxt = { desert: 'عاصفة رملية! 💨', grass: 'رياح قوية تحرّك الأعشاب 🌬️', forest: 'مطر غزير على الغابة 🌧️', lake: 'مطر غزير يملأ البحيرة 🌧️', ocean: 'أمواج عالية في المحيط 🌊' }[cur];
  if (storm) { toast(stormTxt); S.play(cur === 'ocean' ? 'splash' : 'pop'); }
  showSheet(W.icon, `طقس ${HABITATS[cur].name} ${W.temp}`, W.text, storm ? ['اضغطي «الطقس» مرة أخرى للهدوء'] : ['اضغطي «الطقس» لتري العاصفة']);
};

// ───────────────────────── الواقع المعزز الحقيقي (WebXR) ─────────────────────────
let xrCtrl = null, xrJustDropped = false;
let xrOn = false, xrPlaced = false, hitSrc = null, reticle = null;
async function checkXR() { try { return !!(navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')); } catch (e) { return false; } }
$('xrBtn').onclick = startXR;
async function startXR() {
  S.unlock();
  try {
    const hadCam = camOn; stopCamera(); startXR.hadCam = hadCam;
    const session = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay', 'local-floor'], domOverlay: { root: $('app') } });
    renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local'); await renderer.xr.setSession(session);
    xrOn = true; xrPlaced = false; anchor.visible = false; anchor.scale.setScalar(1); $('sky').style.opacity = 0;
    const viewer = await session.requestReferenceSpace('viewer'); hitSrc = await session.requestHitTestSource({ space: viewer });
    if (!reticle) { reticle = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.15, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd04a })); reticle.matrixAutoUpdate = false; scene.add(reticle); }
    const ctrl = renderer.xr.getController(0); scene.add(ctrl);
    xrCtrl = ctrl;
    const ctrlRay = () => { const m = new THREE.Matrix4().identity().extractRotation(ctrl.matrixWorld); ray.ray.origin.setFromMatrixPosition(ctrl.matrixWorld); ray.ray.direction.set(0, 0, -1).applyMatrix4(m); };
    ctrl.addEventListener('selectstart', () => { if (xrPlaced && mode === 'lost') { ctrlRay(); if (tryGrab()) grab.xr = true; } });
    ctrl.addEventListener('selectend', () => { if (grab?.xr) { drop(); xrJustDropped = true; } });
    ctrl.addEventListener('select', () => {
      if (xrJustDropped) { xrJustDropped = false; return; }
      if (!xrPlaced && reticle.visible) { anchor.position.setFromMatrixPosition(reticle.matrix); anchor.visible = true; xrPlaced = true; reticle.visible = false; toast('هذا الموطن على أرض فصلك! تجوّلي حوله 👣', 2400); return; }
      const m = new THREE.Matrix4().identity().extractRotation(ctrl.matrixWorld); ray.ray.origin.setFromMatrixPosition(ctrl.matrixWorld); ray.ray.direction.set(0, 0, -1).applyMatrix4(m); pickRay();
    });
    document.querySelectorAll('.dock,.sheet,.quest,.top').forEach(el => el.addEventListener('beforexrselect', e => e.preventDefault()));
    toast('حرّكي الجوال ببطء نحو الأرض، ثم المسي الشاشة لوضع الموطن', 3500);
    session.addEventListener('end', () => { xrOn = false; hitSrc = null; renderer.xr.enabled = false; anchor.visible = true; anchor.position.copy(PLACE); if (reticle) reticle.visible = false; if (startXR.hadCam) startCamera(); else $('sky').style.opacity = 1; resize(); });
  } catch (e) { toast('الواقع المعزز الكامل غير مدعوم في هذا الجوال، استخدمي وضع الكاميرا', 2800); if (startXR.hadCam) startCamera(); }
}

// ───────────────────────── التنقّل بين الشاشات ─────────────────────────
let mode = 'home';
function showHome() {
  mode = 'home'; endQuest(); clearWorld(); cur = null; S.stopScape();
  $('home').hidden = false; $('hud').hidden = true; $('lostHud').hidden = true; $('game').hidden = true; $('homeBtn').hidden = true;
  $('title').textContent = 'أماكن العيش'; $('subtitle').textContent = 'د. أفنان الطلحي · العلوم · رابع ابتدائي';
  $('sky').style.background = 'linear-gradient(#0d3b2c,#071a14)'; history.replaceState(null, '', location.pathname);
}
$('homeBtn').onclick = () => { if (xrOn) renderer.xr.getSession()?.end(); showHome(); };

async function openHabitat(h) {
  S.unlock();
  mode = 'habitat'; $('home').hidden = true; $('game').hidden = true; $('lostHud').hidden = true; $('loader').hidden = false; $('loaderTxt').textContent = 'يجهّز ' + HABITATS[h].name + '…';
  clearWorld(); cur = h; setLight(h);
  const H = HABITATS[h];
  $('sky').style.background = H.sky; $('title').textContent = H.name; $('subtitle').textContent = (H.lesson === 1 ? 'الدرس الأول · مواطن على اليابسة' : 'الدرس الثاني · مواطن في الماء');
  try { root = await buildHabitat(h); } catch (e) { console.error(e); toast('تعذّر تحميل الموطن، أعيدي المحاولة'); $('loader').hidden = true; return; }
  if (cur !== h) return;
  anchor.add(root); anchor.position.copy(PLACE); anchor.rotation.set(0, 0, 0); anchor.scale.setScalar(1); needCenter = true;
  orbit.az = 0; orbit.pol = h === 'ocean' ? 0.95 : 1.0; orbit.r = (h === 'forest' ? 3.3 : 3.0) * fitK(); Object.assign(orbit0, orbit);
  $('loader').hidden = true; $('hud').hidden = false; $('homeBtn').hidden = false; $('sheet').hidden = true;
  $('chips').innerHTML = H.chips.map(c => `<span class="chip">${c}</span>`).join('');
  $('weatherBtn').classList.remove('on'); $('hint').style.opacity = 1;
  $('hint').textContent = sensor() ? 'حرّكي الجوال حولك · المسي أي حيوان أو نبات' : 'اسحبي للتدوير · المسي أي حيوان أو نبات';
  setTimeout(() => { $('hint').style.opacity = 0; }, 6000);
  showSheet(H.emo, H.name, H.intro, [H.weather.icon + ' ' + H.blurb]);
  S.startScape(h);
  history.replaceState(null, '', '?h=' + h);
}

// ───────────────────────── لعبة: الحيوان التائه (واقع معزز) ─────────────────────────
let lost = null;
const SPOT_ORDER = ['desert', 'grass', 'forest', 'lake', 'ocean'];
const SPOT_COL = { desert: 0xe3b574, grass: 0x8cc04a, forest: 0x3f6a2a, lake: 0x4aa3c4, ocean: 0x2a7fd0 };
async function openLost() {
  S.unlock();
  mode = 'lost'; $('home').hidden = true; $('game').hidden = true; $('hud').hidden = true; $('loader').hidden = false; $('loaderTxt').textContent = 'يجهّز اللعبة…';
  clearWorld(); cur = null; setLight('lost'); $('sky').style.background = 'linear-gradient(#cfeaff,#9fd0a0)';
  $('title').textContent = 'أعيدي الحيوان إلى موطنه'; $('subtitle').textContent = 'لعبة الواقع المعزز';
  const g = new THREE.Group(); const spots = {};
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.04, 64), std(0xd9e6d2, 0.9)); base.position.y = -0.02; base.receiveShadow = true; g.add(base);
  const jobs = [];
  SPOT_ORDER.forEach((h, i) => {
    const a = i / 5 * Math.PI * 2 + Math.PI, x = Math.sin(a) * 0.66, z = Math.cos(a) * 0.66;
    const s = new THREE.Group(); s.position.set(x, 0, z);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.24, 0.05, 40), new THREE.MeshStandardMaterial({ color: SPOT_COL[h], roughness: h === 'lake' || h === 'ocean' ? 0.15 : 0.9 }));
    disc.position.y = 0.025; disc.receiveShadow = true; disc.userData.pick = { kind: 'spot', id: h }; s.add(disc);
    const decor = { desert: [['Cactus_1', 0.22], ['Rock_1', 0.06]], grass: [['CommonTree_3', 0.28, { Green: 0x6f9a34 }], ['Bush_1', 0.08]], forest: [['PineTree_2', 0.38], ['CommonTree_1', 0.32]], lake: [['Lilypad', 0.01], ['Grass', 0.12]], ocean: [['Grass_2', 0.14, { Green: 0x2e8a5a }], ['Rock_3', 0.07]] }[h];
    decor.forEach(([m, ht, tint], k) => jobs.push(placeModel(m, ht, k ? -0.12 : 0.11, k ? 0.06 : -0.08, 'grass', undefined, tint).then(o => { o.position.y += 0.05; if (m === 'Lilypad') o.scale.multiplyScalar(3); o.traverse(c => { if (c.isMesh) c.userData.pick = { kind: 'spot', id: h }; }); s.add(o); })));
    const lb = label(HABITATS[h].name, HABITATS[h].emo); lb.position.y = 0.5; lb.scale.multiplyScalar(0.8); s.add(lb);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.5, 12), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.25; hit.userData.pick = { kind: 'spot', id: h }; s.add(hit);
    g.add(s); spots[h] = s;
  });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 32), std(0xffffff, 0.5)); ped.position.y = 0.03; g.add(ped);
  await Promise.all(jobs);
  root = g; anchor.add(g); anchor.position.copy(PLACE); anchor.rotation.set(0, 0, 0); anchor.scale.setScalar(1); needCenter = true; orbit.az = 0; orbit.pol = 0.85; orbit.r = 2.8 * fitK(); Object.assign(orbit0, orbit);
  const pool = shuffle(Object.keys(ANIMALS).filter(k => !['stork', 'tang', 'stag'].includes(k))).slice(0, 10);
  lost = { spots, pool, i: 0, score: 0, a: null, busy: false };
  $('loader').hidden = true; $('lostHud').hidden = false; $('homeBtn').hidden = false;
  S.startScape('lost'); history.replaceState(null, '', '?g=lost');
  nextLost();
}
async function nextLost() {
  if (lost.a) { /* الحيوان السابق يبقى في موطنه */ }
  if (lost.i >= lost.pool.length) { $('lostQ').textContent = `انتهت اللعبة! أعدتِ ${lost.score} من ${lost.pool.length} حيوانات إلى مواطنها 🎉`; $('lostScore').textContent = '⭐'.repeat(Math.round(lost.score / 2)); confetti(); S.play('win'); $('lostHint').textContent = 'اضغطي ➜ للعودة للقائمة'; lost.done = true; return; }
  const id = lost.pool[lost.i];
  const a = await makeAnimal(id); const d = a.d;
  a.held = true; a.wrap.scale.setScalar(d.len && !d.ground ? 0.34 / d.len : 0.26 / (d.h || d.len * 0.5)); a.home0 = new THREE.Vector3(0, (d.len && !d.ground) ? 0.2 : 0.06, 0); a.wrap.position.copy(a.home0);
  root.add(a.wrap); animals.push(a); lost.a = a; a.tries = 0;
  play(a, 'idle'); showLabel(a, 0); S.play(d.sound);
  $('lostQ').textContent = `${d.emo} ${d.name} تائه! امسكيه بإصبعك وانقليه إلى موطنه`; $('lostScore').textContent = `${lost.i + 1} / ${lost.pool.length} · ⭐ ${lost.score}`;
  $('lostHint').textContent = xrOn ? 'المسي الحيوان مطوّلًا وحرّكي الجوال نحو موطنه ثم ارفعي إصبعك' : 'اسحبي الحيوان بإصبعك وأفلتيه فوق موطنه';
}
// ——— الإمساك بالحيوان وسحبه ———
let grab = null; const dragPlane = new THREE.Plane(), hitPt = new THREE.Vector3();
function tryGrab() {
  if (mode !== 'lost' || !lost || lost.busy || lost.done || !lost.a) return false;
  const h = ray.intersectObject(lost.a.wrap, true)[0]; if (!h) return false;
  grab = { a: lost.a }; S.play('pop'); play(lost.a, lost.a.act.run ? 'run' : 'walk'); return true;
}
function dragTo() {
  if (!grab) return; root.updateMatrixWorld(true);
  const p = new THREE.Vector3(0, 0.1, 0); root.localToWorld(p);
  dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), p);
  if (!ray.ray.intersectPlane(dragPlane, hitPt)) return;
  const l = root.worldToLocal(hitPt.clone()); const r = Math.hypot(l.x, l.z); if (r > 0.95) l.multiplyScalar(0.95 / r);
  const w = grab.a.wrap; const prev = w.position.clone(); w.position.set(l.x, 0.18 + Math.sin(performance.now() / 120) * 0.01, l.z);
  const dx = w.position.x - prev.x, dz = w.position.z - prev.z; if (Math.hypot(dx, dz) > 0.002) w.rotation.y = Math.atan2(dx, dz);
  const near = nearSpot(l); for (const [k, sp] of Object.entries(lost.spots)) sp.scale.setScalar(k === near ? 1.12 : 1);
}
function nearSpot(l) { let best = null, bd = 0.3; for (const [k, sp] of Object.entries(lost.spots)) { const d = Math.hypot(sp.position.x - l.x, sp.position.z - l.z); if (d < bd) { bd = d; best = k; } } return best; }
function drop() {
  if (!grab) return; const a = grab.a; grab = null; Object.values(lost.spots).forEach(sp => sp.scale.setScalar(1));
  const h = nearSpot(a.wrap.position);
  if (h) lostChoose(h); else flyBack(a);
}
function flyBack(a) {
  const from = a.wrap.position.clone(); let k = 0; play(a, 'idle');
  const step = () => { k += 0.05; const e = Math.min(1, k); a.wrap.position.lerpVectors(from, a.home0, e); a.wrap.position.y += Math.sin(e * Math.PI) * 0.08; if (e < 1) requestAnimationFrame(step); };
  step();
}
function lostChoose(h) {
  if (!lost || lost.busy || lost.done) return; const a = lost.a; if (!a) return;
  if (a.d.home !== h) { a.tries++; S.play('bad'); toast(`${a.d.name} لا يعيش في ${HABITATS[h].name}، حاولي مرة أخرى`, 2000); flyBack(a); return; }
  lost.busy = true; if (a.tries === 0) lost.score++; S.play('good'); toast('أحسنتِ! ' + a.d.name + ' يعيش في ' + HABITATS[h].name, 2000);
  const s = lost.spots[h]; const n = s.userData.n = (s.userData.n || 0) + 1;
  const goal = s.position.clone().add(new THREE.Vector3(Math.cos(n * 2.2) * 0.1, a.d.len ? 0.12 : 0.05, Math.sin(n * 2.2) * 0.1));
  const from = a.wrap.position.clone(); let k = 0; a.wrap.rotation.y = Math.atan2(goal.x - from.x, goal.z - from.z); play(a, a.act.run ? 'run' : 'walk');
  const step = () => { k += 0.022; const e = Math.min(1, k); a.wrap.position.lerpVectors(from, goal, e); a.wrap.position.y += Math.sin(e * Math.PI) * 0.15; if (e < 1) requestAnimationFrame(step); else { play(a, 'idle'); if (a.lbl) a.lbl.visible = false; lost.i++; lost.busy = false; nextLost(); } };
  step();
}

// ───────────────────────── الشاشة الرئيسية ─────────────────────────
function card(emo, title, sub, grad, onClick) { const b = document.createElement('button'); b.className = 'card'; b.style.background = grad; b.innerHTML = `<span class="emo">${emo}</span><b>${title}</b><span>${sub}</span>`; b.onclick = onClick; return b; }
for (const [id, H] of Object.entries(HABITATS)) $(H.lesson === 1 ? 'landCards' : 'waterCards').appendChild(card(H.emo, H.name, H.blurb, H.grad, () => openHabitat(id)));
$('gameCards').appendChild(card('🧭', 'الحيوان التائه', 'لعبة واقع معزز: أعيديه إلى موطنه', 'linear-gradient(150deg,#ffb347,#e0572a)', openLost));
GAME_LIST.forEach(gm => $('gameCards').appendChild(card(gm.emo, gm.title, gm.sub, gm.grad, () => { S.unlock(); mode = 'game'; clearWorld(); cur = null; S.stopScape(); $('home').hidden = true; $('game').hidden = false; $('homeBtn').hidden = false; $('title').textContent = gm.title; $('subtitle').textContent = 'ألعاب أماكن العيش'; openGame(gm.id, $('gameInner'), { toast, confetti, play: S.play, speak: S.speak, home: showHome }); })));

$('soundBtn').onclick = () => { S.unlock(); S.setEnabled(!S.isEnabled()); $('soundIco').textContent = S.isEnabled() ? '🔊' : '🔇'; if (!S.isEnabled()) speechSynthesis?.cancel(); };
document.addEventListener('pointerdown', () => S.unlock(), { once: true });

// أزرار إضافية في شريط الموطن
const recBtn = document.createElement('button'); recBtn.className = 'btn'; recBtn.textContent = '🎯 توسيط'; recBtn.onclick = recenter; $('hud').querySelector('.dock').prepend(recBtn);
const lblBtn = document.createElement('button'); lblBtn.className = 'btn'; lblBtn.textContent = '🏷️ الأسماء'; lblBtn.onclick = () => { labelsOn = !labelsOn; lblBtn.classList.toggle('on', labelsOn); animals.forEach(a => labelsOn ? showLabel(a, 0) : (a.lbl && (a.lbl.visible = false))); }; $('hud').querySelector('.dock').prepend(lblBtn);
const gyBtn = document.createElement('button'); gyBtn.className = 'btn'; gyBtn.textContent = '🧭 تتبّع الحركة';
gyBtn.onclick = async () => { useGyro = !useGyro; gyBtn.classList.toggle('on', useGyro);
  if (useGyro) { await enableOrientation(); needCenter = true; toast('حرّكي الجوال حولك، والموطن ثابت في مكانه'); }
  else { recenter(); } };
$('hud').querySelector('.dock').prepend(gyBtn);
checkXR().then(ok => { $('xrBtn').hidden = !ok; });

// ───────────────────────── حلقة العرض ─────────────────────────
renderer.setAnimationLoop((time, frame) => {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (xrOn && frame && hitSrc && !xrPlaced) {
    const hits = frame.getHitTestResults(hitSrc);
    if (hits.length) { const pose = hits[0].getPose(renderer.xr.getReferenceSpace()); reticle.visible = true; reticle.matrix.fromArray(pose.transform.matrix); } else reticle.visible = false;
  }
  if (!xrOn) { if (sensor() && ori) { camera.position.set(0, 0, 0); applyOrientation(); if (needCenter && root) { centerInView(); needCenter = false; } } else applyOrbit(); }
  if (grab?.xr && xrCtrl) { const m = new THREE.Matrix4().identity().extractRotation(xrCtrl.matrixWorld); ray.ray.origin.setFromMatrixPosition(xrCtrl.matrixWorld); ray.ray.direction.set(0, 0, -1).applyMatrix4(m); dragTo(); }
  if (root) { animals.forEach(a => stepAnimal(a, dt, t)); stepFx(dt, t); }
  updateSun();
  renderer.render(scene, camera);
});

// ───────────────────────── البدء ─────────────────────────
startCamera();                       // تفتح الكاميرا مباشرة عند فتح الصفحة
await document.fonts?.ready;
if (Q.get('h') && HABITATS[Q.get('h')]) openHabitat(Q.get('h'));
else if (Q.get('g') === 'lost') openLost();
window.__hab = { lost: () => lost, camera, root: () => root, animals: () => animals, orbit, anchor, openHabitat, openLost, stepFx, setStorm: v => { storm = v; if (fx.rain && cur === 'forest') fx.rain.visible = v; } };
