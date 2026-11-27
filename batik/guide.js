(function(){const g=document.createElement('div');g.id='guide';g.innerHTML='<img src="img/guide.png" alt="لمى">';const b=document.createElement('div');b.id='bub';document.body.append(g,b);
let t=null;window.say=function(txt,mood){b.textContent=txt;b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');g.classList.remove('jump','sad');void g.offsetWidth;if(mood)g.classList.add(mood);clearTimeout(t);t=setTimeout(()=>b.textContent='',7000)};
window.pick=a=>a[Math.floor(Math.random()*a.length)];window.guideHide=h=>{g.style.display=b.style.display=h?'none':''}})();
