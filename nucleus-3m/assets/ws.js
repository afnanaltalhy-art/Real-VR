/* محرّك ورقة العمل التفاعلية على شكل لعبة مراحل */
function norm(v){return String(v).trim().replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace('٫','.').replace(/\s+/g,' ').replace(/^ال/,'')}
function WS(cfg){
  const box=document.getElementById('ws');let total=0,got=0;const stages=cfg.stages;
  box.innerHTML=`<div class="card" style="text-align:center"><div style="font-size:54px">${cfg.icon}</div><h2 style="justify-content:center">${cfg.title}</h2><p>${cfg.intro}</p>
  <div class="row" style="justify-content:center;margin-top:8px"><input id="sn" class="name" placeholder="اسم الطالبة ✎" style="font:inherit;font-size:16px;padding:9px;border-radius:12px;border:2px solid #E6DDC0;text-align:center"></div>
  <div class="prog"><i id="pg"></i></div><b id="pt">⭐ 0</b></div>`+
  stages.map((s,si)=>`<div class="card stage" id="st${si}"><h2><span class="pill">${s.lvl}</span> المرحلة ${si+1}: ${s.title}</h2><p>${s.hint||''}</p><div class="items">${s.items.map((it,ii)=>render(it,si,ii)).join('')}</div><div class="row" style="justify-content:center;margin-top:10px"><button class="btn g" onclick="WScheck(${si})">✔ تحقّقي من المرحلة</button></div><div class="res" id="rs${si}"></div></div>`).join('')+
  `<div class="card" id="cert" style="display:none;text-align:center"><div style="font-size:72px">🏆</div><h2 style="justify-content:center" id="ct"></h2><p id="cp"></p><button class="btn" onclick="window.print()">🖨 اطبعي شهادتك</button></div>`;
  function render(it,si,ii){const id=`q${si}_${ii}`;
    if(it.t==='fill'){total+=it.a.length;let k=0;return `<div class="it">${it.q.replace(/__/g,()=>`<input class="box" id="${id}_${k++}" inputmode="${it.num?'decimal':'text'}" style="width:${it.w||70}px">`)}</div>`}
    if(it.t==='tf'){total++;return `<div class="it tf" id="${id}"><span>${it.q}</span><span class="row"><button class="ch" data-v="1">✔ صح</button><button class="ch" data-v="0">✘ خطأ</button></span></div>`}
    if(it.t==='mcq'){total++;return `<div class="it" id="${id}"><b>${it.q}</b><div class="mc">${it.o.map((o,k)=>`<button class="ch" data-v="${k}">${o}</button>`).join('')}</div></div>`}
    if(it.t==='match'){total+=it.p.length;const opts=[...it.p.map(p=>p[1])].sort();return `<div class="it">${it.q?`<b>${it.q}</b>`:''}${it.p.map((p,k)=>`<div class="mrow"><span>${p[0]}</span><select id="${id}_${k}"><option value="">اختاري…</option>${opts.map(o=>`<option>${o}</option>`).join('')}</select></div>`).join('')}</div>`}
    if(it.t==='open'){return `<div class="it"><b>${it.q}</b><textarea rows="2" placeholder="اكتبي إجابتك…"></textarea><details><summary>💡 الإجابة النموذجية</summary>${it.a}</details></div>`}
  }
  document.querySelectorAll('.ch').forEach(b=>b.onclick=()=>{b.parentElement.querySelectorAll('.ch').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');SFX.click()});
  window.WScheck=si=>{ac();const s=stages[si];let ok=0,n=0;s.items.forEach((it,ii)=>{const id=`q${si}_${ii}`;
    if(it.t==='fill')it.a.forEach((a,k)=>{n++;const e=document.getElementById(`${id}_${k}`);const good=[].concat(a).some(x=>norm(x)===norm(e.value));e.classList.toggle('okk',good);e.classList.toggle('bad',!good);if(good)ok++});
    if(it.t==='tf'||it.t==='mcq'){n++;const el=document.getElementById(id);const sel=el.querySelector('.ch.sel');el.querySelectorAll('.ch').forEach(x=>x.classList.remove('okb','badb'));const good=sel&&+sel.dataset.v===(it.t==='tf'?(it.a?1:0):it.a);if(sel)sel.classList.add(good?'okb':'badb');if(good)ok++}
    if(it.t==='match')it.p.forEach((p,k)=>{n++;const e=document.getElementById(`${id}_${k}`);const good=e.value===p[1];e.classList.toggle('okk',good);e.classList.toggle('bad',!good);if(good)ok++})});
    const stEl=document.getElementById('st'+si);const prev=+(stEl.dataset.best||0);if(ok>prev){got+=ok-prev;stEl.dataset.best=ok}
    document.getElementById('rs'+si).innerHTML=ok===n?`<p class="ok" style="text-align:center;font-size:18px">🌟 مرحلة مكتملة! ${ok}/${n}</p>`:`<p style="text-align:center;font-weight:800">${ok}/${n} صحيحة • صحّحي الخانات الحمراء وحاولي مجددًا 💪</p>`;
    if(ok===n){SFX.win();confetti(120);stEl.classList.add('done')}else{SFX.no()}
    document.getElementById('pg').style.width=(got/total*100)+'%';document.getElementById('pt').textContent='⭐ '+got+' / '+total;
    if(document.querySelectorAll('.stage.done').length===stages.length){const c=document.getElementById('cert');c.style.display='block';document.getElementById('ct').textContent=`شهادة إتقان: ${cfg.title}`;document.getElementById('cp').innerHTML=`تُمنح للطالبة <b>${document.getElementById('sn').value||'............'}</b> لإتمامها مراحل الورقة كلها بنجاح 🎉<br>المعلمة: فاطمه الزربان • ${new Date().toLocaleDateString('ar-SA')}`;c.scrollIntoView({behavior:'smooth'});confetti(260)}};
}
