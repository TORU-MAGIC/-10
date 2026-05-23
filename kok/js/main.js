// ================================================================
//  キングオブキングス v10.0 - メイン（タイトル・セーブ・マップ生成・初期化）
// ================================================================
'use strict';

/* ===== D-PAD ===== */
var _pcSel=4;
/* ===== D-PAD スクロール ===== */
var dpadIntervals={};
function dpadStart(dx,dy){dpadIntervals[dx+','+dy]=setInterval(function(){scrollMap(dx,dy);},80);}
function dpadStop(dx,dy){clearInterval(dpadIntervals[dx+','+dy]);}

/* ===== タイトル・カスタマイズ・ゲーム管理 ===== */
/* ===== カスタマイズ ===== */
function showCustomize(){
  hideAllBoxes();document.getElementById('customBox').style.display='flex';
  var tb=document.getElementById('customTable');
  while(tb.rows.length>1)tb.deleteRow(1);
  Object.entries(UDEFS).forEach(function(e){
    if(e[0]==='skeleton'||e[0]==='king')return;
    var d=e[1],row=tb.insertRow();
    row.innerHTML='<td style="color:var(--text)">'+d.sym+' '+d.name+'</td>'+
      ['hp','atk','pdef','mdef','mov','rng','cost'].map(function(k){return '<td><input type="number" min="1" max="999" value="'+d[k]+'" data-type="'+e[0]+'" data-key="'+k+'" style="width:36px;background:transparent;border:none;color:var(--text);font-size:10px;text-align:center">';}).join('')+'</td>';
  });
}
function resetCustom(){UDEFS=JSON.parse(JSON.stringify(UDEFS_BASE));localStorage.removeItem('kok9_custom');showCustomize();showMsg('リセット完了',1500);}
function saveCustom(){
  var inputs=document.querySelectorAll('#customTable input');var saves={};
  inputs.forEach(function(inp){var t=inp.dataset.type,k=inp.dataset.key,v=parseInt(inp.value);if(!saves[t])saves[t]={};saves[t][k]=isNaN(v)?UDEFS_BASE[t][k]:v;});
  Object.keys(saves).forEach(function(t){if(UDEFS[t])Object.assign(UDEFS[t],saves[t]);});
  try{localStorage.setItem('kok9_custom',JSON.stringify(saves));}catch(e){}
  hideAllBoxes();document.getElementById('modeBox').style.display='flex';showMsg('カスタマイズを保存しました',2000);
}
/* ===== タイトル ===== */
function hideAllBoxes(){['modeBox','offlineBox','onlineBox','hostBox','joinBox','customBox','scenarioBox'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='none';});}
function showOfflineSetup(){hideAllBoxes();document.getElementById('offlineBox').style.display='flex';buildPSetup(4);}
function showOnlineMenu(){hideAllBoxes();document.getElementById('onlineBox').style.display='flex';if(typeof fillPlayerNameInputs==='function')fillPlayerNameInputs();}
var _pcSel=4;
function setPC(btn,n){_pcSel=n;document.querySelectorAll('#offlineBox .pcb').forEach(function(b){b.classList.toggle('sel',b===btn);});buildPSetup(n);}
function buildPSetup(n){
  _pcSel=n;var g=document.getElementById('pSetupGrid');g.innerHTML='';
  for(var i=0;i<n;i++){var pc=PCOLS[i];var div=document.createElement('div');div.className='pcard';
    div.innerHTML='<div class="phead"><span class="pdot" style="background:'+pc.main+'"></span><span style="color:'+pc.light+'">P'+(i+1)+' '+pc.name+'</span></div>'+
      '<select class="sel2" id="pt'+i+'"><option value="human">👤 人間</option><option value="aggressive">⚔ 攻撃型CPU</option><option value="cautious">🛡 慎重型CPU</option><option value="genius">🧠 頭脳型CPU</option></select>';
    g.appendChild(div);if(i>0){var sel=div.querySelector('select');sel.value=AI_TYPES[i%AI_TYPES.length];}}
}
/* ===== 配備モード / FoW オプション設定 ===== */
function setStartMode(m){
  startMode=m;
  ['bSmNormal','bSmAll','bSmPick'].forEach(function(id){var el=document.getElementById(id);if(el)el.classList.remove('sel');});
  var ids={normal:'bSmNormal',all:'bSmAll',pick:'bSmPick'};
  var el=document.getElementById(ids[m]);if(el)el.classList.add('sel');
}
function toggleFoW(){
  useFoW=!useFoW;
  var btn=document.getElementById('bFoWToggle');if(btn)btn.textContent='🌫 索敵: '+(useFoW?'ON':'OFF');
  if(btn)btn.classList.toggle('sel',useFoW);
  var ab=document.getElementById('bAmbushToggle');if(ab)ab.style.display=useFoW?'inline-block':'none';
  if(!useFoW)useAmbush=false;
}
function toggleAmbushOpt(){
  if(!useFoW)return;
  useAmbush=!useAmbush;
  var btn=document.getElementById('bAmbushToggle');if(btn)btn.textContent='⚠ 待ち伏せ: '+(useAmbush?'ON':'OFF');
  if(btn)btn.classList.toggle('sel',useAmbush);
}

function startOffline(){
  var n=_pcSel,settings=[];
  for(var i=0;i<n;i++){var t=document.getElementById('pt'+i);settings.push({name:PCOLS[i].name,type:t?t.value:'aggressive'});}
  applyMapSettings(n);
  useWeather=parseInt(document.getElementById('optWeather').value)===1;
  useEvent=parseInt(document.getElementById('optEvent').value)===1;
  onlineMode=false;
  // 選択配備モード: 人間プレイヤーだけユニット選択画面を挟む
  if(startMode==='pick'){
    pUnitPicks=[];for(var i=0;i<n;i++)pUnitPicks.push([]);
    _doPickFlow(n,settings,0);
  } else {
    _launchGame(n,settings);
  }
}
// ユニット選択フロー（pidごとに順番にモーダルを出す）
var _pickFlowN=0,_pickFlowSettings=null;
function _doPickFlow(n,settings,pid){
  _pickFlowN=n;_pickFlowSettings=settings;
  if(pid>=n){_launchGame(n,settings);return;}
  if(settings[pid].type!=='human'){pUnitPicks[pid]=ALL_DEPLOY_TYPES.slice(0,8);_doPickFlow(n,settings,pid+1);return;}
  openUnitPickModal(pid,n,settings);
}
function openUnitPickModal(pid,n,settings,maxPicks){
  var pc=PCOLS[pid]||PCOLS[0];
  var allT=ALL_DEPLOY_TYPES;
  var picked=pUnitPicks[pid]||[];
  var MAX_PICK=maxPicks||8;
  var html='<div style="color:'+pc.light+';font-weight:bold;margin-bottom:6px">P'+(pid+1)+' '+pc.name+' — 出撃ユニットを最大'+MAX_PICK+'体選択</div>';
  html+='<div style="font-size:9px;color:var(--dim);margin-bottom:8px">👑 王様は自動配備。スケルトンは召喚のみ。</div>';
  html+='<div id="pickCount" style="color:var(--gold);font-size:10px;margin-bottom:6px">選択: '+picked.length+'/'+MAX_PICK+'</div>';
  html+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:8px" id="pickGrid">';
  allT.forEach(function(type){
    var d=UDEFS[type];if(!d)return;
    var isSel=picked.indexOf(type)>=0;
    var canId='psprite_'+type;
    html+='<div id="pcard_'+type+'" onclick="_togglePick('+pid+',\''+type+'\','+MAX_PICK+')" style="background:'+(isSel?'rgba(52,120,60,.7)':'rgba(6,14,28,.8)')+';border:1px solid '+(isSel?'rgba(80,200,80,.7)':'rgba(52,100,160,.3)')+';border-radius:6px;padding:4px 2px;cursor:pointer;text-align:center">';
    html+='<canvas id="'+canId+'" width="36" height="36" style="border-radius:4px;background:rgba(20,30,50,.9);display:block;margin:0 auto 2px"></canvas>';
    html+='<div style="font-size:8.5px;font-weight:bold;color:var(--gold)">'+d.name+'</div>';
    html+='<div style="font-size:7px;color:var(--dim)">HP:'+d.hp+' ATK:'+d.atk+'</div>';
    html+='<div style="font-size:7px;color:var(--gold)">'+d.cost+'G</div>';
    html+='</div>';
  });
  html+='</div>';
  html+='<div style="display:flex;gap:8px">';
  html+='<button onclick="_confirmPick('+pid+')" style="flex:1;padding:8px;background:rgba(40,140,60,.7);border:1px solid rgba(80,200,80,.5);border-radius:8px;color:#aaffaa;font-weight:bold;cursor:pointer">✅ 決定</button>';
  html+='<button onclick="_clearPick('+pid+')" style="padding:8px 12px;background:rgba(80,40,20,.7);border:1px solid rgba(200,80,40,.4);border-radius:8px;color:#ffaa88;cursor:pointer">🔄 リセット</button>';
  html+='</div>';
  document.getElementById('infoContent').innerHTML=html;
  document.getElementById('infoModalTitle').textContent='📋 出撃ユニット選択 P'+(pid+1);
  document.getElementById('infoBg').classList.add('show');
  document.getElementById('infoSheet').classList.add('show');
  setTimeout(function(){
    allT.forEach(function(type){
      var sc=document.getElementById('psprite_'+type);
      if(sc)drawSprite(sc,type,pc.main,false);
    });
  },60);
}
function _togglePick(pid,type,max){
  var arr=pUnitPicks[pid]||[];
  var idx=arr.indexOf(type);
  if(idx>=0){arr.splice(idx,1);}
  else if(arr.length<max){arr.push(type);}
  else{showMsg('最大'+max+'体まで選択できます',1200);return;}
  pUnitPicks[pid]=arr;
  // カードのスタイル更新
  var card=document.getElementById('pcard_'+type);
  if(card){
    var isSel=arr.indexOf(type)>=0;
    card.style.background=isSel?'rgba(52,120,60,.7)':'rgba(6,14,28,.8)';
    card.style.borderColor=isSel?'rgba(80,200,80,.7)':'rgba(52,100,160,.3)';
  }
  var cnt=document.getElementById('pickCount');
  if(cnt)cnt.textContent='選択: '+arr.length+'/'+max;
}
function _clearPick(pid){
  pUnitPicks[pid]=[];
  // シナリオモード時は scnPC を使う
  if(_scnPickPid===pid){openUnitPickModal(pid,_scnPC,null,25);}
  else openUnitPickModal(pid,_pickFlowN,_pickFlowSettings);
}
function _confirmPick(pid){
  if((pUnitPicks[pid]||[]).length===0){showMsg('少なくとも1体を選択してください',1500);return;}
  document.getElementById('infoBg').classList.remove('show');
  document.getElementById('infoSheet').classList.remove('show');
  // ★シナリオモード: scn用コールバックへ
  if(_scnPickPid===pid){
    if(typeof _scnSavePicks==='function')_scnSavePicks(pid, pUnitPicks[pid]);
    _scnPickPid=-1;
    return;
  }
  _doPickFlow(_pickFlowN,_pickFlowSettings,pid+1);
}
function _launchGame(n,settings){
  GS=newGS(n,settings);
  // 配備モードに応じてユニットを追加配備
  if(startMode==='all'){
    for(var i=0;i<n;i++)placeUnitsNear(GS,i,ALL_DEPLOY_TYPES);
  } else if(startMode==='pick'){
    for(var i=0;i<n;i++){
      var picks=pUnitPicks[i]&&pUnitPicks[i].length?pUnitPicks[i]:ALL_DEPLOY_TYPES.slice(0,6);
      placeUnitsNear(GS,i,picks);
    }
  }
  startGame();
}
function startGame(){
  switchScreen('gameScreen');initMap();
  if(typeof bgmPlay==='function') bgmPlay(); _bgmUpdBtn&&_bgmUpdBtn();
  // ★分隊補完: 旧コードパスで作られたユニットに squad 属性を付与
  if(GS&&GS.units&&typeof getSquadSize==='function'){
    GS.units.forEach(function(u){
      if(!u.squadSize||u.squadSize<1)u.squadSize=getSquadSize(u.type);
      if(u.squadAlive==null||isNaN(u.squadAlive)){
        if(typeof recalcSquadAlive==='function')recalcSquadAlive(u);
        else u.squadAlive=u.squadSize;
      }
    });
  }
  // ★FIX: オンライン考慮（自シートの時のみ true）
  isMyTurn = onlineMode ? (GS.turn===myPeerIdx) : isHuman(GS.turn);
  document.getElementById('topWeather').textContent=useWeather?GS.weather.icon:'';
  document.getElementById('pauseBtn').style.display=allCPU()?'block':'none';
  document.getElementById('dpad').style.display='flex';
  var inc=startOfTurn(GS,GS.turn);if(inc>0)addLog(GS.players[GS.turn].name+': +'+inc+'G',{sys:true});
  render();updUI();showTurnNotif(GS.turn);
  if(typeof _syncFoWGameBtn==='function')_syncFoWGameBtn();
  if(!isHuman(GS.turn))setTimeout(function(){runCPUTurn(GS.turn);},900);
}
function goTitle(){
  if(typeof bgmStop==='function') bgmStop();
  if(myPeer)try{myPeer.destroy();}catch(e){}myPeer=null;onlineConns=[];onlineMode=false;
  GS=null;selUnit=null;moveCells=[];atkCells=[];aoeCells=[];
  if(animTimer){clearInterval(animTimer);animTimer=null;}
  if(_tdTimer){clearTimeout(_tdTimer);_tdTimer=null;}
  isPaused=false;cpuTurnPid=-1;
  document.getElementById('dpad').style.display='none';
  document.getElementById('pauseOv').classList.remove('show');
  switchScreen('titleScreen');
}
function switchScreen(id){document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');});document.getElementById(id).classList.add('active');}
/* ===== スクロール・タッチ ===== */
var touchSX=0,touchSY=0,touchPanning=false,panScrollX=0,panScrollY=0;
var dpHeld={};var dpIntervals={};
function scrollMap(dx,dy){var a=document.getElementById('gameMapArea');a.scrollLeft+=dx;a.scrollTop+=dy;drawMinimap();}
function initTouchHandlers(){
  var cvs=document.getElementById('mapCanvas'),area=document.getElementById('gameMapArea');if(!cvs||!area)return;
  cvs.addEventListener('touchstart',function(e){var t=e.touches[0];touchSX=t.clientX;touchSY=t.clientY;touchPanning=false;panScrollX=area.scrollLeft;panScrollY=area.scrollTop;},{passive:true});
  cvs.addEventListener('touchmove',function(e){if(e.touches.length===1){var t=e.touches[0];var dx=t.clientX-touchSX,dy=t.clientY-touchSY;if(Math.abs(dx)>6||Math.abs(dy)>6){touchPanning=true;area.scrollLeft=panScrollX-dx;area.scrollTop=panScrollY-dy;drawMinimap();}}},{passive:true});
  cvs.addEventListener('touchend',function(e){
    if(touchPanning){touchPanning=false;return;}
    var t=e.changedTouches[0];if(Math.abs(t.clientX-touchSX)>12||Math.abs(t.clientY-touchSY)>12)return;
    e.preventDefault();
    var rect=cvs.getBoundingClientRect(),scaleX=cvs.width/rect.width,scaleY=cvs.height/rect.height;
    var mx=Math.floor((t.clientX-rect.left)*scaleX/TW),my=Math.floor((t.clientY-rect.top)*scaleY/TH);
    if(mx>=0&&mx<COLS&&my>=0&&my<ROWS)onTapPos(my,mx,t.clientX,t.clientY);
  },{passive:false});
  cvs.addEventListener('click',function(e){
    var rect=cvs.getBoundingClientRect(),scaleX=cvs.width/rect.width,scaleY=cvs.height/rect.height;
    var mx=Math.floor((e.clientX-rect.left)*scaleX/TW),my=Math.floor((e.clientY-rect.top)*scaleY/TH);
    if(mx>=0&&mx<COLS&&my>=0&&my<ROWS)onTapPos(my,mx,e.clientX,e.clientY);
  });
  cvs.addEventListener('contextmenu',function(e){e.preventDefault();cancelSel();});
  // D-pad長押し対応 (v10.0: eval を排除し onclick ハンドラを直接呼び出し)
  document.querySelectorAll('.dpbtn').forEach(function(btn){
    btn.addEventListener('touchstart',function(){var handler=btn.onclick;if(!handler)return;btn._iv=setInterval(function(){try{handler.call(btn);}catch(e){}},150);},{passive:true});
    btn.addEventListener('touchend',function(){if(btn._iv){clearInterval(btn._iv);btn._iv=null;}},{passive:true});
    btn.addEventListener('touchcancel',function(){if(btn._iv){clearInterval(btn._iv);btn._iv=null;}},{passive:true});
  });
  document.getElementById('minimap').addEventListener('click',function(e){
    var rect=this.getBoundingClientRect(),fx=(e.clientX-rect.left)/rect.width,fy=(e.clientY-rect.top)/rect.height;
    var a=document.getElementById('gameMapArea');a.scrollLeft=fx*COLS*TW-a.clientWidth/2;a.scrollTop=fy*ROWS*TH-a.clientHeight/2;
  });
  cvs.addEventListener('mousemove',function(e){if(!GS)return;var rect=this.getBoundingClientRect(),scaleX=this.width/rect.width,scaleY=this.height/rect.height;var mx=Math.floor((e.clientX-rect.left)*scaleX/TW),my=Math.floor((e.clientY-rect.top)*scaleY/TH);if(mx<0||mx>=COLS||my<0||my>=ROWS){hideHpTip();return;}var u=uAt(GS,my,mx);if(u)showHpTip(u,e.clientX,e.clientY);else hideHpTip();});
  cvs.addEventListener('mouseleave',function(){hideHpTip();});
  // キーボード矢印キー
  document.addEventListener('keydown',function(e){if(!document.getElementById('gameScreen').classList.contains('active'))return;var spd=TH*2;if(e.key==='ArrowUp')scrollMap(0,-spd);else if(e.key==='ArrowDown')scrollMap(0,spd);else if(e.key==='ArrowLeft')scrollMap(-spd,0);else if(e.key==='ArrowRight')scrollMap(spd,0);else if(e.key==='Escape')cancelSel();});
}
/* ===== 星空 ===== */
function initStars(){
  var cvs=document.getElementById('starsCanvas');if(!cvs)return;var c=cvs.getContext('2d');
  var stars=[];function resize(){cvs.width=window.innerWidth;cvs.height=window.innerHeight;stars=[];for(var i=0;i<200;i++)stars.push({x:Math.random()*cvs.width,y:Math.random()*cvs.height,r:Math.random()*1.5+.3,t:Math.random()*Math.PI*2,spd:.01+Math.random()*.03});}
  resize();window.addEventListener('resize',resize);
  function loop(){c.clearRect(0,0,cvs.width,cvs.height);stars.forEach(function(s){s.t+=s.spd;c.fillStyle='rgba(255,255,255,'+(.4+.5*Math.sin(s.t)).toFixed(2)+')';c.beginPath();c.arc(s.x,s.y,s.r,0,Math.PI*2);c.fill();});requestAnimationFrame(loop);}loop();
}
/* ===== 初期化 ===== */
window.addEventListener('DOMContentLoaded',function(){
  try{
  loadCustom();initStars();initBBG();initPCvs();
  hideAllBoxes();document.getElementById('modeBox').style.display='flex';
  document.getElementById('dpad').style.display='none';
  buildPSetup(4);
  initTouchHandlers();
  // 中央にスクロール（ゲーム開始時）
  setTimeout(function(){var area=document.getElementById('gameMapArea');if(area){area.scrollLeft=(COLS*TW-window.innerWidth)/2;area.scrollTop=(ROWS*TH-window.innerHeight)/2;}},200);
  // ゲームオーバー定期確認（念のため）
  setInterval(function(){if(GS&&!GS.over&&document.getElementById('gameScreen').classList.contains('active'))checkWinFull();},5000);
  }catch(e){console.error('Init error:',e);alert('初期化エラー: '+e.message);}
});

/* ===== セーブ・ロード・マップ生成 ===== */

/* ===== セーブ・ロードシステム ===== */
var SAVE_SLOTS=3;
function saveGame(slot){
  slot=slot||0;
  if(!GS||GS.over){showMsg('ゲーム中のみセーブできます',1500);return;}
  var data={
    gs:JSON.parse(JSON.stringify(GS)),
    useWeather:useWeather,useEvent:useEvent,
    timestamp:Date.now(),version:'10.0',round:GS.round,
    playerName:GS.players.map(function(p){return p.name;}),
    winner:GS.winner
  };
  try{
    localStorage.setItem('kok9_save_'+slot,JSON.stringify(data));
    showMsg('💾 スロット'+(slot+1)+'にセーブしました (R'+GS.round+')',2200);
    updateSaveButtons();
  }catch(e){showMsg('セーブ失敗: ストレージ容量不足',2000);}
}
function loadGame(slot){
  slot=slot||0;
  try{
    var raw=localStorage.getItem('kok9_save_'+slot);
    if(!raw){showMsg('スロット'+(slot+1)+'にデータがありません',1500);return;}
    var data=JSON.parse(raw);
    // v10.0: v9.0 互換ロード（不足フィールドを補完）
    if(data.version!=='9.0'&&data.version!=='10.0'){showMsg('バージョン不一致のセーブデータです',2000);return;}
    GS=data.gs;useWeather=data.useWeather;useEvent=data.useEvent;
    if(typeof GS.rngSeed!=='number'||GS.rngSeed===0){GS.rngSeed=(Date.now()^Math.floor(Math.random()*0xffffffff))|0||1;}
    if(typeof GS.actionSeq!=='number')GS.actionSeq=0;
    if(!GS.actionLog)GS.actionLog=[];
    if(!GS.subQuests)GS.subQuests=[];
    if(!GS.mapOverrides)GS.mapOverrides={};
    if(!GS.chainKills)GS.chainKills=[];
    GS.players.forEach(function(p){if(typeof p._chain!=='number')p._chain=0;});
    // ★分隊: 旧セーブに squadSize/squadAlive が無ければ補完
    if(GS.units&&typeof getSquadSize==='function'){
      GS.units.forEach(function(u){
        if(typeof u.squadSize!=='number'||u.squadSize<=0)u.squadSize=getSquadSize(u.type);
        if(typeof u.squadAlive!=='number'){
          // HP比率から個体数を逆算
          if(typeof recalcSquadAlive==='function')recalcSquadAlive(u);
          else u.squadAlive=u.squadSize;
        }
      });
    }
    cancelSel();
    // ★FIX: オンライン考慮（ロード時はオンラインに復帰しないので isHuman で十分だが、防御的に統一）
    isMyTurn = onlineMode ? (GS.turn===myPeerIdx) : isHuman(GS.turn);
    if(document.getElementById('titleScreen').classList.contains('active')){
      switchScreen('gameScreen');initMap();
    }
    document.getElementById('topWeather').textContent=useWeather?GS.weather.icon:'';
    document.getElementById('pauseBtn').style.display=allCPU()?'block':'none';
    document.getElementById('dpad').style.display='flex';
    render();updUI();showTurnNotif(GS.turn);
    showMsg('📂 スロット'+(slot+1)+'からロードしました (R'+GS.round+')',2200);
    closeSaveModal();
    if(!isHuman(GS.turn))setTimeout(function(){runCPUTurn(GS.turn);},800);
  }catch(e){showMsg('ロード失敗: '+e.message,2000);}
}
function deleteSave(slot){
  localStorage.removeItem('kok9_save_'+slot);
  updateSaveButtons();showMsg('スロット'+(slot+1)+'を削除しました',1500);
}
function getSaveInfo(slot){
  try{
    var raw=localStorage.getItem('kok9_save_'+slot);
    if(!raw)return null;
    var d=JSON.parse(raw);
    var dt=new Date(d.timestamp);
    return{
      round:d.round,
      date:dt.getMonth()+1+'/'+dt.getDate()+' '+dt.getHours()+':'+String(dt.getMinutes()).padStart(2,'0'),
      players:d.playerName?d.playerName.join('・'):'-'
    };
  }catch(e){return null;}
}
function updateSaveButtons(){
  for(var s=0;s<SAVE_SLOTS;s++){
    var info=getSaveInfo(s);
    var el=document.getElementById('save_slot_'+s);
    if(!el)continue;
    if(info){
      el.innerHTML='<div style="font-weight:bold;color:var(--gold)">スロット'+(s+1)+'</div>'+
        '<div style="font-size:9px;color:var(--dim)">R'+info.round+' | '+info.date+'</div>'+
        '<div style="font-size:8px;color:var(--dim)">'+info.players+'</div>'+
        '<div style="display:flex;gap:4px;margin-top:4px">'+
        '<button class="btn btn-gold" style="min-height:28px;padding:2px 6px;font-size:10px" onclick="loadGame('+s+')">📂ロード</button>'+
        '<button class="btn" style="min-height:28px;padding:2px 4px;font-size:10px;border-color:rgba(231,76,60,.5);color:#ff8080" onclick="deleteSave('+s+')">🗑</button></div>';
    }else{
      el.innerHTML='<div style="font-weight:bold;color:var(--dim)">スロット'+(s+1)+'</div>'+
        '<div style="font-size:9px;color:var(--dim)">[空き]</div>'+
        '<button class="btn btn-gold" style="min-height:28px;padding:2px 6px;font-size:10px;margin-top:4px" onclick="saveGame('+s+')">💾セーブ</button>';
    }
  }
}
function openSaveModal(){
  updateSaveButtons();
  document.getElementById('saveBg').classList.add('show');
  document.getElementById('saveSheet').classList.add('show');
}
function closeSaveModal(){
  document.getElementById('saveBg').classList.remove('show');
  document.getElementById('saveSheet').classList.remove('show');
}

/* ===== マップサイズ・ランダム生成システム ===== */
var mapSizeKey='medium', mapMode='random';
var MAP_SIZES={
  small: {cols:16,rows:12,tw:68,th:68,label:'小マップ 16×12'},
  medium:{cols:24,rows:18,tw:52,th:52,label:'中マップ 24×18'},
  large: {cols:32,rows:24,tw:42,th:42,label:'大マップ 32×24'},
};
// 固定マップデータ（中マップ用）
var FIXED_MAP=[
  [5,0,1,1,0,0,2,2,4,0,0,4,4,0,0,4,2,2,0,0,1,1,0,5],
  [0,0,1,0,0,0,0,2,0,0,4,0,0,4,0,0,2,0,0,0,0,1,0,0],
  [0,1,0,0,4,0,0,0,0,7,7,0,0,7,7,0,0,0,0,4,0,0,1,0],
  [1,0,0,2,0,0,0,0,0,0,0,4,4,0,0,0,0,0,2,0,0,0,0,1],
  [0,0,2,0,0,0,4,0,0,4,0,2,2,0,4,0,0,4,0,0,0,2,0,0],
  [0,2,0,0,0,4,0,0,6,0,0,0,0,0,0,6,0,0,4,0,0,0,2,0],
  [0,0,0,0,4,0,7,0,0,0,4,0,0,4,0,0,0,7,0,4,0,0,0,0],
  [0,0,2,0,0,0,0,4,0,0,0,4,4,0,0,0,4,0,0,0,0,2,0,0],
  [0,1,0,0,0,0,0,0,4,0,0,0,0,0,0,4,0,0,0,0,0,0,1,0],
  [5,7,0,0,0,4,0,0,0,4,0,0,0,0,4,0,0,0,4,0,0,0,7,5],
  [0,1,0,0,0,0,0,0,4,0,0,0,0,0,0,4,0,0,0,0,0,0,1,0],
  [0,0,2,0,0,0,0,4,0,0,0,4,4,0,0,0,4,0,0,0,0,2,0,0],
  [0,0,0,0,4,0,7,0,0,0,4,0,0,4,0,0,0,7,0,4,0,0,0,0],
  [0,2,0,0,0,4,0,0,6,0,0,0,0,0,0,6,0,0,4,0,0,0,2,0],
  [0,0,2,0,0,0,4,0,0,4,0,2,2,0,4,0,0,4,0,0,0,2,0,0],
  [1,0,0,2,0,0,0,0,0,0,0,4,4,0,0,0,0,0,2,0,0,0,0,1],
  [0,1,0,0,4,0,0,0,0,7,7,0,0,7,7,0,0,0,0,4,0,0,1,0],
  [5,0,1,1,0,0,2,2,4,0,0,4,4,0,0,4,2,2,0,0,1,1,0,5],
];

function setMapSize(key){
  if(!MAP_SIZES[key])return;
  mapSizeKey=key;
  document.querySelectorAll('[id^="msz_"]').forEach(function(b){b.classList.remove('sel');});
  var btn=document.getElementById('msz_'+key.charAt(0));
  if(btn)btn.classList.add('sel');
}
function setMapMode(mode){
  mapMode=mode;
  document.querySelectorAll('[id^="mmd_"]').forEach(function(b){b.classList.remove('sel');});
  var btn=document.getElementById('mmd_'+(mode==='random'?'r':'f'));
  if(btn)btn.classList.add('sel');
}

/* --- シードRNG --- */
function makeRng(seed){
  var s=seed>>>0||Date.now()>>>0;
  return function(){
    s=((s^(s<<13))>>>0);s=((s^(s>>>17))>>>0);s=((s^(s<<5))>>>0);
    return(s>>>0)/4294967296;
  };
}

/* --- マップレイアウト計算 --- */
function computeMapLayout(rows,cols){
  // 8プレイヤー分の城砦位置（マップサイズに応じた相対座標）
  CASTLE_POS=[
    [0,           0          ],  // P1: 左上
    [0,           cols-1     ],  // P2: 右上
    [rows-1,      0          ],  // P3: 左下
    [rows-1,      cols-1     ],  // P4: 右下
    [Math.floor(rows/2), 0   ],  // P5: 左中
    [Math.floor(rows/2), cols-1], // P6: 右中
    [0,           Math.floor(cols/2)],   // P7: 上中
    [rows-1,      Math.floor(cols/2)],   // P8: 下中
  ];
  // 初期ユニット配置（城砦の隣接セル）
  INIT_UNITS=CASTLE_POS.map(function(cp){
    var r=cp[0],c=cp[1];
    var dirs=[[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]];
    var pos=[];
    for(var i=0;i<dirs.length&&pos.length<2;i++){
      var nr=r+dirs[i][0],nc=c+dirs[i][1];
      if(nr>=0&&nr<rows&&nc>=0&&nc<cols)pos.push([nr,nc]);
    }
    return pos;
  });
}

/* --- ランダムマップ生成 --- */
function generateRandomMap(rows,cols,np,seed){
  var rng=makeRng(seed);
  // 全セルを平原で初期化
  var map=[];
  for(var r=0;r<rows;r++){map.push([]);for(var c=0;c<cols;c++)map[r].push(0);}

  // 城砦配置（CASTLE_POSは既にcomputeMapLayoutで設定済み）
  // プレイヤー数分の城砦を配置
  CASTLE_POS.slice(0,np).forEach(function(cp){
    if(cp[0]>=0&&cp[0]<rows&&cp[1]>=0&&cp[1]<cols)map[cp[0]][cp[1]]=5;
  });

  // 城砦周辺の安全距離チェック
  function nearCastle(r,c,dist){
    return CASTLE_POS.slice(0,np).some(function(cp){
      return Math.abs(cp[0]-r)+Math.abs(cp[1]-c)<dist;
    });
  }

  // 地形パッチ生成（ランダム拡張BFS）
  function addPatches(tid,density,maxPatch,clearDist){
    var target=Math.floor(rows*cols*density);
    var placed=0,att=0;
    while(placed<target&&att<target*30){
      att++;
      var sr=Math.floor(rng()*rows),sc=Math.floor(rng()*cols);
      if(map[sr][sc]!==0||nearCastle(sr,sc,clearDist))continue;
      var sz=1+Math.floor(rng()*(maxPatch-1));
      var q=[{r:sr,c:sc}],vis={};vis[sr+','+sc]=1;var n=0;
      while(q.length>0&&n<sz){
        var qi=Math.floor(rng()*Math.min(q.length,4));
        var cur=q.splice(qi,1)[0];
        if(map[cur.r][cur.c]===0&&!nearCastle(cur.r,cur.c,clearDist)){
          map[cur.r][cur.c]=tid;n++;placed++;
          // 180度対称ミラー
          var mr=rows-1-cur.r,mc=cols-1-cur.c;
          if(mr!==cur.r||mc!==cur.c){
            if(map[mr][mc]===0&&!nearCastle(mr,mc,Math.max(1,clearDist-1))){
              map[mr][mc]=tid;placed++;
            }
          }
        }
        var dirs=[[0,1],[0,-1],[1,0],[-1,0]];
        dirs.forEach(function(d){
          var nr=cur.r+d[0],nc=cur.c+d[1];
          var k=nr+','+nc;
          if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&!vis[k]&&rng()<0.6){
            vis[k]=1;q.push({r:nr,c:nc});
          }
        });
      }
    }
    return placed;
  }

  // 地形を配置（密度・パッチサイズはマップサイズに応じて調整）
  addPatches(1,0.12,8,3);   // 森
  addPatches(2,0.08,5,3);   // 山岳
  addPatches(6,0.07,4,2);   // 丘

  // 各城砦周辺に生産施設を配置
  CASTLE_POS.slice(0,np).forEach(function(cp){
    var r=cp[0],c=cp[1];
    var offsets=[[0,2],[2,0],[0,-2],[-2,0],[1,2],[2,1],[-1,2],[-2,1],[1,-2],[-1,-2]];
    var placed=0;
    offsets.forEach(function(d){
      if(placed>=3)return;
      var nr=r+d[0],nc=c+d[1];
      if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&map[nr][nc]===0){
        map[nr][nc]=(placed===0)?7:4;  // 神殿1つ + 都市2つ
        placed++;
      }
    });
  });

  // 追加ランダム都市
  addPatches(4,0.02,1,4);

  return map;
}

/* --- マップサイズ別固定マップ生成 --- */
function generateFixedMap(rows,cols){
  if(rows===18&&cols===24)return FIXED_MAP.map(function(r){return r.slice();});
  // 小・大は固定マップがないのでランダムを使用
  computeMapLayout(rows,cols);
  return generateRandomMap(rows,cols,6,12345);
}

/* --- ゲーム開始前にマップ設定を適用 --- */
function applyMapSettings(np){
  var sz=MAP_SIZES[mapSizeKey]||MAP_SIZES.medium;
  // グローバル変数を更新
  COLS=sz.cols;ROWS=sz.rows;TW=sz.tw;TH=sz.th;
  // レイアウト計算
  computeMapLayout(ROWS,COLS);
  // マップ生成
  if(mapMode==='random'||(mapSizeKey!=='medium')){
    var seed=Math.floor(Math.random()*0xffffff);
    MAP=generateRandomMap(ROWS,COLS,np,seed);
  }else{
    MAP=generateFixedMap(ROWS,COLS);
  }
  // ownグリッドを正しいサイズで再初期化（newGSで使うため事前に設定）
  console.log('Map applied: '+COLS+'x'+ROWS+' TW='+TW+' mode='+mapMode);
}

function toggleBattleSpeed(){
  battleSpeedMode=battleSpeedMode==='skip'?'normal':'skip';
  var btn=document.getElementById('bSpeed');
  if(btn){
    btn.textContent=battleSpeedMode==='skip'?'⚡高速':'🎬全表示';
    btn.classList.toggle('sel',battleSpeedMode==='normal');
    btn.style.color=battleSpeedMode==='normal'?'#ffcc44':'';
  }
  // シナリオ用変数も同期
  if(typeof _scnBattleMode!=='undefined')_scnBattleMode=battleSpeedMode;
  showMsg(battleSpeedMode==='skip'?
    '⚡高速: CPU同士の戦闘画面をスキップ':
    '🎬全表示: CPU同士の戦闘画面も表示します（観戦可能）',2000);
}

/* ===== ゲーム中の索敵トグル（途中ON/OFF可能） ===== */
function toggleFoWInGame(){
  useFoW=!useFoW;
  if(!useFoW)useAmbush=false; // 索敵OFFなら待ち伏せも自動OFF
  var btn=document.getElementById('bFoWGame');
  if(btn){
    btn.textContent=useFoW?'🌫索敵ON':'🌫索敵';
    btn.classList.toggle('sel',useFoW);
    btn.style.color=useFoW?'#88aacc':'';
  }
  // 即座にマップ再描画
  if(typeof updateVisMap==='function')updateVisMap();
  if(typeof render==='function')render();
  if(typeof updUI==='function')updUI();
  showMsg('🌫索敵: '+(useFoW?'ON（敵が霧の中になります）':'OFF（全マップが見えます）'),2000);
}
// 起動時の表示状態を同期するヘルパー
function _syncFoWGameBtn(){
  var btn=document.getElementById('bFoWGame');
  if(btn){
    btn.textContent=useFoW?'🌫索敵ON':'🌫索敵';
    btn.classList.toggle('sel',useFoW);
    btn.style.color=useFoW?'#88aacc':'';
  }
}

/* ===== シナリオモード UI ヘルパー ===== */
var _scnPC=4; // シナリオ攻撃側プレイヤー数
var _scnSize='medium'; // シナリオマップサイズ
// プレイヤーごとの設定保持 (1人目=人間固定、2人目以降はCPU)
var _scnPlayerSettings=[];   // [{type, customUnits:[]?}, ...]
var _scnPickPid=-1; // ユニット選択中の pid
function showScenarioBox(){
  hideAllBoxes();
  var el=document.getElementById('scenarioBox');if(el)el.style.display='flex';
  _syncScnFoWButtons();
  buildScnPSetup(_scnPC);
  // 戦闘演出モードボタンの状態を反映
  setScnBattleMode(_scnBattleMode);
}
function _syncScnFoWButtons(){
  var fb=document.getElementById('scn_fow');
  if(fb){fb.textContent='🌫 索敵: '+(useFoW?'ON':'OFF');fb.classList.toggle('sel',useFoW);}
  var ab=document.getElementById('scn_amb');
  if(ab){
    ab.textContent='⚠ 待ち伏せ: '+(useAmbush?'ON':'OFF');
    ab.classList.toggle('sel',useAmbush);
    ab.style.display=useFoW?'inline-block':'none';
  }
}
function toggleScnFoW(){useFoW=!useFoW;if(!useFoW)useAmbush=false;_syncScnFoWButtons();}
function toggleScnAmbush(){if(!useFoW)return;useAmbush=!useAmbush;_syncScnFoWButtons();}

/* ===== シナリオ: 戦闘演出モード選択 =====
 *  'skip' : CPU vs CPU の戦闘画面をスキップ（自軍関与のみ表示）
 *  'normal': 全戦闘を表示（CPU 同士も観戦できる）
 */
var _scnBattleMode='skip'; // デフォルト
function setScnBattleMode(m){
  _scnBattleMode=m;
  // 共有変数も同期（即時反映）
  if(typeof battleSpeedMode!=='undefined')battleSpeedMode=m;
  // ボタン状態
  var skipBtn=document.getElementById('scn_bs_skip');
  var allBtn=document.getElementById('scn_bs_all');
  if(skipBtn)skipBtn.classList.toggle('sel',m==='skip');
  if(allBtn)allBtn.classList.toggle('sel',m==='normal');
}

/* ===== シナリオプレイヤー設定グリッド =====
 *  P1 含む全プレイヤーが「人間/攻撃/慎重/頭脳」から選択可能
 *  全員CPUの場合は観戦モード
 */
function buildScnPSetup(n){
  var g=document.getElementById('scnPSetupGrid');if(!g)return;
  g.innerHTML='';
  // 既存設定を保持しつつ、足りないものを初期化
  var aiCycle=['aggressive','cautious','genius'];
  while(_scnPlayerSettings.length<n){
    var i=_scnPlayerSettings.length;
    _scnPlayerSettings.push({
      type: i===0?'human':aiCycle[(i-1)%aiCycle.length],
      customUnits:null  // null=デフォルト構成
    });
  }
  for(var i=0;i<n;i++){
    var pc=PCOLS[i]||PCOLS[0];
    var ps=_scnPlayerSettings[i];
    var div=document.createElement('div');div.className='pcard';
    div.innerHTML='<div class="phead"><span class="pdot" style="background:'+pc.main+'"></span><span style="color:'+pc.light+'">P'+(i+1)+' '+pc.name+'</span></div>'+
      '<select class="sel2" id="scnpt'+i+'" onchange="_setScnPlayerType('+i+',this.value)">'+
        '<option value="human">👤 人間</option>'+
        '<option value="aggressive">⚔ 攻撃型CPU</option>'+
        '<option value="cautious">🛡 慎重型CPU</option>'+
        '<option value="genius">🧠 頭脳型CPU</option>'+
      '</select>'+
      '<button class="pcb" style="margin-top:4px;font-size:9px;width:100%" onclick="openScnUnitPick('+i+')">'+
      (ps.customUnits?'✏ '+ps.customUnits.length+'体カスタム':'📋 デフォルト構成')+
      '</button>';
    g.appendChild(div);
    var sel=div.querySelector('select');
    if(sel)sel.value=ps.type;
  }
  // 観戦モード判定（全員CPU）の警告表示
  _updateScnSpectatorHint(n);
}
function _updateScnSpectatorHint(n){
  var allCPU=true;
  for(var i=0;i<n;i++){
    if(_scnPlayerSettings[i]&&_scnPlayerSettings[i].type==='human'){allCPU=false;break;}
  }
  var grid=document.getElementById('scnPSetupGrid');
  if(!grid)return;
  // 既存のヒントを削除
  var existing=document.getElementById('scnSpectatorHint');
  if(existing)existing.remove();
  if(allCPU){
    var hint=document.createElement('div');hint.id='scnSpectatorHint';
    hint.style.cssText='grid-column:1/-1;background:rgba(80,60,20,.5);border:1px solid rgba(240,180,80,.5);border-radius:6px;padding:6px 10px;font-size:10px;color:#ffcc88;margin-top:4px;text-align:center';
    hint.innerHTML='🎬 <b>観戦モード</b>：全プレイヤーがCPU。<br>戦闘演出を「🎬 全表示」にすると AI 同士の戦いを観戦できます';
    grid.appendChild(hint);
    // 観戦モード初回切替時に自動で「全表示」へ
    if(_scnBattleMode==='skip'){
      setScnBattleMode('normal');
    }
  }
}
function _setScnPlayerType(pid,val){
  if(_scnPlayerSettings[pid])_scnPlayerSettings[pid].type=val;
  _updateScnSpectatorHint(_scnPC);
}
function openScnUnitPick(pid){
  // 既存の openUnitPickModal を流用（25体まで）
  _scnPickPid=pid;
  var settings=[];
  for(var i=0;i<_scnPC;i++)settings.push({type:_scnPlayerSettings[i].type,name:PCOLS[i].name});
  if(typeof openUnitPickModal==='function'){
    // pUnitPicks を一時バッファとして流用
    if(!pUnitPicks[pid])pUnitPicks[pid]=_scnPlayerSettings[pid].customUnits?_scnPlayerSettings[pid].customUnits.slice():[];
    openUnitPickModal(pid,_scnPC,settings,25 /* maxPicks */);
  }
}
// openUnitPickModal の確定時に呼ばれる（後で main.js の confirmPick を改造）
function _scnSavePicks(pid,picks){
  if(_scnPlayerSettings[pid]){
    _scnPlayerSettings[pid].customUnits=picks&&picks.length?picks.slice():null;
  }
  buildScnPSetup(_scnPC);
}
function setScnPC(btn,n){
  _scnPC=n;
  // 人数選択ボタンだけをハイライト（マップサイズ・人数を区別）
  ['scn_p2','scn_p3','scn_p4','scn_p5','scn_p6','scn_p7','scn_p8'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.classList.toggle('sel',el===btn);
  });
  // プレイヤー設定グリッドを再構築
  buildScnPSetup(n);
}
function setScnMapSize(sz){
  _scnSize=sz;
  ['scn_sz_s','scn_sz_m','scn_sz_l'].forEach(function(id){
    var el=document.getElementById(id);
    if(el){
      var match=(id==='scn_sz_s'&&sz==='small')||(id==='scn_sz_m'&&sz==='medium')||(id==='scn_sz_l'&&sz==='large');
      el.classList.toggle('sel',match);
    }
  });
}
function startScenarioFromUI(){
  try{
    onlineMode=false;
    if(typeof startScenarioMode!=='function'){
      showMsg('シナリオモジュール(scenario.js)がロードされていません',3000);
      console.error('[scenario] startScenarioMode is undefined');
      return;
    }
    console.log('[scenario] starting with np='+_scnPC+' size='+_scnSize);
    startScenarioMode(_scnPC,_scnSize);
  }catch(e){
    console.error('[scenario] startScenarioFromUI failed:',e);
    showMsg('シナリオ開始エラー: '+(e.message||e),3500);
  }
}

/* ===== シナリオをオンラインホストとして開始 =====
 *  接続済みのオンラインルームから直接シナリオを起動
 *  もしくは新規ルームを作って待機状態へ
 */
function startScenarioOnlineFromUI(){
  try{
    if(typeof startScenarioMode!=='function'){
      showMsg('シナリオモジュールがロードされていません',3000);return;
    }
    // 既にホストとしてルーム開設済みでクライアント接続済みなら、その場でシナリオ開始
    if(onlineMode&&isHost&&onlineConns.length>0){
      // 接続中の人数+ホスト1人で実際の人数を上書き
      var actualPC=Math.min(8,Math.max(2,onlineConns.length+1));
      console.log('[scenario] online host start: connected='+onlineConns.length+' actualPC='+actualPC);
      // シート整理
      onlineConns.sort(function(a,b){return a.seat-b.seat;});
      onlineConns.forEach(function(c,i){c.seat=i+1;});
      startScenarioMode(actualPC, _scnSize, {isHost:true});
    } else {
      // ルーム未開設 → ホスト開設のヒント
      showMsg('まずオンライン対戦からホストルームを作成し、クライアントが接続したらこのボタンで開始してください',4500);
      if(typeof showOnlineMenu==='function')showOnlineMenu();
    }
  }catch(e){
    console.error('[scenario] startScenarioOnlineFromUI failed:',e);
    showMsg('シナリオ開始エラー: '+(e.message||e),3500);
  }
}
