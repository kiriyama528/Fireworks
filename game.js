const canvas = document.querySelector('#sky');
const ctx = canvas.getContext('2d');
const $ = s => document.querySelector(s);
const palette = ['#ffd886','#ff91bb','#8edbff','#c2a2ff','#9af0c3','#ffb078'];
let width=0,height=0,started=false,muted=false,clock=0,last=0,raf=0,count=0,finale=null,lastLaunch=-1,quality=1,slow=0;
let rockets=[],particles=[],rings=[],glows=[];
const gestures=new Map();
let swipeBlooms=[];
let luckyStar=null,nextStarAt=Infinity,starRewards=0;
const starButton=$('#lucky-star');
function syncStar(){
 starButton.hidden=!luckyStar;
 if(!luckyStar)return;
 const age=clock-luckyStar.born,claimed=luckyStar.claimedAt!==null;
 const progress=claimed?Math.min(1,(clock-luckyStar.claimedAt)/.55):0;
 starButton.style.left=`${luckyStar.x*width}px`;
 starButton.style.top=`${luckyStar.y*height+Math.sin(age*1.7)*3}px`;
 starButton.style.transform=`translate(-50%,-50%) rotate(${claimed?progress*360:Math.sin(age*1.4)*5}deg) scale(${claimed?1+Math.sin(progress*Math.PI)*.25:1+Math.sin(age*2)*.04})`;
 starButton.style.opacity=String(1-progress*.65);
 starButton.style.pointerEvents=claimed?'none':'auto';
}
function claimStar(x,y){
 if(!luckyStar||luckyStar.claimedAt!==null||Math.hypot(x-luckyStar.x*width,y-luckyStar.y*height)>58)return false;
 luckyStar.claimedAt=clock;
 sound.tone(880,1320,.22,.045);sound.tone(1320,1760,.25,.035,'sine',.13);
 syncStar();return true;
}
function updateStar(){
 if(!started)return;
 if(!luckyStar&&clock>=nextStarAt&&!finale){luckyStar={x:rand(.2,.8),y:rand(.26,.53),born:clock,claimedAt:null};}
 if(luckyStar&&luckyStar.claimedAt!==null&&clock-luckyStar.claimedAt>=.55){
  const {x,y}=luckyStar;luckyStar=null;nextStarAt=clock+rand(9,13);
  explode({tx:x*width,ty:y*height,type:starRewards++%2?'smile':'heart',big:true,auto:true,color:starRewards%2?'#ff91bb':'#ffd886'});
  animals.forEach((_,i)=>jump(i,true));sound.cheer();
 }
 syncStar();
}
const rand=(a,b)=>a+Math.random()*(b-a);
const animals=[];
for(let i=0;i<4;i++){
 const img=document.createElement('img'); img.src=`./assets/animal-${i}.svg`;img.className='animal';img.alt=['うさぎ','くま','ねこ','たぬき'][i];img.style.left=`${31+i*10}%`;$('#audience').append(img);animals.push(img);const preload=new Image();preload.src=`./assets/animal-${i}-cheer.svg`;
}
function jump(index,cheer=false){const a=animals[index];a.classList.remove('jump','cheer');void a.offsetWidth;a.classList.add(cheer?'cheer':'jump');if(cheer){a.src=`./assets/animal-${index}-cheer.svg`;a.cheerUntil=clock+1.8;}}
class Sound{
 constructor(){this.context=null;this.voices=0;this.lastBurst=-1;this.nextCricket=0;}
 init(){
  if(this.context)return;
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  const a=this.context=new Audio();this.master=a.createGain();this.master.gain.value=.58;
  const compressor=a.createDynamicsCompressor();compressor.threshold.value=-18;compressor.ratio.value=8;this.master.connect(compressor);compressor.connect(a.destination);
  this.noise=a.createBuffer(1,a.sampleRate*2,a.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  // Precompute layered pressure crack, low rumble, scattered crackles and outdoor echoes.
  this.booms=Array.from({length:3},()=>{
   const buffer=a.createBuffer(1,a.sampleRate*3,a.sampleRate),out=buffer.getChannelData(0);
   let low=0,crackle=0,peak=0;
   for(let i=0;i<out.length;i++){
    const t=i/a.sampleRate,n=Math.random()*2-1;low+=.035*(n-low);
    if(t>.12&&Math.random()<.00085*Math.exp(-t*1.6))crackle=rand(.2,.65);
    crackle*=.992;
    const attack=Math.min(1,t/.002);
    const snap=n*Math.exp(-t*65)*.65;
    const body=low*Math.exp(-t*2.7)*3.2+Math.sin(2*Math.PI*(58*t-7*t*t))*Math.exp(-t*9)*.18;
    const echoes=[.19,.37,.61].reduce((v,d,j)=>v+(t>d?low*Math.exp(-(t-d)*(5-j))*(.7-j*.17):0),0);
    out[i]=attack*(snap+body+echoes+n*crackle*Math.exp(-t*.7));peak=Math.max(peak,Math.abs(out[i]));
   }
   for(let i=0;i<out.length;i++)out[i]*=.85/Math.max(.85,peak);
   return buffer;
  });
  const river=a.createBufferSource();river.buffer=this.noise;river.loop=true;const low=a.createBiquadFilter();low.type='lowpass';low.frequency.value=500;const gain=a.createGain();gain.gain.value=.018;river.connect(low);low.connect(gain);gain.connect(this.master);river.start();
 }
 resume(){if(this.context&&this.context.state==='suspended')this.context.resume().catch(()=>{});}
 toggle(){if(this.master)this.master.gain.setTargetAtTime(muted?0:.58,this.context.currentTime,.04);}
 tone(from,to,duration,volume,type='sine',delay=0){
  if(!this.context||muted||this.voices>=16)return;const a=this.context,t=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();this.voices++;o.type=type;o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,to),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.03);o.onended=()=>{this.voices--;o.disconnect();g.disconnect();};
 }
 launch(){this.tone(420,1400,.6,.024);}
 tap(){this.tone(740,1150,.12,.035);}
 burst(big=false){
  if(!this.context||muted||this.voices>=12)return;
  const a=this.context,t=a.currentTime;if(t-this.lastBurst<.1)return;
  this.lastBurst=t;this.voices++;
  const source=a.createBufferSource(),filter=a.createBiquadFilter(),gain=a.createGain();
  source.buffer=this.booms[Math.floor(Math.random()*this.booms.length)];
  source.playbackRate.value=big?rand(.78,.88):rand(.95,1.12);
  filter.type='lowpass';filter.frequency.value=big?4200:5500;
  gain.gain.value=big?.68:.49;
  source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();
  source.onended=()=>{this.voices--;source.disconnect();filter.disconnect();gain.disconnect();};
 }
 cheer(){this.tone(420,690,.22,.045,'sine');this.tone(550,820,.3,.03,'sine',.13);}
 ambience(){if(clock<this.nextCricket)return;this.nextCricket=clock+rand(3,6);for(let i=0;i<3;i++)this.tone(3500,3300,.07,.005,'sine',i*.13);}
}
const sound=new Sound();
function resize(){gestures.clear();swipeBlooms=[];width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);rockets=[];particles=[];rings=[];glows=[];}
function shapePoint(type,a){
 if(type==='heart'){return {x:Math.pow(Math.sin(a),3),y:-(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))/16};}
 if(type==='star'){const n=a/(Math.PI*2)*10,j=Math.floor(n),t=n-j;const r1=j%2?.43:1,r2=j%2?1:.43;const a1=j*Math.PI/5-Math.PI/2,a2=(j+1)*Math.PI/5-Math.PI/2;return{x:Math.cos(a1)*r1*(1-t)+Math.cos(a2)*r2*t,y:Math.sin(a1)*r1*(1-t)+Math.sin(a2)*r2*t};}
 return{x:Math.cos(a),y:Math.sin(a)};
}
function addParticle(p){if(particles.length<Math.floor(quality*1500))particles.push(p);}
function launch(x,y,options={}){
 const c=options.color||palette[Math.floor(Math.random()*palette.length)];
 rockets.push({x:width*.5+(x-width*.5)*.65,y:height*.81,tx:x,ty:y,fromX:width*.5+(x-width*.5)*.65,age:0,duration:rand(.5,.8),color:c,...options});sound.launch();
}
function explode(r){
 const type=r.type||(Math.random()<.2?['heart','star','smile'][Math.floor(Math.random()*3)]:['round','ring','willow'][Math.floor(Math.random()*3)]);
 const base=Math.min(width*.14,height*.26)*(r.big?1.4:1)*(r.scale||1);
 const radius=Math.max(18,Math.min(base,r.tx+15,width-r.tx+15,r.ty+15,height*.83-r.ty+20));
 const number=Math.round((r.big?210:r.scale?55:130)*quality);if(r.big)particles=particles.slice(-Math.max(0,Math.floor(quality*1500)-number));const duration=type==='willow'?2.5:1.8;
 for(let i=0;i<number;i++){
  const a=i/number*Math.PI*2;let point=shapePoint(type,a),factor=type==='round'||type==='willow'?rand(.25,1):rand(.95,1.03);
  if(type==='smile'&&i>number*.68){const k=(i-number*.68)/(number*.32);if(k<.25)point={x:k<.125?-.33:.33,y:-.23};else {const angle=(k-.25)/.75*Math.PI;point={x:Math.cos(angle)*.48,y:Math.sin(angle)*.42+.03};}factor=1;}
  addParticle({x:r.tx,y:r.ty,px:r.tx,py:r.ty,vx:point.x*radius*factor*2,vy:point.y*radius*factor*2,age:0,life:duration*rand(.85,1.2),color:type==='willow'?'#ffda8a':r.color,size:rand(1,2.2),gravity:type==='willow'?36:12,drag:2.5});
 }
 glows.push({x:r.tx,y:r.ty,r:radius,color:r.color,age:0,life:1.4});if(glows.length>16)glows.shift();sound.burst(r.big);jump(Math.floor(Math.random()*4));
 if(!r.auto&&!finale){count++;if(count>=15)finale={start:clock,next:0};}
}
function touch(x,y){
 if(!started||height>width)return;sound.resume();$('#hint').hidden=true;
 rings.push({x,y,age:0});if(rings.length>36)rings.shift();sound.tap();
 if(claimStar(x,y))return true;
 if(y>height*.8){jump(Math.max(0,Math.min(3,Math.round((x/width-.35)/.1))));sound.cheer();return;}
 if(clock-lastLaunch<.085||rockets.length>=10)return;lastLaunch=clock;launch(x,y);
}
function beginGesture(id,x,y){
 if(touch(x,y))return;
 if(started&&width>=height&&y<=height*.8&&gestures.size<5)gestures.set(id,{points:[{x,y}],length:0});
}
function moveGesture(id,x,y){
 const gesture=gestures.get(id);if(!gesture)return;
 x=Math.max(0,Math.min(width,x));y=Math.max(0,Math.min(height*.8,y));
 const previous=gesture.points[gesture.points.length-1];
 const distance=Math.hypot(x-previous.x,y-previous.y);if(distance<10)return;
 gesture.length+=distance;gesture.points.push({x,y});if(gesture.points.length>64)gesture.points.shift();
 for(let i=0;i<5;i++)addParticle({x,y,px:x,py:y,vx:rand(-18,18),vy:rand(-20,20),age:0,life:.55,color:palette[i],size:2,gravity:5,drag:2});
}
function endGesture(id,cancel=false){
 const gesture=gestures.get(id);gestures.delete(id);
 if(cancel||!gesture||gesture.length<45)return;
 const points=gesture.points,n=Math.min(8,Math.max(3,Math.floor(gesture.length/45)));
 if(swipeBlooms.length+n+1>48)return;
 for(let i=0;i<n;i++){
  const point=points[Math.round(i/(n-1)*(points.length-1))];
  swipeBlooms.push({at:clock+i*.12,tx:point.x,ty:point.y,auto:true,type:'star',scale:.45,color:palette[i%palette.length]});
 }
 const end=points[points.length-1];swipeBlooms.push({at:clock+n*.12,tx:end.x,ty:end.y,auto:true,type:'willow',big:true,color:'#ffdf91'});
 animals.forEach((_,i)=>jump(i,true));sound.cheer();
}
function update(dt){
 clock+=dt;updateStar();for(const bloom of swipeBlooms){if(bloom.at<=clock){explode(bloom);bloom.done=true;}}swipeBlooms=swipeBlooms.filter(b=>!b.done);animals.forEach((a,i)=>{if(a.cheerUntil&&clock>=a.cheerUntil){a.src=`./assets/animal-${i}.svg`;a.cheerUntil=0;}});
 if(started){sound.ambience();if(finale){let age=clock-finale.start;const times=[0,.45,.9,1.35,1.8,2.6,3.3];if(finale.next<times.length&&age>=times[finale.next]){const i=finale.next++;launch(width*[.18,.82,.32,.68,.5,.27,.5][i],height*[.34,.3,.24,.35,.23,.32,.28][i],{auto:true,big:i===6,color:i===6?'#ffdf91':palette[i%6],type:i===6?'willow':undefined});if(i===6){animals.forEach((_,i)=>jump(i,true));sound.cheer();}}if(age>=5){finale=null;count=0;}}}
 for(const r of rockets){r.age+=dt;const t=Math.min(1,r.age/r.duration);r.x=r.fromX+(r.tx-r.fromX)*t;r.y=height*.81+(r.ty-height*.81)*(1-Math.pow(1-t,1.5));if(t>=1){r.done=true;explode(r);}}
 rockets=rockets.filter(r=>!r.done);
 for(const p of particles){p.age+=dt;p.px=p.x;p.py=p.y;p.vx*=Math.exp(-p.drag*dt);p.vy*=Math.exp(-p.drag*dt);p.vy+=p.gravity*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
 particles=particles.filter(p=>p.age<p.life);for(const r of rings)r.age+=dt;rings=rings.filter(r=>r.age<.45);for(const g of glows)g.age+=dt;glows=glows.filter(g=>g.age<g.life);
}
function draw(){
 ctx.clearRect(0,0,width,height);ctx.globalCompositeOperation='lighter';
 for(const g of glows){const opacity=Math.max(0,1-g.age/g.life);const gradient=ctx.createRadialGradient(g.x,g.y,0,g.x,g.y,g.r*1.35);gradient.addColorStop(0,g.color+'24');gradient.addColorStop(1,g.color+'00');ctx.globalAlpha=opacity;ctx.fillStyle=gradient;ctx.fillRect(g.x-g.r*1.35,g.y-g.r*1.35,g.r*2.7,g.r*2.7);ctx.fillStyle=g.color;for(let k=0;k<9;k++){ctx.globalAlpha=opacity*.13*(1-k/11);const w=g.r*(.7-k*.05);ctx.fillRect(g.x-w/2+Math.sin(k*9+clock)*10,height*(.82+k*.014),w,2+k%3);} }
 ctx.globalAlpha=1;
 for(const gesture of gestures.values()){
  if(gesture.points.length<2)continue;
  ctx.strokeStyle='#ffe4a6';ctx.lineWidth=2;ctx.globalAlpha=.7;ctx.beginPath();
  gesture.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
 }
 ctx.globalAlpha=1;
 for(const p of particles){const fade=Math.pow(1-p.age/p.life,.65);ctx.globalAlpha=fade;ctx.strokeStyle=p.color;ctx.lineWidth=p.size;ctx.beginPath();ctx.moveTo(p.x-p.vx*.04,p.y-p.vy*.04);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size*.65,0,Math.PI*2);ctx.fill();if(p.age<.2){ctx.fillStyle='#fff9df';ctx.fillRect(p.x-1,p.y-1,2,2);}}
 for(const r of rockets){ctx.globalAlpha=1;ctx.strokeStyle=r.color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(r.x-(r.tx-r.fromX)*.08,r.y+25);ctx.stroke();ctx.fillStyle='#fff1cf';ctx.beginPath();ctx.arc(r.x,r.y,3,0,Math.PI*2);ctx.fill();}
 for(const r of rings){ctx.globalAlpha=1-r.age/.45;ctx.strokeStyle='#ffe6a4';ctx.lineWidth=2;ctx.beginPath();ctx.arc(r.x,r.y,5+r.age*48,0,Math.PI*2);ctx.stroke();}
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 const glow=glows.reduce((best,g)=>!best||g.age<best.age?g:best,null);for(const a of animals)a.style.filter=glow?`drop-shadow(0 -3px ${12*(1-glow.age/glow.life)}px ${glow.color})`:'drop-shadow(0 5px 3px #080c2540)';
}
function frame(now){if(document.hidden||height>width){raf=0;last=0;return;}const delta=last?(now-last)/1000:1/60;last=now;if(delta>.025)slow++;else slow=Math.max(0,slow-1);if(slow>45){quality=Math.max(.45,quality-.1);slow=0;}update(Math.min(delta,.04));draw();raf=requestAnimationFrame(frame);}
function activity(){const paused=document.hidden||innerHeight>innerWidth;$('#festival').setAttribute('data-paused',String(paused));if(paused){gestures.clear();swipeBlooms=[];cancelAnimationFrame(raf);raf=0;last=0;if(sound.context)sound.context.suspend().catch(()=>{});}else{if(started)sound.resume();if(!raf)raf=requestAnimationFrame(frame);}}
const speaker='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4Z"/>';
function soundIcon(){$('#sound').innerHTML=speaker+(muted?'<path d="m16 9 6 6m0-6-6 6"/>':'<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>')+'</svg>';$('#sound').setAttribute('aria-label',muted?'音を出す':'音を消す');$('#sound').setAttribute('aria-pressed',String(muted));}
$('#start').addEventListener('click',()=>{started=true;nextStarAt=clock+4;sound.init();sound.resume();$('#welcome').hidden=true;$('#sound').hidden=false;$('#hint').hidden=false;rockets=[];particles=[];glows=[];sound.tap();});
$('#sound').addEventListener('click',()=>{muted=!muted;sound.toggle();soundIcon();sound.resume();});
canvas.addEventListener('pointerdown',e=>{e.preventDefault();if(e.pointerType==='mouse'&&e.button!==0)return;canvas.setPointerCapture(e.pointerId);beginGesture(e.pointerId,e.clientX,e.clientY);});
canvas.addEventListener('pointermove',e=>{e.preventDefault();moveGesture(e.pointerId,e.clientX,e.clientY);});
canvas.addEventListener('pointerup',e=>{moveGesture(e.pointerId,e.clientX,e.clientY);endGesture(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);});
canvas.addEventListener('pointercancel',e=>endGesture(e.pointerId,true));
canvas.addEventListener('lostpointercapture',e=>endGesture(e.pointerId,true));
starButton.addEventListener('pointerdown',e=>{e.preventDefault();if(e.pointerType==='mouse'&&e.button!==0)return;if(started&&width>=height&&luckyStar)touch(luckyStar.x*width,luckyStar.y*height);});
starButton.addEventListener('click',e=>{if(e.detail===0&&started&&width>=height&&luckyStar)touch(luckyStar.x*width,luckyStar.y*height);});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('resize',()=>{resize();activity();});document.addEventListener('visibilitychange',activity);window.addEventListener('pagehide',()=>{if(sound.context)sound.context.suspend().catch(()=>{});});window.addEventListener('pageshow',activity);
resize();soundIcon();
// Silent decorative fireworks belong only to the opening screen.
launch(width*.21,height*.29,{auto:true,color:'#ffcf88',type:'round'});launch(width*.79,height*.4,{auto:true,color:'#b3a6ff',type:'ring'});activity();
