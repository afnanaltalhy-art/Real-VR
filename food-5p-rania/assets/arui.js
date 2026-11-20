// واجهة الواقع المعزز: تبويبات + بطاقة + اختبار سريع
import {clearRoot,setUpdater} from './arcore.js';
export function arUI(SCENES){
  const tabs=document.getElementById('artabs'),card=document.getElementById('arcard'),chips=document.getElementById('chips');
  tabs.innerHTML=SCENES.map((s,i)=>`<button data-i="${i}">${s.tab}</button>`).join('');
  let cur=-1;
  const api={chipSet(list,onPick,start=0){chips.innerHTML=list.map((l,i)=>`<button data-i="${i}" class="${i===start?'on':''}">${l}</button>`).join('');chips.querySelectorAll('button').forEach(b=>b.onclick=()=>{chips.querySelectorAll('button').forEach(x=>x.classList.remove('on'));b.classList.add('on');window.SFX&&SFX.click();onPick(+b.dataset.i)})},setText:t=>{const e=document.getElementById('arText');if(e)e.innerHTML=t},flash(){const f=document.getElementById('flash');f.style.opacity=1;setTimeout(()=>f.style.opacity=0,180)}};
  function open(i){if(i===cur)return;cur=i;tabs.querySelectorAll('button').forEach((b,k)=>b.classList.toggle('on',k===i));const S=SCENES[i];clearRoot();setUpdater(null);chips.innerHTML='';
    const q=S.quiz;card.classList.remove('min');
    card.innerHTML=`<h3><span>${S.title}</span><button onclick="this.closest('.arcard').classList.toggle('min')">▾</button></h3><p id="arText">${S.text}</p><div class="act" id="arAct"></div>`+(q?`<div class="quiz"><b>❓ ${q.q}</b>${q.o.map((o,k)=>`<button data-k="${k}">${o}</button>`).join('')}<div id="qres" style="font-weight:800;font-size:13.5px"></div></div>`:'');
    if(q)card.querySelectorAll('.quiz button').forEach(b=>b.onclick=()=>{const k=+b.dataset.k;if(k===q.a){b.classList.add('ok');SFX.ok();confetti(70);document.getElementById('qres').innerHTML='✓ أحسنتِ! '+(q.why||'')}else{b.classList.add('bad');SFX.no();document.getElementById('qres').innerHTML='✗ حاولي مرة أخرى'}});
    const act=document.getElementById('arAct');(S.actions||[]).forEach(a=>{const b=document.createElement('button');b.className=a.c||'';b.innerHTML=a.l;b.onclick=()=>{ac();a.f(b,api)};act.appendChild(b)});
    S.build&&S.build(api);SFX.pop()}
  tabs.querySelectorAll('button').forEach(b=>b.onclick=()=>open(+b.dataset.i));
  open(0);
  return api;
}
export function splashOff(){const s=document.getElementById('splash');if(!s)return;s.style.opacity=0;setTimeout(()=>s.remove(),600)}
