// أصوات الموطن — مُولَّدة بالكامل بالمتصفح (Web Audio) دون ملفات خارجية
let ctx = null, master = null, noiseBuf = null;
let bed = [];          // عُقد الصوت المحيطي للموطن الحالي
let timers = [];       // مؤقتات الأصوات المتكررة (طيور، ضفادع...)
let enabled = true;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}
export function setEnabled(v) { enabled = v; if (master) master.gain.setTargetAtTime(v ? 0.9 : 0, ctx.currentTime, 0.1); }
export function isEnabled() { return enabled; }

function noise() { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; }
function g(v) { const n = ctx.createGain(); n.gain.value = v; return n; }
function filt(type, f, q = 0.7) { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; }
function lfo(freq, depth, target) { const o = ctx.createOscillator(); o.frequency.value = freq; const d = g(depth); o.connect(d); d.connect(target); o.start(); bed.push(o); return o; }
const rnd = (a, b) => a + Math.random() * (b - a);

function every(fn, min, max) {
  let alive = true;
  const loop = () => { if (!alive) return; try { fn(); } catch (e) {} const t = setTimeout(loop, rnd(min, max)); timers.push(t); };
  const t = setTimeout(loop, rnd(300, min)); timers.push(t);
  timers.push({ stop: () => { alive = false; } });
}

// ——— طبقات محيطية ———
function wind(level = 0.25, f = 450) {
  const n = noise(), bp = filt('bandpass', f, 0.6), out = g(level * 0.5);
  n.connect(bp); bp.connect(out); out.connect(master);
  lfo(0.07, level * 0.45, out.gain); lfo(0.13, f * 0.5, bp.frequency);
  n.start(); bed.push(n, out);
}
function surf(level = 0.5) {
  const n = noise(), lp = filt('lowpass', 700), out = g(level * 0.4);
  n.connect(lp); lp.connect(out); out.connect(master);
  lfo(0.11, level * 0.4, out.gain); lfo(0.11, 500, lp.frequency);
  n.start(); bed.push(n, out);
}
function rain(level = 0.15) {
  const n = noise(), hp = filt('highpass', 2500), out = g(level);
  n.connect(hp); hp.connect(out); out.connect(master); n.start(); bed.push(n, out);
}
function underwater(level = 0.35) {
  const n = noise(), lp = filt('lowpass', 260), out = g(level);
  n.connect(lp); lp.connect(out); out.connect(master); lfo(0.08, level * 0.3, out.gain); n.start(); bed.push(n, out);
}
function leaves(level = 0.08) {
  const n = noise(), bp = filt('bandpass', 3200, 0.5), out = g(level);
  n.connect(bp); bp.connect(out); out.connect(master); lfo(0.2, level * 0.9, out.gain); n.start(); bed.push(n, out);
}

// ——— أصوات قصيرة ———
function tone({ type = 'sine', f0, f1, dur, vol = 0.2, at = 0, vib = 0, filter = null }) {
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const e = g(0); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol, t + Math.min(0.03, dur / 4)); e.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  let last = o;
  if (vib) { const v = ctx.createOscillator(); v.frequency.value = vib; const vd = g(f0 * 0.04); v.connect(vd); vd.connect(o.frequency); v.start(t); v.stop(t + dur); }
  if (filter) { const fl = filt(filter[0], filter[1], filter[2] || 1); last.connect(fl); last = fl; }
  last.connect(e); e.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
function burst({ f = 1500, q = 2, dur = 0.05, vol = 0.3, at = 0, type = 'bandpass' }) {
  const t = ctx.currentTime + at;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; const fl = filt(type, f, q); const e = g(0);
  e.gain.setValueAtTime(vol, t); e.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(fl); fl.connect(e); e.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.02);
}

export const sfx = {
  chirp() { const b = rnd(2600, 3800); const n = 2 + (Math.random() * 4 | 0); for (let i = 0; i < n; i++) tone({ f0: b, f1: b * rnd(1.2, 1.6), dur: 0.09, vol: 0.06, at: i * 0.13 }); },
  warble() { const b = rnd(1800, 2600); for (let i = 0; i < 6; i++) tone({ f0: b + (i % 2) * 500, f1: b + (i % 2 ? 0 : 600), dur: 0.08, vol: 0.05, at: i * 0.09 }); },
  cricket() { for (let i = 0; i < 4; i++) tone({ type: 'triangle', f0: 4600, f1: 4500, dur: 0.05, vol: 0.025, at: i * 0.08 }); },
  croak() { for (let i = 0; i < 2; i++) tone({ type: 'sawtooth', f0: 140, f1: 95, dur: 0.28, vol: 0.18, at: i * 0.38, vib: 28, filter: ['lowpass', 700, 3] }); },
  woodpecker() { for (let i = 0; i < 14; i++) burst({ f: 1300, q: 4, dur: 0.025, vol: 0.5, at: i * 0.055 }); },
  drop() { tone({ f0: rnd(900, 1500), f1: rnd(1800, 2600), dur: 0.06, vol: 0.05 }); },
  bubble() { tone({ f0: rnd(300, 500), f1: rnd(900, 1400), dur: 0.12, vol: 0.08 }); },
  gull() { tone({ type: 'sawtooth', f0: 1900, f1: 1150, dur: 0.35, vol: 0.05, vib: 18, filter: ['bandpass', 1600, 2] }); tone({ type: 'sawtooth', f0: 1800, f1: 1200, dur: 0.3, vol: 0.04, at: 0.4, vib: 18, filter: ['bandpass', 1600, 2] }); },
  whale() { tone({ f0: 240, f1: 120, dur: 2.2, vol: 0.25, vib: 3 }); tone({ f0: 160, f1: 260, dur: 1.6, vol: 0.15, at: 2.0, vib: 2 }); },
  dolphin() { for (let i = 0; i < 8; i++) burst({ f: 5000, q: 6, dur: 0.012, vol: 0.4, at: i * 0.035 }); tone({ f0: 6500, f1: 11000, dur: 0.35, vol: 0.05, at: 0.35 }); tone({ f0: 9000, f1: 6000, dur: 0.3, vol: 0.05, at: 0.72 }); },
  hiss() { burst({ f: 5200, q: 0.6, dur: 1.1, vol: 0.18, type: 'highpass' }); },
  yip() { tone({ type: 'sawtooth', f0: 900, f1: 1400, dur: 0.12, vol: 0.08, filter: ['bandpass', 1200, 2] }); tone({ type: 'sawtooth', f0: 1000, f1: 1500, dur: 0.12, vol: 0.08, at: 0.2, filter: ['bandpass', 1200, 2] }); },
  grunt() { tone({ type: 'sawtooth', f0: 110, f1: 70, dur: 0.7, vol: 0.2, vib: 14, filter: ['lowpass', 500, 2] }); burst({ f: 400, q: 0.8, dur: 0.5, vol: 0.08 }); },
  snort() { burst({ f: 700, q: 0.7, dur: 0.35, vol: 0.25 }); tone({ type: 'sawtooth', f0: 400, f1: 700, dur: 0.5, vol: 0.06, at: 0.3, vib: 9, filter: ['bandpass', 800, 1] }); },
  honk() { tone({ type: 'square', f0: 500, f1: 420, dur: 0.22, vol: 0.06, filter: ['bandpass', 900, 3] }); tone({ type: 'square', f0: 500, f1: 420, dur: 0.22, vol: 0.06, at: 0.3, filter: ['bandpass', 900, 3] }); },
  squeak() { tone({ f0: 2200, f1: 3000, dur: 0.08, vol: 0.06 }); tone({ f0: 2400, f1: 3200, dur: 0.08, vol: 0.06, at: 0.12 }); },
  click() { burst({ f: 2000, q: 1, dur: 0.03, vol: 0.2 }); },
  splash() { burst({ f: 1200, q: 0.4, dur: 0.6, vol: 0.3 }); },
  hum() { tone({ type: 'triangle', f0: 220, f1: 210, dur: 0.6, vol: 0.05, vib: 6 }); },
  good() { tone({ f0: 660, f1: 660, dur: 0.12, vol: 0.18 }); tone({ f0: 880, f1: 880, dur: 0.12, vol: 0.18, at: 0.12 }); tone({ f0: 1320, f1: 1320, dur: 0.25, vol: 0.18, at: 0.24 }); },
  bad() { tone({ type: 'triangle', f0: 300, f1: 180, dur: 0.35, vol: 0.2 }); },
  win() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone({ type: 'triangle', f0: f, f1: f, dur: 0.18, vol: 0.18, at: i * 0.13 })); },
  pop() { tone({ f0: 400, f1: 1200, dur: 0.08, vol: 0.12 }); },
};
export function play(name) { if (!ctx || !enabled) return; unlock(); (sfx[name] || sfx.pop)(); }

// ——— المشهد الصوتي لكل موطن ———
export function startScape(id) {
  stopScape(); if (!ctx) return;
  switch (id) {
    case 'desert': wind(0.55, 380); every(() => sfx.cricket(), 2500, 6000); every(() => burst({ f: 1800, q: 0.3, dur: 1.4, vol: 0.06 }), 4000, 9000); break;
    case 'grass': wind(0.22, 600); every(() => sfx.chirp(), 1500, 4000); every(() => sfx.cricket(), 1200, 3000); every(() => sfx.hum(), 6000, 12000); break;
    case 'forest': leaves(0.09); wind(0.12, 300); every(() => sfx.warble(), 1200, 3200); every(() => sfx.chirp(), 1500, 3500); every(() => sfx.woodpecker(), 6000, 11000); break;
    case 'lake': surf(0.12); rain(0.06); every(() => sfx.croak(), 1800, 4500); every(() => sfx.drop(), 150, 600); every(() => sfx.chirp(), 3000, 7000); break;
    case 'ocean': surf(0.8); underwater(0.18); every(() => sfx.gull(), 4000, 9000); every(() => sfx.bubble(), 500, 1800); every(() => sfx.whale(), 14000, 22000); break;
    case 'lost': wind(0.15, 500); every(() => sfx.chirp(), 3000, 6000); break;
  }
}
export function stopScape() {
  timers.forEach(t => (t && t.stop) ? t.stop() : clearTimeout(t)); timers = [];
  bed.forEach(n => { try { n.stop ? n.stop() : null; } catch (e) {} try { n.disconnect(); } catch (e) {} }); bed = [];
}

// ——— القراءة بالصوت ———
let arVoice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  arVoice = vs.find(v => /ar[-_]SA/i.test(v.lang)) || vs.find(v => /^ar/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
export function speak(text) {
  if (!('speechSynthesis' in window)) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = 'ar-SA'; u.rate = 0.92; if (arVoice) u.voice = arVoice;
  speechSynthesis.speak(u); return true;
}
