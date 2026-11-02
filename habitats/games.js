import { HABITATS, ANIMALS, VOCAB, QUIZ, LEGS, STUDENTS } from './data.js';

export const GAME_LIST = [
  { id: 'where', emo: '🏠', title: 'أين أعيش؟', sub: 'صنّفي كل حيوان في موطنه', grad: 'linear-gradient(150deg,#6a5cff,#3a2a9a)' },
  { id: 'legs', emo: '🦵', title: 'أعدّ الأرجل', sub: 'العلوم والرياضيات: عدّي ورتّبي', grad: 'linear-gradient(150deg,#ff6fae,#a8326a)' },
  { id: 'vocab', emo: '🔤', title: 'أصل الكلمة بمعناها', sub: 'مفردات الفصل الرابع', grad: 'linear-gradient(150deg,#22c1c3,#137a7c)' },
  { id: 'quiz', emo: '⭐', title: 'مسابقة نجمات العلوم', sub: 'أسئلة بالدور لطالبات الصف', grad: 'linear-gradient(150deg,#ffcf3a,#c98a00)' },
];

const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const H_ORDER = ['desert', 'grass', 'forest', 'lake', 'ocean'];

export function openGame(id, el, api) { ({ where, legs, vocab, quiz })[id](el, api); }

function head(title, score) { return `<div class="g-head"><h2>${title}</h2><div class="g-score" id="gScore">${score}</div></div>`; }
function result(el, api, emo, title, msg, again) {
  el.innerHTML = `<div class="result"><div class="e">${emo}</div><h3>${title}</h3><p>${msg}</p><div class="row"><button class="btn accent" id="again">🔁 العبي مرة أخرى</button><button class="btn" id="back">القائمة</button></div></div>`;
  el.querySelector('#again').onclick = again; el.querySelector('#back').onclick = api.home; api.confetti(); api.play('win');
}

// ① أين أعيش؟
function where(el, api) {
  const pool = shuffle(Object.keys(ANIMALS).filter(k => k !== 'tang')).slice(0, 12); let i = 0, score = 0, tries = 0;
  const round = () => {
    if (i >= pool.length) return result(el, api, score >= 10 ? '🏆' : '🌟', `${score} من ${pool.length}`, score >= 10 ? 'رائع! تعرفين أماكن عيش الحيوانات جيدًا.' : 'أحسنتِ، تدرّبي أكثر لتصلي إلى العلامة الكاملة.', () => where(el, api));
    const a = ANIMALS[pool[i]]; tries = 0;
    el.innerHTML = head('أين أعيش؟', `${i + 1}/${pool.length} · ⭐ ${score}`) + `<p class="g-prompt">اختاري الموطن الذي يعيش فيه هذا الحيوان:</p>
      <div class="big-animal">${a.emo}</div><div class="big-name">${a.name}</div>
      <div class="opts">${H_ORDER.map(h => `<button class="opt" data-h="${h}">${HABITATS[h].emo} ${HABITATS[h].name}</button>`).join('')}</div>`;
    el.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      if (b.dataset.h === a.home) { b.classList.add('ok'); if (!tries) score++; api.play('good'); api.toast('صحيح! ' + a.fact.split('،')[0]); setTimeout(() => { i++; round(); }, 1300); el.querySelectorAll('.opt').forEach(o => o.disabled = true); }
      else { tries++; b.classList.add('no'); api.play('bad'); setTimeout(() => b.classList.remove('no'), 500); }
    });
  };
  round();
}

// ② أعدّ الأرجل (صفحة العلوم والرياضيات)
function legs(el, api) {
  const items = LEGS.map(x => ({ ...x, v: 0 }));
  const draw = () => {
    el.innerHTML = head('أعدّ الأرجل', 'الخطوة ١ من ٢') + `<p class="g-prompt">تختلف الحيوانات في عدد الأرجل. عدّي أرجل كل حيوان:</p>
      <div class="legs">${items.map((x, i) => `<div class="leg-card"><div class="e">${x.emo}</div><div class="n">${x.name}</div><div class="stepper"><button data-i="${i}" data-d="-1">−</button><output id="o${i}">${x.v}</output><button data-i="${i}" data-d="1">+</button></div></div>`).join('')}</div>
      <div class="row"><button class="btn accent" id="check">تحقّقي ✓</button></div>`;
    el.querySelectorAll('.stepper button').forEach(b => b.onclick = () => { const x = items[b.dataset.i]; x.v = Math.max(0, Math.min(12, x.v + +b.dataset.d)); el.querySelector('#o' + b.dataset.i).textContent = x.v; api.play('pop'); });
    el.querySelector('#check').onclick = () => {
      const wrong = items.filter(x => x.v !== x.n);
      el.querySelectorAll('.leg-card').forEach((c, i) => c.style.borderColor = items[i].v === items[i].n ? 'var(--good)' : 'var(--bad)');
      if (wrong.length) { api.play('bad'); api.toast(`راجعي: ${wrong.map(w => w.name).join('، ')}`, 2200); }
      else { api.play('good'); api.toast('أحسنتِ! كل الأعداد صحيحة'); setTimeout(order, 1000); }
    };
  };
  const order = () => {
    let picked = []; const pool = shuffle(items);
    const render = () => {
      el.innerHTML = head('أعدّ الأرجل', 'الخطوة ٢ من ٢') + `<p class="g-prompt">رتّبي الحيوانات بحسب عدد أرجلها من الأقلّ إلى الأكثر. المسيها بالترتيب:</p>
        <div class="order-row">${picked.map(x => `<span class="e" title="${x.name}">${x.emo}<small style="display:block;font-size:13px;text-align:center">${x.n}</small></span>`).join('')}</div>
        <div class="opts">${pool.map((x, i) => `<button class="opt ${picked.includes(x) ? 'done' : ''}" data-i="${i}">${x.emo} ${x.name}</button>`).join('')}</div>
        <div class="row"><button class="btn" id="reset">↺ ابدئي الترتيب من جديد</button></div>`;
      el.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        const x = pool[b.dataset.i]; const next = items.filter(y => !picked.includes(y)).sort((a, b) => a.n - b.n)[0];
        if (x === next) { picked.push(x); api.play('good'); if (picked.length === items.length) return result(el, api, '🦵', 'ترتيب صحيح!', '٢ ← ٤ ← ٦ ← ٨ : الفلامنغو، السلحفاة، الخنفساء، العنكبوت', () => legs(el, api)); render(); }
        else { api.play('bad'); api.toast(`${x.name} له ${x.n} أرجل، هل هذا الأقل؟`); }
      });
      el.querySelector('#reset').onclick = () => { picked = []; render(); };
    };
    render();
  };
  draw();
}

// ③ المفردات
function vocab(el, api) {
  const words = shuffle(VOCAB), defs = shuffle(VOCAB); let sel = null, done = 0, mistakes = 0;
  el.innerHTML = head('أصل الكلمة بمعناها', `0/${VOCAB.length}`) + `<p class="g-prompt">المسي الكلمة، ثم المسي معناها الصحيح.</p>
    <div style="display:grid;grid-template-columns:1fr 1.6fr;gap:10px">
      <div style="display:grid;gap:8px">${words.map(w => `<button class="opt w" data-k="${w[0]}">${w[0]}</button>`).join('')}</div>
      <div style="display:grid;gap:8px">${defs.map(w => `<button class="opt d" data-k="${w[0]}" style="font-size:14px;font-weight:600">${w[1]}</button>`).join('')}</div>
    </div>`;
  el.querySelectorAll('.w').forEach(b => b.onclick = () => { el.querySelectorAll('.w').forEach(o => o.classList.remove('sel')); b.classList.add('sel'); sel = b; api.play('pop'); api.speak(b.dataset.k); });
  el.querySelectorAll('.d').forEach(b => b.onclick = () => {
    if (!sel) return api.toast('اختاري كلمة أولًا');
    if (sel.dataset.k === b.dataset.k) { sel.classList.remove('sel'); sel.classList.add('ok', 'done'); b.classList.add('ok', 'done'); sel = null; done++; api.play('good'); el.querySelector('#gScore').textContent = `${done}/${VOCAB.length}`;
      if (done === VOCAB.length) setTimeout(() => result(el, api, '🔤', 'أتقنتِ المفردات!', mistakes ? `أخطاء: ${mistakes}` : 'دون أي خطأ! 👏', () => vocab(el, api)), 700); }
    else { mistakes++; b.classList.add('no'); api.play('bad'); setTimeout(() => b.classList.remove('no'), 500); }
  });
}

// ④ مسابقة نجمات العلوم (بالدور بين الطالبات)
function quiz(el, api) {
  const qs = shuffle(QUIZ).slice(0, 12); const stars = Object.fromEntries(STUDENTS.map(s => [s, 0])); let i = 0, turn = Math.random() * STUDENTS.length | 0;
  const board = () => `<div class="team">${STUDENTS.map((s, k) => `<div class="member ${k === turn ? 'turn' : ''}">${s}<div class="st">${'⭐'.repeat(stars[s])}</div></div>`).join('')}</div>`;
  const ask = () => {
    if (i >= qs.length) {
      const top = Math.max(...Object.values(stars)); const winners = STUDENTS.filter(s => stars[s] === top && top > 0);
      return result(el, api, '👑', winners.length ? 'نجمة العلوم: ' + winners.join(' و ') : 'انتهت المسابقة', STUDENTS.map(s => `${s}: ${stars[s]}⭐`).join(' · '), () => quiz(el, api));
    }
    const q = qs[i], name = STUDENTS[turn]; const opts = shuffle(q.a.map((t, k) => ({ t, ok: k === q.c }))); let first = true;
    el.innerHTML = head('مسابقة نجمات العلوم', `سؤال ${i + 1}/${qs.length}`) + board() + `<p class="g-prompt">دور <b style="color:var(--accent)">${name}</b> 🎤</p>
      <div class="qcard">${q.q}</div><div class="opts" style="grid-template-columns:1fr">${opts.map((o, k) => `<button class="opt" data-k="${k}">${o.t}</button>`).join('')}</div>
      <div class="row"><button class="btn" id="read">🗣️ اقرئي السؤال</button><button class="btn" id="skip">تخطّي الدور</button></div>`;
    el.querySelector('#read').onclick = () => api.speak(q.q.replace('…', '') + '. ' + opts.map(o => o.t).join('، أو '));
    el.querySelector('#skip').onclick = () => { turn = (turn + 1) % STUDENTS.length; ask(); };
    el.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      const o = opts[b.dataset.k];
      if (o.ok) { b.classList.add('ok'); if (first) stars[name]++; api.play('good'); api.toast(first ? `أحسنتِ يا ${name}! ⭐` : 'صحيح'); el.querySelectorAll('.opt').forEach(x => x.disabled = true); setTimeout(() => { i++; turn = (turn + 1) % STUDENTS.length; ask(); }, 1300); }
      else { first = false; b.classList.add('no'); api.play('bad'); }
    });
  };
  ask();
}
