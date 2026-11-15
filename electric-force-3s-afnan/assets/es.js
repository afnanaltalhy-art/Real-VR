/* رسم أدوات الكهرباء الساكنة على canvas – مشترك بين المختبر واللعبة */
const ES={
 col:{neg:'#2F6FD6',pos:'#E2463F',navy:'#26306B',gold:'#E0B43A',glass:'rgba(205,228,248,.45)',metal:'#B9BECD'},
 fit(cv,W,H){const r=devicePixelRatio||1,w=cv.clientWidth||W;cv.width=w*r;cv.height=w*H/W*r;cv.style.height=(w*H/W)+'px';const x=cv.getContext('2d');x.setTransform(cv.width/W,0,0,cv.height/H,0,0);return x},
 charge(x,cx,cy,sign,r=11,a=1){x.save();x.globalAlpha=a;x.beginPath();x.arc(cx,cy,r,0,7);x.fillStyle=sign>0?ES.col.pos:ES.col.neg;x.fill();x.lineWidth=2;x.strokeStyle='#fff';x.stroke();x.strokeStyle='#fff';x.lineWidth=Math.max(2,r*.24);x.beginPath();x.moveTo(cx-r*.55,cy);x.lineTo(cx+r*.55,cy);if(sign>0){x.moveTo(cx,cy-r*.55);x.lineTo(cx,cy+r*.55)}x.stroke();x.restore()},
 rod(x,x1,y1,x2,y2,sign,n=4,w=18){x.save();x.lineCap='round';x.lineWidth=w;x.strokeStyle=sign>0?'#F0BE78':sign<0?'#46465A':'#C8BFA8';x.beginPath();x.moveTo(x1,y1);x.lineTo(x2,y2);x.stroke();x.lineWidth=w*.25;x.strokeStyle='rgba(255,255,255,.35)';x.beginPath();x.moveTo(x1,y1-w*.2);x.lineTo(x2,y2-w*.2);x.stroke();if(sign)for(let i=0;i<n;i++){const t=.45+i/(n)*.5;ES.charge(x,x1+(x2-x1)*t,y1+(y2-y1)*t,sign,8)}x.restore()},
 /* st:{ang, knob:int, leaves:int, finger:bool} */
 scope(x,cx,cy,s,st){x.save();x.translate(cx,cy);x.scale(s,s);
  // الإناء
  x.beginPath();x.moveTo(-120,250);x.lineTo(-120,40);x.quadraticCurveTo(-120,-40,-50,-55);x.lineTo(50,-55);x.quadraticCurveTo(120,-40,120,40);x.lineTo(120,250);x.closePath();x.fillStyle=ES.col.glass;x.fill();x.lineWidth=3;x.strokeStyle='#7FA3C8';x.stroke();
  x.strokeStyle='rgba(255,255,255,.8)';x.lineWidth=6;x.beginPath();x.moveTo(-95,30);x.lineTo(-98,200);x.stroke();
  x.fillStyle=ES.col.navy;x.fillRect(-140,250,280,22);
  // السدادة والساق
  x.fillStyle='#3d3d48';x.beginPath();x.moveTo(-36,-75);x.lineTo(36,-75);x.lineTo(30,-40);x.lineTo(-30,-40);x.closePath();x.fill();
  x.fillStyle='#A9AEBC';x.fillRect(-5,-110,10,230);
  // الكرة
  const g=x.createRadialGradient(-10,-150,4,0,-135,34);g.addColorStop(0,'#fff');g.addColorStop(1,ES.col.metal);x.fillStyle=g;x.beginPath();x.arc(0,-135,32,0,7);x.fill();x.strokeStyle='#7d8292';x.lineWidth=2;x.stroke();
  // الورقتان
  const a=(st.ang||3)*Math.PI/180,L=125;
  [-1,1].forEach(sd=>{x.save();x.translate(0,120);x.rotate(-sd*a);x.fillStyle=ES.col.gold;x.strokeStyle='#A67F14';x.lineWidth=1.5;x.fillRect(-6,0,12,L);x.strokeRect(-6,0,12,L);x.restore()});
  x.fillStyle='#8f94a3';x.beginPath();x.arc(0,120,7,0,7);x.fill();
  // الشحنات
  const k=Math.round(st.knob||0),l=Math.round(st.leaves||0);
  const kn=Math.min(8,Math.abs(k));for(let i=0;i<kn;i++){const an=-Math.PI/2+(i-(kn-1)/2)*.62;ES.charge(x,Math.cos(an)*22,-135+Math.sin(an)*22+ (i%2?6:0),Math.sign(k),9)}
  const ln=Math.min(8,Math.abs(l));for(let i=0;i<ln;i++){const sd=i%2?1:-1,j=Math.floor(i/2),t=.3+j*.2;x.save();x.translate(0,120);x.rotate(-sd*a);ES.charge(x,sd*18,L*t,Math.sign(l),9);x.restore()}
  if(st.finger){x.fillStyle='#F0C3A0';x.beginPath();x.ellipse(70,-135,48,17,0,0,7);x.fill();x.fillRect(80,-152,120,34);x.strokeStyle=ES.col.navy;x.lineWidth=5;x.beginPath();x.moveTo(205,-135);x.lineTo(205,-70);x.stroke();[50,32,14].forEach((w,i)=>{x.beginPath();x.moveTo(205-w/2,-70+i*11);x.lineTo(205+w/2,-70+i*11);x.stroke()})}
  x.restore()},
 sphere(x,cx,cy,r,q,label){const g=x.createRadialGradient(cx-r*.35,cy-r*.4,r*.1,cx,cy,r);g.addColorStop(0,'#fff');g.addColorStop(1,'#B7C6E2');x.fillStyle='#9a6a3a';x.fillRect(cx-6,cy+r-4,12,80);x.beginPath();x.ellipse(cx,cy+r+78,48,12,0,0,7);x.fill();x.beginPath();x.arc(cx,cy,r,0,7);x.fillStyle=g;x.fill();x.strokeStyle='#7088B4';x.lineWidth=2;x.stroke();return x},
 arrow(x,x1,y1,x2,y2,c='#E2463F',w=5){x.save();x.strokeStyle=c;x.fillStyle=c;x.lineWidth=w;x.beginPath();x.moveTo(x1,y1);x.lineTo(x2,y2);x.stroke();const a=Math.atan2(y2-y1,x2-x1),L=14;x.beginPath();x.moveTo(x2,y2);x.lineTo(x2-L*Math.cos(a-.45),y2-L*Math.sin(a-.45));x.lineTo(x2-L*Math.cos(a+.45),y2-L*Math.sin(a+.45));x.closePath();x.fill();x.restore()},
 text(x,t,cx,cy,c='#26306B',sz=18,al='center'){x.save();x.font=`800 ${sz}px Almarai`;x.fillStyle=c;x.textAlign=al;x.textBaseline='middle';x.direction='rtl';x.fillText(t,cx,cy);x.restore()}
};
