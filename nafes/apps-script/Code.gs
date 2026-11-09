/**
 * منصة نجمات نافس — حفظ نتائج الطالبات في جدول Google
 * إعداد: د. أفنان الطلحي
 *
 * غيّري كلمة مرور المعلمة هنا إذا تبين:
 */
const TEACHER_PIN = "825409";

const DOMAINS = ["m", "f", "p", "e", "l"];
const DN = { m: "المادة وتفاعلاتها", f: "الحركة والقوى", p: "العلوم الفيزيائية", e: "علوم الأرض والفضاء", l: "علوم الحياة" };

function sheet_(name, header) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); if (header) sh.appendRow(header); }
  return sh;
}
function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function clean_(s, max) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, max || 60); }
function getConfig_() {
  const p = PropertiesService.getScriptProperties().getProperty("config");
  return p ? JSON.parse(p) : { classes: ["٣/١"], threshold: 70 };
}
function keyOf_(cls, name) { return cls + "|" + name; }

function findRow_(sh, key) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const keys = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < keys.length; i++) if (keys[i][0] === key) return i + 2;
  return 0;
}
function getRec_(key) {
  const sh = sheet_("data", ["key", "record"]);
  const r = findRow_(sh, key);
  return r ? JSON.parse(sh.getRange(r, 2).getValue()) : null;
}
function putRec_(rec) {
  const sh = sheet_("data", ["key", "record"]);
  const key = keyOf_(rec.cls, rec.name);
  const r = findRow_(sh, key);
  if (r) sh.getRange(r, 2).setValue(JSON.stringify(rec));
  else sh.appendRow([key, JSON.stringify(rec)]);
  summary_(rec);
}
// جدول «الدرجات» المقروء: صف لكل طالبة
function summary_(rec) {
  const sh = sheet_("الدرجات", ["الطالبة", "الفصل"].concat(DOMAINS.map(function (d) { return DN[d]; })).concat(["المجالات المتقنة", "عدد المحاولات", "آخر نشاط"]));
  const key = keyOf_(rec.cls, rec.name);
  const row = [rec.name, "'" + rec.cls].concat(DOMAINS.map(function (d) {
    const at = rec.attempts.filter(function (a) { return a.d === d; });
    if (!at.length) return "";
    const best = Math.max.apply(null, at.map(function (a) { return a.pct; }));
    return best + "%" + (rec.mastered[d] ? " ✓" : "");
  })).concat([DOMAINS.filter(function (d) { return rec.mastered[d]; }).length, rec.attempts.length, new Date()]);
  const last = sh.getLastRow();
  if (last >= 2) {
    const vals = sh.getRange(2, 1, last - 1, 2).getValues();
    for (let i = 0; i < vals.length; i++) if (keyOf_(vals[i][1], vals[i][0]) === key) { sh.getRange(i + 2, 1, 1, row.length).setValues([row]); return; }
  }
  sh.appendRow(row);
}

function doGet(e) {
  const a = (e && e.parameter && e.parameter.action) || "config";
  if (a === "config") { const c = getConfig_(); return out_({ classes: c.classes, threshold: c.threshold }); }
  if (a === "teacher") {
    if (e.parameter.pin !== TEACHER_PIN) return out_({ error: "كلمة المرور غير صحيحة" });
    const sh = sheet_("data", ["key", "record"]);
    const last = sh.getLastRow();
    const students = last < 2 ? [] : sh.getRange(2, 2, last - 1, 1).getValues().map(function (r) { return JSON.parse(r[0]); });
    return out_({ config: getConfig_(), students: students });
  }
  return out_({ error: "not_found" });
}

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (err) { return out_({ error: "bad_json" }); }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const c = getConfig_();
    const name = clean_(b.name), cls = clean_(b.cls, 20);

    if (b.action === "login") {
      if (name.length < 3) return out_({ error: "اكتبي اسمك الثلاثي" });
      if (c.classes.indexOf(cls) < 0) return out_({ error: "اختاري فصلك من القائمة" });
      let rec = getRec_(keyOf_(cls, name));
      if (!rec) { rec = { name: name, cls: cls, created: Date.now(), attempts: [], mastered: {}, self: {} }; putRec_(rec); }
      return out_({ record: rec, threshold: c.threshold });
    }
    if (b.action === "attempt") {
      if (DOMAINS.indexOf(b.d) < 0 || !Array.isArray(b.items) || !b.items.length || b.items.length > 30) return out_({ error: "bad_attempt" });
      const rec = getRec_(keyOf_(cls, name));
      if (!rec) return out_({ error: "not_found" });
      const items = b.items.map(function (x) { return [Number(x[0]) | 0, Number(x[1]) | 0, x[2] ? 1 : 0]; });
      const ok = items.filter(function (x) { return x[2]; }).length;
      const pct = Math.round(ok / items.length * 100);
      rec.attempts.push({ d: b.d, at: Date.now(), n: items.length, ok: ok, pct: pct, items: items });
      if (pct >= c.threshold) rec.mastered[b.d] = true;
      putRec_(rec);
      return out_({ record: rec, pct: pct, mastered: !!rec.mastered[b.d] });
    }
    if (b.action === "self") {
      if (DOMAINS.indexOf(b.d) < 0 || typeof b.ratings !== "object") return out_({ error: "bad_self" });
      const rec = getRec_(keyOf_(cls, name));
      if (!rec) return out_({ error: "not_found" });
      const r = {};
      Object.keys(b.ratings).forEach(function (t) { r[Number(t) | 0] = b.ratings[t] ? 1 : 0; });
      rec.self[b.d] = { at: Date.now(), r: r };
      putRec_(rec);
      return out_({ record: rec });
    }
    if (b.action === "teacher_config" || b.action === "teacher_delete") {
      if (b.pin !== TEACHER_PIN) return out_({ error: "كلمة المرور غير صحيحة" });
      if (b.action === "teacher_config") {
        const classes = (Array.isArray(b.classes) ? b.classes : []).map(function (x) { return clean_(x, 20); }).filter(String).slice(0, 30);
        const threshold = Math.min(100, Math.max(40, Number(b.threshold) || c.threshold));
        if (!classes.length) return out_({ error: "أضيفي فصلًا واحدًا على الأقل" });
        const cfg = { classes: classes, threshold: threshold };
        PropertiesService.getScriptProperties().setProperty("config", JSON.stringify(cfg));
        return out_({ config: cfg });
      }
      const sh = sheet_("data", ["key", "record"]);
      const r = findRow_(sh, keyOf_(cls, name));
      if (r) sh.deleteRow(r);
      const sm = sheet_("الدرجات");
      const last = sm.getLastRow();
      if (last >= 2) {
        const vals = sm.getRange(2, 1, last - 1, 2).getValues();
        for (let i = 0; i < vals.length; i++) if (vals[i][0] === name && vals[i][1] === cls) { sm.deleteRow(i + 2); break; }
      }
      return out_({ ok: true });
    }
    return out_({ error: "not_found" });
  } finally {
    lock.releaseLock();
  }
}
