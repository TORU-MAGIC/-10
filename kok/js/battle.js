// ================================================================
//  キングオブキングス v10.0 - 戦闘演出（showBattle / endBattle）
// ================================================================
'use strict';

/* ===== 戦闘状態変数 ===== */
var battleCb=null,battleSkip=false;
var _RANGED=['archer','catapult','necromancer','mage','witch','arcanelord','phoenix','healer','monk'];

/* ===== HPバー スムーズドレイン ===== */
function animateHPBar(barId,txtId,fromPct,toPct,fromHp,toHp,maxHp,dur){
  var bar=document.getElementById(barId),txt=document.getElementById(txtId);
  if(!bar)return;
  dur=dur||700;fromPct=Math.max(0,fromPct);toPct=Math.max(0,toPct);
  bar.style.transition='none';
  // hp-lost 残像（失われたHPを黄→赤でフェード表示）
  var bg=bar.parentElement,lostEl=bg.querySelector('.hp-lost');
  if(!lostEl){lostEl=document.createElement('div');lostEl.className='hp-lost';bg.appendChild(lostEl);}
  lostEl.style.left=toPct+'%';
  lostEl.style.width=Math.max(0,fromPct-toPct)+'%';
  lostEl.style.opacity='.85';
  setTimeout(function(){if(lostEl)lostEl.style.opacity='0';},dur+380);
  // RAFアニメーション（ease-out cubic）
  var t0=null;
  function frame(ts){
    if(!t0)t0=ts;
    var prog=Math.min(1,(ts-t0)/dur),ease=1-Math.pow(1-prog,3);
    var cur=fromPct+(toPct-fromPct)*ease;
    bar.style.width=Math.max(0,cur)+'%';
    if(txt)txt.textContent=Math.round(fromHp+(toHp-fromHp)*ease)+'/'+maxHp;
    if(prog<1)requestAnimationFrame(frame);
    else{bar.style.width=Math.max(0,toPct)+'%';if(txt)txt.textContent=toHp+'/'+maxHp;bar.style.transition='';}
  }
  requestAnimationFrame(frame);
}

/* ===== バトル演出 ===== */
function showBattle(res,cb){
  if(!res){if(cb)cb();return;}
  var isCpuBattle=GS&&!isHuman(res.atkOwner)&&!isHuman(res.defOwner);
  // オンライン: 自分が関与しないCPU戦は skip（帯域節約）
  if(onlineMode){var iAmInv=(res.atkOwner===myPeerIdx||res.defOwner===myPeerIdx);if(!iAmInv&&isCpuBattle&&battleSpeedMode==='skip'){if(cb)cb();return;}}
  if(battleSpeedMode==='skip'&&isCpuBattle){if(cb)cb();return;}
  battleCb=cb;battleSkip=false;

  var bs=document.getElementById('battleScreen');bs.classList.add('active');
  startBBGLoop(res.tid||0);startPLoop();
  applyBattleView(res);

  /* --- UI セットアップ --- */
  var al=getAffLabel(res.atkType,res.defType);
  var ei1=ELEM_INFO[res.atkElem||'none']||ELEM_INFO.none;
  var ei2=ELEM_INFO[res.defElem||'none']||ELEM_INFO.none;
  var affTxt=al.text;
  if(res.elemMult>=1.4)affTxt+=' '+ei1.name.split(' ')[0]+'→'+ei2.name.split(' ')[0]+'✨';
  else if(res.elemMult<=0.75)affTxt+=' '+ei1.name.split(' ')[0]+'→'+ei2.name.split(' ')[0]+'🛡';
  document.getElementById('bAffinityTxt').textContent=affTxt;
  document.getElementById('bAffinityTxt').style.color=al.col;
  document.getElementById('bRoundLbl').textContent='ROUND '+(GS?GS.round:1);

  var lac=PCOLS[res.atkOwner];
  document.getElementById('bLName').textContent=lac.name+' '+UDEFS[res.atkType].name;
  document.getElementById('bLName').style.color=lac.light;
  var lBarEl=document.getElementById('bLBar');
  lBarEl.style.transition='none';
  lBarEl.style.width=(res.atkHpBef/res.atkMhp*100)+'%';
  lBarEl.style.background='linear-gradient(90deg,'+lac.dark+','+lac.main+','+lac.light+')';
  document.getElementById('bLTxt').textContent=res.atkHpBef+'/'+res.atkMhp;
  var atkTypeSt=(UDEFS[res.atkType]&&UDEFS[res.atkType].atkType==='magic')?' ✨魔法':' ⚔物理';
  document.getElementById('bLStatus').textContent=ei1.name+atkTypeSt+(res.atkStatus&&res.atkStatus.length?' 状態:'+res.atkStatus.join(','):'');
  drawSprite(document.getElementById('bLCvs'),res.atkType,lac.main,false);

  var rac=PCOLS[res.defOwner];
  document.getElementById('bRName').textContent=rac.name+' '+UDEFS[res.defType].name;
  document.getElementById('bRName').style.color=rac.light;
  var rBarEl=document.getElementById('bRBar');
  rBarEl.style.transition='none';
  rBarEl.style.width=(res.defHpBef/res.defMhp*100)+'%';
  rBarEl.style.background='linear-gradient(90deg,'+rac.dark+','+rac.main+','+rac.light+')';
  document.getElementById('bRTxt').textContent=res.defHpBef+'/'+res.defMhp;
  document.getElementById('bRStatus').textContent=ei2.name+(res.defStatus&&res.defStatus.length?' ['+res.defStatus.join(',')+']':'');
  drawSprite(document.getElementById('bRCvs'),res.defType,rac.main,true);
  document.getElementById('bLog').textContent='';

  // アイドルボブ（スプライトが静止せず軽く上下する）
  var lCvs=document.getElementById('bLCvs'),rCvs=document.getElementById('bRCvs');
  if(lCvs){lCvs.classList.remove('b-idle-bob');void lCvs.offsetWidth;lCvs.classList.add('b-idle-bob');}
  if(rCvs){rCvs.classList.remove('b-idle-bob');void rCvs.offsetWidth;rCvs.classList.add('b-idle-bob');}

  SFX.sfxFor(res.atkType);

  var lw=document.getElementById('bLWrap'),rw=document.getElementById('bRWrap');
  function getC(el){var r=el.getBoundingClientRect();return{x:r.left+r.width*.5,y:r.top+r.height*.55};}

  /* タイミング（T=速度係数。isFastBattle で 0.38 に短縮） */
  var isFastBattle=arguments[2]||false;
  var T=isFastBattle?.38:1;
  var tVS     =Math.round(  10*T);
  var tCharge =Math.round( 165*T);
  var tProj   =Math.round( 310*T);
  var tImpact =Math.round( 530*T);
  var projDur =tImpact-tProj;
  var tClear  =tImpact+Math.round(620*T);
  var tCounter=Math.round(1170*T);
  var cProjDur=Math.round( 195*T);
  var tResult =Math.round(1900*T);
  var tEnd    =Math.round(2560*T);

  /* VS イントロスライドイン */
  setTimeout(applyVsIntro,tVS);

  /* ===== Step 0: 攻撃フェーズ ===== */

  // チャージ（攻撃者が踏み込む）
  setTimeout(function(){
    if(battleSkip)return;
    lw.classList.remove('do-charge-l');void lw.offsetWidth;lw.classList.add('do-charge-l');
  },tCharge);

  // プロジェクタイル or 斬撃軌跡
  setTimeout(function(){
    if(battleSkip)return;
    var lc=getC(lw),rc=getC(rw);
    if(_RANGED.indexOf(res.atkType)>=0){spawnProjectileArc(lc.x,lc.y,rc.x,rc.y,ei1.col,10,projDur);}
    else{spawnMeleeSlash(lc.x,lc.y,rc.x,rc.y,lac.main);}
  },tProj);

  // インパクト（属性バースト・衝撃波・リコイル・HPドレイン）
  setTimeout(function(){
    if(battleSkip)return;
    var rc=getC(rw);
    rw.classList.remove('do-recoil-r');void rw.offsetWidth;rw.classList.add('do-recoil-r');
    rw.classList.remove('do-flash');void rw.offsetWidth;rw.classList.add('do-flash');
    applyScreenShake(res.isCrit);
    applyElementFlash(res.atkElem);
    spawnElementBurst(rc.x,rc.y,res.atkElem,res.isCrit);
    spawnShockwave(rc.x,rc.y,ei1.col,res.isCrit?95:65);
    if(res.isCrit){SFX.crit();applyCritZoom('R');}
    var dt=res.isCrit?'💥'+res.dmg:(res.elemMult>=1.4?'⚡'+res.dmg:'-'+res.dmg);
    var dc=res.isCrit?'#ffee22':(res.affMult>=3?'#f0c840':lac.light);
    showDmg('bRDmg',dt,dc);
    maybeBigDamage('bRDmg',res);
    animateHPBar('bRBar','bRTxt',
      res.defHpBef/res.defMhp*100,res.defHpAft/res.defMhp*100,
      res.defHpBef,res.defHpAft,res.defMhp,Math.round(680*T));
    var msg='';
    if(res.isDual)msg+='⚔⚔2回攻撃！ ';
    if(res.isCrit)msg+='💥会心！ ';
    if(res.affMult>=4)msg+='★特効×'+res.affMult+'!! ';
    else if(res.affMult>=3)msg+='⚡有利×3！ ';
    else if(res.affMult<=0.4)msg+='🛡不利… ';
    if(res.elemMult>=1.4)msg+='🔥属性有効！ ';
    msg+=UDEFS[res.atkType].name+'の攻撃 -'+res.dmg+'ダメージ';
    if(res.dkill)msg+=' 【撃破！】';if(res.phxRev)msg+=' 🔥復活！';
    document.getElementById('bLog').textContent=msg;
  },tImpact);

  // チャージ/フラッシュ クリア
  setTimeout(function(){
    lw.classList.remove('do-charge-l');
    rw.classList.remove('do-flash');rw.classList.remove('do-recoil-r');
  },tClear);

  /* ===== Step 2: 結果（step1 から早期呼び出し可能なので先定義） ===== */
  var _step2Done=false;
  function step2(){
    if(_step2Done)return;_step2Done=true;
    var lc=getC(lw),rc=getC(rw);
    var msgs=[];
    if(res.dkill){msgs.push(UDEFS[res.defType].name+'が倒れた！');SFX.kill();rw.classList.add('do-death-r');spawnLevelUp(rc.x,rc.y);}
    if(res.ckill){msgs.push(UDEFS[res.atkType].name+'も倒れた！');SFX.kill();lw.classList.add('do-death-l');}
    if(msgs.length)document.getElementById('bLog').textContent=msgs.join(' / ');
    if(!res.dkill&&!res.ckill){lw.classList.add('do-victory');document.getElementById('bLog').textContent='双方生存';}
    if(res.dkill&&!res.ckill){SFX.victory();spawnLevelUp(lc.x,lc.y);showKillBanner(UDEFS[res.defType].name);}
  }

  /* ===== Step 1: 反撃フェーズ ===== */
  setTimeout(function(){
    if(battleSkip)return;
    if(res.cdmg<=0||res.dkill){step2();return;}
    var lc=getC(lw),rc=getC(rw);
    rw.classList.remove('do-charge-r');void rw.offsetWidth;rw.classList.add('do-charge-r');
    SFX.sfxFor(res.defType);
    if(_RANGED.indexOf(res.defType)>=0){spawnProjectileArc(rc.x,rc.y,lc.x,lc.y,ei2.col,8,cProjDur);}
    else{spawnMeleeSlash(rc.x,rc.y,lc.x,lc.y,rac.main);}
    setTimeout(function(){
      if(battleSkip)return;
      var lc2=getC(lw);
      lw.classList.remove('do-recoil-l');void lw.offsetWidth;lw.classList.add('do-recoil-l');
      lw.classList.remove('do-flash');void lw.offsetWidth;lw.classList.add('do-flash');
      applyScreenShake(res.isCritC);
      applyElementFlash(res.defElem);
      spawnElementBurst(lc2.x,lc2.y,res.defElem,res.isCritC);
      spawnShockwave(lc2.x,lc2.y,ei2.col,res.isCritC?90:58);
      if(res.isCritC){SFX.crit();applyCritZoom('L');showDmg('bLDmg','💥'+res.cdmg,rac.light);}
      else showDmg('bLDmg','-'+res.cdmg,rac.light);
      animateHPBar('bLBar','bLTxt',
        res.atkHpBef/res.atkMhp*100,res.atkHpAft/res.atkMhp*100,
        res.atkHpBef,res.atkHpAft,res.atkMhp,Math.round(640*T));
      var msg2=UDEFS[res.defType].name+'の反撃 -'+res.cdmg+'ダメージ';
      if(res.isCritC)msg2+=' 💥会心！';if(res.ckill)msg2+=' 【撃破！】';
      document.getElementById('bLog').textContent=msg2;
      setTimeout(function(){
        rw.classList.remove('do-charge-r');
        lw.classList.remove('do-flash');lw.classList.remove('do-recoil-l');
      },Math.round(560*T));
    },cProjDur);
  },tCounter);

  /* ===== Step 2 & 終了 ===== */
  setTimeout(function(){if(!battleSkip)step2();},tResult);
  setTimeout(function(){if(!battleSkip)endBattle();},tEnd);
}

function showDmg(id,txt,col){
  var el=document.getElementById(id);
  el.textContent=txt;el.style.color=col||'#fff';
  el.style.textShadow='0 0 18px '+col+', 0 2px 4px #000';
  el.style.display='none';void el.offsetWidth;el.style.display='block';
}

function endBattle(){
  var bs=document.getElementById('battleScreen');bs.classList.remove('active');
  ['bLWrap','bRWrap'].forEach(function(id){
    var el=document.getElementById(id);if(!el)return;
    el.style.opacity='1';
    el.classList.remove('do-victory','do-death-l','do-death-r',
      'do-charge-l','do-charge-r','do-recoil-l','do-recoil-r');
    el.style.transform='';
  });
  ['bLDmg','bRDmg','bLCrit','bRCrit'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.style.display='none';
  });
  // アイドルボブ解除
  ['bLCvs','bRCvs'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.classList.remove('b-idle-bob');
  });
  // hp-lost 残像フェードアウト
  document.querySelectorAll('.hp-lost').forEach(function(el){el.style.opacity='0';});
  // 戦闘ビューで非表示にしたパネルを復元
  var lf=document.getElementById('bLWrap'),rf=document.getElementById('bRWrap');
  if(lf&&lf.parentElement)lf.parentElement.style.display='';
  if(rf&&rf.parentElement)rf.parentElement.style.display='';
  var arena=document.querySelector('.b-arena');if(arena)arena.classList.remove('b-solo');
  var vsc=document.querySelector('.b-vsc');if(vsc)vsc.style.display='';
  // 演出クラスをクリア
  if(bs)bs.classList.remove('do-screen-shake');
  ['bLWrap','bRWrap'].forEach(function(id){
    var el=document.getElementById(id);
    if(el){el.classList.remove('do-vs-intro-l','do-vs-intro-r','do-zoom');el.style.transform='';}
  });
  var killB=document.getElementById('bKillBanner');if(killB)killB.style.display='none';
  if(bBGRaf){cancelAnimationFrame(bBGRaf);bBGRaf=null;}
  if(battleCb){var f=battleCb;battleCb=null;f();}
}

function skipBattle(){battleSkip=true;endBattle();}
