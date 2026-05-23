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
  var cx=w*.5,sk='#f2c882',skd='#c49050',skl='#fad8a8',lt=cL(col,40),dk=cL(col,-30);
  // ── ブーツ ──
  c.fillStyle='#1c1c1c';c.beginPath();c.roundRect(cx-w*.21,h*.88,w*.18,h*.08,4);c.fill();c.beginPath();c.roundRect(cx+w*.03,h*.88,w*.18,h*.08,4);c.fill();
  c.fillStyle='rgba(60,40,20,.5)';c.beginPath();c.roundRect(cx-w*.22,h*.93,w*.19,h*.025,3);c.fill();c.beginPath();c.roundRect(cx+w*.02,h*.93,w*.19,h*.025,3);c.fill();
  // ── 脛（すね）──
  var llG=c.createLinearGradient(cx-w*.18,0,cx-w*.06,0);llG.addColorStop(0,lt);llG.addColorStop(.55,col);llG.addColorStop(1,dk);
  c.fillStyle=llG;c.beginPath();c.roundRect(cx-w*.2,h*.76,w*.15,h*.13,4);c.fill();c.strokeStyle=dk;c.lineWidth=1;c.stroke();c.beginPath();c.roundRect(cx+w*.05,h*.76,w*.15,h*.13,4);c.fill();c.stroke();
  // ── 膝 ──
  c.fillStyle=lt;c.beginPath();c.ellipse(cx-w*.125,h*.762,w*.082,h*.044,0,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(cx+w*.125,h*.762,w*.082,h*.044,0,0,Math.PI*2);c.fill();
  // ── 太もも ──
  c.fillStyle=col;c.beginPath();c.roundRect(cx-w*.21,h*.635,w*.18,h*.135,5);c.fill();c.strokeStyle=dk;c.lineWidth=1;c.stroke();c.beginPath();c.roundRect(cx+w*.03,h*.635,w*.18,h*.135,5);c.fill();c.stroke();
  // ── 胴体（台形＋腰くびれ）──
  var torG=c.createLinearGradient(cx-w*.24,h*.38,cx+w*.24,h*.65);torG.addColorStop(0,lt);torG.addColorStop(.42,col);torG.addColorStop(1,dk);
  c.fillStyle=torG;c.beginPath();c.moveTo(cx-w*.24,h*.40);c.quadraticCurveTo(cx-w*.27,h*.52,cx-w*.22,h*.645);c.lineTo(cx+w*.22,h*.645);c.quadraticCurveTo(cx+w*.27,h*.52,cx+w*.24,h*.40);c.closePath();c.fill();c.strokeStyle=dk;c.lineWidth=1.5;c.stroke();
  // 胸の縫い目・皺
  c.strokeStyle=lt+'66';c.lineWidth=1.2;c.beginPath();c.moveTo(cx,h*.42);c.lineTo(cx,h*.61);c.stroke();
  c.strokeStyle=dk+'55';c.lineWidth=1;c.beginPath();c.moveTo(cx-w*.19,h*.52);c.quadraticCurveTo(cx-w*.07,h*.54,cx,h*.535);c.stroke();c.beginPath();c.moveTo(cx+w*.19,h*.52);c.quadraticCurveTo(cx+w*.07,h*.54,cx,h*.535);c.stroke();
  // ── ベルト・バックル ──
  c.fillStyle='#3a2010';c.beginPath();c.roundRect(cx-w*.23,h*.625,w*.46,h*.055,3);c.fill();c.fillStyle='#8a6030';c.beginPath();c.roundRect(cx-w*.04,h*.625,w*.08,h*.055,2);c.fill();
  // ── 左腕（肩球→上腕→肘→前腕→掌→指）──
  c.fillStyle=sk;c.beginPath();c.ellipse(cx-w*.265,h*.425,w*.09,w*.065,0,0,Math.PI*2);c.fill();c.strokeStyle=skd;c.lineWidth=1;c.stroke();
  c.fillStyle=sk;c.beginPath();c.roundRect(cx-w*.36,h*.415,w*.13,h*.21,5);c.fill();c.strokeStyle=skd;c.stroke();
  c.fillStyle=skd;c.beginPath();c.ellipse(cx-w*.3,h*.625,w*.072,w*.054,0,0,Math.PI*2);c.fill();
  c.fillStyle=sk;c.beginPath();c.roundRect(cx-w*.35,h*.61,w*.11,h*.18,4);c.fill();c.strokeStyle=skd;c.stroke();
  c.fillStyle=sk;c.beginPath();c.ellipse(cx-w*.3,h*.8,w*.074,h*.046,0,0,Math.PI*2);c.fill();
  c.fillStyle=sk;for(var lf=0;lf<3;lf++){c.beginPath();c.roundRect(cx-w*.337+lf*w*.026,h*.834,w*.022,h*.034,4);c.fill();}
  // ── 右腕（肩球→上腕→肘→前腕→掌→指）──
  c.fillStyle=sk;c.beginPath();c.ellipse(cx+w*.265,h*.425,w*.09,w*.065,0,0,Math.PI*2);c.fill();c.strokeStyle=skd;c.lineWidth=1;c.stroke();
  c.fillStyle=sk;c.beginPath();c.roundRect(cx+w*.23,h*.415,w*.13,h*.21,5);c.fill();c.strokeStyle=skd;c.stroke();
  c.fillStyle=skd;c.beginPath();c.ellipse(cx+w*.3,h*.625,w*.072,w*.054,0,0,Math.PI*2);c.fill();
  c.fillStyle=sk;c.beginPath();c.roundRect(cx+w*.24,h*.61,w*.11,h*.18,4);c.fill();c.strokeStyle=skd;c.stroke();
  c.fillStyle=sk;c.beginPath();c.ellipse(cx+w*.3,h*.8,w*.074,h*.046,0,0,Math.PI*2);c.fill();
  c.fillStyle=sk;for(var rf=0;rf<3;rf++){c.beginPath();c.roundRect(cx+w*.287+rf*w*.026,h*.834,w*.022,h*.034,4);c.fill();}
  // ── 首 ──
  c.fillStyle=sk;c.beginPath();c.roundRect(cx-w*.065,h*.35,w*.13,h*.07,4);c.fill();c.strokeStyle=skd;c.lineWidth=1;c.stroke();
  // ── 頭（球体グラデ）──
  var hG=c.createRadialGradient(cx-w*.06,h*.17,0,cx,h*.22,w*.17);hG.addColorStop(0,skl);hG.addColorStop(.7,sk);hG.addColorStop(1,skd);
  c.fillStyle=hG;c.beginPath();c.arc(cx,h*.22,w*.155,0,Math.PI*2);c.fill();c.strokeStyle=skd;c.lineWidth=1;c.stroke();
  // 顎影
  c.fillStyle='rgba(0,0,0,.07)';c.beginPath();c.ellipse(cx,h*.325,w*.08,h*.028,0,0,Math.PI*2);c.fill();
  // 耳（内耳）
  c.fillStyle=sk;c.beginPath();c.ellipse(cx-w*.168,h*.224,w*.028,w*.042,0,0,Math.PI*2);c.fill();c.strokeStyle=skd;c.lineWidth=1;c.stroke();c.fillStyle=skd;c.beginPath();c.ellipse(cx-w*.165,h*.224,w*.015,w*.024,0,0,Math.PI*2);c.fill();
  c.fillStyle=sk;c.beginPath();c.ellipse(cx+w*.168,h*.224,w*.028,w*.042,0,0,Math.PI*2);c.fill();c.strokeStyle=skd;c.stroke();c.fillStyle=skd;c.beginPath();c.ellipse(cx+w*.165,h*.224,w*.015,w*.024,0,0,Math.PI*2);c.fill();
  // 顔パーツ（眉・目・鼻・口）
  drawFace(c,w,h,h*.22,w*.155,'#3a2808');
}
/* ─── 顔描画ヘルパー ─── fy=顔中心Y, fr=顔半径, eyeCol=虹彩色 */
function drawFace(c,w,h,fy,fr,eyeCol){
  var cx=w*.5,ey=fy-fr*.14;
  // 眉
  c.strokeStyle='rgba(0,0,0,.28)';c.lineWidth=Math.max(1,fr*.065);c.lineCap='round';
  c.beginPath();c.moveTo(cx-fr*.68,ey-fr*.18);c.quadraticCurveTo(cx-fr*.36,ey-fr*.26,cx-fr*.09,ey-fr*.17);c.stroke();
  c.beginPath();c.moveTo(cx+fr*.09,ey-fr*.17);c.quadraticCurveTo(cx+fr*.36,ey-fr*.26,cx+fr*.68,ey-fr*.18);c.stroke();c.lineCap='butt';
  // 目の窪み
  c.fillStyle='rgba(0,0,0,.1)';c.beginPath();c.ellipse(cx-fr*.42,ey,fr*.35,fr*.22,0,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(cx+fr*.42,ey,fr*.35,fr*.22,0,0,Math.PI*2);c.fill();
  // 白目
  c.fillStyle='#fffff4';c.beginPath();c.ellipse(cx-fr*.42,ey,fr*.25,fr*.16,0,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(cx+fr*.42,ey,fr*.25,fr*.16,0,0,Math.PI*2);c.fill();
  // 虹彩
  c.fillStyle=eyeCol||'#3a2808';c.beginPath();c.arc(cx-fr*.42,ey+fr*.03,fr*.14,0,Math.PI*2);c.fill();c.beginPath();c.arc(cx+fr*.42,ey+fr*.03,fr*.14,0,Math.PI*2);c.fill();
  // 瞳孔
  c.fillStyle='#111';c.beginPath();c.arc(cx-fr*.42,ey+fr*.03,fr*.075,0,Math.PI*2);c.fill();c.beginPath();c.arc(cx+fr*.42,ey+fr*.03,fr*.075,0,Math.PI*2);c.fill();
  // 角膜ハイライト
  c.fillStyle='rgba(255,255,255,.88)';c.beginPath();c.arc(cx-fr*.48,ey-fr*.04,fr*.052,0,Math.PI*2);c.fill();c.beginPath();c.arc(cx+fr*.36,ey-fr*.04,fr*.052,0,Math.PI*2);c.fill();
  // 鼻（輪郭）
  var ny=fy+fr*.18;c.strokeStyle='rgba(0,0,0,.17)';c.lineWidth=Math.max(.8,fr*.04);c.lineCap='round';
  c.beginPath();c.moveTo(cx-fr*.06,ey+fr*.1);c.quadraticCurveTo(cx-fr*.1,ny,cx-fr*.18,ny+fr*.06);c.stroke();
  c.beginPath();c.moveTo(cx+fr*.06,ey+fr*.1);c.quadraticCurveTo(cx+fr*.1,ny,cx+fr*.18,ny+fr*.06);c.stroke();
  c.beginPath();c.moveTo(cx-fr*.2,ny+fr*.06);c.quadraticCurveTo(cx,ny+fr*.14,cx+fr*.2,ny+fr*.06);c.stroke();c.lineCap='butt';
  // 口
  c.strokeStyle='rgba(120,60,40,.72)';c.lineWidth=Math.max(1,fr*.06);c.lineCap='round';
  c.beginPath();c.moveTo(cx-fr*.25,fy+fr*.38);c.quadraticCurveTo(cx,fy+fr*.48,cx+fr*.25,fy+fr*.38);c.stroke();c.lineCap='butt';
  // 頬紅（微妙に）
  c.fillStyle='rgba(255,180,160,.12)';c.beginPath();c.ellipse(cx-fr*.5,ey+fr*.2,fr*.22,fr*.14,0,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(cx+fr*.5,ey+fr*.2,fr*.22,fr*.14,0,0,Math.PI*2);c.fill();
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
      c.fillStyle='#f0c840';for(var i=-2;i<=2;i++){c.beginPath();c.moveTo(cx+i*w*.07,h*.02);c.lineTo(cx+i*w*.07-w*.025,h*.08);c.lineTo(cx+i*w*.07+w*.025,h*.08);c.closePath();c.fill();}
      c.fillStyle='rgba(240,200,64,.8)';c.fillRect(cx-w*.18,h*.08,w*.36,h*.045);
      c.fillStyle='#cc0000';c.beginPath();c.arc(cx-w*.1,h*.09,3,0,Math.PI*2);c.fill();c.beginPath();c.arc(cx+w*.1,h*.09,3,0,Math.PI*2);c.fill();
      // Scepter
      c.strokeStyle='#f0c840';c.lineWidth=5;c.beginPath();c.moveTo(cx+w*.3,h*.85);c.lineTo(cx+w*.35,h*.06);c.stroke();
      var og=c.createRadialGradient(cx+w*.35,h*.02,2,cx+w*.35,h*.02,16);og.addColorStop(0,'#fff');og.addColorStop(.5,'#f0c840');og.addColorStop(1,'transparent');c.fillStyle=og;c.beginPath();c.arc(cx+w*.35,h*.02,16,0,Math.PI*2);c.fill();
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
      drawFace(c,w,h,h*.28,w*.13,'#4a3820');
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
      // ===== DRAGON v10: 詳細ドラゴンスプライト =====
      var lt3=cL(col,45),dk3=cL(col,-40);
      // 翼（後ろレイヤー）
      c.fillStyle=col+'68';c.beginPath();c.moveTo(cx+w*.05,h*.42);c.quadraticCurveTo(cx+w*.58,h*.04,cx+w*.5,h*.56);c.lineTo(cx+w*.14,h*.5);c.closePath();c.fill();
      c.fillStyle=col+'50';c.beginPath();c.moveTo(cx-w*.05,h*.42);c.quadraticCurveTo(cx-w*.55,h*.06,cx-w*.46,h*.56);c.lineTo(cx-w*.08,h*.5);c.closePath();c.fill();
      // 翼の骨（leading edge）
      c.strokeStyle=cL(col,-10);c.lineWidth=5;c.lineCap='round';
      c.beginPath();c.moveTo(cx+w*.06,h*.43);c.quadraticCurveTo(cx+w*.44,h*.09,cx+w*.5,h*.56);c.stroke();
      c.beginPath();c.moveTo(cx-w*.06,h*.43);c.quadraticCurveTo(cx-w*.42,h*.10,cx-w*.46,h*.56);c.stroke();
      // 翼の指リブ
      c.strokeStyle=dk3;c.lineWidth=2;
      for(var wi=0;wi<3;wi++){c.beginPath();c.moveTo(cx+w*.06,h*.43);c.lineTo(cx+w*(.18+wi*.11),h*.09+(wi+1)/4*h*.08);c.lineTo(cx+w*(.33+wi*.07),h*.54);c.stroke();}
      // 胴体
      var dbG=c.createLinearGradient(cx-w*.2,h*.38,cx+w*.2,h*.82);dbG.addColorStop(0,lt3);dbG.addColorStop(.4,col);dbG.addColorStop(1,dk3);
      c.fillStyle=dbG;c.beginPath();c.ellipse(cx,h*.63,w*.2,h*.22,0,0,Math.PI*2);c.fill();
      // 鱗テクスチャ（弧の行列）
      c.strokeStyle=dk3;c.lineWidth=1.2;
      for(var sr=0;sr<3;sr++)for(var sc3=0;sc3<4;sc3++){c.beginPath();c.arc(cx-w*.15+sc3*w*.10,h*.46+sr*h*.12,w*.05,-Math.PI,0);c.stroke();}
      // 腹（明るい下面）
      var belG=c.createLinearGradient(cx-w*.08,h*.52,cx+w*.08,h*.82);belG.addColorStop(0,lt3+'bb');belG.addColorStop(1,col+'77');
      c.fillStyle=belG;c.beginPath();c.ellipse(cx+w*.02,h*.65,w*.09,h*.16,0,0,Math.PI*2);c.fill();
      // 首
      var nkG=c.createLinearGradient(cx-w*.08,h*.42,cx+w*.24,h*.2);nkG.addColorStop(0,lt3);nkG.addColorStop(1,col);
      c.fillStyle=nkG;c.beginPath();c.moveTo(cx-w*.06,h*.42);c.lineTo(cx+w*.1,h*.41);c.quadraticCurveTo(cx+w*.24,h*.3,cx+w*.26,h*.22);c.quadraticCurveTo(cx+w*.3,h*.18,cx+w*.22,h*.18);c.quadraticCurveTo(cx+w*.14,h*.26,cx+w*.02,h*.43);c.closePath();c.fill();
      c.strokeStyle=dk3;c.lineWidth=1;for(var ni=0;ni<3;ni++){c.beginPath();c.arc(cx+w*(.05+ni*.08),h*(.4-ni*.05),w*.04,-Math.PI,0);c.stroke();}
      // 頭部（上顎・頭蓋）改良版 - 首と自然につながる
      var hdG=c.createRadialGradient(cx+w*.2,h*.1,w*.02,cx+w*.26,h*.17,w*.22);hdG.addColorStop(0,lt3);hdG.addColorStop(.5,col);hdG.addColorStop(1,dk3);
      c.fillStyle=hdG;c.beginPath();
      c.moveTo(cx+w*.14,h*.23);c.quadraticCurveTo(cx+w*.1,h*.14,cx+w*.16,h*.07);
      c.quadraticCurveTo(cx+w*.22,h*.02,cx+w*.3,h*.06);c.quadraticCurveTo(cx+w*.42,h*.1,cx+w*.47,h*.17);
      c.quadraticCurveTo(cx+w*.47,h*.21,cx+w*.44,h*.22);c.quadraticCurveTo(cx+w*.34,h*.22,cx+w*.22,h*.24);
      c.lineTo(cx+w*.14,h*.23);c.closePath();c.fill();c.strokeStyle=dk3;c.lineWidth=1.5;c.stroke();
      // 下顎（開口）
      c.fillStyle=col;c.beginPath();
      c.moveTo(cx+w*.18,h*.27);c.quadraticCurveTo(cx+w*.35,h*.25,cx+w*.44,h*.24);
      c.quadraticCurveTo(cx+w*.47,h*.27,cx+w*.44,h*.32);c.quadraticCurveTo(cx+w*.3,h*.35,cx+w*.16,h*.32);
      c.closePath();c.fill();c.strokeStyle=dk3;c.stroke();
      // 口腔
      c.fillStyle='#550000';c.beginPath();
      c.moveTo(cx+w*.2,h*.24);c.quadraticCurveTo(cx+w*.36,h*.22,cx+w*.44,h*.22);
      c.quadraticCurveTo(cx+w*.44,h*.31,cx+w*.3,h*.33);c.quadraticCurveTo(cx+w*.18,h*.30,cx+w*.18,h*.27);c.closePath();c.fill();
      // 歯（上）
      c.fillStyle='#fffdd0';
      for(var ti=0;ti<4;ti++){var txi=cx+w*(.22+ti*.056);c.beginPath();c.moveTo(txi-w*.018,h*.24);c.lineTo(txi+w*.018,h*.24);c.lineTo(txi,h*.28);c.closePath();c.fill();}
      // 歯（下）
      for(var ti2=0;ti2<3;ti2++){var txi2=cx+w*(.26+ti2*.065);c.beginPath();c.moveTo(txi2-w*.014,h*.31);c.lineTo(txi2+w*.014,h*.31);c.lineTo(txi2,h*.27);c.closePath();c.fill();}
      // 舌
      c.fillStyle='#cc2244';c.beginPath();
      c.moveTo(cx+w*.22,h*.29);c.quadraticCurveTo(cx+w*.38,h*.28,cx+w*.43,h*.26);
      c.quadraticCurveTo(cx+w*.44,h*.28,cx+w*.43,h*.30);c.quadraticCurveTo(cx+w*.36,h*.32,cx+w*.20,h*.31);c.closePath();c.fill();
      // 目（頭蓋の前寄り）
      cRad(c,cx+w*.18,h*.12,w*.04,'#ffdd00','#885500');c.fillStyle='#111';c.beginPath();c.ellipse(cx+w*.18,h*.12,w*.013,w*.027,-0.2,0,Math.PI*2);c.fill();c.fillStyle='rgba(255,255,255,.6)';c.beginPath();c.arc(cx+w*.16,h*.10,w*.01,0,Math.PI*2);c.fill();
      // 角（頭頂部から後方へ）
      c.fillStyle='#bb8800';
      c.beginPath();c.moveTo(cx+w*.2,h*.08);c.quadraticCurveTo(cx+w*.22,h*.01,cx+w*.28,h*.04);c.quadraticCurveTo(cx+w*.26,h*.08,cx+w*.21,h*.1);c.closePath();c.fill();
      c.beginPath();c.moveTo(cx+w*.28,h*.07);c.quadraticCurveTo(cx+w*.32,h*.0,cx+w*.36,h*.02);c.quadraticCurveTo(cx+w*.33,h*.07,cx+w*.28,h*.09);c.closePath();c.fill();
      c.strokeStyle='#aa6600';c.lineWidth=1.5;c.beginPath();c.arc(cx+w*.28,h*.07,w*.08,-2.5,-0.5);c.stroke();
      // 鼻孔（スノウト付近）
      c.fillStyle=dk3;c.beginPath();c.ellipse(cx+w*.42,h*.175,w*.022,w*.013,0.3,0,Math.PI*2);c.fill();
      // 火炎ブレス（口先から噴出）
      var fg=c.createRadialGradient(cx+w*.46,h*.28,0,cx+w*.46,h*.28,w*.25);fg.addColorStop(0,'#fff');fg.addColorStop(.15,'#ffee44');fg.addColorStop(.4,'#ff6600');fg.addColorStop(.7,'#cc2200');fg.addColorStop(1,'transparent');
      c.fillStyle=fg;c.beginPath();c.arc(cx+w*.46,h*.28,w*.25,0,Math.PI*2);c.fill();
      var fg2=c.createRadialGradient(cx+w*.46,h*.28,0,cx+w*.46,h*.28,w*.1);fg2.addColorStop(0,'#fff');fg2.addColorStop(.5,'#ffffaa');fg2.addColorStop(1,'transparent');
      c.fillStyle=fg2;c.beginPath();c.arc(cx+w*.46,h*.28,w*.1,0,Math.PI*2);c.fill();
      // 前脚・爪
      var clG=c.createLinearGradient(cx-w*.18,h*.72,cx,h*.78);clG.addColorStop(0,lt3);clG.addColorStop(1,col);
      c.fillStyle=clG;c.beginPath();c.ellipse(cx-w*.1,h*.76,w*.12,h*.05,-0.3,0,Math.PI*2);c.fill();
      c.strokeStyle=dk3;c.lineWidth=4;c.lineCap='round';
      c.beginPath();c.moveTo(cx-w*.12,h*.77);c.lineTo(cx-w*.2,h*.89);c.stroke();c.beginPath();c.moveTo(cx-w*.08,h*.77);c.lineTo(cx-w*.13,h*.92);c.stroke();c.beginPath();c.moveTo(cx-w*.04,h*.76);c.lineTo(cx-w*.05,h*.89);c.stroke();
      c.fillStyle='#ccc';for(var ci=0;ci<3;ci++){var cxa=[cx-w*.2,cx-w*.13,cx-w*.05][ci],cya=[h*.89,h*.92,h*.89][ci];c.beginPath();c.moveTo(cxa-w*.02,cya);c.lineTo(cxa+w*.02,cya);c.lineTo(cxa,cya+h*.033);c.closePath();c.fill();}
      // 尻尾
      c.strokeStyle=col;c.lineWidth=14;
      c.beginPath();c.moveTo(cx-w*.15,h*.73);c.quadraticCurveTo(cx-w*.36,h*.85,cx-w*.44,h*.78);c.stroke();
      c.lineWidth=8;c.beginPath();c.moveTo(cx-w*.36,h*.85);c.quadraticCurveTo(cx-w*.49,h*.82,cx-w*.47,h*.72);c.stroke();
      c.lineWidth=4;c.beginPath();c.moveTo(cx-w*.47,h*.72);c.lineTo(cx-w*.49,h*.65);c.stroke();
      // 尾のトゲ
      c.fillStyle='#cc9922';for(var si=0;si<3;si++){c.beginPath();c.moveTo(cx-w*(.23+si*.09),h*(.73-si*.02));c.lineTo(cx-w*(.27+si*.09),h*(.64-si*.02));c.lineTo(cx-w*(.3+si*.09),h*(.72-si*.02));c.closePath();c.fill();}
      c.lineCap='butt';break;
    case 'skeleton':
      var bone='#d8d8c0';c.strokeStyle=bone;c.lineWidth=5;c.beginPath();c.moveTo(cx,h*.42);c.lineTo(cx,h*.72);c.stroke();c.lineWidth=4;c.beginPath();c.moveTo(cx-w*.2,h*.48);c.lineTo(cx,h*.5);c.lineTo(cx+w*.2,h*.48);c.stroke();c.lineWidth=3;c.beginPath();c.moveTo(cx,h*.72);c.lineTo(cx-w*.12,h*.88);c.stroke();c.beginPath();c.moveTo(cx,h*.72);c.lineTo(cx+w*.12,h*.88);c.stroke();
      cRad(c,cx,h*.3,w*.13,bone,'#aaa890');c.fillStyle='#111';c.beginPath();c.arc(cx-w*.06,h*.28,w*.055,0,Math.PI*2);c.fill();c.beginPath();c.arc(cx+w*.06,h*.28,w*.055,0,Math.PI*2);c.fill();
      var eg2=c.createRadialGradient(cx-w*.06,h*.28,0,cx-w*.06,h*.28,7);eg2.addColorStop(0,'#88ff88');eg2.addColorStop(1,'transparent');c.fillStyle=eg2;c.beginPath();c.arc(cx-w*.06,h*.28,7,0,Math.PI*2);c.fill();break;
    case 'knight':
      // ===== KNIGHT v10: フルプレートアーマー騎士 =====
      var lt=cL(col,55),dk=cL(col,-35);
      // ブーツ
      c.fillStyle='#1a1a1a';c.beginPath();c.roundRect(cx-w*.22,h*.87,w*.19,h*.09,4);c.fill();c.beginPath();c.roundRect(cx+w*.03,h*.87,w*.19,h*.09,4);c.fill();
      // グリーブ（脛甲）
      var grG=c.createLinearGradient(cx-w*.22,0,cx,0);grG.addColorStop(0,lt);grG.addColorStop(.5,col);grG.addColorStop(1,dk);
      c.fillStyle=grG;c.beginPath();c.roundRect(cx-w*.22,h*.72,w*.18,h*.16,4);c.fill();c.strokeStyle=dk;c.lineWidth=1.5;c.stroke();
      grG=c.createLinearGradient(cx+w*.04,0,cx+w*.22,0);grG.addColorStop(0,lt);grG.addColorStop(.5,col);grG.addColorStop(1,dk);
      c.fillStyle=grG;c.beginPath();c.roundRect(cx+w*.04,h*.72,w*.18,h*.16,4);c.fill();c.strokeStyle=dk;c.stroke();
      // キュイス（腿甲）
      c.fillStyle=col;c.beginPath();c.roundRect(cx-w*.21,h*.60,w*.18,h*.14,5);c.fill();c.strokeStyle=dk;c.stroke();
      c.beginPath();c.roundRect(cx+w*.03,h*.60,w*.18,h*.14,5);c.fill();c.stroke();
      // 膝当て
      c.fillStyle=lt;c.beginPath();c.ellipse(cx-w*.12,h*.725,w*.09,h*.05,0,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(cx+w*.12,h*.725,w*.09,h*.05,0,0,Math.PI*2);c.fill();
      // ブレストプレート（胸甲）
      var bpG=c.createLinearGradient(cx-w*.25,h*.37,cx+w*.25,h*.68);bpG.addColorStop(0,lt);bpG.addColorStop(.4,col);bpG.addColorStop(1,dk);
      c.fillStyle=bpG;c.beginPath();c.roundRect(cx-w*.24,h*.37,w*.48,h*.26,6);c.fill();c.strokeStyle=dk;c.lineWidth=2;c.stroke();
      c.strokeStyle=lt;c.lineWidth=2.5;c.beginPath();c.moveTo(cx,h*.39);c.lineTo(cx,h*.61);c.stroke();
      c.strokeStyle=dk+'88';c.lineWidth=1.5;c.beginPath();c.moveTo(cx-w*.22,h*.48);c.lineTo(cx+w*.22,h*.48);c.stroke();
      // フォルズ（スカート状鎧板）
      for(var fi=-2;fi<=2;fi++){c.fillStyle=fi%2?col:cL(col,-20);c.beginPath();c.moveTo(cx+fi*w*.095-w*.04,h*.62);c.lineTo(cx+fi*w*.095+w*.04,h*.62);c.lineTo(cx+fi*w*.095+w*.05,h*.73);c.lineTo(cx+fi*w*.095-w*.05,h*.73);c.closePath();c.fill();c.strokeStyle=dk;c.lineWidth=1;c.stroke();}
      // カイトシールド（凧型盾）
      var shG=c.createLinearGradient(cx-w*.52,h*.33,cx-w*.26,h*.72);shG.addColorStop(0,lt);shG.addColorStop(.5,col);shG.addColorStop(1,dk);
      c.fillStyle=shG;c.beginPath();c.moveTo(cx-w*.52,h*.32);c.lineTo(cx-w*.26,h*.32);c.lineTo(cx-w*.26,h*.63);c.quadraticCurveTo(cx-w*.39,h*.82,cx-w*.52,h*.63);c.closePath();c.fill();c.strokeStyle=lt;c.lineWidth=2;c.stroke();
      cRad(c,cx-w*.39,h*.48,w*.055,'#fff','#888');
      c.strokeStyle=lt+'cc';c.lineWidth=2;c.beginPath();c.moveTo(cx-w*.39,h*.35);c.lineTo(cx-w*.39,h*.64);c.stroke();c.beginPath();c.moveTo(cx-w*.50,h*.48);c.lineTo(cx-w*.27,h*.48);c.stroke();
      // ポールドロン（肩当て）
      cRad(c,cx-w*.26,h*.4,w*.12,lt,dk);c.strokeStyle=dk;c.lineWidth=1.5;c.beginPath();c.arc(cx-w*.26,h*.4,w*.12,0,Math.PI*2);c.stroke();
      cRad(c,cx+w*.26,h*.4,w*.12,lt,dk);c.beginPath();c.arc(cx+w*.26,h*.4,w*.12,0,Math.PI*2);c.stroke();
      // 右腕・ガントレット
      c.fillStyle=col;c.beginPath();c.roundRect(cx+w*.21,h*.43,w*.12,h*.2,4);c.fill();c.strokeStyle=dk;c.stroke();
      c.fillStyle=lt;for(var gi=0;gi<4;gi++){c.beginPath();c.arc(cx+w*.225+gi*w*.028,h*.615,w*.012,0,Math.PI*2);c.fill();}
      // ロングソード（クロスガード）
      var cgG=c.createLinearGradient(cx+w*.15,h*.62,cx+w*.42,h*.63);cgG.addColorStop(0,'#aaa');cgG.addColorStop(.5,'#fff');cgG.addColorStop(1,'#888');
      c.fillStyle=cgG;c.beginPath();c.roundRect(cx+w*.15,h*.62,w*.27,h*.04,4);c.fill();
      // グリップ
      c.fillStyle='#5a3010';c.beginPath();c.roundRect(cx+w*.25,h*.655,w*.06,h*.17,3);c.fill();
      // ポンメル
      cRad(c,cx+w*.28,h*.84,w*.03,'#ccc','#666');
      // ブレード（グラデーション）
      var blG=c.createLinearGradient(cx+w*.245,h*.62,cx+w*.31,h*.62);blG.addColorStop(0,'#fff');blG.addColorStop(.4,'#ddd');blG.addColorStop(1,'#888');
      c.fillStyle=blG;c.beginPath();c.moveTo(cx+w*.245,h*.62);c.lineTo(cx+w*.315,h*.62);c.lineTo(cx+w*.28,h*.09);c.closePath();c.fill();
      c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=1.5;c.beginPath();c.moveTo(cx+w*.27,h*.11);c.lineTo(cx+w*.25,h*.60);c.stroke();
      c.save();c.globalAlpha=.35;c.fillStyle=col;c.beginPath();c.moveTo(cx+w*.245,h*.62);c.lineTo(cx+w*.315,h*.62);c.lineTo(cx+w*.28,h*.09);c.closePath();c.fill();c.restore();
      // ゴージェット（首当て）
      c.fillStyle=col;c.beginPath();c.roundRect(cx-w*.1,h*.33,w*.2,h*.06,3);c.fill();c.strokeStyle=dk;c.stroke();
      // ヘルメット（頭蓋部）
      var helmG=c.createRadialGradient(cx-w*.06,h*.14,0,cx,h*.21,w*.2);helmG.addColorStop(0,lt);helmG.addColorStop(.6,col);helmG.addColorStop(1,dk);
      c.fillStyle=helmG;c.beginPath();c.arc(cx,h*.22,w*.18,-Math.PI,0);c.fill();c.strokeStyle=dk;c.lineWidth=1.5;c.stroke();
      // チークガード（頬当て）
      c.fillStyle=col;c.beginPath();c.roundRect(cx-w*.18,h*.22,w*.08,h*.13,4);c.fill();c.strokeStyle=dk;c.stroke();c.beginPath();c.roundRect(cx+w*.10,h*.22,w*.08,h*.13,4);c.fill();c.stroke();
      // バイザー（面当て）
      var visG=c.createLinearGradient(cx-w*.14,h*.22,cx+w*.14,h*.36);visG.addColorStop(0,cL(col,20));visG.addColorStop(.5,col);visG.addColorStop(1,dk);
      c.fillStyle=visG;c.beginPath();c.roundRect(cx-w*.14,h*.22,w*.28,h*.135,4);c.fill();c.strokeStyle=dk;c.stroke();
      // バイザースリット（T字）
      c.fillStyle='#111';c.beginPath();c.roundRect(cx-w*.13,h*.247,w*.26,h*.026,3);c.fill();
      for(var vi=0;vi<5;vi++){c.beginPath();c.roundRect(cx-w*.065+vi*w*.03,h*.27,w*.018,h*.044,2);c.fill();}
      // ヘルメットハイライト
      var hhG=c.createRadialGradient(cx-w*.08,h*.13,0,cx-w*.06,h*.16,w*.14);hhG.addColorStop(0,lt+'cc');hhG.addColorStop(.5,lt+'44');hhG.addColorStop(1,'transparent');
      c.fillStyle=hhG;c.beginPath();c.arc(cx,h*.22,w*.17,-Math.PI,0);c.fill();
      // プリューム（兜のたてがみ）
      c.fillStyle=lt+'ee';c.beginPath();c.moveTo(cx-w*.03,h*.17);c.quadraticCurveTo(cx+w*.14,h*.02,cx+w*.24,h*.08);c.quadraticCurveTo(cx+w*.10,h*.14,cx+w*.02,h*.19);c.closePath();c.fill();
      c.fillStyle=col+'99';c.beginPath();c.moveTo(cx,h*.17);c.quadraticCurveTo(cx+w*.17,h*.03,cx+w*.26,h*.09);c.quadraticCurveTo(cx+w*.11,h*.16,cx+w*.03,h*.2);c.closePath();c.fill();
      break;
    case 'soldier':
      sprHumanoid(c,w,h,col);
      // 円盾
      cRad(c,cx-w*.32,h*.52,w*.13,cL(col,20),cL(col,-20));
      c.strokeStyle='#333';c.lineWidth=2;c.beginPath();c.arc(cx-w*.32,h*.52,w*.13,0,Math.PI*2);c.stroke();
      cRad(c,cx-w*.32,h*.52,w*.055,'#888','#444');
      c.strokeStyle='#c8c8c8';c.lineWidth=1.5;c.beginPath();c.moveTo(cx-w*.32,h*.41);c.lineTo(cx-w*.32,h*.63);c.stroke();c.beginPath();c.moveTo(cx-w*.44,h*.52);c.lineTo(cx-w*.2,h*.52);c.stroke();
      // 槍
      c.strokeStyle='#8a6030';c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(cx+w*.29,h*.85);c.lineTo(cx+w*.33,h*.17);c.stroke();c.lineCap='butt';
      c.fillStyle='#ccc';c.beginPath();c.moveTo(cx+w*.28,h*.17);c.lineTo(cx+w*.38,h*.17);c.lineTo(cx+w*.33,h*.06);c.closePath();c.fill();
      c.strokeStyle='#888';c.lineWidth=1.5;c.stroke();
      // ヘルメット（頭頂部に被せる）
      c.fillStyle=col;c.beginPath();c.arc(cx,h*.16,w*.16,-Math.PI,0);c.fill();c.strokeStyle=cL(col,-20);c.lineWidth=1.5;c.stroke();
      c.fillStyle=cL(col,-30);c.fillRect(cx-w*.04,h*.21,w*.08,h*.06);
      break;
    case 'archer':
      sprHumanoid(c,w,h,col);
      // クイバー（矢筒）
      c.fillStyle='#6a4020';c.beginPath();c.roundRect(cx+w*.18,h*.42,w*.09,h*.24,4);c.fill();
      c.strokeStyle='#888';c.lineWidth=2;for(var qi=0;qi<3;qi++){c.beginPath();c.moveTo(cx+w*.21+qi*w*.025,h*.42);c.lineTo(cx+w*.21+qi*w*.025,h*.52);c.stroke();}
      // 弓（湾曲）
      c.strokeStyle='#6a4020';c.lineWidth=5;c.lineCap='round';
      c.beginPath();c.moveTo(cx-w*.36,h*.28);c.quadraticCurveTo(cx-w*.52,h*.52,cx-w*.36,h*.74);c.stroke();
      // 弦
      c.strokeStyle='#ddd';c.lineWidth=1.5;
      c.beginPath();c.moveTo(cx-w*.36,h*.28);c.lineTo(cx-w*.3,h*.52);c.lineTo(cx-w*.36,h*.74);c.stroke();
      // 矢（つがえた状態）
      c.strokeStyle='#8a6030';c.lineWidth=3;c.beginPath();c.moveTo(cx-w*.3,h*.52);c.lineTo(cx+w*.14,h*.52);c.stroke();
      c.fillStyle='#aaa';c.beginPath();c.moveTo(cx+w*.14,h*.48);c.lineTo(cx+w*.22,h*.52);c.lineTo(cx+w*.14,h*.56);c.closePath();c.fill();
      c.fillStyle='#44aa44';c.beginPath();c.moveTo(cx-w*.3,h*.52);c.lineTo(cx-w*.38,h*.49);c.lineTo(cx-w*.3,h*.55);c.closePath();c.fill();
      c.lineCap='butt';
      break;
    case 'mage':
      // ローブ
      var mRg=c.createLinearGradient(cx-w*.22,h*.36,cx+w*.22,h*.9);mRg.addColorStop(0,cL(col,20));mRg.addColorStop(1,col);
      c.fillStyle=mRg;c.beginPath();c.moveTo(cx-w*.22,h*.38);c.lineTo(cx+w*.22,h*.38);c.lineTo(cx+w*.3,h*.9);c.lineTo(cx-w*.3,h*.9);c.closePath();c.fill();
      c.strokeStyle=cL(col,-20);c.lineWidth=1.5;c.stroke();
      // 顔
      cRad(c,cx,h*.28,w*.13,'#f0c080','#c4904e');
      drawFace(c,w,h,h*.28,w*.13,'#2a4080');
      // 帽子
      c.fillStyle=cL(col,-30);c.beginPath();c.ellipse(cx,h*.2,w*.18,h*.05,0,0,Math.PI*2);c.fill();
      c.beginPath();c.moveTo(cx-w*.05,h*.2);c.lineTo(cx+w*.05,h*.2);c.lineTo(cx,h*.04);c.closePath();c.fill();
      c.strokeStyle=cL(col,10);c.lineWidth=1;c.stroke();
      c.fillStyle=elemCol+'55';c.beginPath();c.ellipse(cx,h*.2,w*.18,h*.05,0,0,Math.PI*2);c.fill();
      // 杖
      c.strokeStyle='#8a6030';c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(cx+w*.28,h*.86);c.lineTo(cx+w*.32,h*.1);c.stroke();c.lineCap='butt';
      // 宝珠
      var mOrb=c.createRadialGradient(cx+w*.3,h*.06,0,cx+w*.3,h*.08,w*.1);mOrb.addColorStop(0,'#fff');mOrb.addColorStop(.4,elemCol);mOrb.addColorStop(1,'transparent');
      c.fillStyle=mOrb;c.beginPath();c.arc(cx+w*.3,h*.08,w*.1,0,Math.PI*2);c.fill();
      cRad(c,cx+w*.3,h*.08,w*.06,cL(elemCol,40),elemCol);
      // ベルト
      c.fillStyle='#5a3010';c.fillRect(cx-w*.2,h*.54,w*.4,h*.04);
      c.fillStyle=elemCol+'99';c.font=Math.floor(w*.14)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('✦',cx,h*.66);
      break;
    case 'paladin':
      sprHumanoid(c,w,h,col);
      // タワーシールド
      var shG2=c.createLinearGradient(cx-w*.52,h*.34,cx-w*.24,h*.75);shG2.addColorStop(0,'#f0c840');shG2.addColorStop(.3,cL(col,20));shG2.addColorStop(1,col);
      c.fillStyle=shG2;c.beginPath();c.moveTo(cx-w*.52,h*.34);c.lineTo(cx-w*.24,h*.34);c.lineTo(cx-w*.24,h*.7);c.quadraticCurveTo(cx-w*.38,h*.84,cx-w*.52,h*.7);c.closePath();c.fill();
      c.strokeStyle='#f0c840';c.lineWidth=2.5;c.stroke();
      c.strokeStyle='#f0c840';c.lineWidth=3;c.beginPath();c.moveTo(cx-w*.38,h*.38);c.lineTo(cx-w*.38,h*.76);c.stroke();c.beginPath();c.moveTo(cx-w*.5,h*.52);c.lineTo(cx-w*.26,h*.52);c.stroke();
      // メイス
      c.strokeStyle='#888';c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(cx+w*.3,h*.85);c.lineTo(cx+w*.32,h*.44);c.stroke();c.lineCap='butt';
      c.fillStyle='#aaa';c.beginPath();c.arc(cx+w*.32,h*.4,w*.08,0,Math.PI*2);c.fill();c.strokeStyle='#666';c.lineWidth=1.5;c.stroke();
      c.fillStyle='#999';for(var mi=0;mi<8;mi++){var ma2=mi*Math.PI/4,mr2=w*.1;c.beginPath();c.arc(cx+w*.32+Math.cos(ma2)*mr2,h*.4+Math.sin(ma2)*mr2*.7,w*.025,0,Math.PI*2);c.fill();}
      // 光輪（頭の上）
      c.strokeStyle='rgba(255,220,80,.6)';c.lineWidth=2;c.setLineDash([4,3]);c.beginPath();c.arc(cx,h*.08,w*.18,0,Math.PI*2);c.stroke();c.setLineDash([]);
      break;
    case 'ninja':
      // 暗装束
      c.fillStyle='#111';c.beginPath();c.roundRect(cx-w*.18,h*.42,w*.36,h*.3,5);c.fill();
      cRad(c,cx,h*.32,w*.13,'#1e1e1e','#0a0a0a');
      // 赤いスカーフ
      c.fillStyle='#aa0000';c.beginPath();c.moveTo(cx-w*.12,h*.36);c.lineTo(cx+w*.12,h*.36);c.quadraticCurveTo(cx+w*.28,h*.46,cx+w*.22,h*.6);c.lineTo(cx-w*.22,h*.6);c.quadraticCurveTo(cx-w*.28,h*.46,cx-w*.12,h*.36);c.closePath();c.fill();
      // 目だけ見える
      c.fillStyle='#2a2a2a';c.beginPath();c.roundRect(cx-w*.12,h*.28,w*.24,h*.07,3);c.fill();
      c.fillStyle='rgba(255,200,0,.9)';c.beginPath();c.ellipse(cx-w*.05,h*.315,w*.03,w*.025,0,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(cx+w*.05,h*.315,w*.03,w*.025,0,0,Math.PI*2);c.fill();
      // 手裏剣
      c.fillStyle='#aaa';var sx2=cx+w*.34,sy2=h*.48;
      for(var shi=0;shi<4;shi++){c.save();c.translate(sx2,sy2);c.rotate(shi*Math.PI/4);c.beginPath();c.moveTo(-w*.055,0);c.lineTo(0,-w*.022);c.lineTo(w*.055,0);c.lineTo(0,w*.022);c.closePath();c.fill();c.restore();}
      // 刀（左側）
      c.strokeStyle='#ddd';c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(cx-w*.3,h*.8);c.lineTo(cx-w*.38,h*.26);c.stroke();
      c.strokeStyle='rgba(220,220,255,.4)';c.lineWidth=5;c.beginPath();c.moveTo(cx-w*.3,h*.8);c.lineTo(cx-w*.38,h*.26);c.stroke();
      c.strokeStyle='#888';c.lineWidth=6;c.lineCap='butt';c.beginPath();c.moveTo(cx-w*.34,h*.5);c.lineTo(cx-w*.24,h*.5);c.stroke();
      // 脚
      c.fillStyle='#111';c.beginPath();c.roundRect(cx-w*.14,h*.72,w*.12,h*.18,4);c.fill();c.beginPath();c.roundRect(cx+w*.02,h*.72,w*.12,h*.18,4);c.fill();
      c.fillStyle='#222';c.beginPath();c.roundRect(cx-w*.16,h*.87,w*.15,h*.07,3);c.fill();c.beginPath();c.roundRect(cx+w*.01,h*.87,w*.15,h*.07,3);c.fill();
      break;
    case 'catapult':
      // 車輪×2
      c.strokeStyle='#5a3010';c.lineWidth=6;c.beginPath();c.arc(cx-w*.24,h*.78,w*.14,0,Math.PI*2);c.stroke();c.beginPath();c.arc(cx+w*.24,h*.78,w*.14,0,Math.PI*2);c.stroke();
      c.strokeStyle='#6a4020';c.lineWidth=3;
      for(var spi=0;spi<4;spi++){var spa=spi*Math.PI/4;[cx-w*.24,cx+w*.24].forEach(function(wx2){c.beginPath();c.moveTo(wx2,h*.78);c.lineTo(wx2+Math.cos(spa)*w*.13,h*.78+Math.sin(spa)*h*.1);c.stroke();});}
      // フレーム
      c.fillStyle='#8a6030';c.fillRect(cx-w*.3,h*.6,w*.6,h*.18);c.fillStyle='#6a4020';c.fillRect(cx-w*.28,h*.62,w*.56,h*.14);
      // 投擲アーム
      c.strokeStyle='#8a6030';c.lineWidth=8;c.lineCap='round';c.beginPath();c.moveTo(cx-w*.1,h*.66);c.quadraticCurveTo(cx,h*.55,cx+w*.2,h*.26);c.stroke();c.lineCap='butt';
      // バケット
      c.fillStyle='#5a3010';c.beginPath();c.arc(cx+w*.22,h*.24,w*.08,0,Math.PI*2);c.fill();c.strokeStyle='#8a6030';c.lineWidth=2;c.stroke();
      // 岩
      c.fillStyle='#888';c.beginPath();c.arc(cx+w*.2,h*.22,w*.05,0,Math.PI*2);c.fill();c.fillStyle='#777';c.beginPath();c.arc(cx+w*.28,h*.24,w*.04,0,Math.PI*2);c.fill();
      // ロープ
      c.strokeStyle='#ddd';c.lineWidth=2;c.beginPath();c.moveTo(cx-w*.1,h*.66);c.lineTo(cx-w*.24,h*.73);c.stroke();
      c.fillStyle='#8a6030';c.beginPath();c.arc(cx-w*.24,h*.72,w*.04,0,Math.PI*2);c.fill();
      break;
    case 'healer':
      // 白ローブ
      var hrg=c.createLinearGradient(cx-w*.2,h*.38,cx+w*.2,h*.9);hrg.addColorStop(0,'#ffffff');hrg.addColorStop(1,'#ccd8ff');
      c.fillStyle=hrg;c.beginPath();c.moveTo(cx-w*.2,h*.38);c.lineTo(cx+w*.2,h*.38);c.lineTo(cx+w*.28,h*.9);c.lineTo(cx-w*.28,h*.9);c.closePath();c.fill();c.strokeStyle='#aabbdd';c.lineWidth=1.5;c.stroke();
      // 赤十字
      c.fillStyle='#cc2222';c.fillRect(cx-w*.04,h*.5,w*.08,h*.22);c.fillRect(cx-w*.14,h*.58,w*.28,h*.07);
      // 顔
      cRad(c,cx,h*.28,w*.13,'#f0c080','#c4904e');
      drawFace(c,w,h,h*.28,w*.13,'#5a3820');
      // 光輪
      var haG=c.createRadialGradient(cx,h*.14,0,cx,h*.14,w*.2);haG.addColorStop(0,'rgba(255,220,80,.6)');haG.addColorStop(.5,'rgba(255,220,80,.2)');haG.addColorStop(1,'transparent');
      c.fillStyle=haG;c.beginPath();c.arc(cx,h*.14,w*.2,0,Math.PI*2);c.fill();
      c.strokeStyle='rgba(255,220,80,.8)';c.lineWidth=2.5;c.setLineDash([3,2]);c.beginPath();c.arc(cx,h*.16,w*.18,0,Math.PI*2);c.stroke();c.setLineDash([]);
      // 聖なる杖
      c.strokeStyle='#c8c8c8';c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(cx+w*.28,h*.88);c.lineTo(cx+w*.3,h*.15);c.stroke();c.lineCap='butt';
      c.strokeStyle='rgba(255,220,80,.9)';c.lineWidth=3;c.beginPath();c.moveTo(cx+w*.22,h*.2);c.lineTo(cx+w*.38,h*.2);c.stroke();c.beginPath();c.moveTo(cx+w*.3,h*.13);c.lineTo(cx+w*.3,h*.28);c.stroke();
      var cg2=c.createRadialGradient(cx+w*.3,h*.2,0,cx+w*.3,h*.2,w*.12);cg2.addColorStop(0,'rgba(255,220,80,.5)');cg2.addColorStop(1,'transparent');
      c.fillStyle=cg2;c.beginPath();c.arc(cx+w*.3,h*.2,w*.12,0,Math.PI*2);c.fill();
      break;
    case 'berserker':
      // 鍛え上げた素肌の腕
      c.fillStyle='#c08840';c.fillRect(cx-w*.36,h*.42,w*.1,h*.26);c.fillRect(cx+w*.26,h*.42,w*.1,h*.26);
      // 毛皮の胴
      var bChG=c.createLinearGradient(cx-w*.22,h*.38,cx+w*.22,h*.72);bChG.addColorStop(0,cL(col,20));bChG.addColorStop(1,col);
      c.fillStyle=bChG;c.beginPath();c.roundRect(cx-w*.22,h*.38,w*.44,h*.3,5);c.fill();c.strokeStyle=cL(col,-30);c.lineWidth=1.5;c.stroke();
      // 傷跡・戦闘ダメージ
      c.strokeStyle=cL(col,-40);c.lineWidth=1.8;c.beginPath();c.moveTo(cx-w*.1,h*.44);c.lineTo(cx+w*.06,h*.56);c.stroke();c.beginPath();c.moveTo(cx+w*.1,h*.46);c.lineTo(cx-w*.02,h*.62);c.stroke();
      // 頭（モヒカン）
      cRad(c,cx,h*.28,w*.14,'#c08040','#885020');
      drawFace(c,w,h,h*.28,w*.14,'#5a2010');
      c.fillStyle='#cc4400';for(var mhi=0;mhi<5;mhi++){c.beginPath();c.moveTo(cx-w*.04+mhi*w*.02,h*.16);c.lineTo(cx-w*.02+mhi*w*.02,h*.04);c.lineTo(cx+mhi*w*.02,h*.16);c.closePath();c.fill();}
      // ウォーペイント
      c.strokeStyle='#cc0000';c.lineWidth=3;c.beginPath();c.moveTo(cx-w*.12,h*.25);c.lineTo(cx-w*.04,h*.3);c.stroke();c.beginPath();c.moveTo(cx+w*.04,h*.25);c.lineTo(cx+w*.12,h*.3);c.stroke();
      // 巨大バトルアックス
      c.strokeStyle='#6a4020';c.lineWidth=8;c.lineCap='round';c.beginPath();c.moveTo(cx+w*.22,h*.85);c.lineTo(cx+w*.32,h*.22);c.stroke();c.lineCap='butt';
      var axG=c.createLinearGradient(cx+w*.22,h*.22,cx+w*.5,h*.22);axG.addColorStop(0,'#aaa');axG.addColorStop(.5,'#fff');axG.addColorStop(1,'#888');
      c.fillStyle=axG;c.beginPath();c.moveTo(cx+w*.3,h*.18);c.quadraticCurveTo(cx+w*.5,h*.14,cx+w*.52,h*.26);c.quadraticCurveTo(cx+w*.5,h*.38,cx+w*.3,h*.34);c.closePath();c.fill();c.strokeStyle='#777';c.lineWidth=1.5;c.stroke();
      c.fillStyle='#bbb';c.beginPath();c.moveTo(cx+w*.3,h*.2);c.quadraticCurveTo(cx+w*.18,h*.17,cx+w*.18,h*.26);c.quadraticCurveTo(cx+w*.18,h*.35,cx+w*.3,h*.32);c.closePath();c.fill();
      // 脚
      c.fillStyle=col;c.beginPath();c.roundRect(cx-w*.14,h*.68,w*.12,h*.2,4);c.fill();c.beginPath();c.roundRect(cx+w*.02,h*.68,w*.12,h*.2,4);c.fill();
      c.fillStyle='#333';c.beginPath();c.roundRect(cx-w*.16,h*.85,w*.15,h*.08,3);c.fill();c.beginPath();c.roundRect(cx+w*.01,h*.85,w*.15,h*.08,3);c.fill();
      break;
    case 'witch':
      // 黒ローブ
      var wRg=c.createLinearGradient(cx-w*.22,h*.36,cx+w*.22,h*.9);wRg.addColorStop(0,'#1a0a1a');wRg.addColorStop(1,'#0a0514');
      c.fillStyle=wRg;c.beginPath();c.moveTo(cx-w*.22,h*.38);c.lineTo(cx+w*.22,h*.38);c.lineTo(cx+w*.32,h*.9);c.lineTo(cx-w*.32,h*.9);c.closePath();c.fill();c.strokeStyle=col+'aa';c.lineWidth=1.5;c.stroke();
      c.fillStyle=col+'55';c.font=Math.floor(w*.1)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('★',cx-w*.1,h*.55);c.fillText('☽',cx+w*.1,h*.66);
      c.fillStyle=col;c.fillRect(cx-w*.2,h*.54,w*.4,h*.04);
      cRad(c,cx,h*.3,w*.12,'#e0a060','#b07040');
      drawFace(c,w,h,h*.3,w*.12,'#7a3060');
      // 尖り帽子
      c.fillStyle='#1a0a1a';c.beginPath();c.moveTo(cx-w*.2,h*.2);c.lineTo(cx,h*.04);c.lineTo(cx+w*.2,h*.2);c.closePath();c.fill();
      c.fillStyle='#2a0a2a';c.beginPath();c.ellipse(cx,h*.21,w*.22,h*.045,0,0,Math.PI*2);c.fill();c.strokeStyle=col+'cc';c.lineWidth=2;c.stroke();
      c.fillStyle=col+'44';c.beginPath();c.ellipse(cx,h*.21,w*.22,h*.045,0,0,Math.PI*2);c.fill();
      // ほうき
      c.strokeStyle='#8a6030';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(cx+w*.22,h*.38);c.lineTo(cx+w*.44,h*.72);c.stroke();c.lineCap='butt';
      c.fillStyle='#cc8822';c.beginPath();c.moveTo(cx+w*.36,h*.7);c.lineTo(cx+w*.52,h*.66);c.lineTo(cx+w*.5,h*.78);c.lineTo(cx+w*.34,h*.82);c.closePath();c.fill();
      c.strokeStyle='#664400';c.lineWidth=2;for(var bri=0;bri<5;bri++){c.beginPath();c.moveTo(cx+w*.36+bri*w*.032,h*.7);c.lineTo(cx+w*.34+bri*w*.032,h*.82);c.stroke();}
      // 手の魔法光
      var mhG=c.createRadialGradient(cx-w*.24,h*.48,0,cx-w*.24,h*.48,w*.1);mhG.addColorStop(0,col+'cc');mhG.addColorStop(1,'transparent');
      c.fillStyle=mhG;c.beginPath();c.arc(cx-w*.24,h*.48,w*.1,0,Math.PI*2);c.fill();
      break;
    case 'pirate':
      sprHumanoid(c,w,h,col);
      // 海賊帽（頭頂部に配置）
      c.fillStyle='#111';c.beginPath();c.ellipse(cx,h*.12,w*.2,h*.045,0,0,Math.PI*2);c.fill();
      c.beginPath();c.moveTo(cx-w*.12,h*.12);c.lineTo(cx,h*.01);c.lineTo(cx+w*.12,h*.12);c.closePath();c.fill();c.strokeStyle='#f0c840';c.lineWidth=2;c.stroke();
      c.fillStyle='#f0f0f0';c.font=Math.floor(w*.12)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('☠',cx,h*.07);
      // 眼帯（目の位置に合わせる）
      c.fillStyle='#111';c.beginPath();c.ellipse(cx-w*.07,h*.21,w*.06,w*.04,0.3,0,Math.PI*2);c.fill();c.strokeStyle='#555';c.lineWidth=1.5;c.beginPath();c.moveTo(cx-w*.13,h*.19);c.lineTo(cx-w*.01,h*.19);c.stroke();
      // カトラス
      c.strokeStyle='#888';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(cx+w*.22,h*.82);c.quadraticCurveTo(cx+w*.36,h*.55,cx+w*.42,h*.28);c.stroke();c.lineCap='butt';
      c.fillStyle='#aaa';c.beginPath();c.moveTo(cx+w*.38,h*.3);c.lineTo(cx+w*.46,h*.3);c.lineTo(cx+w*.42,h*.22);c.closePath();c.fill();
      c.strokeStyle='#888';c.lineWidth=6;c.beginPath();c.moveTo(cx+w*.2,h*.54);c.lineTo(cx+w*.36,h*.54);c.stroke();
      // フック（左手）
      c.strokeStyle='#ccc';c.lineWidth=4;c.beginPath();c.arc(cx-w*.32,h*.62,w*.06,Math.PI*.5,-Math.PI*.1);c.stroke();
      // ベルト
      c.fillStyle='#5a3010';c.fillRect(cx-w*.22,h*.54,w*.44,h*.05);c.fillStyle='#c0a000';c.fillRect(cx-w*.04,h*.54,w*.08,h*.05);
      break;
    case 'phoenix':
      var lt4=cL(col,40),dk4=cL(col,-30);
      // 尾羽（流れるように）
      c.fillStyle=col+'77';
      c.beginPath();c.moveTo(cx,h*.6);c.quadraticCurveTo(cx-w*.28,h*.74,cx-w*.36,h*.95);c.lineTo(cx-w*.2,h*.88);c.quadraticCurveTo(cx-w*.1,h*.72,cx,h*.62);c.closePath();c.fill();
      c.beginPath();c.moveTo(cx,h*.6);c.quadraticCurveTo(cx+w*.28,h*.74,cx+w*.36,h*.95);c.lineTo(cx+w*.2,h*.88);c.quadraticCurveTo(cx+w*.1,h*.72,cx,h*.62);c.closePath();c.fill();
      c.beginPath();c.moveTo(cx,h*.58);c.quadraticCurveTo(cx-w*.1,h*.8,cx-w*.08,h*.96);c.lineTo(cx+w*.08,h*.96);c.quadraticCurveTo(cx+w*.1,h*.8,cx,h*.58);c.closePath();c.fill();
      // 翼（大きく広げた）
      c.fillStyle=col+'cc';
      c.beginPath();c.moveTo(cx,h*.46);c.quadraticCurveTo(cx-w*.48,h*.3,cx-w*.46,h*.62);c.lineTo(cx-w*.3,h*.58);c.quadraticCurveTo(cx-w*.2,h*.5,cx-w*.04,h*.52);c.closePath();c.fill();
      c.beginPath();c.moveTo(cx,h*.46);c.quadraticCurveTo(cx+w*.48,h*.3,cx+w*.46,h*.62);c.lineTo(cx+w*.3,h*.58);c.quadraticCurveTo(cx+w*.2,h*.5,cx+w*.04,h*.52);c.closePath();c.fill();
      c.strokeStyle=cL(col,-10);c.lineWidth=3;c.beginPath();c.moveTo(cx,h*.46);c.quadraticCurveTo(cx-w*.48,h*.3,cx-w*.46,h*.62);c.stroke();c.beginPath();c.moveTo(cx,h*.46);c.quadraticCurveTo(cx+w*.48,h*.3,cx+w*.46,h*.62);c.stroke();
      // 胴
      var pbG=c.createLinearGradient(cx-w*.14,h*.38,cx+w*.14,h*.66);pbG.addColorStop(0,lt4);pbG.addColorStop(1,col);
      c.fillStyle=pbG;c.beginPath();c.ellipse(cx,h*.52,w*.12,h*.16,0,0,Math.PI*2);c.fill();
      // 頭
      cRad(c,cx,h*.3,w*.12,lt4,col);
      // 冠羽
      c.fillStyle=lt4;for(var phi=0;phi<5;phi++){c.beginPath();c.moveTo(cx-w*.08+phi*w*.04,h*.2);c.quadraticCurveTo(cx-w*.1+phi*w*.04,h*.08,cx-w*.06+phi*w*.04,h*.14);c.lineTo(cx-w*.04+phi*w*.04,h*.2);c.closePath();c.fill();}
      c.fillStyle='#111';c.beginPath();c.arc(cx+w*.06,h*.28,w*.03,0,Math.PI*2);c.fill();c.fillStyle='rgba(255,220,80,.9)';c.beginPath();c.arc(cx+w*.05,h*.27,w*.01,0,Math.PI*2);c.fill();
      // くちばし
      c.fillStyle='#f0c040';c.beginPath();c.moveTo(cx+w*.12,h*.3);c.lineTo(cx+w*.2,h*.28);c.lineTo(cx+w*.12,h*.34);c.closePath();c.fill();
      // 炎のオーラ
      var pfG=c.createRadialGradient(cx,h*.45,0,cx,h*.45,w*.28);pfG.addColorStop(0,'rgba(255,220,80,.4)');pfG.addColorStop(.5,'rgba(255,100,0,.2)');pfG.addColorStop(1,'transparent');
      c.fillStyle=pfG;c.beginPath();c.arc(cx,h*.45,w*.28,0,Math.PI*2);c.fill();
      break;
    case 'spy':
      // フードクローク
      var spyRg=c.createLinearGradient(cx-w*.22,h*.36,cx+w*.22,h*.9);spyRg.addColorStop(0,'#222244');spyRg.addColorStop(1,'#111133');
      c.fillStyle=spyRg;c.beginPath();c.moveTo(cx-w*.22,h*.38);c.lineTo(cx+w*.22,h*.38);c.lineTo(cx+w*.28,h*.9);c.lineTo(cx-w*.28,h*.9);c.closePath();c.fill();c.strokeStyle=col+'88';c.lineWidth=1.5;c.stroke();
      // フード付き頭
      cRad(c,cx,h*.3,w*.13,'#1a1a2a','#0a0a14');
      c.fillStyle='#222244';c.beginPath();c.ellipse(cx,h*.22,w*.18,h*.08,0,0,Math.PI*2);c.fill();
      c.beginPath();c.moveTo(cx-w*.18,h*.22);c.lineTo(cx-w*.08,h*.28);c.lineTo(cx+w*.08,h*.28);c.lineTo(cx+w*.18,h*.22);c.quadraticCurveTo(cx,h*.04,cx-w*.18,h*.22);c.closePath();c.fill();
      // 光る目
      c.fillStyle=col+'dd';c.beginPath();c.ellipse(cx-w*.06,h*.3,w*.03,w*.02,0,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(cx+w*.06,h*.3,w*.03,w*.02,0,0,Math.PI*2);c.fill();
      var eyeG=c.createRadialGradient(cx,h*.3,0,cx,h*.3,w*.14);eyeG.addColorStop(0,col+'44');eyeG.addColorStop(1,'transparent');
      c.fillStyle=eyeG;c.beginPath();c.arc(cx,h*.3,w*.14,0,Math.PI*2);c.fill();
      // 交差したダガー
      c.strokeStyle='#ccc';c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(cx+w*.18,h*.42);c.lineTo(cx+w*.42,h*.64);c.stroke();c.beginPath();c.moveTo(cx+w*.42,h*.42);c.lineTo(cx+w*.18,h*.64);c.stroke();c.lineCap='butt';
      c.strokeStyle='#888';c.lineWidth=5;c.beginPath();c.moveTo(cx+w*.25,h*.47);c.lineTo(cx+w*.35,h*.47);c.stroke();c.beginPath();c.moveTo(cx+w*.25,h*.59);c.lineTo(cx+w*.35,h*.59);c.stroke();
      c.fillStyle='#333355';c.fillRect(cx-w*.2,h*.54,w*.4,h*.05);
      c.fillStyle=col+'88';for(var gi2=0;gi2<3;gi2++){c.beginPath();c.arc(cx-w*.1+gi2*w*.1,h*.565,w*.02,0,Math.PI*2);c.fill();}
      break;
    case 'necromancer':
      // 黒いボロローブ
      var nRg=c.createLinearGradient(cx-w*.24,h*.36,cx+w*.24,h*.92);nRg.addColorStop(0,'#100818');nRg.addColorStop(1,'#050408');
      c.fillStyle=nRg;c.beginPath();c.moveTo(cx-w*.24,h*.38);c.lineTo(cx+w*.24,h*.38);c.lineTo(cx+w*.32,h*.92);c.lineTo(cx-w*.32,h*.92);c.closePath();c.fill();
      // ボロ裾
      c.fillStyle='#100818';for(var ti3=0;ti3<6;ti3++){c.beginPath();c.moveTo(cx-w*.3+ti3*w*.1,h*.88);c.lineTo(cx-w*.25+ti3*w*.1,h*.96);c.lineTo(cx-w*.2+ti3*w*.1,h*.88);c.closePath();c.fill();}
      c.fillStyle='#ddddaa';c.font=Math.floor(w*.1)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('💀',cx-w*.1,h*.52);c.fillText('💀',cx+w*.1,h*.66);
      // 青白い顔
      cRad(c,cx,h*.29,w*.13,'#c8b888','#847860');
      // フード
      c.fillStyle='#100818';c.beginPath();c.moveTo(cx-w*.18,h*.22);c.quadraticCurveTo(cx,h*.05,cx+w*.18,h*.22);c.quadraticCurveTo(cx+w*.16,h*.36,cx,h*.38);c.quadraticCurveTo(cx-w*.16,h*.36,cx-w*.18,h*.22);c.closePath();c.fill();
      // 光る緑の目
      c.fillStyle='#88ff44';c.beginPath();c.arc(cx-w*.06,h*.3,w*.028,0,Math.PI*2);c.fill();c.beginPath();c.arc(cx+w*.06,h*.3,w*.028,0,Math.PI*2);c.fill();
      var necEG=c.createRadialGradient(cx,h*.3,0,cx,h*.3,w*.12);necEG.addColorStop(0,'rgba(100,255,60,.3)');necEG.addColorStop(1,'transparent');
      c.fillStyle=necEG;c.beginPath();c.arc(cx,h*.3,w*.12,0,Math.PI*2);c.fill();
      // 髑髏の杖
      c.strokeStyle='#6a5030';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(cx-w*.3,h*.85);c.lineTo(cx-w*.32,h*.14);c.stroke();c.lineCap='butt';
      cRad(c,cx-w*.32,h*.1,w*.075,'#e8e8c0','#aaa890');
      c.fillStyle='#111';c.beginPath();c.arc(cx-w*.36,h*.12,w*.025,0,Math.PI*2);c.fill();c.beginPath();c.arc(cx-w*.28,h*.12,w*.025,0,Math.PI*2);c.fill();
      var naG=c.createRadialGradient(cx-w*.32,h*.1,0,cx-w*.32,h*.1,w*.14);naG.addColorStop(0,'rgba(100,255,60,.4)');naG.addColorStop(1,'transparent');
      c.fillStyle=naG;c.beginPath();c.arc(cx-w*.32,h*.1,w*.14,0,Math.PI*2);c.fill();
      c.strokeStyle='rgba(100,255,60,.35)';c.lineWidth=1.5;for(var wi3=0;wi3<3;wi3++){c.beginPath();c.moveTo(cx-w*.32,h*.16);c.quadraticCurveTo(cx-w*(.22+wi3*.08),h*(.3+wi3*.05),cx-w*(.18+wi3*.1),h*(.5+wi3*.05));c.stroke();}
      break;
    case 'assassin':
      // ぴったりした暗装束
      c.fillStyle='#111';c.beginPath();c.roundRect(cx-w*.16,h*.42,w*.32,h*.28,4);c.fill();
      c.fillStyle='#111';c.beginPath();c.roundRect(cx-w*.14,h*.7,w*.12,h*.2,4);c.fill();c.beginPath();c.roundRect(cx+w*.02,h*.7,w*.12,h*.2,4);c.fill();
      c.fillStyle='#1a1a1a';c.beginPath();c.roundRect(cx-w*.16,h*.87,w*.15,h*.07,3);c.fill();c.beginPath();c.roundRect(cx+w*.01,h*.87,w*.15,h*.07,3);c.fill();
      // 赤サッシュ
      c.fillStyle='#880000';c.fillRect(cx-w*.18,h*.54,w*.36,h*.05);
      // マスクされた頭
      cRad(c,cx,h*.28,w*.13,'#1a1a1a','#0a0a0a');c.fillStyle='#880000';c.beginPath();c.roundRect(cx-w*.12,h*.32,w*.24,h*.05,3);c.fill();
      c.fillStyle='rgba(255,80,80,.8)';c.beginPath();c.ellipse(cx-w*.06,h*.28,w*.025,w*.02,0,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(cx+w*.06,h*.28,w*.025,w*.02,0,0,Math.PI*2);c.fill();
      // 双刃（両手）
      c.fillStyle='#ccc';c.beginPath();c.moveTo(cx-w*.28,h*.45);c.lineTo(cx-w*.32,h*.45);c.lineTo(cx-w*.32,h*.67);c.lineTo(cx-w*.3,h*.67);c.lineTo(cx-w*.28,h*.57);c.lineTo(cx-w*.24,h*.46);c.closePath();c.fill();
      c.save();c.translate(cx+w*.3,h*.56);c.rotate(0.3);
      c.fillStyle='#ccc';c.beginPath();c.moveTo(-w*.03,w*.02);c.lineTo(w*.03,w*.02);c.lineTo(w*.01,-w*.13);c.lineTo(-w*.01,-w*.13);c.closePath();c.fill();c.restore();
      c.fillStyle='#555';c.beginPath();c.roundRect(cx-w*.3,h*.45,w*.06,h*.03,2);c.fill();
      // ベルトのナイフ
      c.fillStyle='#888';for(var ki=0;ki<3;ki++){c.beginPath();c.moveTo(cx-w*.04+ki*w*.04,h*.54);c.lineTo(cx-w*.02+ki*w*.04,h*.54);c.lineTo(cx-w*.03+ki*w*.04,h*.62);c.closePath();c.fill();}
      break;
    case 'arcanelord':
      // 豪華ローブ
      var arRg=c.createLinearGradient(cx-w*.24,h*.36,cx+w*.24,h*.92);arRg.addColorStop(0,cL(col,30));arRg.addColorStop(.5,col);arRg.addColorStop(1,cL(col,-20));
      c.fillStyle=arRg;c.beginPath();c.moveTo(cx-w*.24,h*.38);c.lineTo(cx+w*.24,h*.38);c.lineTo(cx+w*.3,h*.92);c.lineTo(cx-w*.3,h*.92);c.closePath();c.fill();c.strokeStyle=cL(col,-10);c.lineWidth=1.5;c.stroke();
      c.strokeStyle='#f0c840';c.lineWidth=2;c.beginPath();c.moveTo(cx-w*.24,h*.38);c.lineTo(cx-w*.3,h*.92);c.stroke();c.beginPath();c.moveTo(cx+w*.24,h*.38);c.lineTo(cx+w*.3,h*.92);c.stroke();c.beginPath();c.moveTo(cx-w*.24,h*.38);c.lineTo(cx+w*.24,h*.38);c.stroke();
      // ルーン文字
      c.fillStyle='rgba(255,220,80,.5)';c.font=Math.floor(w*.1)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';
      c.fillText('✦',cx,h*.52);c.fillText('⊕',cx-w*.12,h*.65);c.fillText('⊕',cx+w*.12,h*.65);
      // 顔
      cRad(c,cx,h*.29,w*.13,'#e0d0b0','#b0a080');
      drawFace(c,w,h,h*.29,w*.13,'#1a3060');
      // 王冠
      c.strokeStyle='#f0c840';c.lineWidth=4;c.beginPath();c.arc(cx,h*.22,w*.16,-Math.PI,0);c.stroke();
      c.fillStyle='#f0c840';for(var ci2=0;ci2<5;ci2++){var ca=Math.PI+ci2*Math.PI/4,cr2=w*.16;c.beginPath();c.moveTo(cx+Math.cos(ca)*cr2,h*.22+Math.sin(ca)*cr2*.6);c.lineTo(cx+Math.cos(ca)*(cr2+w*.05),h*.22+Math.sin(ca)*(cr2+w*.05)*.6);c.lineTo(cx+Math.cos(ca+0.22)*(cr2+w*.03),h*.22+Math.sin(ca+0.22)*(cr2+w*.03)*.6);c.closePath();c.fill();}
      // アルケインスタッフ
      c.strokeStyle=cL(col,-10);c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(cx+w*.28,h*.88);c.lineTo(cx+w*.32,h*.08);c.stroke();c.lineCap='butt';
      var acG=c.createRadialGradient(cx+w*.32,h*.04,0,cx+w*.32,h*.04,w*.14);acG.addColorStop(0,'#fff');acG.addColorStop(.3,elemCol);acG.addColorStop(.7,col);acG.addColorStop(1,'transparent');
      c.fillStyle=acG;c.beginPath();c.arc(cx+w*.32,h*.04,w*.14,0,Math.PI*2);c.fill();cRad(c,cx+w*.32,h*.04,w*.08,cL(elemCol,40),elemCol);
      // 浮遊オーブ×3
      [[cx-w*.38,h*.44],[cx+w*.46,h*.55],[cx-w*.36,h*.7]].forEach(function(orb){
        var og3=c.createRadialGradient(orb[0],orb[1],0,orb[0],orb[1],w*.055);og3.addColorStop(0,'#fff');og3.addColorStop(.4,elemCol);og3.addColorStop(1,'transparent');
        c.fillStyle=og3;c.beginPath();c.arc(orb[0],orb[1],w*.055,0,Math.PI*2);c.fill();
        c.strokeStyle=elemCol+'88';c.lineWidth=1;c.setLineDash([2,2]);c.beginPath();c.moveTo(cx+w*.28,h*.42);c.lineTo(orb[0],orb[1]);c.stroke();c.setLineDash([]);
      });
      break;
    case 'valkyrie':
      var lt5=cL(col,50),dk5=cL(col,-30);
      // 天使の翼
      c.fillStyle='rgba(255,255,255,.85)';
      c.beginPath();c.moveTo(cx,h*.42);c.quadraticCurveTo(cx-w*.5,h*.26,cx-w*.48,h*.66);c.lineTo(cx-w*.32,h*.58);c.quadraticCurveTo(cx-w*.2,h*.52,cx-w*.04,h*.48);c.closePath();c.fill();
      c.beginPath();c.moveTo(cx,h*.42);c.quadraticCurveTo(cx+w*.5,h*.26,cx+w*.48,h*.66);c.lineTo(cx+w*.32,h*.58);c.quadraticCurveTo(cx+w*.2,h*.52,cx+w*.04,h*.48);c.closePath();c.fill();
      c.strokeStyle='rgba(255,255,255,.9)';c.lineWidth=3;c.beginPath();c.moveTo(cx,h*.42);c.quadraticCurveTo(cx-w*.5,h*.26,cx-w*.48,h*.66);c.stroke();c.beginPath();c.moveTo(cx,h*.42);c.quadraticCurveTo(cx+w*.5,h*.26,cx+w*.48,h*.66);c.stroke();
      c.strokeStyle='rgba(200,220,255,.5)';c.lineWidth=1;for(var vfi=0;vfi<5;vfi++){c.beginPath();c.moveTo(cx-w*.04-vfi*w*.08,h*.48);c.lineTo(cx-w*.08-vfi*w*.09,h*.62);c.stroke();}
      // 鎧
      var vaG=c.createLinearGradient(cx-w*.22,h*.38,cx+w*.22,h*.68);vaG.addColorStop(0,'#e8e8f0');vaG.addColorStop(.4,col);vaG.addColorStop(1,dk5);
      c.fillStyle=vaG;c.beginPath();c.roundRect(cx-w*.22,h*.38,w*.44,h*.28,6);c.fill();c.strokeStyle='#f0c840';c.lineWidth=2;c.stroke();
      c.strokeStyle='rgba(255,220,80,.6)';c.lineWidth=1.5;c.beginPath();c.arc(cx,h*.52,w*.08,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(cx,h*.44);c.lineTo(cx,h*.6);c.stroke();c.beginPath();c.moveTo(cx-w*.08,h*.52);c.lineTo(cx+w*.08,h*.52);c.stroke();
      // ヘルメット（顔→下半分が見える）
      cRad(c,cx,h*.28,w*.14,lt5,col);
      drawFace(c,w,h,h*.28,w*.14,'#4a7080');
      var vhG=c.createRadialGradient(cx-w*.08,h*.18,0,cx,h*.26,w*.18);vhG.addColorStop(0,'#e8e8f0');vhG.addColorStop(.6,col);vhG.addColorStop(1,dk5);
      c.fillStyle=vhG;c.beginPath();c.arc(cx,h*.24,w*.18,-Math.PI,0);c.fill();c.strokeStyle='#f0c840';c.lineWidth=2;c.stroke();
      c.fillStyle='rgba(255,220,80,.9)';c.beginPath();c.roundRect(cx-w*.1,h*.24,w*.2,h*.03,3);c.fill();
      // 槍
      c.strokeStyle=col;c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(cx+w*.28,h*.88);c.lineTo(cx+w*.32,h*.06);c.stroke();c.lineCap='butt';
      c.fillStyle='#ddd';c.beginPath();c.moveTo(cx+w*.28,h*.08);c.lineTo(cx+w*.36,h*.08);c.lineTo(cx+w*.32,h*.02);c.closePath();c.fill();c.fillStyle='#f0c840';c.beginPath();c.roundRect(cx+w*.28,h*.12,w*.08,h*.04,2);c.fill();
      // 脚鎧
      c.fillStyle=col;c.beginPath();c.roundRect(cx-w*.2,h*.66,w*.17,h*.22,4);c.fill();c.strokeStyle='#f0c840';c.lineWidth=1.5;c.stroke();c.beginPath();c.roundRect(cx+w*.03,h*.66,w*.17,h*.22,4);c.fill();c.stroke();
      c.fillStyle=dk5;c.beginPath();c.roundRect(cx-w*.22,h*.85,w*.19,h*.08,3);c.fill();c.beginPath();c.roundRect(cx+w*.03,h*.85,w*.19,h*.08,3);c.fill();
      break;
    case 'dualblader':
      sprHumanoid(c,w,h,col);
      // 左剣（左上斜め）
      c.strokeStyle='#ddd';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(cx-w*.24,h*.56);c.lineTo(cx-w*.44,h*.18);c.stroke();
      c.strokeStyle='rgba(200,220,255,.45)';c.lineWidth=7;c.beginPath();c.moveTo(cx-w*.24,h*.56);c.lineTo(cx-w*.44,h*.18);c.stroke();
      c.strokeStyle='#888';c.lineWidth=7;c.lineCap='butt';c.beginPath();c.moveTo(cx-w*.3,h*.49);c.lineTo(cx-w*.18,h*.49);c.stroke();
      // 右剣（右上斜め）
      c.strokeStyle='#ddd';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(cx+w*.24,h*.56);c.lineTo(cx+w*.44,h*.18);c.stroke();
      c.strokeStyle='rgba(200,220,255,.45)';c.lineWidth=7;c.beginPath();c.moveTo(cx+w*.24,h*.56);c.lineTo(cx+w*.44,h*.18);c.stroke();
      c.strokeStyle='#888';c.lineWidth=7;c.lineCap='butt';c.beginPath();c.moveTo(cx+w*.18,h*.49);c.lineTo(cx+w*.3,h*.49);c.stroke();
      // 剣のグロー
      c.strokeStyle='rgba(180,200,255,.35)';c.lineWidth=2;c.lineCap='round';c.beginPath();c.moveTo(cx-w*.24,h*.56);c.lineTo(cx-w*.44,h*.18);c.stroke();c.beginPath();c.moveTo(cx+w*.24,h*.56);c.lineTo(cx+w*.44,h*.18);c.stroke();c.lineCap='butt';
      // 残像エフェクト
      c.fillStyle=col+'44';c.beginPath();c.moveTo(cx,h*.42);c.quadraticCurveTo(cx-w*.38,h*.5,cx-w*.34,h*.7);c.quadraticCurveTo(cx-w*.18,h*.72,cx,h*.6);c.closePath();c.fill();
      c.strokeStyle=col+'33';c.lineWidth=1.5;c.setLineDash([3,2]);c.beginPath();c.ellipse(cx,h*.92,w*.3,h*.04,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
      break;
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
  // 索敵マップを更新（FoWがONの時のみ）
  if(typeof updateVisMap==='function')updateVisMap();
  // 地形
  for(var r=0;r<ROWS;r++){
    for(var cl=0;cl<COLS;cl++){
      var x=cl*TW,y=r*TH,tid=(MAP&&MAP[r])?MAP[r][cl]||0:0,tdef=TDEFS[tid]||TDEFS[0],own=GS&&GS.own[r]?GS.own[r][cl]:-1;
      // 地形ベース色
      c.fillStyle=tdef.col;c.fillRect(x,y,TW,TH);
      // ★所有者カラー表示（明確・見やすく）
      if(own>=0){
        var pc=PCOLS[own]||PCOLS[0]; // 防御: 未定義時はP1色フォールバック
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
  // v10.1: フィールド魔法エフェクト
  if(typeof drawMapFx==='function')drawMapFx(c);
  // ★ 索敵 (Fog of War) オーバーレイ
  if(useFoW&&_visMap){
    for(var fr=0;fr<ROWS;fr++){
      for(var fc=0;fc<COLS;fc++){
        if(!_visMap[fr][fc]){
          // 霧: 濃い暗闇
          c.fillStyle='rgba(0,0,0,0.74)';
          c.fillRect(fc*TW,fr*TH,TW,TH);
          // 霧の質感（微細なノイズ風）
          c.fillStyle='rgba(10,15,30,0.15)';
          c.fillRect(fc*TW+(fr%3)*3,fr*TH+(fc%3)*3,TW*.5,TH*.5);
        }
      }
    }
    // 視界境界のソフトエッジ（隣接する霧との境界をぼかす）
    for(var fr=0;fr<ROWS;fr++){
      for(var fc=0;fc<COLS;fc++){
        if(_visMap[fr][fc]){
          // 可視セルの隣に霧があれば境界グラデ
          var dirs2=[[0,1],[0,-1],[1,0],[-1,0]];
          dirs2.forEach(function(d){
            var nr=fr+d[0],nc=fc+d[1];
            if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!_visMap[nr][nc]){
              var ex=fc*TW,ey=fr*TH;
              var gx=d[1]<0?ex:d[1]>0?ex+TW:ex,gy=d[0]<0?ey:d[0]>0?ey+TH:ey;
              var ex2=d[1]<0?ex+TW*.35:d[1]>0?ex+TW*.65:ex+TW,ey2=d[0]<0?ey+TH*.35:d[0]>0?ey+TH*.65:ey+TH;
              var fog=c.createLinearGradient(gx,gy,ex2,ey2);
              fog.addColorStop(0,'rgba(0,0,0,.72)');fog.addColorStop(1,'rgba(0,0,0,0)');
              c.fillStyle=fog;c.fillRect(ex,ey,TW,TH);
            }
          });
        }
      }
    }
  }
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
  // ★ 索敵 FoW: 霧の中の敵ユニットは描画しない
  if(typeof isCellHiddenByFoW==='function'&&isCellHiddenByFoW(u))return;
  // v10.1: 忍者ステルス — 隠れている敵忍者は描画しない
  if(typeof isUnitHidden==='function'&&isUnitHidden(u))return;
  var x=u.col*TW,y=u.row*TH,pc=PCOLS[u.owner];
  // 行動済み = 攻撃済み / 移動済み = 移動したが未攻撃
  var isDone=!!u.attacked;
  var isMoved=!!(u.moved&&!u.attacked);
  var isSel=selUnit&&selUnit.id===u.id;
  var ux=x+TW/2,uy=y+TH/2,r2=TW*.38;
  var meIdx=(typeof onlineMode!=='undefined'&&onlineMode)?myPeerIdx:GS.turn;
  var isOwn=(u.owner===meIdx);
  var isMovable=isOwn&&!isDone&&!isMoved&&isMyTurn;
  var scale=Math.min(1.0+((u.level||1)-1)*.015,1.25);
  var rad=r2*scale;

  // ── グロー（自軍・未行動は鮮やか、移動済みは控えめ）──
  if(isOwn&&!isDone){
    var glowR=rad+5+Math.sin(t*.18)*1.5;
    var glowAlpha=isMoved?'55':'bb';
    var glow=c.createRadialGradient(ux,uy,rad*.6,ux,uy,glowR+5);
    glow.addColorStop(0,pc.light+glowAlpha);glow.addColorStop(1,pc.light+'00');
    c.fillStyle=glow;c.beginPath();c.arc(ux,uy,glowR+5,0,Math.PI*2);c.fill();
  }
  // ── 動かせるユニット: 緑の点滅リング ──
  if(isMovable){
    var pulse=0.55+0.45*Math.sin(t*.18);
    c.strokeStyle='rgba(80,255,120,'+pulse+')';c.lineWidth=2.5;
    c.beginPath();c.arc(ux,uy,rad+4,0,Math.PI*2);c.stroke();
  }

  // ════ 円背景 ════
  // ★ 未行動: プレイヤーカラーを鮮やかに（light→main グラデ）
  // ★ 行動済み: グレーアウト（プレイヤー色をごく薄く残す）
  var ug=c.createRadialGradient(ux-rad*.28,uy-rad*.28,rad*.05,ux,uy,rad);
  if(!isDone&&!isMoved){
    ug.addColorStop(0,pc.light);       // 中心: 明るいプレイヤー色
    ug.addColorStop(0.55,pc.main);     // 中間: メインカラー
    ug.addColorStop(1,pc.dark+'ee');   // 外縁: 暗い縁
  } else if(isMoved){
    ug.addColorStop(0,pc.light+'bb');  // 移動済み: やや落ち着いた色合い
    ug.addColorStop(0.55,pc.main+'99');
    ug.addColorStop(1,pc.dark+'cc');
  } else {
    ug.addColorStop(0,'rgba(68,70,78,.97)');   // 行動済み: ダークグレー
    ug.addColorStop(0.6,'rgba(42,44,52,.97)');
    ug.addColorStop(1,'rgba(26,28,34,.97)');
  }
  c.fillStyle=ug;c.beginPath();c.arc(ux,uy,rad,0,Math.PI*2);c.fill();

  // 行動済み: プレイヤー色をうっすら残して所属を示す
  if(isDone){
    c.fillStyle=pc.main+'3a';
    c.beginPath();c.arc(ux,uy,rad,0,Math.PI*2);c.fill();
  }

  // ── 外枠 ──
  var frameCol=isSel?'#ffee44':(u.type==='king'?'#f0c840':isDone?(pc.main+'77'):isMoved?'#ffcc44':(isOwn?pc.light:'#ff6666'));
  var frameWid=isSel?3.5:(isOwn?(isDone?1.5:isMoved?2.0:2.5):1.8);
  c.strokeStyle=frameCol;c.lineWidth=frameWid;
  c.beginPath();c.arc(ux,uy,rad,0,Math.PI*2);c.stroke();

  // 敵ユニット: 外側に赤い破線（未行動のみ）
  if(!isOwn&&!isDone){
    c.strokeStyle='rgba(255,80,80,.75)';c.lineWidth=1.2;c.setLineDash([3,2]);
    c.beginPath();c.arc(ux,uy,rad+2.5,0,Math.PI*2);c.stroke();c.setLineDash([]);
  }
  // 王様はダブル枠
  if(u.type==='king'){
    c.strokeStyle=isDone?(pc.light+'44'):(pc.light+'cc');
    c.lineWidth=1.5;c.beginPath();c.arc(ux,uy,rad+3.5,0,Math.PI*2);c.stroke();
  }

  // ── ユニット記号 ──
  // ★ 未行動: 白文字（黒縁付き・視認性MAX）
  // ★ 行動済み: くすんだグレー文字
  var sym=UDEFS[u.type]?UDEFS[u.type].sym:'?';
  c.font='bold '+Math.floor(TW*.3)+'px sans-serif';
  c.textAlign='center';c.textBaseline='middle';
  if(!isDone&&!isMoved){
    c.strokeStyle='rgba(0,0,0,.6)';c.lineWidth=3;c.strokeText(sym,ux,uy);
    c.fillStyle='#ffffff';c.fillText(sym,ux,uy);
  } else if(isMoved){
    c.strokeStyle='rgba(0,0,0,.4)';c.lineWidth=2;c.strokeText(sym,ux,uy);
    c.fillStyle='rgba(210,225,255,.85)';c.fillText(sym,ux,uy);
  } else {
    c.fillStyle='rgba(130,132,140,.72)';c.fillText(sym,ux,uy);
  }

  // ── 行動済みバッジ ──
  // タイル下部に横帯で「済」を明確に表示（漢字が読める十分なサイズ）
  if(isDone){
    var badgeH=Math.floor(TH*.26);             // 帯の高さ（例:TH=52→13px）
    var badgeY=y+TH-badgeH;
    // 帯の背景
    c.fillStyle='rgba(18,20,28,.88)';
    c.fillRect(x,badgeY,TW,badgeH);
    // プレイヤーカラーの左縁ライン（どの軍か一目でわかる）
    c.fillStyle=pc.main;
    c.fillRect(x,badgeY,3,badgeH);
    // 右縁ライン
    c.fillStyle=pc.main+'55';
    c.fillRect(x+TW-1,badgeY,1,badgeH);
    // 上縁ライン
    c.strokeStyle=pc.main+'55';c.lineWidth=1;
    c.beginPath();c.moveTo(x,badgeY);c.lineTo(x+TW,badgeY);c.stroke();
    // 「済」テキスト
    var doneFont=Math.max(10,Math.floor(badgeH*.78));
    c.font='bold '+doneFont+'px sans-serif';
    c.textAlign='center';c.textBaseline='middle';
    // 自軍: プレイヤーカラー寄りのグレー　敵軍: 赤寄りのグレー
    c.fillStyle=isOwn?'rgba(180,200,220,.95)':'rgba(220,180,180,.9)';
    c.fillText('済',x+TW*.54,badgeY+badgeH*.5);
    // ✓チェックを左に
    c.fillStyle=isOwn?'rgba(100,200,120,.9)':'rgba(200,100,100,.75)';
    c.font='bold '+(doneFont-1)+'px sans-serif';
    c.textAlign='left';
    c.fillText('✓',x+5,badgeY+badgeH*.5);
  } else if(isMoved&&isOwn){
    // ── 移動済みバッジ（攻撃はまだ可能）──
    var badgeH=Math.floor(TH*.26);
    var badgeY=y+TH-badgeH;
    // 帯の背景
    c.fillStyle='rgba(18,22,40,.82)';
    c.fillRect(x,badgeY,TW,badgeH);
    // 左縁: 琥珀色ライン（移動済みを示す）
    c.fillStyle='#ffcc44';
    c.fillRect(x,badgeY,3,badgeH);
    // 右縁・上縁
    c.strokeStyle='rgba(255,200,60,.35)';c.lineWidth=1;
    c.beginPath();c.moveTo(x,badgeY);c.lineTo(x+TW,badgeY);c.stroke();
    // 「移」テキスト
    var doneFont=Math.max(10,Math.floor(badgeH*.78));
    c.font='bold '+doneFont+'px sans-serif';
    c.textAlign='center';c.textBaseline='middle';
    c.fillStyle='rgba(255,215,80,.95)';
    c.fillText('移',x+TW*.54,badgeY+badgeH*.5);
    // 「→」アイコンを左に
    c.fillStyle='rgba(255,180,40,.85)';
    c.font='bold '+(doneFont-1)+'px sans-serif';
    c.textAlign='left';
    c.fillText('→',x+5,badgeY+badgeH*.5);
  }

  // ── レベル表示（2以上）──
  if((u.level||1)>1){
    c.fillStyle=(u.level||1)>=5?'#ff8844':(u.level||1)>=3?'#ffdd44':'#aaffaa';
    c.font='bold '+Math.floor(TW*.2)+'px sans-serif';c.textAlign='left';c.textBaseline='top';
    c.fillText('★'+(u.level||1),x+2,y+2);
  }
  // ── 属性アイコン（右下 / 行動済み時は「済」帯の上に移動）──
  var ei=ELEM_INFO[UDEFS[u.type]?UDEFS[u.type].elem:'none']||ELEM_INFO.none;
  c.globalAlpha=(isDone||isMoved)?0.65:1;
  var eiOffset=(isDone||isMoved)?Math.floor(TH*.26)+2:2;  // バッジ帯の上に逃がす
  c.font=Math.floor(TW*.18)+'px sans-serif';c.textAlign='right';c.textBaseline='bottom';
  c.fillText(ei.name.split(' ')[0],x+TW-2,y+TH-eiOffset);
  c.globalAlpha=1;
  // ── HPバー ──（行動済み時は「済」帯の上）
  var hpBh=5,hpBOffset=(isDone||isMoved)?Math.floor(TH*.26)+3:8;
  var hpPct=Math.max(0,u.hp/u.mhp),bw=TW-6,bh=hpBh,bx=x+3,by=y+TH-hpBOffset;
  c.fillStyle='rgba(0,0,0,.65)';c.fillRect(bx,by,bw,bh);
  var hpCol=hpPct>0.5?'#27ae60':hpPct>0.25?'#f0c840':'#e74c3c';
  if(isDone)hpCol='rgba(95,98,108,.85)';
  c.fillStyle=hpCol;c.fillRect(bx,by,Math.round(bw*hpPct),bh);
  // ── 分隊ドット（HPバーの直上に表示）──
  // 個体数を ◆ / ◇ で表現（生存=色付き / 損失=暗色）
  if(u.squadSize&&u.squadSize>0){
    var sqSize=u.squadSize, sqAlive=(u.squadAlive==null?sqSize:u.squadAlive);
    var dotR=Math.max(2,Math.floor(TW*.045));
    var dotGap=Math.max(1,Math.floor(TW*.025));
    var totalW=sqSize*(dotR*2)+(sqSize-1)*dotGap;
    var startX=x+(TW-totalW)/2+dotR;
    var dotY=by-dotR-2;
    for(var di=0;di<sqSize;di++){
      var alive=di<sqAlive;
      c.beginPath();c.arc(startX+di*(dotR*2+dotGap),dotY,dotR,0,Math.PI*2);
      if(alive){
        // 生存個体: HPに連動した色
        c.fillStyle=isDone?'rgba(150,150,160,.85)':hpCol;
      } else {
        // 損失個体: 暗赤色
        c.fillStyle='rgba(50,12,12,.85)';
      }
      c.fill();
      // 縁
      c.strokeStyle=alive?'rgba(255,255,255,.6)':'rgba(120,40,40,.6)';
      c.lineWidth=0.6;c.stroke();
    }
  }
  // ── 状態アイコン ──
  if(u.status&&u.status.length){
    var sic={'cursed':'💀','poisoned':'🟢','weakened':'⬇','enfeebled':'🔻'};
    u.status.forEach(function(s,si){c.font='8px sans-serif';c.textAlign='left';c.fillText(sic[s]||'?',x+2+si*10,y+TH-16);});
  }
  // ── v10.1: ステータス増減バッジ ──
  if(typeof statDelta==='function'){
    var sd=statDelta(u),badges=[];
    if(sd.atk)badges.push({ic:'⚔',v:sd.atk});
    if(sd.pdef)badges.push({ic:'🛡',v:sd.pdef});
    if(sd.mdef)badges.push({ic:'✨',v:sd.mdef});
    if(sd.mov)badges.push({ic:'👣',v:sd.mov});
    badges.forEach(function(b,bi){
      var by3=y+2+bi*11,up=b.v>0;
      var txt=b.ic+(up?'▲':'▼')+Math.abs(b.v);
      c.font='bold 9px sans-serif';c.textAlign='right';c.textBaseline='top';
      var tw2=c.measureText(txt).width;
      c.fillStyle='rgba(0,0,0,.72)';c.fillRect(x+TW-tw2-4,by3,tw2+4,11);
      c.fillStyle=up?'#7dffa8':'#ff7a7a';c.fillText(txt,x+TW-2,by3+1);
    });
  }
  // ── 選択パルス ──
  if(isSel){
    var pulse2=Math.sin(t*.25)*.3;
    c.strokeStyle='rgba(255,220,80,'+(0.55+pulse2)+')';c.lineWidth=1.8;
    c.setLineDash([3,3]);c.strokeRect(x+2,y+2,TW-4,TH-4);c.setLineDash([]);
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
    if(typeof isCellHiddenByFoW==='function'&&isCellHiddenByFoW(u))return;
    if(typeof isUnitHidden==='function'&&isUnitHidden(u))return;
    c.fillStyle=u.type==='king'?'#f0c840':PCOLS[u.owner].light;
    c.fillRect(u.col*tw+.5,u.row*th+.5,tw-1,th-1);
  });
  // ミニマップの霧オーバーレイ
  if(useFoW&&_visMap){
    for(var mr=0;mr<ROWS;mr++)for(var mc=0;mc<COLS;mc++){
      if(!_visMap[mr][mc]){c.fillStyle='rgba(0,0,0,.78)';c.fillRect(mc*tw,mr*th,tw,th);}
    }
  }
  var ma=document.getElementById('gameMapArea');
  var vx=ma.scrollLeft/TW*tw,vy=ma.scrollTop/TH*th,vw=ma.clientWidth/TW*tw,vh=ma.clientHeight/TH*th;
  c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=1;c.strokeRect(vx,vy,Math.min(vw,mw-vx),Math.min(vh,mh-vy));
}
/* ===== マップ演出（フィールド魔法エフェクト v10.1）===== */
var mapFxList=[],_mapFxRaf=null;
function spawnMapFx(fx){
  fx.start=Date.now();fx.dur=fx.dur||1000;mapFxList.push(fx);
  if(!_mapFxRaf)_mapFxLoop();
}
function _mapFxLoop(){
  mapFxList=mapFxList.filter(function(f){return Date.now()-f.start<f.dur;});
  if(typeof render==='function')render();
  if(mapFxList.length>0)_mapFxRaf=requestAnimationFrame(_mapFxLoop);
  else{_mapFxRaf=null;if(typeof render==='function')render();}
}
function drawMapFx(c){
  if(!mapFxList.length)return;
  var now=Date.now();
  mapFxList.forEach(function(f){
    var p=(now-f.start)/f.dur;if(p<0)p=0;if(p>1)p=1;
    if(f.kind==='linefire')_fxLineFire(c,f,p);
    else if(f.kind==='ice')_fxIce(c,f,p);
    else if(f.kind==='curse')_fxCurse(c,f,p);
    else if(f.kind==='guard')_fxGuard(c,f,p);
  });
}
function _fxLineFire(c,f,p){
  (f.cells||[]).forEach(function(cell,i){
    var local=Math.min(1,Math.max(0,p*1.7-i*.2));if(local<=0)return;
    var fade=1-Math.max(0,(p-.6)/.4);
    var cx=cell.c*TW+TW/2,cy=cell.r*TH+TH/2;
    var r=TW*(.58+.22*Math.sin(Date.now()*.022+i));
    var g=c.createRadialGradient(cx,cy-p*TH*.15,0,cx,cy,r);
    g.addColorStop(0,'rgba(255,255,210,'+(.95*local*fade)+')');
    g.addColorStop(.38,'rgba(255,150,30,'+(.85*local*fade)+')');
    g.addColorStop(.72,'rgba(225,45,10,'+(.5*local*fade)+')');
    g.addColorStop(1,'rgba(120,10,0,0)');
    c.fillStyle=g;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();
    for(var k=0;k<4;k++){
      var a=Math.random()*Math.PI*2,rr=Math.random()*TW*.55;
      c.fillStyle='rgba(255,'+(170+(Math.random()*70|0))+',50,'+(local*fade*.85)+')';
      c.beginPath();c.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr-p*TH*.45,Math.random()*3+1,0,Math.PI*2);c.fill();
    }
  });
}
function _fxIce(c,f,p){
  var fx0=f.from.c*TW+TW/2,fy0=f.from.r*TH+TH/2;
  var tx=f.to.c*TW+TW/2,ty=f.to.r*TH+TH/2;
  if(p<.55){
    var t=p/.55;
    var mx=fx0+(tx-fx0)*t,my=fy0+(ty-fy0)*t-Math.sin(t*Math.PI)*TH*1.3;
    for(var k=6;k>=0;k--){
      var tt=Math.max(0,t-k*.06);
      var px=fx0+(tx-fx0)*tt,py=fy0+(ty-fy0)*tt-Math.sin(tt*Math.PI)*TH*1.3;
      c.fillStyle='rgba(160,225,255,'+(.5-k*.06)+')';
      c.beginPath();c.arc(px,py,Math.max(1,TW*.2-k*1.5),0,Math.PI*2);c.fill();
    }
    var g=c.createRadialGradient(mx,my,0,mx,my,TW*.42);
    g.addColorStop(0,'#fff');g.addColorStop(.5,'#9fe0ff');g.addColorStop(1,'rgba(80,160,255,0)');
    c.fillStyle=g;c.beginPath();c.arc(mx,my,TW*.42,0,Math.PI*2);c.fill();
  }else{
    var ip=(p-.55)/.45,fade=1-ip,r=TW*(.3+ip*1.15);
    c.strokeStyle='rgba(190,240,255,'+fade+')';c.lineWidth=Math.max(.5,5*fade);
    c.beginPath();c.arc(tx,ty,r,0,Math.PI*2);c.stroke();
    for(var k2=0;k2<10;k2++){
      var a2=k2/10*Math.PI*2,sr=TW*.6*ip;
      c.strokeStyle='rgba(225,248,255,'+fade+')';c.lineWidth=Math.max(.5,3.5*fade);
      c.beginPath();c.moveTo(tx,ty);c.lineTo(tx+Math.cos(a2)*sr,ty+Math.sin(a2)*sr);c.stroke();
    }
    var g2=c.createRadialGradient(tx,ty,0,tx,ty,r);
    g2.addColorStop(0,'rgba(255,255,255,'+(fade*.75)+')');g2.addColorStop(1,'rgba(120,200,255,0)');
    c.fillStyle=g2;c.beginPath();c.arc(tx,ty,r,0,Math.PI*2);c.fill();
  }
}
function _fxCurse(c,f,p){
  var fade=p<.2?p/.2:(1-Math.max(0,(p-.62)/.38));
  (f.cells||[]).forEach(function(cell){
    var cx=cell.c*TW+TW/2,cy=cell.r*TH+TH/2;
    var g=c.createRadialGradient(cx,cy,0,cx,cy,TW*.72);
    g.addColorStop(0,'rgba(150,45,195,'+(fade*.62)+')');
    g.addColorStop(.6,'rgba(85,12,130,'+(fade*.42)+')');
    g.addColorStop(1,'rgba(40,0,65,0)');
    c.fillStyle=g;c.beginPath();c.arc(cx,cy,TW*.72,0,Math.PI*2);c.fill();
    for(var k=0;k<6;k++){
      var ang=Date.now()*.006+k*1.05,rad=TW*.38*(1-p*.45);
      var px=cx+Math.cos(ang)*rad,py=cy+Math.sin(ang)*rad-p*TH*.45;
      c.fillStyle='rgba('+(185+(Math.random()*40|0))+',65,225,'+fade+')';
      c.beginPath();c.arc(px,py,3.5,0,Math.PI*2);c.fill();
    }
    c.save();c.globalAlpha=fade;c.font=Math.floor(TW*.5)+'px sans-serif';
    c.textAlign='center';c.textBaseline='middle';
    c.fillText('💀',cx,cy-p*TH*.55);c.restore();
  });
}
function _fxGuard(c,f,p){
  var fade=p<.2?p/.2:(1-Math.max(0,(p-.62)/.38));
  (f.cells||[]).forEach(function(cell){
    var cx=cell.c*TW+TW/2,cy=cell.r*TH+TH/2,r=TW*(.32+p*.42);
    var g=c.createRadialGradient(cx,cy,0,cx,cy,r);
    g.addColorStop(0,'rgba(255,242,185,'+(fade*.55)+')');
    g.addColorStop(.7,'rgba(255,212,95,'+(fade*.38)+')');
    g.addColorStop(1,'rgba(255,200,80,0)');
    c.fillStyle=g;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();
    c.strokeStyle='rgba(255,232,150,'+fade+')';c.lineWidth=3;
    c.beginPath();c.arc(cx,cy,r*.82,0,Math.PI*2);c.stroke();
    for(var k=0;k<4;k++){
      var px=cx+(Math.random()-.5)*TW*.66,py=cy+TH*.4-p*TH*.95-k*5;
      c.fillStyle='rgba(255,242,175,'+fade+')';
      c.beginPath();c.arc(px,py,2.5,0,Math.PI*2);c.fill();
    }
    c.save();c.globalAlpha=fade;c.font=Math.floor(TW*.45)+'px sans-serif';
    c.textAlign='center';c.textBaseline='middle';
    c.fillText('🛡',cx,cy-p*TH*.42);c.restore();
  });
}
/* ===== バトル演出 ===== */