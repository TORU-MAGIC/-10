// ================================================================
//  キングオブキングス v10.0 - UI・操作・モーダル
// ================================================================
'use strict';

/* ===== UI操作 ===== */
function updUI(){
  if(!GS)return;
  var pl=GS.players[GS.turn],pc=PCOLS[GS.turn];
  var avgLv=avgLevel(GS.turn).toFixed(1);
  document.getElementById('topTurn').textContent=pl.name+' のターン (R'+GS.round+') 平均Lv'+avgLv;
  document.getElementById('topTurn').style.color=pc.light;
  document.getElementById('topSub').textContent='💰'+pl.gold+'G  士気:'+pl.morale+'%'+(useWeather?' '+GS.weather.icon:'');
  document.getElementById('topEndBtn').style.opacity=isMyTurn?'1':'.45';
  document.getElementById('topEndBtn').disabled=!isMyTurn;
  // ★FIX: 自分が誰なのか・操作可否を可視化（オンライン同期バグの早期発見用）
  var topMe=document.getElementById('topMe');
  if(topMe){
    if(onlineMode){
      var mePc=PCOLS[myPeerIdx]||{name:'?',light:'#fff',main:'#888'};
      topMe.style.display='inline-block';
      topMe.style.background=mePc.main+'33';
      topMe.style.border='1px solid '+mePc.light;
      topMe.style.color=mePc.light;
      topMe.textContent='YOU=P'+(myPeerIdx+1)+(isHost?'(host)':'')+' / '+(isMyTurn?'✅操作可':'⏳待機');
    } else { topMe.style.display='none'; }
  }
  var hasSel=!!selUnit,myUnit=hasSel&&selUnit.owner===GS.turn&&isMyTurn;
  document.getElementById('bAtk').style.display=myUnit?'flex':'none';
  document.getElementById('bWait').style.display=myUnit?'flex':'none';
  document.getElementById('bCancel').style.display=hasSel?'flex':'none';
  document.getElementById('bKingAoe').style.display=(myUnit&&selUnit.type==='king'&&!selUnit.attacked)?'flex':'none';
  document.getElementById('bField').style.display=(myUnit&&isMagicUnit(selUnit.type)&&!selUnit.attacked)?'flex':'none';
  document.getElementById('bSummon').style.display=(myUnit&&selUnit.type==='necromancer'&&!selUnit.attacked&&(GS.summonCounts[selUnit.id]||0)<3&&pl.gold>=80)?'flex':'none';
  document.getElementById('bAtk').disabled=!myUnit||selUnit.attacked||gMode==='atk';
  if(gMode==='atk'){document.getElementById('bAtk').textContent='⚔攻撃中';document.getElementById('bAtk').style.background='rgba(180,30,20,.4)';}
  else{document.getElementById('bAtk').textContent='⚔攻撃';document.getElementById('bAtk').style.background='';}
}
function showTurnNotif(pid){
  var pl=GS.players[pid],pc=PCOLS[pid];
  var el=document.getElementById('turnNotif');
  el.textContent=(pl.aiType==='human'?'👤 ':'🤖 ')+pl.name+' のターン';
  el.style.color=pc.light;el.style.borderColor=pc.main+'80';
  el.classList.remove('show');void el.offsetWidth;el.style.display='block';
  setTimeout(function(){el.classList.add('show');},10);
  setTimeout(function(){el.classList.remove('show');setTimeout(function(){el.style.display='none';},300);},1800);
}
var msgTimer=null;
function showMsg(txt,dur){dur=dur||2200;var el=document.getElementById('msgBox');el.textContent=txt;el.classList.add('show');if(msgTimer)clearTimeout(msgTimer);msgTimer=setTimeout(function(){el.classList.remove('show');},dur);}
/* ===== セル選択・アクション ===== */
function onTapPos(row,col,cx,cy){
  if(!GS||GS.over)return;
  hideHpTip();
  var tapped=uAt(GS,row,col);
  if(gMode==='atk'){
    // ★FIX: オンラインで自シート以外なら攻撃不可
    if(onlineMode&&GS.turn!==myPeerIdx){gMode='';atkCells=[];render();updUI();return;}
    if(tapped&&tapped.owner!==GS.turn&&atkCells.some(function(a){return a.r===row&&a.c===col;})){SFX.select();execAtk(selUnit,tapped);}
    else{gMode='';atkCells=[];render();updUI();}
    return;
  }
  if(gMode==='aoe'){// 王の威令: クリックで確定
    if(document.getElementById('bKingAoe').style.display!=='none'){execKingAoe();}
    return;
  }
  if(!isMyTurn){if(tapped)showHpTip(tapped,cx,cy);return;}
  // ★FIX: オンライン時は myPeerIdx と GS.turn の整合を二重チェック（防御的）
  if(onlineMode&&GS.turn!==myPeerIdx){if(tapped)showHpTip(tapped,cx,cy);return;}
  if(tapped&&tapped.owner===GS.turn){
    if(selUnit&&selUnit.id===tapped.id){cancelSel();return;}
    selUnit=tapped;moveCells=tapped.moved?[]:getMovable(GS,tapped);atkCells=tapped.attacked?[]:getAttackable(GS,tapped);aoeCells=[];gMode='sel';SFX.select();
    // ★オンライン: 自分が選択したユニットの位置を他プレイヤーへ通知（追従用）
    if(onlineMode&&typeof broadcastCursor==='function')broadcastCursor(tapped.row,tapped.col);
    render();updUI();showHpTip(tapped,cx,cy);return;
  }
  if(selUnit&&selUnit.owner===GS.turn){
    if(tapped&&tapped.owner!==GS.turn&&atkCells.some(function(a){return a.r===row&&a.c===col;})){SFX.select();execAtk(selUnit,tapped);return;}
    if(!tapped&&moveCells.some(function(m){return m.r===row&&m.c===col;})){SFX.move();execMove(selUnit,row,col);return;}
    // ★生産: 自分の施設タップ（ユニットが乗っていても可）
    if(GS.own[row][col]===GS.turn&&td(row,col).prod){openProdModal(row,col);return;}
  }
  cancelSel();
  if(tapped)showHpTip(tapped,cx,cy);
}
function execMove(u,r,c){
  // ★FIX: オンライン時は所有者厳格チェック
  if(onlineMode&&(u.owner!==myPeerIdx||GS.turn!==myPeerIdx)){console.warn('[online] execMove blocked');cancelSel();return;}
  var res=doMove(GS,u.id,r,c);
  moveCells=[];
  if(res.captured){addLog(GS.players[GS.turn].name+'の'+UDEFS[u.type].name+'が'+res.terrain.name+'を占領！',{hot:true});SFX.capture();}
  if(!u.attacked)atkCells=getAttackable(GS,u);
  if(onlineMode){
    broadcastAction({type:'move',uid:u.id,r:r,c:c});
    if(typeof broadcastCursor==='function')broadcastCursor(r,c);
  }
  render();updUI();if(GS.over)showGameOver();
}
function execAtk(atk,def){
  // ★FIX: オンライン時は攻撃者の所有者チェック
  if(onlineMode&&(atk.owner!==myPeerIdx||GS.turn!==myPeerIdx)){console.warn('[online] execAtk blocked');cancelSel();return;}
  var res=calcAttack(GS,atk.id,def.id);if(!res){cancelSel();return;}
  var m=GS.players[atk.owner].name+'の'+UDEFS[atk.type].name+'[Lv'+(atk.level||1)+']→'+UDEFS[def.type].name+'[Lv'+(def.level||1)+'](-'+res.dmg+')';
  if(res.isCrit)m+='💥会心';if(res.elemMult>=1.4)m+='⚡属性有効';if(res.dkill)m+='【撃破】';if(res.cdmg)m+=' 反撃-'+res.cdmg+(res.ckill?'【撃破】':'');
  addLog(m,{hot:true});gMode='';atkCells=[];moveCells=[];
  if(onlineMode){
    broadcastAction({type:'attack',atkId:atk.id,defId:def.id});
    if(typeof broadcastCursor==='function')broadcastCursor(def.row,def.col);
  }
  showBattle(res,function(){selUnit=null;render();updUI();if(GS.over)showGameOver();});
}
function execKingAoe(){
  if(!selUnit||selUnit.type!=='king'||selUnit.attacked)return;
  // ★FIX: オンライン時は所有者チェック
  if(onlineMode&&(selUnit.owner!==myPeerIdx||GS.turn!==myPeerIdx)){console.warn('[online] execKingAoe blocked');cancelSel();return;}
  var results=doKingAoEAction(GS,selUnit.id);
  if(!results||results.length===0){showMsg('範囲内に敵がいません',1500);}
  else{showMsg('👑王の威令！'+results.length+'体に攻撃！',2000);}
  if(onlineMode)broadcastAction({type:'king_aoe',uid:selUnit.id});
  aoeCells=[];gMode='';cancelSel();render();updUI();if(GS.over)showGameOver();
}
function toggleAtkMode(){if(!selUnit||selUnit.attacked||!isMyTurn)return;if(gMode==='atk'){gMode='sel';atkCells=getAttackable(GS,selUnit);}else{gMode='atk';atkCells=getAttackable(GS,selUnit);}render();updUI();}
function doKingAoE(){
  if(!selUnit||!isMyTurn||selUnit.type!=='king')return;
  // 広域範囲を表示
  aoeCells=[];
  for(var dr=-KING_AOE_RANGE;dr<=KING_AOE_RANGE;dr++)for(var dc=-KING_AOE_RANGE;dc<=KING_AOE_RANGE;dc++){
    if(Math.abs(dr)+Math.abs(dc)>KING_AOE_RANGE)continue;var nr=selUnit.row+dr,nc=selUnit.col+dc;
    if(nr<0||nr>=ROWS||nc<0||nc>=COLS)continue;aoeCells.push({r:nr,c:nc});
  }
  gMode='aoe';render();updUI();showMsg('👑 王の威令発動！ボタンを再タップで確定',2000);
  execKingAoe();
}
function doWait(){if(!selUnit||!isMyTurn)return;selUnit.moved=true;selUnit.attacked=true;if(onlineMode)broadcastAction({type:'wait',uid:selUnit.id});cancelSel();SFX.move();}
function cancelSel(){selUnit=null;moveCells=[];atkCells=[];aoeCells=[];gMode='';render();updUI();}
function doFieldMagic(){
  if(!selUnit||!isMyTurn||!isMagicUnit(selUnit.type)||selUnit.attacked)return;
  var res=doFieldMagicAction(GS,selUnit.id);
  if(res.count>0){showMsg('✨フィールド魔法！'+res.count+'体を弱体化！',2200);spawnPart(window.innerWidth/2,window.innerHeight*.4,'#cc88ff',50,'magic');startPLoop();}
  else showMsg('範囲内に敵がいません',1500);
  if(onlineMode)broadcastAction({type:'field_magic',uid:selUnit.id});
  cancelSel();render();updUI();
}
function doNecroSummon(){
  if(!selUnit||!isMyTurn||selUnit.type!=='necromancer')return;
  var ok=doNecroSummonAction(GS,selUnit.id);
  if(!ok)showMsg('召喚失敗（隣接空きマス不足・G不足・上限3体）',1800);
  else{if(onlineMode)broadcastAction({type:'necro_summon',uid:selUnit.id});render();updUI();}
}
/* ===== ツールチップ ===== */
function showHpTip(u,cx,cy){
  if(!u)return;var t=document.getElementById('hpTip');var pc=PCOLS[u.owner];var d=UDEFS[u.type];
  var ei=ELEM_INFO[d.elem||'none']||ELEM_INFO.none;
  var html='<b style="color:'+pc.light+'">'+d.name+' <span style="color:'+(u.level>=5?'#ff8844':u.level>=3?'#ffdd44':'#aaffaa')+'">Lv.'+(u.level||1)+'</span></b><br>';
  html+='HP:'+u.hp+'/'+u.mhp+' ATK:'+effAtk(u)+'<br>';
  html+='物理防:'+effPDef(u)+' 魔法防:'+effMDef(u)+'<br>';
  html+='攻撃種: '+(d.atkType==='magic'?'✨魔法':'⚔物理')+' '+ei.name+'<br>';
  html+='<span style="color:'+ei.col+'">'+ei.desc+'</span><br>';
  if(u.status&&u.status.length)html+='状態: '+u.status.join(', ')+'<br>';
  var tb=GS?getTerrainBonus(u,u.row,u.col):{atk:0,pdef:0,mdef:0};
  if(tb.atk||tb.pdef||tb.mdef)html+='<span style="color:#52d68a">地形:ATK+'+tb.atk+' pdef+'+tb.pdef+' mdef+'+tb.mdef+'</span>';
  t.innerHTML=html;t.classList.add('v');
  t.style.left=Math.min(cx+10,window.innerWidth-220)+'px';t.style.top=Math.min(cy+10,window.innerHeight-160)+'px';
}
function hideHpTip(){document.getElementById('hpTip').classList.remove('v');}
/* ===== ★生産モーダル（バグ修正版）===== */
var prodR=-1,prodC=-1;
function openProdModal(r,c){
  if(!GS||!isMyTurn)return;
  if(GS.own[r][c]!==GS.turn){showMsg('占領していない施設です',1500);return;}
  // ★修正: 友軍ユニットが乗っていても生産可（隣接配置）
  var existing=uAt(GS,r,c);
  if(existing&&existing.owner!==GS.turn){showMsg('敵ユニットが占有中',1500);return;}
  // 隣接空きマスを事前確認
  var canPlace=!existing;
  if(existing&&existing.owner===GS.turn){
    var dirs=[[0,1],[0,-1],[1,0],[-1,0],[-1,-1],[-1,1],[1,-1],[1,1]];
    for(var i=0;i<dirs.length;i++){var nr=r+dirs[i][0],nc=c+dirs[i][1];if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!uAt(GS,nr,nc)&&TDEFS[MAP[nr][nc]].cost<99){canPlace=true;break;}}
    if(!canPlace){showMsg('周囲に空きマスがありません',1500);return;}
  }
  prodR=r;prodC=c;
  var pl=GS.players[GS.turn];
  var tname=TDEFS[MAP[r][c]].name+(existing?' (隣接配置)':'');
  document.getElementById('prodTitle').textContent=tname+' 生産 (💰'+pl.gold+'G)';
  var g=document.getElementById('prodGrid');g.innerHTML='';
  Object.entries(UDEFS).sort(function(a,b){return a[1].cost-b[1].cost;}).forEach(function(e){
    var type=e[0],d=e[1];if(type==='skeleton'||type==='king'||d.cost===0)return;
    var ok=pl.gold>=d.cost;var pc2=PCOLS[GS.turn];
    var ei=ELEM_INFO[d.elem||'none']||ELEM_INFO.none;
    var div=document.createElement('div');div.className='pcard2'+(ok?'':' off');
    div.innerHTML='<div class="psym">'+d.sym+'</div>'+
      '<div style="font-weight:bold;font-size:10px;color:'+pc2.light+'">'+d.name+'</div>'+
      '<div style="font-size:7.5px;color:'+ei.col+'">'+ei.name+' '+(d.atkType==='magic'?'✨魔法':'⚔物理')+'</div>'+
      '<div style="font-size:7px;color:var(--dim);margin-top:2px;line-height:1.3">'+d.desc+'</div>'+
      '<div style="color:var(--gold);font-size:11px;margin-top:3px;font-weight:bold">'+d.cost+'G</div>'+
      '<div style="font-size:8px;color:var(--dim)">HP:'+d.hp+' ATK:'+d.atk+' P:'+d.pdef+'/M:'+d.mdef+'</div>';
    if(ok)div.onclick=function(){execProd(type);};
    g.appendChild(div);
  });
  document.getElementById('prodBg').classList.add('show');document.getElementById('prodSheet').classList.add('show');
}
function closeProdModal(){document.getElementById('prodBg').classList.remove('show');document.getElementById('prodSheet').classList.remove('show');}
// ★doProdバグ修正: 施設にユニットがいても隣接空きに配置
function doProd(gs,type,r,c){
  if(type==='skeleton'||type==='king'||UDEFS[type].cost===0)return false;
  var def=UDEFS[type],pl=gs.players[gs.turn];
  if(pl.gold<def.cost)return false;
  var existing=uAt(gs,r,c);
  if(existing&&existing.owner!==gs.turn)return false;// 敵がいる
  var placeR=r,placeC=c;
  if(existing){// 友軍がいる場合は隣接空きマスを探す
    var dirs=[[0,1],[0,-1],[1,0],[-1,0],[-1,-1],[-1,1],[1,-1],[1,1]];
    var found=false;
    for(var i=0;i<dirs.length;i++){var nr=r+dirs[i][0],nc=c+dirs[i][1];if(nr<0||nr>=ROWS||nc<0||nc>=COLS)continue;if(!uAt(gs,nr,nc)&&TDEFS[MAP[nr][nc]].cost<99){placeR=nr;placeC=nc;found=true;break;}}
    if(!found)return false;
  }
  pl.gold-=def.cost;gs.units.push(mkU(gs,type,gs.turn,placeR,placeC,true));return true;
}
function execProd(type){
  // ★FIX: オンライン時は自分の占領タイル & 自分のターン中のみ
  if(onlineMode&&(GS.own[prodR][prodC]!==myPeerIdx||GS.turn!==myPeerIdx)){console.warn('[online] execProd blocked');closeProdModal();return;}
  if(doProd(GS,type,prodR,prodC)){
    addLog(GS.players[GS.turn].name+'が'+UDEFS[type].name+'を生産',{hot:true});SFX.produce();
    if(onlineMode)broadcastAction({type:'produce',unitType:type,r:prodR,c:prodC});
    closeProdModal();render();updUI();
  }else showMsg('生産失敗（空きなし・G不足）',1500);
}
/* ===== 情報・ユニット特性モーダル ===== */
function openInfoModal(){
  if(!GS)return;
  var html='<div style="font-size:10px;color:var(--gold);margin-bottom:8px">勝利条件: 敵王様を倒す OR 全城砦を占拠</div>';
  GS.players.forEach(function(pl,i){
    if(!pl.alive)return;var pc=PCOLS[i];
    var units=GS.units.filter(function(u){return u.owner===i;});
    var avgLv=units.length?units.reduce(function(s,u){return s+(u.level||1);},0)/units.length:1;
    var cap=0;for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++)if(GS.own[r][c]===i&&TDEFS[MAP[r][c]].cap)cap++;
    var hasKing=units.some(function(u){return u.type==='king';});
    html+='<div class="prow3"><div style="color:'+pc.light+';font-weight:bold">'+pc.name+(pl.aiType!=='human'?' 🤖':'')+(hasKing?' 👑':'<b style="color:#f00"> ★王なし</b>')+'</div>';
    html+='<div class="prow2"><span>💰金</span><span>'+pl.gold+'G</span></div>';
    html+='<div class="prow2"><span>🏰城砦</span><span>'+cap+'</span></div>';
    html+='<div class="prow2"><span>⚔部隊数</span><span>'+units.length+'</span></div>';
    html+='<div class="prow2"><span>★平均Lv</span><span>'+avgLv.toFixed(1)+'</span></div>';
    html+='<div class="prow2"><span>📊士気</span><span>'+pl.morale+'%</span></div>';
    html+='</div>';
  });
  // 属性チャート
  html+='<div class="prow3"><div style="color:var(--gold);font-size:11px;margin-bottom:4px">⚗ 属性相関</div><div style="font-size:9px;color:var(--dim);line-height:1.9">';
  html+='🔥火 > ❄️氷・🌿自然 | ❄️氷 > ⚡雷・🌍大地 | ⚡雷 > 🔥火・🌍大地<br>';
  html+='✨聖 > 🌑闇(×1.8) | 🌑闇 > 🌿自然 | 🌿自然 > 🌍大地<br>';
  html+='⚔物理攻撃→物理防御(pdef) / ✨魔法攻撃→魔法防御(mdef)';
  html+='</div></div>';
  html+='<div class="prow3"><div style="color:var(--gold);font-size:11px;margin-bottom:4px">⚔ 3すくみ</div><div style="font-size:9px;color:var(--dim);line-height:1.9">';
  html+='重装⚙→魔法✨→機動⚡→重装(×3) | モンク→重装(×4) | 英雄→王様(×5)<br>';
  html+='忍・暗殺→重装(×3) | 会心10%(暗殺者/モンク20%) | 編隊+8%ATK';
  html+='</div></div>';
  document.getElementById('infoContent').innerHTML=html;
  document.getElementById('infoModalTitle').textContent='情報 (R'+GS.round+')';
  document.getElementById('infoBg').classList.add('show');document.getElementById('infoSheet').classList.add('show');
}
function openUnitDetailModal(u){
  if(!u&&!GS){showMsg('ユニットを選択してください',1500);return;}
  var type=u?u.type:'soldier';
  var d=UDEFS[type],ei=ELEM_INFO[d.elem||'none']||ELEM_INFO.none;
  var html='<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">';
  html+='<canvas id="detailSprite" width="80" height="80" style="border-radius:8px;background:rgba(6,14,28,.9)"></canvas>';
  html+='<div><div style="font-size:16px;font-weight:bold;color:var(--gold)">'+d.name+'</div>';
  html+='<div style="font-size:10px;color:'+ei.col+'">'+ei.name+'</div>';
  html+='<div style="font-size:9px;color:var(--dim)">'+(d.atkType==='magic'?'✨魔法攻撃':'⚔物理攻撃')+'</div></div></div>';
  if(u)html+='<div style="font-size:11px;color:var(--gold);margin-bottom:4px">★ Lv.'+(u.level||1)+' HP:'+u.hp+'/'+u.mhp+'</div>';
  // ステータス
  html+='<div class="udstat">';
  [['HP',d.hp],['ATK',d.atk],['物理防',d.pdef],['魔法防',d.mdef],['移動',d.mov],['射程',d.rng],['コスト',d.cost+'G'],['分類',({heavy:'重装⚙',magic:'魔法✨',swift:'機動⚡'})[TYPE_CAT[type]]||'-']].forEach(function(s){
    html+='<div class="uds"><div class="uds-lbl">'+s[0]+'</div><div>'+s[1]+'</div></div>';
  });html+='</div>';
  // 属性詳細
  html+='<div class="prow3"><div style="color:'+ei.col+';font-weight:bold;margin-bottom:3px">'+ei.name+' 属性</div><div style="font-size:9px;color:var(--dim)">'+ei.desc+'</div><div style="margin-top:4px;font-size:9px">';
  var advs=[],disadvs=[];
  Object.keys(ELEM_CHART[d.elem||'none']||{}).forEach(function(te){var v=(ELEM_CHART[d.elem||'none']||{})[te];if(v>=1.4)advs.push((ELEM_INFO[te]||ELEM_INFO.none).name+' ×'+v.toFixed(1));else if(v<=0.8)disadvs.push((ELEM_INFO[te]||ELEM_INFO.none).name+' ×'+v.toFixed(1));});
  if(advs.length)html+='<span style="color:#52d68a">有効: '+advs.join(', ')+'</span><br>';
  if(disadvs.length)html+='<span style="color:#e74c3c">無効: '+disadvs.join(', ')+'</span>';
  html+='</div></div>';
  // 相性
  html+='<div class="prow3"><div style="color:var(--gold);font-weight:bold;margin-bottom:3px">3すくみ相性</div><div style="font-size:9px">';
  var cat=TYPE_CAT[type];var strgvs=[],weakvs=[];
  Object.keys(TYPE_CAT).forEach(function(ot){var m=getAffMult(type,ot);var me=getElemMult(d.elem||'none',UDEFS[ot]?UDEFS[ot].elem||'none':'none');if(m>=3||me>=1.4){strgvs.push({n:UDEFS[ot].name,m:(m*me).toFixed(1)});}if(m<=0.5||me<=0.8){weakvs.push({n:UDEFS[ot].name,m:(m*me).toFixed(1)});}});
  if(strgvs.length)html+='<span style="color:#52d68a">✅ 有利: '+strgvs.slice(0,5).map(function(x){return x.n+'(×'+x.m+')';}).join(', ')+'</span><br>';
  if(weakvs.length)html+='<span style="color:#e74c3c">❌ 不利: '+weakvs.slice(0,5).map(function(x){return x.n+'(×'+x.m+')';}).join(', ')+'</span>';
  html+='</div></div>';
  // 使い方TIPS
  html+='<div class="tip-box">💡 '+(UNIT_TIPS[type]||d.desc)+'</div>';
  // 地形ボーナス
  html+='<div class="prow3" style="margin-top:6px"><div style="color:var(--gold);font-size:10px;margin-bottom:3px">地形ボーナス</div><div style="font-size:9px;color:var(--dim);line-height:1.7">';
  var dummyU={type:type,level:1};
  [0,1,2,4,5,7].forEach(function(tid){var tb=getTerrainBonus(dummyU,0,0);// approximate
  var b2={atk:0,pdef:0,mdef:0};if(tid===1&&['archer','spy','ninja','berserker'].indexOf(type)>=0){b2.pdef=2;b2.atk=2;}if(tid===2&&['catapult','arcanelord','mage','necromancer','archer'].indexOf(type)>=0)b2.atk=3;if(tid===5){b2.pdef=2;b2.mdef=1;if(['king','paladin','knight','valkyrie'].indexOf(type)>=0){b2.pdef+=3;b2.mdef+=2;}}if(tid===7&&['mage','arcanelord','healer','necromancer','witch'].indexOf(type)>=0)b2.atk=3;if(b2.atk||b2.pdef||b2.mdef)html+=TDEFS[tid].name+': ATK+'+b2.atk+' pdef+'+b2.pdef+' mdef+'+b2.mdef+'<br>';});
  html+='</div></div>';
  document.getElementById('infoContent').innerHTML=html;
  document.getElementById('infoModalTitle').textContent=d.name+' 特性詳細';
  document.getElementById('infoBg').classList.add('show');document.getElementById('infoSheet').classList.add('show');
  // スプライト描画
  setTimeout(function(){var sc=document.getElementById('detailSprite');if(sc)drawSprite(sc,type,u?PCOLS[u.owner].main:PCOLS[0].main,false);},50);
}
function openLogModal(){
  if(!GS)return;
  var html='<div style="font-size:11px;line-height:2">';
  GS.log.slice(0,60).forEach(function(l){var col=l.opt.hot?'#ff8080':l.opt.sys?'#74b9e8':l.opt.cpu?'#c8dff0':'var(--dim)';html+='<div style="color:'+col+'">'+l.msg+'</div>';});
  html+='</div>';
  document.getElementById('infoContent').innerHTML=html;
  document.getElementById('infoModalTitle').textContent='戦闘ログ (R'+GS.round+')';
  document.getElementById('infoBg').classList.add('show');document.getElementById('infoSheet').classList.add('show');
}
function closeInfoModal(){document.getElementById('infoBg').classList.remove('show');document.getElementById('infoSheet').classList.remove('show');}
/* ===== ゲームオーバー（必ず表示） ===== */
function showGameOver(){
  if(!GS)return;
  // 強制確認
  checkWin(GS);if(!GS.over){var alive=GS.players.filter(function(p){return p.alive;});if(alive.length<=1){GS.over=true;GS.winner=alive.length===1?alive[0].id:-1;}}
  var ws=GS.winner>=0,wpc=ws?PCOLS[GS.winner]:null;
  var winTxt=ws?'👑 '+wpc.name+' 勝利！':'引き分け';
  document.getElementById('goTitle').textContent=winTxt;
  if(ws){document.getElementById('goTitle').style.color=wpc.light;document.getElementById('goTitle').style.textShadow='0 0 40px '+wpc.light;SFX.victory();}
  document.getElementById('goDetail').textContent='最終ラウンド '+GS.round+' | 総撃破数 '+GS.stats.reduce(function(s,st){return s+st.killed;},0);
  var html='<div class="slabel">戦績</div>';
  GS.players.forEach(function(pl,i){var pc=PCOLS[i];html+='<div class="gsrow" style="color:'+(pl.alive?pc.light:pc.main)+'">';html+='<span>'+(i===GS.winner?'👑 ':'')+(pl.alive?'':'💀 ')+pc.name+(pl.aiType!=='human'?' 🤖':'')+'</span>';html+='<span>撃破:'+GS.stats[i].killed+'</span><span>損失:'+GS.stats[i].lost+'</span><span>占領:'+GS.stats[i].captured+'</span></div>';});
  html+='<div class="gsrow"><span>経過ラウンド</span><span>'+GS.round+'</span></div>';
  document.getElementById('goStats').innerHTML=html;document.getElementById('goDetail').textContent='';
  switchScreen('gameOverScreen');
}