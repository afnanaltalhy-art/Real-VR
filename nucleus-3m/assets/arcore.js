// محرك الواقع المعزز المشترك – كاميرا + three.js
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
export {THREE};

const video=document.getElementById('cam');
let facing='environment',stream=null;
export async function startCam(){
  try{
    if(stream)stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720}},audio:false});
    video.srcObject=stream;video.setAttribute('playsinline','');video.muted=true;
    await video.play();video.style.display='block';video.style.transform=facing==='user'?'scaleX(-1)':'none';
    document.getElementById('nocam').style.display='none';
  }catch(e){document.getElementById('nocam').style.display='flex'}
}
window.flipCam=()=>{facing=facing==='environment'?'user':'environment';window.SFX&&SFX.click();startCam()};
window.retryCam=()=>{window.ac&&ac();startCam()};

const canvas=document.getElementById('gl');
export const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(2,devicePixelRatio));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;
export const scene=new THREE.Scene();
const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;
export const camera=new THREE.PerspectiveCamera(45,1,.1,200);camera.position.set(0,0,12);
scene.add(new THREE.AmbientLight(0xffffff,.6));const dl=new THREE.DirectionalLight(0xffffff,1.6);dl.position.set(4,6,8);scene.add(dl);
const pl=new THREE.PointLight(0x88aaff,30,30);pl.position.set(-5,-3,4);scene.add(pl);
export const root=new THREE.Group();scene.add(root);
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=w<h?20:13;root.position.y=w<h?1.6:.6;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();

// تدوير وتكبير باللمس
let rotX=.25,rotY=0,zoom=1,drag=null,pinch=null,autoSpin=true;
canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};autoSpin=false;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!drag||pinch)return;rotY+=(e.clientX-drag.x)*.008;rotX+=(e.clientY-drag.y)*.008;rotX=Math.max(-1.3,Math.min(1.3,rotX));drag={x:e.clientX,y:e.clientY}});
canvas.addEventListener('pointerup',()=>{drag=null});
canvas.addEventListener('touchstart',e=>{if(e.touches.length===2){pinch={d:dist(e),z:zoom}}},{passive:true});
canvas.addEventListener('touchmove',e=>{if(pinch&&e.touches.length===2){zoom=Math.max(.45,Math.min(2.6,pinch.z*dist(e)/pinch.d))}},{passive:true});
canvas.addEventListener('touchend',()=>{pinch=null},{passive:true});
canvas.addEventListener('wheel',e=>{zoom=Math.max(.45,Math.min(2.6,zoom*(e.deltaY<0?1.08:.92)))},{passive:true});
function dist(e){return Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)}
window.zoomBy=f=>{zoom=Math.max(.45,Math.min(2.6,zoom*f));window.SFX&&SFX.click()};
window.toggleSpin=()=>{autoSpin=!autoSpin;window.SFX&&SFX.click()};

// مواد وجسيمات
export const MAT={
  P:new THREE.MeshPhysicalMaterial({color:0xe2463f,roughness:.25,clearcoat:1,clearcoatRoughness:.15,emissive:0x400000,emissiveIntensity:.35}),
  N:new THREE.MeshPhysicalMaterial({color:0x2f6fd6,roughness:.25,clearcoat:1,clearcoatRoughness:.15,emissive:0x001040,emissiveIntensity:.35}),
  E:new THREE.MeshPhysicalMaterial({color:0xf2c230,roughness:.2,emissive:0xffb300,emissiveIntensity:1.2}),
  G:new THREE.MeshPhysicalMaterial({color:0xffe08a,roughness:.1,metalness:.2,emissive:0xffc400,emissiveIntensity:1.5})
};
export const SPH=new THREE.SphereGeometry(.5,32,24);
const gtex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)})();
export function glow(color,size=4,op=.8){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:gtex,color,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false}));s.scale.set(size,size,1);return s}
export function nucleonPositions(n,seed=1){const pts=[];const ga=Math.PI*(3-Math.sqrt(5));for(let i=0;i<n;i++){const y=1-(i+.5)/n*2,r=Math.sqrt(1-y*y),t=i*ga;const R=.55*Math.cbrt(n)*Math.cbrt((i+.5)/n);pts.push(new THREE.Vector3(Math.cos(t)*r*R,y*R,Math.sin(t)*r*R))}
  for(let it=0;it<70;it++){for(let i=0;i<n;i++){const p=pts[i];p.multiplyScalar(.985);for(let j=i+1;j<n;j++){const q=pts[j];const d=p.distanceTo(q);if(d<1.0&&d>1e-4){const push=q.clone().sub(p).setLength((1.0-d)/2);p.sub(push);q.add(push)}}}}return pts}
export function makeNucleus(P,N,{seed=3,glowColor=0x8fb4ff}={}){const g=new THREE.Group();const n=P+N;const pts=nucleonPositions(n,seed);let rnd=seed*999;const R=()=>{rnd=(rnd*9301+49297)%233280;return rnd/233280};let p=P,q=N;const meshes=[];
  pts.forEach(v=>{let t;if(p&&(!q||R()<p/(p+q))){t='P';p--}else{t='N';q--}const m=new THREE.Mesh(SPH,MAT[t]);m.position.copy(v);m.userData.t=t;m.userData.home=v.clone();g.add(m);meshes.push(m)});
  const gl=glow(glowColor,.9*Math.cbrt(n)*2.6,.55);g.add(gl);g.userData={meshes,glow:gl};return g}
export function electronCloud(count=900,R=3.4,color=0x6fb7ff){const geo=new THREE.BufferGeometry();const a=new Float32Array(count*3);for(let i=0;i<count;i++){const r=R*Math.pow(Math.random(),.6)+.8,t=Math.random()*6.283,u=Math.random()*2-1,s=Math.sqrt(1-u*u);a.set([r*s*Math.cos(t),r*u,r*s*Math.sin(t)],i*3)}geo.setAttribute('position',new THREE.BufferAttribute(a,3));return new THREE.Points(geo,new THREE.PointsMaterial({size:.09,color,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false}))}
export function dust(){const geo=new THREE.BufferGeometry(),n=500,a=new Float32Array(n*3);for(let i=0;i<n;i++)a.set([(Math.random()-.5)*30,(Math.random()-.5)*20,(Math.random()-.5)*20-4],i*3);geo.setAttribute('position',new THREE.BufferAttribute(a,3));const p=new THREE.Points(geo,new THREE.PointsMaterial({size:.06,color:0xfff3c4,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(p);return p}
export function label(text,color='#fff',bg='rgba(14,22,48,.75)',scale=1){const c=document.createElement('canvas');const x=c.getContext('2d');x.font='800 44px Almarai';const w=x.measureText(text).width+40;c.width=w;c.height=72;x.font='800 44px Almarai';x.fillStyle=bg;x.beginPath();x.roundRect(0,0,w,72,30);x.fill();x.fillStyle=color;x.textAlign='center';x.textBaseline='middle';x.direction='rtl';x.fillText(text,w/2,38);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,transparent:true}));s.scale.set(w/72*.62*scale,.62*scale,1);s.renderOrder=10;return s}
export function clearRoot(){while(root.children.length){const c=root.children.pop();c.traverse(o=>{if(o.material&&o.material.map&&o.isSprite&&o.material.map!==gtex)o.material.map.dispose()})}}

// حلقة الرسم
let updater=null,last=performance.now();export const clock={t:0};
export function setUpdater(f){updater=f}
const dustP=dust();
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;clock.t+=dt;if(autoSpin)rotY+=dt*.35;root.rotation.set(rotX,rotY,0);root.scale.setScalar(zoom);dustP.rotation.y+=dt*.02;updater&&updater(dt,clock.t);renderer.render(scene,camera);requestAnimationFrame(loop)}
requestAnimationFrame(loop);

// لقطة شاشة
window.snap=()=>{const w=renderer.domElement.width,h=renderer.domElement.height;const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');if(video.style.display==='block'&&video.videoWidth){const vr=video.videoWidth/video.videoHeight,cr=w/h;let sw=video.videoWidth,sh=video.videoHeight,sx=0,sy=0;if(vr>cr){sw=sh*cr;sx=(video.videoWidth-sw)/2}else{sh=sw/cr;sy=(video.videoHeight-sh)/2}if(facing==='user'){x.translate(w,0);x.scale(-1,1)}x.drawImage(video,sx,sy,sw,sh,0,0,w,h);x.setTransform(1,0,0,1,0,0)}else{x.fillStyle='#1b2547';x.fillRect(0,0,w,h)}x.drawImage(renderer.domElement,0,0);x.fillStyle='rgba(59,74,23,.85)';x.fillRect(0,h-60,w,60);x.fillStyle='#fff';x.font='bold 26px Almarai';x.textAlign='center';x.fillText('النواة • ثالث متوسط • المعلمة فاطمه الزربان',w/2,h-22);const a=document.createElement('a');a.download='nucleus-ar.png';a.href=c.toDataURL('image/png');a.click();window.SFX&&SFX.coin();window.toast&&toast('📸 حُفظت الصورة!')};
startCam();
