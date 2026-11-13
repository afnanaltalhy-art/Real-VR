/* أدوات مشتركة: أصوات، احتفال، رسائل، رأس الصفحة */
const SCHOOL={teacher:'فاطمه الزربان',principal:'الجوهره الجريذي',school:'مجمع جو التعليمي',subject:'العلوم • ثالث متوسط • الفصل 3: تركيب الذرة • الدرس 2: النواة'};
let AC=null;function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC}
function tone(f,d=.15,type='sine',v=.18,when=0,slide=0){const a=ac();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,a.currentTime+when);if(slide)o.frequency.exponentialRampToValueAtTime(slide,a.currentTime+when+d);g.gain.setValueAtTime(v,a.currentTime+when);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+when+d);o.connect(g);g.connect(a.destination);o.start(a.currentTime+when);o.stop(a.currentTime+when+d+.02)}
function noise(d=.3,v=.25,hp=800){const a=ac();if(!a)return;const b=a.createBuffer(1,a.sampleRate*d,a.sampleRate),c=b.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=(Math.random()*2-1)*(1-i/c.length);const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type='highpass';f.frequency.value=hp;const g=a.createGain();g.gain.value=v;s.connect(f);f.connect(g);g.connect(a.destination);s.start()}
const SFX={
 pop(){tone(520,.08,'sine',.2,0,880)},
 ok(){tone(660,.12,'triangle',.2);tone(880,.12,'triangle',.2,.1);tone(1320,.2,'triangle',.18,.2)},
 no(){tone(220,.25,'sawtooth',.12,0,140)},
 click(){tone(1200,.04,'square',.06)},
 zap(){tone(1600,.35,'sawtooth',.12,0,200);noise(.25,.12,2000)},
 boom(){tone(120,.6,'sine',.35,0,40);noise(.5,.3,200)},
 tick(){tone(1800,.03,'square',.05)},
 win(){[523,659,784,1046,1318].forEach((f,i)=>tone(f,.22,'triangle',.18,i*.11))},
 coin(){tone(988,.08,'square',.1);tone(1318,.25,'square',.1,.08)},
 alarm(){for(let i=0;i<6;i++){tone(1000,.16,'square',.12,i*.36);tone(800,.16,'square',.12,i*.36+.18)}},
 hum(){tone(110,1.2,'sine',.08)}
};
function toast(msg,ms=1900){let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t)}t.innerHTML=msg;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),ms)}
function say(msg,ms=3200){let s=document.getElementById('speech');if(!s)return;s.innerHTML=msg;s.classList.add('on');clearTimeout(s._h);s._h=setTimeout(()=>s.classList.remove('on'),ms)}
function confetti(n=140){let c=document.getElementById('confetti');if(!c){c=document.createElement('canvas');c.id='confetti';document.body.appendChild(c)}const x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;const cols=['#E2463F','#2F6FD6','#D4A72C','#5A6B2B','#F2C230','#8E44AD'];const P=[...Array(n)].map(()=>({x:Math.random()*c.width,y:-20-Math.random()*c.height*.5,r:4+Math.random()*6,c:cols[Math.random()*6|0],vy:2+Math.random()*3,vx:-1.5+Math.random()*3,a:Math.random()*6,round:Math.random()<.5}));let f=0;(function loop(){x.clearRect(0,0,c.width,c.height);P.forEach(p=>{p.y+=p.vy;p.x+=p.vx;p.a+=.1;x.fillStyle=p.c;x.save();x.translate(p.x,p.y);x.rotate(p.a);if(p.round){x.beginPath();x.arc(0,0,p.r/1.4,0,7);x.fill()}else x.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.6);x.restore()});if(++f<220)requestAnimationFrame(loop);else x.clearRect(0,0,c.width,c.height)})()}
function header(title,sub,home='index.html'){document.write(`<div class="top"><img src="assets/img/logo.webp" alt="وزارة التعليم"><div class="t"><b>${title}</b><small>${sub||SCHOOL.subject}</small></div><a class="home" href="${home}">⌂ الحزمة</a></div>`)}
function footer(){document.write(`<div class="foot">إعداد المعلمة: <b>${SCHOOL.teacher}</b> • قائدة المدرسة: <b>${SCHOOL.principal}</b><br>${SCHOOL.school} • وزارة التعليم</div>`)}
function girl(){document.write('<img class="girlpop" src="assets/img/girl.webp" alt=""><div id="speech" class="speech"></div>')}
function nucleonHTML(t,s=26,txt){return `<span class="nucleon ${t}" style="width:${s}px;height:${s}px;font-size:${s*.45}px">${txt??(t==='P'?'+':t==='E'?'−':'')}</span>`}
const ELEMENTS=['','الهيدروجين','الهيليوم','الليثيوم','البيريليوم','البورون','الكربون','النيتروجين','الأكسجين','الفلور','النيون','الصوديوم','المغنيسيوم'];
const SYM=['','H','He','Li','Be','B','C','N','O','F','Ne','Na','Mg'];
/* رسم نواة بكرات ملتصقة (لوحة 2D) */
function drawNucleus(ctx,cx,cy,P,N,r=14,seed=7,shake=0){const tot=P+N;const pts=[];let rnd=seed;const R=()=>{rnd=(rnd*9301+49297)%233280;return rnd/233280};const types=[];let p=P,n=N;for(let i=0;i<tot;i++){if(p&&(!n||R()<p/(p+n))){types.push('P');p--}else{types.push('N');n--}}for(let i=0;i<tot;i++){const a=i*2.39996,d=r*.95*Math.sqrt(i);pts.push([cx+Math.cos(a)*d+(shake?(Math.random()-.5)*shake:0),cy+Math.sin(a)*d+(shake?(Math.random()-.5)*shake:0)])}const order=pts.map((q,i)=>i).sort((a,b)=>Math.hypot(pts[b][0]-cx,pts[b][1]-cy)-Math.hypot(pts[a][0]-cx,pts[a][1]-cy));order.forEach(i=>ball(ctx,pts[i][0],pts[i][1],r,types[i]))}
function ball(ctx,x,y,r,t){const c={P:['#ff9a90','#E2463F','#9b1f19'],N:['#9cc2ff','#2F6FD6','#163f8a'],E:['#fff5b5','#F2C230','#a57d06'],A:['#e8b8ff','#8E44AD','#4c1d66']}[t];const g=ctx.createRadialGradient(x-r*.35,y-r*.4,r*.1,x,y,r);g.addColorStop(0,c[0]);g.addColorStop(.6,c[1]);g.addColorStop(1,c[2]);ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();if(t==='P'||t==='E'){ctx.fillStyle='rgba(255,255,255,.95)';ctx.font=`900 ${r*1.1}px Almarai`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t==='P'?'+':'−',x,y+1)}}
function fitCanvas(cv,h){const dpr=Math.min(2,devicePixelRatio||1);const w=cv.parentElement.clientWidth;cv.style.width=w+'px';cv.style.height=h+'px';cv.width=w*dpr;cv.height=h*dpr;const x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);return {x,w,h}}
