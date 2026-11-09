"use strict";
const ORDER = ["m", "f", "p", "e", "l"];
const DN = { m: "المادة وتفاعلاتها", f: "الحركة والقوى", p: "العلوم الفيزيائية", e: "علوم الأرض والفضاء", l: "علوم الحياة" };
const AR = ["أ", "ب", "ج", "د"];
const NQ = 10;
const X0 = 22, XW = 553;
const app = document.getElementById("app");
const ar = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const ssn = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch {} },
  del(k) { try { sessionStorage.removeItem(k); } catch {} },
};
// كل الطلبات تروح لتطبيق Google Apps Script المرتبط بجدول الدرجات
async function api(path, { body, pin } = {}) {
  if (!window.NAFES_API) throw new Error("المنصة غير مربوطة بجدول الدرجات بعد");
  let r;
  try {
    if (body) {
      const action = path === "teacher/config" ? "teacher_config" : path === "teacher/delete" ? "teacher_delete" : path;
      r = await fetch(window.NAFES_API, { method: "POST", headers: { "content-type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, pin, ...body }) });
    } else {
      const q = new URLSearchParams({ action: path, ...(pin ? { pin } : {}) });
      r = await fetch(window.NAFES_API + "?" + q.toString());
    }
  } catch { throw new Error("تعذّر الاتصال بالإنترنت، حاولي مرة ثانية"); }
  let j = {};
  try { j = await r.json(); } catch { throw new Error("صار خطأ، حاولي مرة ثانية"); }
  if (j.error) throw new Error(/^[a-z_]+$/.test(j.error) ? "صار خطأ، حاولي مرة ثانية" : j.error);
  return j;
}
const topicsOf = (d) => TP.map((t, i) => [t, i]).filter(([t]) => t[0] === d).map(([, i]) => i);
function qImg(qid) {
  const q = BANK[qid], h = q[2] - q[1];
  return `<div class="qimg" style="aspect-ratio:${XW}/${h}"><img src="bank/p${q[0]}.webp" alt="نص السؤال" style="width:${(595 / XW) * 100}%;right:${(-(595 - X0 - XW) / XW) * 100}%;top:${(-q[1] / h) * 100}%"></div>`;
}
const pctCls = (p) => (p >= S.threshold ? "ok" : p >= 50 ? "mid" : "no");
const S = { cfg: null, rec: null, threshold: 70, pin: null, data: null, cls: null, dom: "m" };

// ================= البداية =================
async function boot() {
  app.innerHTML = `<p class="muted" style="margin-top:30px">جاري التحميل…</p>`;
  try { S.cfg = await api("config"); S.threshold = S.cfg.threshold; }
  catch (e) { app.innerHTML = `<div class="card" style="margin-top:20px"><p class="err">${esc(e.message)}</p><button class="btn" onclick="boot()">إعادة المحاولة</button></div>`; return; }
  const pin = ssn.get("nafes_pin");
  if (pin) { S.pin = pin; return teacherLoad(); }
  const me = ls.get("nafes_me");
  if (me && S.cfg.classes.includes(me.cls)) return studentLogin(me.name, me.cls, true);
  home();
}
function home(msg) {
  app.innerHTML = `
  <section class="hero">
    <div>
      <h1>منصة <span>نجمات نافس</span></h1>
      <p>تدرّبي على علوم نافس مجالًا بعد مجال. كل مجال تتقنينه (${ar(S.threshold)}٪ فأكثر) يفتح لك المجال اللي بعده، وكل خطأ له شرح يساعدك تفهمين.</p>
    </div>
    <img class="mascot" src="img/mascot.webp" alt="">
  </section>
  <div class="roles">
    <form class="card role" id="fs">
      <h2>دخول الطالبة</h2>
      <label for="sn">اسمك الثلاثي<input id="sn" autocomplete="name" required></label>
      <label for="sc">فصلك<select id="sc">${S.cfg.classes.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>
      <p class="err" id="se">${msg ? esc(msg) : ""}</p>
      <button class="btn" type="submit">ابدئي</button>
    </form>
    <form class="card role t" id="ft">
      <h2>دخول المعلمة</h2>
      <p class="muted" style="margin:0;font-size:14px">درجات الفصول، وتحليل المهارات، والتقييم الذاتي للطالبات.</p>
      <label for="tp">كلمة المرور<input id="tp" type="password" inputmode="numeric" autocomplete="current-password" required></label>
      <p class="err" id="te"></p>
      <button class="btn navy" type="submit">دخول</button>
    </form>
  </div>`;
  document.getElementById("fs").onsubmit = (e) => { e.preventDefault(); studentLogin(document.getElementById("sn").value, document.getElementById("sc").value); };
  document.getElementById("ft").onsubmit = async (e) => {
    e.preventDefault();
    S.pin = document.getElementById("tp").value.trim();
    try { await teacherLoad(true); } catch (err) { document.getElementById("te").textContent = err.message; }
  };
}

// ================= الطالبة =================
async function studentLogin(name, cls, silent) {
  try {
    const r = await api("login", { body: { name, cls } });
    S.rec = r.record; S.threshold = r.threshold;
    ls.set("nafes_me", { name: S.rec.name, cls: S.rec.cls });
    studentMap();
  } catch (e) {
    if (silent) { ls.del("nafes_me"); home(); } else { const el = document.getElementById("se"); if (el) el.textContent = e.message; }
  }
}
function domState(d) {
  const i = ORDER.indexOf(d), m = S.rec.mastered;
  const at = S.rec.attempts.filter((a) => a.d === d);
  const best = at.length ? Math.max(...at.map((a) => a.pct)) : null;
  const open = i === 0 || !!m[ORDER[i - 1]];
  return { done: !!m[d], open, best, n: at.length };
}
function studentMap() {
  const doneN = ORDER.filter((d) => S.rec.mastered[d]).length;
  const all = doneN === ORDER.length;
  app.innerHTML = `
  <div class="me">
    <img src="img/mascot.webp" alt="">
    <div><h2>أهلًا ${esc(S.rec.name.split(" ")[0])}</h2>
    <div class="muted">فصل ${esc(S.rec.cls)} · أتقنتِ ${ar(doneN)} من ${ar(ORDER.length)} مجالات</div></div>
  </div>
  ${all ? `<div class="card" style="background:var(--ok-soft);border-color:var(--ok)"><b style="color:var(--ok);font-size:18px">ما شاء الله! أتقنتِ كل مجالات نافس 🌟</b><div>تقدرين تعيدين أي مجال للتدريب.</div></div>` : ""}
  <div class="path">
    ${ORDER.map((d, i) => {
      const s = domState(d);
      const cls = s.done ? "done" : s.open ? "open" : "lock";
      const st = s.done ? `متقن ✓ · أعلى نتيجة ${ar(s.best)}٪` : s.open ? (s.n ? `أعلى نتيجة ${ar(s.best)}٪ · تحتاجين ${ar(S.threshold)}٪` : "جاهز للبدء") : `يُفتح بعد إتقان «${DN[ORDER[i - 1]]}»`;
      return `<div class="dom ${cls}">
        <div class="n">${s.done ? "✓" : s.open ? ar(i + 1) : "🔒"}</div>
        <div><h3>${DN[d]}</h3><div class="st">${st}</div>${s.best != null ? `<div class="meter"><i style="width:${s.best}%"></i></div>` : ""}</div>
        ${s.open ? `<button class="btn ${s.done ? "ghost" : ""}" data-d="${d}">${s.done ? "تدرّبي" : s.n ? "حاولي مرة ثانية" : "ابدئي"}</button>` : ""}
      </div>`;
    }).join("")}
  </div>
  <div class="row" style="margin-top:18px"><button class="btn ghost" id="out">لستِ ${esc(S.rec.name.split(" ")[0])}؟ تسجيل خروج</button></div>`;
  app.querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => startQuiz(b.dataset.d)));
  document.getElementById("out").onclick = () => { ls.del("nafes_me"); S.rec = null; home(); };
  window.scrollTo({ top: 0 });
}
function pickQuestions(d) {
  const seen = new Set(S.rec.attempts.flatMap((a) => a.items.map((x) => x[0])));
  const by = {};
  BANK.forEach((q, id) => { if (TP[q[4]][0] === d) (by[q[4]] = by[q[4]] || []).push(id); });
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  for (const t in by) { const ids = shuffle(by[t]); by[t] = [...ids.filter((x) => !seen.has(x)), ...ids.filter((x) => seen.has(x))]; }
  const ts = shuffle(Object.keys(by)), out = [];
  let k = 0;
  while (out.length < NQ && ts.some((t) => by[t].length)) { const t = ts[k++ % ts.length]; if (by[t].length) out.push(by[t].shift()); }
  return shuffle(out);
}
let Q = null;
function startQuiz(d) { Q = { d, qs: pickQuestions(d), i: 0, items: [] }; showQ(); }
function showQ() {
  const qid = Q.qs[Q.i], q = BANK[qid];
  app.innerHTML = `
  <div class="qtop"><span class="tag">${DN[Q.d]} · ${esc(TP[q[4]][1])}</span><span class="muted">سؤال ${ar(Q.i + 1)} من ${ar(Q.qs.length)}</span></div>
  <div class="prog"><i style="width:${(Q.i / Q.qs.length) * 100}%"></i></div>
  ${qImg(qid)}
  <div class="ans">${AR.map((L, i) => `<button type="button" data-i="${i}" aria-label="الإجابة ${L}">${L}</button>`).join("")}</div>
  <div id="fb"></div>
  <div class="spread" style="margin-top:14px"><button class="btn ghost" id="quit">رجوع للمجالات</button><span></span></div>`;
  document.getElementById("quit").onclick = studentMap;
  app.querySelectorAll(".ans button").forEach((b) => (b.onclick = () => answer(+b.dataset.i)));
  window.scrollTo({ top: 0 });
}
function answer(i) {
  const qid = Q.qs[Q.i], q = BANK[qid], ok = i === q[3];
  Q.items.push([qid, i, ok ? 1 : 0]);
  app.querySelectorAll(".ans button").forEach((b, j) => { b.disabled = true; if (j === q[3]) b.classList.add("right"); if (j === i && !ok) b.classList.add("wrong"); });
  const last = Q.i === Q.qs.length - 1;
  const fb = document.getElementById("fb");
  fb.innerHTML = ok
    ? `<div class="fb ok"><img src="img/mascot.webp" alt=""><div><b>أحسنتِ! إجابة صحيحة</b><p>استمري بنفس التركيز.</p></div></div>`
    : `<div class="fb no"><img src="img/mascot.webp" alt=""><div><b>الإجابة الصحيحة: ${AR[q[3]]}</b><p><strong>تذكّري:</strong> ${esc(TIPS[q[4]])}</p></div></div>`;
  const nb = document.createElement("button");
  nb.className = "btn"; nb.type = "button"; nb.style.marginTop = "12px";
  nb.textContent = last ? "عرض النتيجة" : "السؤال التالي";
  nb.onclick = () => { if (last) finish(); else { Q.i++; showQ(); } };
  fb.appendChild(nb);
  fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
async function finish() {
  app.innerHTML = `<p class="muted" style="margin-top:30px">جاري حفظ نتيجتك…</p>`;
  let r;
  try { r = await api("attempt", { body: { name: S.rec.name, cls: S.rec.cls, d: Q.d, items: Q.items } }); }
  catch (e) {
    app.innerHTML = `<div class="card" style="margin-top:20px"><p class="err">${esc(e.message)}</p><p class="muted">إجاباتك محفوظة في الصفحة، اضغطي لإعادة الإرسال.</p><button class="btn" id="rt">إعادة الإرسال</button></div>`;
    document.getElementById("rt").onclick = finish; return;
  }
  S.rec = r.record;
  const d = Q.d, i = ORDER.indexOf(d), next = ORDER[i + 1];
  const wrongT = {};
  Q.items.forEach(([qid, , ok]) => { if (!ok) { const t = BANK[qid][4]; wrongT[t] = (wrongT[t] || 0) + 1; } });
  const weak = Object.keys(wrongT).map(Number);
  const passed = r.pct >= S.threshold;
  app.innerHTML = `
  <div class="card res" style="margin-top:18px">
    <img src="img/mascot.webp" alt="">
    <div>
      <div class="muted">${DN[d]}</div>
      <div class="big" style="color:var(--${passed ? "ok" : "gold"})">${ar(r.pct)}٪</div>
      <p style="margin:6px 0 0;font-weight:700">${passed
        ? (next ? `أتقنتِ المجال! انفتح لك «${DN[next]}».` : "أتقنتِ آخر مجال، ما شاء الله!")
        : `قربتِ! تحتاجين ${ar(S.threshold)}٪ عشان ينفتح المجال اللي بعده. راجعي الملاحظات تحت وحاولي بأسئلة جديدة.`}</p>
    </div>
  </div>
  ${weak.length ? `<div class="card" style="margin-top:14px"><h3 style="font-size:17px">راجعي هذي المهارات</h3><div class="weak">${weak.map((t) => `<div><b>${esc(TP[t][1])}:</b> ${esc(TIPS[t])}</div>`).join("")}</div></div>` : ""}
  <form class="card" id="selfF" style="margin-top:14px">
    <h3 style="font-size:17px">قيّمي نفسك في مهارات «${DN[d]}»</h3>
    <p class="muted" style="margin:4px 0 0;font-size:14px">بصراحة: هل تعرفين كل مهارة؟ تقييمك يساعد معلمتك تركّز على اللي تحتاجينه.</p>
    <div class="selfl">${topicsOf(d).map((t) => `<div class="selfr"><span>${esc(TP[t][1])}</span><div class="seg" data-t="${t}"><button type="button" class="y" aria-pressed="false">أعرفها</button><button type="button" class="n" aria-pressed="false">ما أعرفها</button></div></div>`).join("")}</div>
    <p class="err" id="sfe"></p>
    <button class="btn" type="submit">حفظ التقييم والرجوع للمجالات</button>
  </form>`;
  app.querySelectorAll(".seg").forEach((g) => g.querySelectorAll("button").forEach((b) => (b.onclick = () => g.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)))));
  document.getElementById("selfF").onsubmit = async (e) => {
    e.preventDefault();
    const ratings = {}; let missing = 0;
    app.querySelectorAll(".seg").forEach((g) => { const p = g.querySelector('[aria-pressed="true"]'); if (!p) missing++; else ratings[g.dataset.t] = p.classList.contains("y"); });
    if (missing) { document.getElementById("sfe").textContent = "قيّمي كل المهارات قبل الحفظ"; return; }
    try { const s = await api("self", { body: { name: S.rec.name, cls: S.rec.cls, d, ratings } }); S.rec = s.record; studentMap(); }
    catch (err) { document.getElementById("sfe").textContent = err.message; }
  };
  window.scrollTo({ top: 0 });
}

// ================= المعلمة =================
async function teacherLoad(fromForm) {
  try {
    S.data = await api("teacher", { pin: S.pin });
  } catch (e) {
    ssn.del("nafes_pin");
    if (fromForm) throw e;
    S.pin = null; return home();
  }
  ssn.set("nafes_pin", S.pin);
  S.cfg = { classes: S.data.config.classes, threshold: S.data.config.threshold };
  S.threshold = S.cfg.threshold;
  if (!S.cls || (S.cls !== "__set" && !S.cfg.classes.includes(S.cls))) S.cls = S.cfg.classes[0];
  teacherView();
}
function teacherView() {
  app.innerHTML = `
  <div class="spread" style="margin-top:18px"><h2>لوحة المعلمة</h2>
    <div class="row"><button class="btn ghost" id="rf">تحديث</button><button class="btn ghost" id="lo">خروج</button></div></div>
  <div class="tabs" id="ct">${S.cfg.classes.map((c) => `<button type="button" aria-pressed="${c === S.cls}" data-c="${esc(c)}">فصل ${esc(c)}</button>`).join("")}<button type="button" aria-pressed="${S.cls === "__set"}" data-c="__set">الإعدادات</button></div>
  <div id="tv"></div>`;
  document.getElementById("rf").onclick = () => teacherLoad();
  document.getElementById("lo").onclick = () => { ssn.del("nafes_pin"); S.pin = null; home(); };
  app.querySelectorAll("#ct button").forEach((b) => (b.onclick = () => { S.cls = b.dataset.c; teacherView(); }));
  if (S.cls === "__set") settingsView(); else classView();
}
function stats(students) {
  // دقة كل موضوع من كل المحاولات، وآخر تقييم ذاتي
  const top = {};
  TP.forEach((_, t) => (top[t] = { n: 0, ok: 0, sy: 0, sn: 0, gap: [] }));
  students.forEach((s) => {
    s.attempts.forEach((a) => a.items.forEach(([qid, , ok]) => { const t = BANK[qid]?.[4]; if (t == null) return; top[t].n++; if (ok) top[t].ok++; }));
    Object.values(s.self || {}).forEach((x) => Object.entries(x.r).forEach(([t, v]) => { if (!top[t]) return; if (v) top[t].sy++; else top[t].sn++; }));
  });
  return top;
}
function studentTopic(s, t) {
  let n = 0, ok = 0;
  s.attempts.forEach((a) => a.items.forEach(([qid, , o]) => { if (BANK[qid]?.[4] === t) { n++; if (o) ok++; } }));
  return n ? Math.round((ok / n) * 100) : null;
}
function classView() {
  const st = S.data.students.filter((s) => s.cls === S.cls).sort((a, b) => a.name.localeCompare(b.name, "ar"));
  const tv = document.getElementById("tv");
  if (!st.length) { tv.innerHTML = `<div class="card"><b>ما فيه طالبات في هذا الفصل بعد.</b><p class="muted" style="margin:6px 0 0">أرسلي رابط المنصة للطالبات، وكل طالبة تدخل باسمها الثلاثي وتختار فصل ${esc(S.cls)}.</p></div>`; return; }
  const mastered = st.reduce((a, s) => a + ORDER.filter((d) => s.mastered[d]).length, 0);
  const attempts = st.reduce((a, s) => a + s.attempts.length, 0);
  const bests = st.flatMap((s) => ORDER.map((d) => { const at = s.attempts.filter((a) => a.d === d); return at.length ? Math.max(...at.map((a) => a.pct)) : null; }).filter((x) => x != null));
  const avg = bests.length ? Math.round(bests.reduce((a, b) => a + b, 0) / bests.length) : 0;
  const top = stats(st);
  tv.innerHTML = `
  <div class="tiles">
    <div class="tile"><b>${ar(st.length)}</b><span>طالبات</span></div>
    <div class="tile"><b>${ar(avg)}٪</b><span>متوسط أعلى نتيجة في المجالات</span></div>
    <div class="tile"><b>${ar(mastered)}</b><span>مجالات متقنة (من ${ar(st.length * 5)})</span></div>
    <div class="tile"><b>${ar(attempts)}</b><span>محاولات</span></div>
  </div>
  <h3 style="margin-top:20px;font-size:18px">درجات الفصل</h3>
  <p class="muted" style="margin:2px 0 0;font-size:13.5px">أعلى نتيجة لكل طالبة في كل مجال، و✓ = متقن. اضغطي على اسم الطالبة لتفاصيلها.</p>
  <div class="tbl"><table>
    <thead><tr><th>الطالبة</th>${ORDER.map((d) => `<th>${DN[d]}</th>`).join("")}<th>المتقن</th><th>آخر نشاط</th></tr></thead>
    <tbody>${st.map((s, k) => {
      const last = s.attempts.length ? new Date(s.attempts[s.attempts.length - 1].at) : null;
      return `<tr class="click" data-k="${k}"><td><b>${esc(s.name)}</b></td>${ORDER.map((d, i) => {
        const at = s.attempts.filter((a) => a.d === d);
        if (!at.length) { const open = i === 0 || s.mastered[ORDER[i - 1]]; return `<td class="c lk">${open ? "لم تبدأ" : "🔒"}</td>`; }
        const b = Math.max(...at.map((a) => a.pct));
        return `<td class="c ${pctCls(b)}">${ar(b)}٪${s.mastered[d] ? " ✓" : ""} <small style="font-weight:400">(${ar(at.length)})</small></td>`;
      }).join("")}<td class="c">${ar(ORDER.filter((d) => s.mastered[d]).length)}/٥</td><td>${last ? last.toLocaleDateString("ar-SA", { day: "numeric", month: "short" }) : "—"}</td></tr>`;
    }).join("")}</tbody></table></div>
  <div class="spread" style="margin-top:24px"><h3 style="font-size:18px">تحليل المهارات</h3><button class="btn ghost" id="csv">تنزيل الدرجات (Excel)</button></div>
  <div class="tabs" id="dt">${ORDER.map((d) => `<button type="button" aria-pressed="${d === S.dom}" data-d="${d}">${DN[d]}</button>`).join("")}</div>
  <div class="grid2">
    <div class="card"><h3 style="font-size:16px">دقة الفصل في كل مهارة</h3><p class="muted" style="margin:2px 0 0;font-size:13px">المهارة اللي دقتها ٥٠٪ أو أقل: أدخليها بكرة في الدرس.</p><div class="bars" id="acc"></div></div>
    <div class="card"><h3 style="font-size:16px">التقييم الذاتي مقابل الأداء</h3><p class="muted" style="margin:2px 0 0;font-size:13px">نسبة «أعرفها» في تقييم الطالبات. إذا كانت أعلى بكثير من الدقة، فالطالبات يظنون أنهم يعرفونها وهم يخطئون فيها.</p><div class="bars" id="slf"></div></div>
  </div>
  <div id="sd"></div>`;
  tv.querySelectorAll("tr.click").forEach((r) => (r.onclick = () => studentDetail(st[+r.dataset.k])));
  tv.querySelectorAll("#dt button").forEach((b) => (b.onclick = () => { S.dom = b.dataset.d; tv.querySelectorAll("#dt button").forEach((x) => x.setAttribute("aria-pressed", x === b)); drawDom(top); }));
  document.getElementById("csv").onclick = () => csv(st);
  drawDom(top);
}
function drawDom(top) {
  const ts = topicsOf(S.dom);
  document.getElementById("acc").innerHTML = ts.map((t) => {
    const x = top[t], p = x.n ? Math.round((x.ok / x.n) * 100) : null;
    return `<div class="bar"><span>${esc(TP[t][1])}${p != null && p <= 50 ? '<span class="flag red">مهارة بكرة</span>' : ""}</span><div class="t"><i class="${p == null ? "" : p <= 50 ? "lo" : p < S.threshold ? "mid" : ""}" style="width:${p ?? 0}%"></i></div><b>${p == null ? "—" : ar(p) + "٪"}</b></div>`;
  }).join("");
  document.getElementById("slf").innerHTML = ts.map((t) => {
    const x = top[t], tot = x.sy + x.sn, p = tot ? Math.round((x.sy / tot) * 100) : null, acc = x.n ? Math.round((x.ok / x.n) * 100) : null;
    const over = p != null && acc != null && p - acc >= 30;
    return `<div class="bar"><span>${esc(TP[t][1])}${over ? '<span class="flag gold">ثقة أعلى من الأداء</span>' : ""}</span><div class="t"><i class="mid" style="width:${p ?? 0}%"></i></div><b>${p == null ? "—" : ar(p) + "٪"}</b></div>`;
  }).join("");
}
function studentDetail(s) {
  const sd = document.getElementById("sd");
  sd.innerHTML = `<div class="card" style="margin-top:18px;border:2px solid var(--navy)">
    <div class="spread"><h3 style="font-size:19px">${esc(s.name)} <span class="muted" style="font-size:14px">· فصل ${esc(s.cls)}</span></h3><button class="btn ghost" id="cl">إغلاق</button></div>
    ${ORDER.map((d) => {
      const at = s.attempts.filter((a) => a.d === d), self = s.self?.[d]?.r || {};
      if (!at.length) return "";
      return `<h4 style="margin:16px 0 4px">${DN[d]} ${s.mastered[d] ? '<span class="flag" style="background:var(--ok-soft);color:var(--ok)">متقن</span>' : ""}</h4>
      <div class="muted" style="font-size:13.5px">المحاولات: ${at.map((a) => `${ar(a.pct)}٪ (${new Date(a.at).toLocaleDateString("ar-SA", { day: "numeric", month: "short" })})`).join(" ← ")}</div>
      <div class="tbl"><table><thead><tr><th>المهارة</th><th>دقتها</th><th>تقييمها لنفسها</th></tr></thead><tbody>${topicsOf(d).map((t) => {
        const p = studentTopic(s, t), r = self[t];
        return `<tr><td>${esc(TP[t][1])}</td><td class="c ${p == null ? "lk" : pctCls(p)}">${p == null ? "—" : ar(p) + "٪"}</td><td>${r == null ? "—" : r ? "أعرفها" : "ما أعرفها"}${r && p != null && p <= 50 ? ' <span class="flag gold">تحتاج انتباه</span>' : ""}</td></tr>`;
      }).join("")}</tbody></table></div>`;
    }).join("") || '<p class="muted">ما بدأت أي مجال بعد.</p>'}
    <div class="row" style="margin-top:16px"><button class="btn ghost" id="del" style="color:var(--bad);border-color:var(--bad)">حذف الطالبة</button><span id="delc"></span></div>
  </div>`;
  document.getElementById("cl").onclick = () => (sd.innerHTML = "");
  document.getElementById("del").onclick = () => {
    const c = document.getElementById("delc");
    c.innerHTML = `<span class="err">متأكدة؟ تنحذف كل نتائجها.</span> <button class="btn" id="dy" style="background:var(--bad)">نعم، احذفي</button>`;
    document.getElementById("dy").onclick = async () => {
      try { await api("teacher/delete", { pin: S.pin, body: { cls: s.cls, name: s.name } }); await teacherLoad(); }
      catch (e) { c.innerHTML = `<span class="err">${esc(e.message)}</span>`; }
    };
  };
  sd.scrollIntoView({ behavior: "smooth", block: "start" });
}
function csv(st) {
  const rows = [["الطالبة", "الفصل", ...ORDER.map((d) => DN[d] + " (أعلى نتيجة)"), ...ORDER.map((d) => DN[d] + " (متقن)"), "عدد المحاولات"]];
  st.forEach((s) => rows.push([s.name, s.cls,
    ...ORDER.map((d) => { const at = s.attempts.filter((a) => a.d === d); return at.length ? Math.max(...at.map((a) => a.pct)) : ""; }),
    ...ORDER.map((d) => (s.mastered[d] ? "نعم" : "")), s.attempts.length]));
  const text = "﻿" + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = `درجات نافس - فصل ${S.cls}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
}
function settingsView() {
  let classes = S.cfg.classes.slice();
  const tv = document.getElementById("tv");
  const draw = () => {
    tv.innerHTML = `<form class="card" id="setF" style="display:grid;gap:14px;max-width:560px">
      <h3 style="font-size:18px">الإعدادات</h3>
      <div><b style="font-size:14px">الفصول</b><div class="chips" style="margin-top:6px">${classes.map((c, i) => `<span>${esc(c)}<button type="button" data-i="${i}" aria-label="حذف ${esc(c)}">×</button></span>`).join("")}</div></div>
      <div class="row"><input id="nc" placeholder="مثال: ٣/٢" style="max-width:200px"><button class="btn ghost" type="button" id="ac">إضافة فصل</button></div>
      <label for="th">نسبة الإتقان لفتح المجال التالي (٪)<input id="th" type="number" min="40" max="100" value="${S.cfg.threshold}" style="max-width:140px"></label>
      <p class="err" id="ste"></p>
      <button class="btn navy" type="submit">حفظ</button>
    </form>`;
    tv.querySelectorAll(".chips button").forEach((b) => (b.onclick = () => { classes.splice(+b.dataset.i, 1); draw(); }));
    document.getElementById("ac").onclick = () => { const v = document.getElementById("nc").value.trim(); if (v && !classes.includes(v)) classes.push(v); draw(); };
    document.getElementById("setF").onsubmit = async (e) => {
      e.preventDefault();
      try {
        const r = await api("teacher/config", { pin: S.pin, body: { classes, threshold: +document.getElementById("th").value } });
        S.cfg = r.config; S.threshold = r.config.threshold; S.cls = S.cfg.classes[0]; teacherLoad();
      } catch (err) { document.getElementById("ste").textContent = err.message; }
    };
  };
  draw();
}
boot();
