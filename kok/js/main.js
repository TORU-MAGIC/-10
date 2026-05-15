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
function hideAllBoxes(){['modeBox','offlineBox','onlineBox','hostBox','joinBox','customBox'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='none';});}
function showOfflineSetup(){hideAllBoxes();document.getElementById('offlineBox').style.display='flex';buildPSetup(4);}
function showOnlineMenu(){hideAllBoxes();document.getElementById('onlineBox').style.display='flex';}
var _pcSel=4;
function setPC(btn,n){_pcSel=n;document.querySelectorAll('#offlineBox .pcb').forEach(function(b){b.classList.toggle('sel',b===btn);});buildPSetup(n);}
function buildPSetup(n){
  _pcSel=n;var g=document.getElementById('pSetupGrid');g.innerHTML='';
  for(var i=0;i<n;i++){var pc=PCOLS[i];var div=document.createElement('div');div.className='pcard';
    div.innerHTML='<div class="phead"><span class="pdot" style="background:'+pc.main+'"></span><span style="color:'+pc.light+'">P'+(i+1)+' '+pc.name+'</span></div>'+
      '<select class="sel2" id="pt'+i+'"><option value="human">👤 人間</option><option value="aggressive">⚔ 攻撃型CPU</option><option value="cautious">🛡 慎重型CPU</option><option value="genius">🧠 頭脳型CPU</option></select>';
    g.appendChild(div);if(i>0){var sel=div.querySelector('select');sel.value=AI_TYPES[i%AI_TYPES.length];}}
}
function startOffline(){
  var n=_pcSel,settings=[];
  for(var i=0;i<n;i++){var t=document.getElementById('pt'+i);settings.push({name:PCOLS[i].name,type:t?t.value:'aggressive'});}
  // マップサイズ・生成モードを適用（COLS,ROWS,TW,TH,CASTLE_POS,MAPを更新）
  applyMapSettings(n);
  GS=newGS(n,settings);
  useWeather=parseInt(document.getElementById('optWeather').value)===1;
  useEvent=parseInt(document.getElementById('optEvent').value)===1;
  onlineMode=false;startGame();
}
function startGame(){
  switchScreen('gameScreen');initMap();
  isMyTurn=isHuman(GS.turn);
  document.getElementById('topWeather').textContent=useWeather?GS.weather.icon:'';
  document.getElementById('pauseBtn').style.display=allCPU()?'block':'none';
  document.getElementById('dpad').style.display='flex';
  var inc=startOfTurn(GS,GS.turn);if(inc>0)addLog(GS.players[GS.turn].name+': +'+inc+'G',{sys:true});
  render();updUI();showTurnNotif(GS.turn);
  if(!isHuman(GS.turn))setTimeout(function(){runCPUTurn(GS.turn);},900);
}
function goTitle(){
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
    cancelSel();isMyTurn=isHuman(GS.turn);
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
  // 6プレイヤー分の城砦位置（マップサイズに応じた相対座標）
  // 各プレイヤーの城砦位置を角・辺に配置
  CASTLE_POS=[
    [0,           0          ],  // P1: 左上
    [0,           cols-1     ],  // P2: 右上
    [rows-1,      0          ],  // P3: 左下
    [rows-1,      cols-1     ],  // P4: 右下
    [Math.floor(rows/2), 0   ],  // P5: 左中
    [Math.floor(rows/2), cols-1], // P6: 右中
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
  if(btn)btn.textContent=battleSpeedMode==='skip'?'⚡高速':'🎬全表示';
  showMsg(battleSpeedMode==='skip'?'CPUバトルをスキップします':'全バトルを表示します',1500);
}
