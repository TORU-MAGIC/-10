// ================================================================
//  キングオブキングス v10.0 - レンダリング（マップ・スプライト・パーティクル）
// ================================================================
'use strict';

/* ===== 効果音 ===== */
var _ac=null;function getAC(){if(!_ac){try{_ac=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}return _ac;}
function beep(f,d,t,v,det){t=t||'sine';v=v||.22;det=det||0;try{var ac=getAC();if(!ac)return;var o=ac.createOscillator(),g=ac.createGain();o.type=t;o.frequency.value=f;o.detune.value=det;g.gain.setValueAtTime(v,ac.currentTime);g.gain.exponentialRampToValueAtTime(0.0001,ac.currentTime+d);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+d);}catch(e){}}
function noise(d,v){v=v||.12;try{var ac=getAC();if(!ac)return;var buf=ac.createBuffer(1,Math.floor(ac.sampleRate*d),ac.sampleRate),da=buf.getChannelData(0);for(var i=0;i<da.length;i++)da[i]=Math.random()*2-1;var s=ac.createBufferSource(),g=ac.createGain();s.buffer=buf;g.gain.setValueAtTime(v,ac.currentTime);g.gain.exponentialRampToValueAtTime(0.0001,ac.currentTime+d);s.connect(g);g.connect(ac.destination);s.start();s.stop(ac.currentTime+d);}catch(e){}}
var SFX={select:function(){beep(440,.08,'square',.18);setTimeout(function(){beep(660,.1,'square',.13);},55);},move:function(){beep(330,.06,'sine',.13);},sword:function(){noise(.08,.22);beep(180,.14,'sawtooth',.16);},arrow:function(){beep(900,.04,'sawtooth',.12);setTimeout(function(){beep(400,.1,'sawtooth',.08);},35);},magic:function(){for(var i=0;i<7;i++)(function(ii){setTimeout(function(){beep(280+ii*130,.1,'sine',.1,ii*45);},ii*38);})(i);},dragon:function(){beep(55,.6,'sawtooth',.32);setTimeout(function(){noise(.35,.28);},70);},kill:function(){noise(.1,.35);beep(90,.25,'sawtooth',.25);},capture:function(){for(var i=0;i<3;i++)(function(ii){setTimeout(function(){beep(520+ii*110,.14,'square',.18);},ii*90);})(i);},turnEnd:function(){beep(440,.1,'sine',.16);setTimeout(function(){beep(660,.18,'sine',.12);},150);},victory:function(){var ns=[523,659,784,1047,1318];ns.forEach(function(f,i){setTimeout(function(){beep(f,.28,'square',.18);},i*140);});},produce:function(){beep(392,.1,'triangle',.16);setTimeout(function(){beep(588,.16,'triangle',.13);},150);},levelup:function(){var ns=[523,659,784,880,1047,1318];ns.forEach(function(f,i){setTimeout(function(){beep(f,.16,'sine',.2);},i*60);});},crit:function(){beep(880,.07,'square',.32);setTimeout(function(){beep(1100,.12,'square',.24);},55);setTimeout(function(){beep(1320,.18,'sine',.2);},110);},king:function(){beep(220,.5,'square',.28);beep(440,.5,'square',.18);setTimeout(function(){noise(.2,.2);},200);},sfxFor:function(t){if(['archer','catapult','necromancer'].indexOf(t)>=0)return SFX.arrow();if(['mage','witch','arcanelord','phoenix','healer','monk'].indexOf(t)>=0)return SFX.magic();if(t==='dragon')return SFX.dragon();if(t==='king')return SFX.king();SFX.sword();}};
/* ===== パーティクル ===== */
var pCvs,pCtx,particles=[],pRaf=null;
function initPCvs(){pCvs=document.getElementById('bParticleCanvas');if(!pCvs)return;pCtx=pCvs.getContext('2d');function resize(){pCvs.width=window.innerWidth;pCvs.height=window.innerHeight;}resize();window.addEventListener('resize',resize);}
function spawnPart(x,y,col,count,type){count=count||24;type=type||'hit';for(var i=0;i<count;i++){var a=Math.random()*Math.PI*2,sp=(type==='magic'?7:10)*Math.random()+2;particles.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:type==='magic'?Math.random()*10+4:Math.random()*8+2,col:col,alpha:1,type:type,decay:type==='magic'?.013:.022});}}
function spawnCrit(x,y){for(var i=0;i<90;i++){var a=Math.random()*Math.PI*2,sp=Math.random()*22+6;particles.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-5,sz:Math.random()*16+5,col:['#ffee44','#ffcc00','#ff8800','#fff'][i%4],alpha:1,type:'crit',decay:.01});}}
function spawnLevelUp(x,y){for(var i=0;i<60;i++){var a=Math.random()*Math.PI*2,sp=Math.random()*15+4;particles.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-8,sz:Math.random()*12+4,col:['#ffdd44','#ffffff','#44ffaa','#ffaa44'][i%4],alpha:1,type:'level',decay:.009});}}
/* ===== 属性エフェクト・衝撃波・軌跡（v10演出強化）===== */
function spawnElementBurst(x,y,elem,isCrit){
  var info=ELEM_INFO[elem||'none']||ELEM_INFO.none,col=info.col;
  var cnt=isCrit?88:52,sp0=isCrit?20:13;
  for(var i=0;i<cnt;i++){var a=Math.random()*Math.PI*2,sp=Math.random()*sp0+3,c2=i%5===2?'#fff':col;particles.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-3,sz:isCrit?(Math.random()*15+5):(Math.random()*9+3),col:c2,alpha:1,type:'magic',decay:isCrit?.008:.013});}
  for(var j=0;j<20;j++){var a2=j/20*Math.PI*2,sp2=isCrit?18:11;particles.push({x:x,y:y,vx:Math.cos(a2)*sp2,vy:Math.sin(a2)*sp2-2,sz:4,col:'#fff',alpha:.9,type:'hit',decay:.046});}
}
function spawnShockwave(x,y,col,size){
  size=size||65;
  particles.push({x:x,y:y,vx:0,vy:0,sz:6,growRate:size/16,maxSz:size,col:col||'#fff',alpha:.88,type:'ring',decay:.048});
  particles.push({x:x,y:y,vx:0,vy:0,sz:4,growRate:size/26,maxSz:size*.65,col:'#fff',alpha:.55,type:'ring',decay:.065});
}
function spawnMeleeSlash(x1,y1,x2,y2,col){
  var n=18,dx=x2-x1,dy=y2-y1;
  for(var i=0;i<n;i++){var t=i/n,px=x1+dx*t,py=y1+dy*t;particles.push({x:px,y:py,vx:(dx>0?1:-1)*(Math.random()*5+2)+(Math.random()-.5)*4,vy:(Math.random()-.5)*4-1.5,sz:Math.random()*5+2,col:i%3===1?'#fff':col,alpha:.85,type:'hit',decay:.04});}
}
function spawnProjectileArc(x1,y1,x2,y2,col,steps,duration){
  steps=steps||10;duration=duration||260;var iv=duration/steps;
  for(var i=0;i<steps;i++){(function(ii){setTimeout(function(){var t=ii/(steps-1)||0,arc=Math.sin(t*Math.PI)*-55,px=x1+(x2-x1)*t,py=y1+(y2-y1)*t+arc,sz=6+Math.sin(t*Math.PI)*8;particles.push({x:px,y:py,vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2,sz:sz,col:col,alpha:1,type:'magic',decay:.07});if(ii>0)particles.push({x:px,y:py,vx:(Math.random()-.5)*1.5,vy:-1,sz:sz*.4,col:'#fff',alpha:.5,type:'hit',decay:.1});},Math.round(ii*iv));})(i);}
}
function tickPart(){if(!pCtx)return;pCtx.clearRect(0,0,pCvs.width,pCvs.height);particles=particles.filter(function(p){if(p.type!=='ring'){p.vy+=0.22;p.vx*=0.93;}p.x+=p.vx;p.y+=p.vy;p.alpha-=p.decay;if(p.alpha<=0)return false;pCtx.save();pCtx.globalAlpha=p.alpha;if(p.type==='ring'){p.sz+=p.growRate||4;pCtx.strokeStyle=p.col;pCtx.lineWidth=Math.max(.5,3.5*(1-p.sz/(p.maxSz||65)));pCtx.beginPath();pCtx.arc(p.x,p.y,p.sz,0,Math.PI*2);pCtx.stroke();}else if(p.type==='magic'||p.type==='crit'||p.type==='level'){var g=pCtx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.sz);g.addColorStop(0,'#fff');g.addColorStop(.4,p.col);g.addColorStop(1,'transparent');pCtx.fillStyle=g;pCtx.beginPath();pCtx.arc(p.x,p.y,p.sz,0,Math.PI*2);pCtx.fill();}else{pCtx.fillStyle=p.col;pCtx.beginPath();pCtx.arc(p.x,p.y,p.sz,0,Math.PI*2);pCtx.fill();}pCtx.restore();return true;});}
function startPLoop(){if(pRaf)return;function loop(){tickPart();if(particles.length>0||document.getElementById('battleScreen').classList.contains('active'))pRaf=requestAnimationFrame(loop);else pRaf=null;}pRaf=requestAnimationFrame(loop);}
/* ===== バトル背景 ===== */
var bBGCvs,bBGCtx,bBGRaf=null,bBGTime=0,bBGTid=0;
function initBBG(){bBGCvs=document.getElementById('bBGCanvas');if(!bBGCvs)return;bBGCtx=bBGCvs.getContext('2d');function resize(){bBGCvs.width=window.innerWidth;bBGCvs.height=window.innerHeight;}resize();window.addEventListener('resize',resize);}
function startBBGLoop(tid){bBGTid=tid||0;bBGTime=0;if(bBGRaf){cancelAnimationFrame(bBGRaf);bBGRaf=null;}function loop(){bBGTime++;drawBBG(bBGCtx,bBGCvs.width,bBGCvs.height,bBGTid,bBGTime);if(document.getElementById('battleScreen').classList.contains('active'))bBGRaf=requestAnimationFrame(loop);else bBGRaf=null;}bBGRaf=requestAnimationFrame(loop);}
function drawBBG(c,w,h,tid,t){
  c.clearRect(0,0,w,h);
  var skys={0:['#050e20','#0a1a38','#0d2510'],1:['#020a04','#041008','#061808'],2:['#120e06','#1e1808','#2a1e0c'],4:['#030610','#060c1c','#0a0c24'],5:['#080402','#140808','#0c0604'],7:['#0c0618','#18082e','#240840']};
  var sk=skys[tid]||skys[0];var sg=c.createLinearGradient(0,0,0,h*.65);sg.addColorStop(0,sk[0]);sg.addColorStop(.5,sk[1]);sg.addColorStop(1,sk[2]);c.fillStyle=sg;c.fillRect(0,0,w,h);
  // Stars
  c.fillStyle='rgba(255,255,255,.8)';var seed=42;for(var i=0;i<100;i++){seed=(seed*1103515245+12345)&0x7fffffff;var sx=seed%w;seed=(seed*1103515245+12345)&0x7fffffff;var sy=seed%Math.floor(h*.6);c.globalAlpha=(Math.sin(t*.03+i*.7)*.4+.6)*.9;c.beginPath();c.arc(sx,sy,i%5===0?1.5:.7,0,Math.PI*2);c.fill();}c.globalAlpha=1;
  var gy=h*.62;
  if(tid===0){c.fillStyle='#102808';c.beginPath();c.moveTo(0,gy);for(var x=0;x<=w;x+=30)c.lineTo(x,gy+Math.sin((x+t*.3)*.02)*15);c.lineTo(w,h);c.lineTo(0,h);c.closePath();c.fill();}
  else if(tid===1){c.fillStyle='#061004';for(var i=0;i<10;i++){var tx=i*(w*.12),ty=gy-30+Math.sin(i*2.1)*20;c.beginPath();c.moveTo(tx,ty);c.lineTo(tx+25,ty+50);c.lineTo(tx-25,ty+50);c.fill();}}
  else if(tid===2){['#1a1408','#241c0c','#2e2410'].forEach(function(mc,mi){[[-.1,1.0,.5],[.15,0.8,.4],[.7,0.75,.38]].forEach(function(m,j){if(mi===j){c.fillStyle=mc;c.beginPath();c.moveTo(w*m[0],h);c.lineTo(w*(m[0]+m[2]/2),h*m[1]-40);c.lineTo(w*(m[0]+m[2]),h);c.closePath();c.fill();}});});}
  else if(tid===4){c.fillStyle='#08091c';var bw=40;for(var i=0;i<Math.ceil(w/bw)+1;i++){var bh=60+Math.sin(i*1.9)*40;c.fillRect(i*bw-10,gy-bh,bw-4,bh+10);c.fillStyle='rgba(255,220,80,'+(.3+.2*Math.sin(t*.05+i))+')';for(var wy=gy-bh+8;wy<gy-8;wy+=12)for(var wx=i*bw-6;wx<i*bw+bw-10;wx+=8)c.fillRect(wx,wy,4,5);c.fillStyle='#08091c';}}
  else if(tid===5){c.fillStyle='#1c1008';c.fillRect(0,gy,w,h-gy);c.fillStyle='#140c04';var bs=55;for(var i=0;i<Math.ceil(w/bs)+1;i++){c.fillRect(i*bs-5,gy-40,bs-2,42);c.fillRect(i*bs-3,gy-52,12,14);c.fillRect(i*bs+18,gy-52,12,14);}c.fillStyle='rgba(255,140,0,'+(.5+.5*Math.sin(t*.12))+')';for(var i=0;i<5;i++){c.beginPath();c.arc(i*(w*.25),gy-30,4,0,Math.PI*2);c.fill();}}
  else if(tid===7){c.fillStyle='#200a30';c.fillRect(0,gy,w,h-gy);for(var x=0;x<=w;x+=80){c.fillStyle='rgba(180,100,255,'+(.08+.04*Math.sin(t*.04))+')';c.fillRect(x,gy-70,28,72);}var gr=c.createRadialGradient(w/2,gy,0,w/2,gy,w*.4);gr.addColorStop(0,'rgba(180,80,255,.18)');gr.addColorStop(1,'transparent');c.fillStyle=gr;c.fillRect(0,0,w,h);}
  var gcols={0:'#1a3a0e,#0c2006',1:'#0a2204,#040e02',2:'#3a2810,#201408',4:'#14162a,#080a18',5:'#281608,#160c04',7:'#1c0a2e,#0c0418'};
  var gc=(gcols[tid]||gcols[0]).split(',');var grd=c.createLinearGradient(0,gy,0,h);grd.addColorStop(0,gc[0]);grd.addColorStop(1,gc[1]);c.fillStyle=grd;c.fillRect(0,gy,w,h-gy);
  // Platform glow
  [[w*.22,w*.18,'rgba(255,255,200,.22)'],[w*.78,w*.18,'rgba(200,220,255,.22)']].forEach(function(g){var pg=c.createRadialGradient(g[0],h*.75,0,g[0],h*.75,g[1]);pg.addColorStop(0,g[2]);pg.addColorStop(1,'transparent');c.fillStyle=pg;c.fillRect(0,0,w,h);});
}
/* ===== スプライト描画 ===== */
function drawSprite(cvs,type,col,flip){
  var c=cvs.getContext('2d'),w=cvs.width,h=cvs.height;
  c.clearRect(0,0,w,h);c.save();if(flip){c.translate(w,0);c.scale(-1,1);}
  // Shadow
  c.fillStyle='rgba(0,0,0,.45)';c.beginPath();c.ellipse(w*.5,h*.91,w*.32,h*.055,0,0,Math.PI*2);c.fill();
  drawSpriteInner(c,w,h,type,col);c.restore();
}
function cL(hex,a){var n=parseInt(hex.replace('#',''),16),r=Math.min(255,((n>>16)&0xff)+a),g=Math.min(255,((n>>8)&0xff)+a),b=Math.min(255,(n&0xff)+a);return '#'+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1);}
function cRad(c,cx,cy,r,c1,c2){var g=c.createRadialGradient(cx-r*.3,cy-r*.3,r*.05,cx,cy,r);g.addColorStop(0,c1);g.addColorStop(1,c2);c.fillStyle=g;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();}
function sprHumanoid(c,w,h,col){
  var cx=w*.5,skin='#f0c080';
  var tg=c.createLinearGradient(cx-w*.18,h*.42,cx+w*.18,h*.72);tg.addColorStop(0,cL(col,30));tg.addColorStop(1,col);
  c.fillStyle=tg;c.beginPath();c.roundRect(cx-w*.18,h*.42,w*.36,h*.3,5);c.fill();
  c.strokeStyle=col;c.lineWidth=1.5;c.stroke();
  cRad(c,cx,h*.32,w*.13,skin,'#c4904e');
  c.fillStyle=col;c.beginPath();c.ellipse(cx,h*.32-w*.07,w*.15,w*.065,0,-Math.PI,0);c.fill();
  c.fillStyle=skin;c.fillRect(cx-w*.29,h*.45,w*.08,h*.24);c.fillRect(cx+w*.21,h*.45,w*.08,h*.24);
  c.fillStyle=col;c.beginPath();c.roundRect(cx-w*.14,h*.72,w*.12,h*.18,4);c.fill();c.beginPath();c.roundRect(cx+w*.02,h*.72,w*.12,h*.18,4);c.fill();
  c.fillStyle='#333';c.beginPath();c.roundRect(cx-w*.16,h*.87,w*.15,h*.07,3);c.fill();c.beginPath();c.roundRect(cx+w*.01,h*.87,w*.15,h*.07,3);c.fill();
}
function drawSpriteInner(c,w,h,type,col){
  var cx=w*.5;var ei=ELEM_INFO[UDEFS[type]?UDEFS[type].elem:'none']||ELEM_INFO.none;
  var elemCol=ei.col;
  // Element aura
  c.fillStyle=elemCol+'18';c.beginPath();c.arc(cx,h*.5,w*.46,0,Math.PI*2);c.fill();
  switch(type){
    case 'king':
      sprHumanoid(c,w,h,col);
      // Crown
      c.fillStyle='#f0c840';for(var i=-2;i<=2;i++){c.beginPath();c.moveTo(cx+i*w*.07,h*.15);c.lineTo(cx+i*w*.07-w*.025,h*.22);c.lineTo(cx+i*w*.07+w*.025,h*.22);c.closePath();c.fill();}
      c.fillStyle='rgba(240,200,64,.8)';c.fillRect(cx-w*.18,h*.20,w*.36,h*.06);
      c.fillStyle='#cc0000';c.beginPath();c.arc(cx-w*.1,h*.21,3,0,Math.PI*2);c.fill();c.beginPath();c.arc(cx+w*.1,h*.21,3,0,Math.PI*2);c.fill();
      // Scepter
      c.strokeStyle='#f0c840';c.lineWidth=5;c.beginPath();c.moveTo(cx+w*.3,h*.85);c.lineTo(cx+w*.35,h*.2);c.stroke();
      var og=c.createRadialGradient(cx+w*.35,h*.16,2,cx+w*.35,h*.16,16);og.addColorStop(0,'#fff');og.addColorStop(.5,'#f0c840');og.addColorStop(1,'transparent');c.fillStyle=og;c.beginPath();c.arc(cx+w*.35,h*.16,16,0,Math.PI*2);c.fill();
      // Aura
      c.strokeStyle='rgba(240,200,64,.5)';c.lineWidth=2;c.beginPath();c.arc(cx,h*.5,w*.44,0,Math.PI*2);c.stroke();break;
    case 'hero':
      sprHumanoid(c,w,h,col);
      // Cape
      c.fillStyle=cL(col,-20)+'cc';c.beginPath();c.moveTo(cx,h*.42);c.quadraticCurveTo(cx-w*.3,h*.6,cx-w*.28,h*.9);c.lineTo(cx,h*.88);c.closePath();c.fill();
      c.beginPath();c.moveTo(cx,h*.42);c.quadraticCurveTo(cx+w*.3,h*.6,cx+w*.28,h*.9);c.lineTo(cx,h*.88);c.closePath();c.fill();
      // Glowing sword
      c.strokeStyle='#88ddff';c.lineWidth=4;c.beginPath();c.moveTo(cx+w*.26,h*.82);c.lineTo(cx+w*.44,h*.26);c.stroke();
      var sg2=c.createLinearGradient(cx+w*.26,h*.82,cx+w*.44,h*.26);sg2.addColorStop(0,'rgba(136,221,255,0)');sg2.addColorStop(.5,'rgba(136,221,255,.7)');sg2.addColorStop(1,'rgba(255,255,255,1)');c.strokeStyle=sg2;c.lineWidth=3;c.beginPath();c.moveTo(cx+w*.26,h*.82);c.lineTo(cx+w*.44,h*.26);c.stroke();
      c.strokeStyle='#888';c.lineWidth=8;c.beginPath();c.moveTo(cx+w*.22,h*.56);c.lineTo(cx+w*.4,h*.56);c.stroke();break;
    case 'monk':
      var skin='#e8c880';var rg=c.createLinearGradient(cx-w*.2,h*.36,cx+w*.2,h*.9);rg.addColorStop(0,'#cc8800');rg.addColorStop(1,'#884400');c.fillStyle=rg;c.beginPath();c.moveTo(cx-w*.2,h*.4);c.lineTo(cx+w*.2,h*.4);c.lineTo(cx+w*.3,h*.9);c.lineTo(cx-w*.3,h*.9);c.closePath();c.fill();c.strokeStyle=col;c.lineWidth=2;c.stroke();
      cRad(c,cx,h*.28,w*.13,skin,'#d4a060');
      var kg=c.createRadialGradient(cx-w*.28,h*.52,0,cx-w*.28,h*.52,16);kg.addColorStop(0,'#fff');kg.addColorStop(.4,col);kg.addColorStop(1,'transparent');c.fillStyle=kg;c.beginPath();c.arc(cx-w*.28,h*.52,16,0,Math.PI*2);c.fill();cRad(c,cx-w*.28,h*.52,9,skin,'#d4a060');
      kg=c.createRadialGradient(cx+w*.28,h*.52,0,cx+w*.28,h*.52,16);kg.addColorStop(0,'#fff');kg.addColorStop(.4,col);kg.addColorStop(1,'transparent');c.fillStyle=kg;c.beginPath();c.arc(cx+w*.28,h*.52,16,0,Math.PI*2);c.fill();cRad(c,cx+w*.28,h*.52,9,skin,'#d4a060');break;
    case 'golem':
      var bg=c.createLinearGradient(cx-w*.3,h*.28,cx+w*.3,h*.88);bg.addColorStop(0,'#888');bg.addColorStop(.5,'#555');bg.addColorStop(1,'#333');c.fillStyle=bg;c.beginPath();c.roundRect(cx-w*.3,h*.28,w*.6,h*.55,8);c.fill();
      c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=2;[[.35,.35,.48,.5],[.52,.4,.45,.55],[.38,.55,.55,.65]].forEach(function(l){c.beginPath();c.moveTo(cx+w*(l[0]-.5),h*l[1]);c.lineTo(cx+w*(l[2]-.5),h*l[3]);c.stroke();});
      c.fillStyle='#666';c.beginPath();c.roundRect(cx-w*.2,h*.18,w*.4,h*.18,4);c.fill();
      var eg=c.createRadialGradient(cx-w*.08,h*.25,0,cx-w*.08,h*.25,10);eg.addColorStop(0,'#fff');eg.addColorStop(.5,col);eg.addColorStop(1,'transparent');c.fillStyle=eg;c.beginPath();c.arc(cx-w*.08,h*.25,10,0,Math.PI*2);c.fill();
      eg=c.createRadialGradient(cx+w*.08,h*.25,0,cx+w*.08,h*.25,10);eg.addColorStop(0,'#fff');eg.addColorStop(.5,col);eg.addColorStop(1,'transparent');c.fillStyle=eg;c.beginPath();c.arc(cx+w*.08,h*.25,10,0,Math.PI*2);c.fill();
      c.fillStyle='#666';c.beginPath();c.roundRect(cx-w*.44,h*.56,w*.14,h*.18,5);c.fill();c.beginPath();c.roundRect(cx+w*.3,h*.56,w*.14,h*.18,5);c.fill();
      c.strokeStyle=col;c.lineWidth=2.5;c.beginPath();c.arc(cx,h*.55,w*.12,0,Math.PI*2);c.stroke();break;
    case 'titan':
      var bg2=c.createLinearGradient(cx-w*.38,h*.18,cx+w*.38,h*.88);bg2.addColorStop(0,cL(col,10));bg2.addColorStop(.5,col);bg2.addColorStop(1,cL(col,-20));c.fillStyle=bg2;c.beginPath();c.roundRect(cx-w*.38,h*.22,w*.76,h*.6,10);c.fill();
      c.fillStyle=cL(col,-20)+'66';[h*.3,h*.45,h*.6].forEach(function(y){c.fillRect(cx-w*.3,y,w*.6,h*.08);});
      c.fillStyle=bg2;c.beginPath();c.roundRect(cx-w*.22,h*.1,w*.44,h*.18,8);c.fill();
      c.fillStyle='#333';c.fillRect(cx-w*.2,h*.14,w*.4,h*.1);c.fillStyle=col+'cc';c.beginPath();c.arc(cx-w*.1,h*.19,6,0,Math.PI*2);c.fill();c.beginPath();c.arc(cx+w*.1,h*.19,6,0,Math.PI*2);c.fill();
      c.strokeStyle='#666';c.lineWidth=4;for(var i=0;i<2;i++){c.beginPath();c.moveTo(cx-w*.38,h*(.35+i*.1));c.lineTo(cx-w*.48,h*(.45+i*.1));c.stroke();c.beginPath();c.moveTo(cx+w*.38,h*(.35+i*.1));c.lineTo(cx+w*.48,h*(.45+i*.1));c.stroke();}
      c.fillStyle='#554400';c.beginPath();c.roundRect(cx+w*.42,h*.12,w*.14,h*.52,6);c.fill();c.fillStyle='#aaa';c.beginPath();c.roundRect(cx+w*.38,h*.12,w*.22,h*.12,4);c.fill();break;
    case 'dragon':
      c.fillStyle=col+'b0';c.beginPath();c.moveTo(cx,h*.4);c.quadraticCurveTo(cx-w*.5,h*.15,cx-w*.45,h*.55);c.lineTo(cx-w*.1,h*.52);c.closePath();c.fill();c.beginPath();c.moveTo(cx,h*.4);c.quadraticCurveTo(cx+w*.5,h*.15,cx+w*.45,h*.55);c.lineTo(cx+w*.1,h*.52);c.closePath();c.fill();
      var db=c.createLinearGradient(cx-w*.18,h*.38,cx+w*.18,h*.82);db.addColorStop(0,cL(col,30));db.addColorStop(1,col);c.fillStyle=db;c.beginPath();c.ellipse(cx,h*.6,w*.18,h*.24,0,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(cx+w*.15,h*.35,w*.15,h*.12,-.4,0,Math.PI*2);c.fill();
      cRad(c,cx+w*.2,h*.3,w*.1,cL(col,40),col);c.fillStyle='#ffcc00';c.beginPath();c.arc(cx+w*.27,h*.28,4,0,Math.PI*2);c.fill();
      var fc=c.createRadialGradient(cx+w*.38,h*.25,0,cx+w*.38,h*.25,18);fc.addColorStop(0,'#fff');fc.addColorStop(.3,'#ffcc00');fc.addColorStop(.6,'#ff6600');fc.addColorStop(1,'transparent');c.fillStyle=fc;c.beginPath();c.arc(cx+w*.38,h*.25,18,0,Math.PI*2);c.fill();
      c.strokeStyle=col;c.lineWidth=8;c.beginPath();c.moveTo(cx,h*.75);c.quadraticCurveTo(cx-w*.2,h*.9,cx-w*.4,h*.78);c.stroke();break;
    case 'skeleton':
      var bone='#d8d8c0';c.strokeStyle=bone;c.lineWidth=5;c.beginPath();c.moveTo(cx,h*.42);c.lineTo(cx,h*.72);c.stroke();c.lineWidth=4;c.beginPath();c.moveTo(cx-w*.2,h*.48);c.lineTo(cx,h*.5);c.lineTo(cx+w*.2,h*.48);c.stroke();c.lineWidth=3;c.beginPath();c.moveTo(cx,h*.72);c.lineTo(cx-w*.12,h*.88);c.stroke();c.beginPath();c.moveTo(cx,h*.72);c.lineTo(cx+w*.12,h*.88);c.stroke();
      cRad(c,cx,h*.3,w*.13,bone,'#aaa890');c.fillStyle='#111';c.beginPath();c.arc(cx-w*.06,h*.28,w*.055,0,Math.PI*2);c.fill();c.beginPath();c.arc(cx+w*.06,h*.28,w*.055,0,Math.PI*2);c.fill();
      var eg2=c.createRadialGradient(cx-w*.06,h*.28,0,cx-w*.06,h*.28,7);eg2.addColorStop(0,'#88ff88');eg2.addColorStop(1,'transparent');c.fillStyle=eg2;c.beginPath();c.arc(cx-w*.06,h*.28,7,0,Math.PI*2);c.fill();break;
    default:
      sprHumanoid(c,w,h,col);
      // Type-specific icon overlay
      var sym=UDEFS[type]?UDEFS[type].sym:'?';
      c.fillStyle='rgba(255,255,220,.3)';c.font='bold '+Math.floor(w*.2)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(sym,cx+w*.28,h*.52);break;
  }
  // Elem icon bottom right
  c.font=Math.floor(w*.14)+'px sans-serif';c.textAlign='right';c.textBaseline='bottom';c.fillText(ei.name.split(' ')[0],w-3,h-3);
}


/* ===== カメラフォーカス ===== */
var focusEnabled=true;
function focusOnCell(row,col,smooth){
  if(!focusEnabled)return;
  var area=document.getElementById('gameMapArea');
  if(!area)return;
  var tx=col*TW-area.clientWidth/2+TW/2;
  var ty=row*TH-area.clientHeight/2+TH/2;
  tx=Math.max(0,Math.min(tx,COLS*TW-area.clientWidth));
  ty=Math.max(0,Math.min(ty,ROWS*TH-area.clientHeight));
  if(smooth){area.scrollTo({left:tx,top:ty,behavior:'smooth'});}
  else{area.scrollLeft=tx;area.scrollTop=ty;}
  drawMinimap();
}
function focusOnUnit(u,smooth){if(u)focusOnCell(u.row,u.col,smooth!==false);}
var cpuFocusUnit=null;

/* ===== リモートカーソル（オンライン他プレイヤー操作位置の追従＋表示） ===== */
var remoteCursor=null; // {row,col,seat,t,fadeTimer}
var _remoteCursorRaf=null;
function handleRemoteCursor(data){
  if(!data||typeof data.row!=='number'||typeof data.col!=='number')return;
  remoteCursor={row:data.row,col:data.col,seat:data.seat||0,t:Date.now(),fade:1};
  // カメラを滑らかに追従
  focusOnCell(data.row,data.col,true);
  render();
  // 数秒後に自動フェードアウト
  if(_remoteCursorRaf)clearTimeout(_remoteCursorRaf);
  _remoteCursorRaf=setTimeout(function(){remoteCursor=null;render();},3500);
}
function drawRemoteCursor(c){
  if(!remoteCursor)return;
  var elapsed=Date.now()-remoteCursor.t;
  var fade=Math.max(0,1-elapsed/3500);
  var pc=PCOLS[remoteCursor.seat]||{main:'#fff',light:'#fff'};
  var x=remoteCursor.col*TW,y=remoteCursor.row*TH;
  c.save();
  c.globalAlpha=fade*(0.6+0.4*Math.sin(Date.now()*.008));
  c.strokeStyle=pc.light;c.lineWidth=4;
  c.strokeRect(x-2,y-2,TW+4,TH+4);
  c.lineWidth=2;c.strokeStyle='#fff';c.strokeRect(x,y,TW,TH);
  // ラベル
  c.globalAlpha=fade;
  c.fillStyle='rgba(0,0,0,.7)';c.fillRect(x,y-14,Math.max(60,TW),12);
  c.fillStyle=pc.light;c.font='bold 9px sans-serif';c.textAlign='left';c.textBaseline='middle';
  var name=(GS&&GS.players[remoteCursor.seat]&&GS.players[remoteCursor.seat].name)||('P'+(remoteCursor.seat+1));
  c.fillText('▶ '+name,x+2,y-8);
  c.restore();
}

/* ===== レベルアップフラッシュ ===== */
var lvUpQueue=[];
function lvUpFlash(u,gained){
  lvUpQueue.push({r:u.row,c:u.col,lv:u.level,gained:gained,timer:60});
}
function drawLvUpFlash(c){
  lvUpQueue=lvUpQueue.filter(function(f){
    f.timer--;
    var alpha=f.timer/60;
    var x=f.c*TW,y=f.r*TH;
    c.save();c.globalAlpha=alpha;
    c.fillStyle=f.gained>=3?'#ff8844':f.gained>=2?'#ffdd44':'#aaffaa';
    c.font='bold '+Math.floor(TW*.35)+'px sans-serif';
    c.textAlign='center';c.textBaseline='middle';
    var oy=(1-alpha)*TH*.8;
    c.fillText('★Lv'+f.lv,x+TW/2,y+TH/2-oy);
    c.restore();
    return f.timer>0;
  });
}

/* ===== マップ描画 ===== */
var mapCanvas,mapCtx,minimapCanvas,minimapCtx;
var selUnit=null,moveCells=[],atkCells=[],aoeCells=[],gMode='';
var animFrame=0,animTimer=null;
function initMap(){
  mapCanvas=document.getElementById('mapCanvas');if(!mapCanvas)return;mapCtx=mapCanvas.getContext('2d');
  // 現在のCOLS/ROWS/TW/THでキャンバスをリサイズ
  mapCanvas.width=COLS*TW;mapCanvas.height=ROWS*TH;
  mapCanvas.style.width=COLS*TW+'px';mapCanvas.style.height=ROWS*TH+'px';
  minimapCanvas=document.getElementById('minimap');minimapCtx=minimapCanvas.getContext('2d');
  animTimer=setInterval(function(){animFrame=(animFrame+1)%60;if(GS)render();},150);
}
function render(){if(!mapCtx)return;drawMap();drawRemoteCursor(mapCtx);drawMinimap();}
function drawMap(){
  var c=mapCtx,t=animFrame;
  // 地形
  for(var r=0;r<ROWS;r++){
    for(var cl=0;cl<COLS;cl++){
      var x=cl*TW,y=r*TH,tid=(MAP&&MAP[r])?MAP[r][cl]||0:0,tdef=TDEFS[tid]||TDEFS[0],own=GS&&GS.own[r]?GS.own[r][cl]:-1;
      // 地形ベース色
      c.fillStyle=tdef.col;c.fillRect(x,y,TW,TH);
      // ★所有者カラー表示（明確・見やすく）
      if(own>=0){
        var pc=PCOLS[own];
        // 塗りつぶし（濃い目）
        c.fillStyle=pc.main+'70';c.fillRect(x,y,TW,TH);
        // 斜めストライプで所有感を強調
        c.save();c.beginPath();c.rect(x,y,TW,TH);c.clip();
        c.strokeStyle=pc.main+'35';c.lineWidth=6;
        for(var sx=-TW;sx<=TW*2;sx+=12){c.beginPath();c.moveTo(x+sx,y);c.lineTo(x+sx+TH,y+TH);c.stroke();}
        c.restore();
        // 太い外枠
        c.strokeStyle=pc.main;c.lineWidth=4;c.strokeRect(x+2,y+2,TW-4,TH-4);
        // 内側細枠（立体感）
        c.strokeStyle=pc.light+'88';c.lineWidth=1.5;c.strokeRect(x+4,y+4,TW-8,TH-8);
        // 城砦: 大きな旗
        if(tdef.cap){
          c.fillStyle=pc.main;c.font='bold '+Math.floor(TW*.32)+'px sans-serif';c.textAlign='center';c.textBaseline='top';
          c.fillText('⚑',x+TW*.5,y+2);
          // 国番号バッジ
          c.fillStyle=pc.light;c.fillRect(x+TW-14,y+TH-14,13,13);
          c.fillStyle='#000';c.font='bold 9px sans-serif';c.textAlign='center';c.textBaseline='middle';
          c.fillText(own+1,x+TW-7.5,y+TH-7.5);
        } else if(tdef.prod){
          // 施設: 小旗＋国番号
          c.fillStyle=pc.light;c.font=Math.floor(TW*.22)+'px sans-serif';c.textAlign='center';c.textBaseline='top';
          c.fillText('⚑',x+TW*.5,y+2);
        }
      }
      // 地形テクスチャ
      drawTerrainTex(c,x,y,TW,TH,tid,own,t);
      // グリッドライン
      c.strokeStyle=tdef.bdr;c.lineWidth=0.5;c.strokeRect(x+.5,y+.5,TW-1,TH-1);
    }
  }
  // 移動ハイライト
  moveCells.forEach(function(m){c.fillStyle='rgba(80,160,255,.22)';c.fillRect(m.c*TW,m.r*TH,TW,TH);c.strokeStyle='rgba(80,160,255,.8)';c.lineWidth=1.5;c.strokeRect(m.c*TW+1,m.r*TH+1,TW-2,TH-2);});
  // 攻撃ハイライト
  atkCells.forEach(function(m){c.fillStyle='rgba(231,76,60,.25)';c.fillRect(m.c*TW,m.r*TH,TW,TH);c.strokeStyle='rgba(231,76,60,.8)';c.lineWidth=1.5;c.strokeRect(m.c*TW+1,m.r*TH+1,TW-2,TH-2);});
  // 広域攻撃ハイライト
  aoeCells.forEach(function(m){c.fillStyle='rgba(240,200,64,.25)';c.fillRect(m.c*TW,m.r*TH,TW,TH);c.strokeStyle='rgba(240,200,64,.9)';c.lineWidth=2;c.strokeRect(m.c*TW+1,m.r*TH+1,TW-2,TH-2);});
  // 選択ユニット枠
  if(selUnit){c.strokeStyle='rgba(255,220,80,.95)';c.lineWidth=2.5;c.strokeRect(selUnit.col*TW+1,selUnit.row*TH+1,TW-2,TH-2);c.fillStyle='rgba(255,220,80,.1)';c.fillRect(selUnit.col*TW,selUnit.row*TH,TW,TH);}
  // ユニット
  if(GS)GS.units.forEach(function(u){drawUnit(c,u,t);});
  // レベルアップフラッシュ
  drawLvUpFlash(c);
}
function drawTerrainTex(c,x,y,w,h,tid,own,t){
  var cx=x+w/2,cy=y+h/2;
  if(tid===0||tid===3){// 平原
    c.fillStyle='rgba(60,120,30,.45)';for(var i=0;i<4;i++){var dx=(i*13+7)%(w-6)+3,dy=(i*17+3)%(h-6)+3;c.beginPath();c.arc(x+dx,y+dy,1.5,0,Math.PI*2);c.fill();}
  }else if(tid===1){// 森
    c.fillStyle='rgba(20,80,10,.75)';c.beginPath();c.moveTo(cx,y+5);c.lineTo(cx+14,y+h-10);c.lineTo(cx-14,y+h-10);c.fill();c.fillStyle='rgba(15,60,8,.75)';c.beginPath();c.moveTo(cx,y+2);c.lineTo(cx+10,y+16);c.lineTo(cx-10,y+16);c.fill();c.fillStyle='rgba(80,50,20,.7)';c.fillRect(cx-3,y+h-12,6,10);
  }else if(tid===2){// 山岳
    c.fillStyle='rgba(120,100,60,.65)';c.beginPath();c.moveTo(cx,y+5);c.lineTo(cx+20,y+h-8);c.lineTo(cx-20,y+h-8);c.fill();c.fillStyle='rgba(220,220,240,.55)';c.beginPath();c.moveTo(cx,y+5);c.lineTo(cx+7,y+16);c.lineTo(cx-7,y+16);c.fill();
  }else if(tid===4){// 都市
    c.fillStyle='rgba(80,80,120,.6)';c.fillRect(cx-12,y+h-20,10,18);c.fillRect(cx+2,y+h-24,10,22);c.fillStyle='rgba(255,220,80,'+(.5+.3*Math.sin(t*.1+(own||0)))+')';c.fillRect(cx-10,y+h-18,3,3);c.fillRect(cx-10,y+h-12,3,3);c.fillRect(cx+4,y+h-22,3,3);c.fillRect(cx+4,y+h-16,3,3);c.fillStyle='rgba(80,80,120,.55)';c.beginPath();c.moveTo(cx-14,y+h-20);c.lineTo(cx-7,y+h-28);c.lineTo(cx,y+h-20);c.fill();
  }else if(tid===5){// 城砦
    c.fillStyle='rgba(120,80,40,.7)';c.fillRect(cx-16,y+8,32,h-14);c.fillStyle='rgba(90,60,30,.7)';c.fillRect(cx-18,y+6,8,10);c.fillRect(cx-4,y+6,8,10);c.fillRect(cx+10,y+6,8,10);c.fillStyle='rgba(30,30,30,.75)';c.fillRect(cx-5,y+h-15,10,13);c.fillStyle='rgba(255,140,0,'+(.4+.3*Math.sin(t*.2+(own||0)*1.5))+')';c.beginPath();c.arc(cx-15,y+10,2.5,0,Math.PI*2);c.fill();c.beginPath();c.arc(cx+15,y+10,2.5,0,Math.PI*2);c.fill();
  }else if(tid===6){// 丘
    c.fillStyle='rgba(60,100,30,.5)';c.beginPath();c.arc(cx,cy,w*.32,0,Math.PI*2);c.fill();c.fillStyle='rgba(80,130,40,.4)';c.beginPath();c.arc(cx-4,cy-3,w*.18,0,Math.PI*2);c.fill();
  }else if(tid===7){// 神殿
    c.fillStyle='rgba(80,40,120,.65)';c.fillRect(cx-14,y+10,28,h-16);c.fillStyle='rgba(60,30,90,.65)';c.fillRect(cx-18,y+8,6,h-14);c.fillRect(cx+12,y+8,6,h-14);var tg=c.createRadialGradient(cx,cy,0,cx,cy,16);tg.addColorStop(0,'rgba(180,100,255,'+(.2+.1*Math.sin(t*.08))+')');tg.addColorStop(1,'transparent');c.fillStyle=tg;c.beginPath();c.arc(cx,cy,16,0,Math.PI*2);c.fill();c.font='10px serif';c.textAlign='center';c.textBaseline='middle';c.fillText('⛩',cx,cy);
  }
}
function drawUnit(c,u,t){
  var x=u.col*TW,y=u.row*TH,pc=PCOLS[u.owner];
  var isDone=u.moved&&u.attacked,isSel=selUnit&&selUnit.id===u.id;
  var ux=x+TW/2,uy=y+TH/2,r2=TW*.38;
  // ★自軍/敵軍 判定（オフラインは現ターン主、オンラインは myPeerIdx 基準）
  var meIdx=(typeof onlineMode!=='undefined'&&onlineMode)?myPeerIdx:GS.turn;
  var isOwn=(u.owner===meIdx);
  var isMovable=isOwn&&!isDone&&isMyTurn;  // 自分の動かせるユニット
  // レベルに応じてサイズ微増
  var scale=Math.min(1.0+((u.level||1)-1)*.015,1.25);
  // ★自軍ユニット: 外側に光彩リング（一目で「自分」と分かる）
  if(isOwn&&!isDone){
    var glowR=r2*scale+5+Math.sin(t*.18)*1.5;
    var glow=c.createRadialGradient(ux,uy,r2*scale,ux,uy,glowR+4);
    glow.addColorStop(0,pc.light+'cc');glow.addColorStop(1,pc.light+'00');
    c.fillStyle=glow;c.beginPath();c.arc(ux,uy,glowR+4,0,Math.PI*2);c.fill();
  }
  // ★動かせるユニット: 緑の点滅リング
  if(isMovable){
    var pulse=0.6+0.4*Math.sin(t*.18);
    c.strokeStyle='rgba(120,255,120,'+pulse+')';c.lineWidth=2.5;
    c.beginPath();c.arc(ux,uy,r2*scale+3,0,Math.PI*2);c.stroke();
  }
  // 円背景
  var ug=c.createRadialGradient(ux,uy,2,ux,uy,r2*scale);
  ug.addColorStop(0,isDone?'rgba(40,40,40,.85)':pc.main+'dd');ug.addColorStop(1,isDone?'rgba(20,20,20,.7)':pc.dark+'aa');
  c.fillStyle=ug;c.beginPath();c.arc(ux,uy,r2*scale,0,Math.PI*2);c.fill();
  // 枠：自軍は太い金/明るい縁、敵は細く赤系
  var frameCol=isSel?'#ffee44':(u.type==='king'?'#f0c840':isDone?'#333':(isOwn?pc.light:'#ff5555'));
  var frameWid=isSel?3:(isOwn?2.5:1.5);
  c.strokeStyle=frameCol;c.lineWidth=frameWid;c.beginPath();c.arc(ux,uy,r2*scale,0,Math.PI*2);c.stroke();
  // 敵ユニット: 外側に赤い破線（明確に区別）
  if(!isOwn&&!isDone){
    c.strokeStyle='rgba(255,80,80,.8)';c.lineWidth=1.2;c.setLineDash([3,2]);
    c.beginPath();c.arc(ux,uy,r2*scale+2.5,0,Math.PI*2);c.stroke();c.setLineDash([]);
  }
  // 王様はダブル枠
  if(u.type==='king'){c.strokeStyle=pc.light+'a0';c.lineWidth=1.2;c.beginPath();c.arc(ux,uy,r2*scale+3,0,Math.PI*2);c.stroke();}
  // ユニット記号
  var sym=UDEFS[u.type]?UDEFS[u.type].sym:'?';
  c.fillStyle=isDone?'#555':pc.light;
  c.font='bold '+Math.floor(TW*.3)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(sym,ux,uy);
  // レベル表示（2以上）
  if((u.level||1)>1){
    c.fillStyle=(u.level||1)>=5?'#ff8844':(u.level||1)>=3?'#ffdd44':'#aaffaa';
    c.font='bold '+Math.floor(TW*.2)+'px sans-serif';c.textAlign='left';c.textBaseline='top';
    c.fillText('★'+(u.level||1),x+2,y+2);
  }
  // 属性アイコン（小さく右下）
  var ei=ELEM_INFO[UDEFS[u.type]?UDEFS[u.type].elem:'none']||ELEM_INFO.none;
  c.font=Math.floor(TW*.18)+'px sans-serif';c.textAlign='right';c.textBaseline='bottom';
  c.fillText(ei.name.split(' ')[0],x+TW-2,y+TH-8);
  // HPバー
  var hpPct=Math.max(0,u.hp/u.mhp),bw=TW-6,bh=5,bx=x+3,by=y+TH-8;
  c.fillStyle='rgba(0,0,0,.6)';c.fillRect(bx,by,bw,bh);
  c.fillStyle=hpPct>0.5?'#27ae60':hpPct>0.25?'#f0c840':'#e74c3c';c.fillRect(bx,by,Math.round(bw*hpPct),bh);
  // 状態アイコン
  if(u.status&&u.status.length){var sic={'cursed':'💀','poisoned':'🟢','weakened':'⬇','enfeebled':'🔻'};u.status.forEach(function(s,si){c.font='8px sans-serif';c.textAlign='left';c.fillText(sic[s]||'?',x+2+si*10,y+TH-16);});}
  // 選択パルス
  if(isSel&&!isDone){var pulse2=Math.sin(t*.25)*.3;c.strokeStyle='rgba(255,220,80,'+(0.5+pulse2)+')';c.lineWidth=1.5;c.setLineDash([3,3]);c.strokeRect(x+2,y+2,TW-4,TH-4);c.setLineDash([]);}
  // 行動済みオーバーレイ
  if(isDone){
    c.fillStyle='rgba(0,0,0,.45)';c.beginPath();c.arc(ux,uy,r2*scale,0,Math.PI*2);c.fill();
    // ★行動済みマーク（チェックマーク）
    if(isOwn){
      c.fillStyle='rgba(120,120,120,.8)';c.font='bold '+Math.floor(TW*.18)+'px sans-serif';
      c.textAlign='right';c.textBaseline='top';c.fillText('✓',x+TW-2,y+2);
    }
  }
}
function drawMinimap(){
  if(!minimapCtx||!GS)return;
  var c=minimapCtx,mw=120,mh=90,tw=mw/COLS,th=mh/ROWS;
  c.clearRect(0,0,mw,mh);
  for(var r=0;r<ROWS;r++)for(var cl=0;cl<COLS;cl++){
    var own=GS.own[r]?GS.own[r][cl]:-1;c.fillStyle=(TDEFS[(MAP&&MAP[r])?MAP[r][cl]||0:0]||TDEFS[0]).col;c.fillRect(cl*tw,r*th,tw,th);
    if(own>=0){c.fillStyle=PCOLS[own].main+'88';c.fillRect(cl*tw,r*th,tw,th);}
  }
  GS.units.forEach(function(u){
    c.fillStyle=u.type==='king'?'#f0c840':PCOLS[u.owner].light;
    c.fillRect(u.col*tw+.5,u.row*th+.5,tw-1,th-1);
  });
  var ma=document.getElementById('gameMapArea');
  var vx=ma.scrollLeft/TW*tw,vy=ma.scrollTop/TH*th,vw=ma.clientWidth/TW*tw,vh=ma.clientHeight/TH*th;
  c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=1;c.strokeRect(vx,vy,Math.min(vw,mw-vx),Math.min(vh,mh-vy));
}
/* ===== バトル演出 ===== */