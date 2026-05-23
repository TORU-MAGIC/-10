// ================================================================
//  キングオブキングス v10.2 - 昼夜システム
// ================================================================
// 5ラウンド毎に昼→夜→昼…と切り替わる。
// 夜は索敵範囲が半減（最低1）。マップに暗色オーバーレイ、トップバーに🌙アイコン表示。
'use strict';

/* ===== 設定 ===== */
var DAYNIGHT_CYCLE=5; // 何ラウンド毎に切り替わるか
var dayNightEnabled=true; // 機能ON/OFF

/* ===== 現在の時間帯取得 =====
 * round=1〜DAYNIGHT_CYCLE: 朝, +1〜+DAYNIGHT_CYCLE: 夜 ...と繰り返し
 */
function getCurrentTimePhase(gs){
  gs=gs||GS;
  if(!gs||!dayNightEnabled)return 'day';
  // GS に明示的に保存されていればそれを使う（セーブ・同期用）
  if(gs.timePhase)return gs.timePhase;
  // ラウンドから算出
  var r=Math.max(1,gs.round||1);
  var cycleIdx=Math.floor((r-1)/DAYNIGHT_CYCLE);
  return (cycleIdx%2===0)?'day':'night';
}

/* ===== ラウンド進行時に GS.timePhase を更新 ===== */
function updateTimePhase(){
  if(!GS||!dayNightEnabled)return;
  var newPhase=getCurrentTimePhase(GS);
  if(GS.timePhase!==newPhase){
    var prev=GS.timePhase;
    GS.timePhase=newPhase;
    if(prev){ // 初回以外はログ＆通知
      var msg=newPhase==='night'?'🌙 夜になった。索敵範囲が半減する…':'☀ 朝が来た。視界が回復した！';
      if(typeof addLog==='function')addLog(msg,{sys:true});
      if(typeof showMsg==='function')showMsg(msg,2200);
    }
    // FoW 使用中は再描画必要
    if(typeof updateVisMap==='function')updateVisMap();
    if(typeof render==='function')render();
  }
}

/* ===== SIGHT_RANGE の動的修飾 =====
 * 夜は半減（最低1）。computeVisMap の中で参照される。
 */
function getEffectiveSightRange(type){
  var base=(typeof SIGHT_RANGE!=='undefined'&&SIGHT_RANGE[type])?SIGHT_RANGE[type]:3;
  if(getCurrentTimePhase()==='night')return Math.max(1,Math.floor(base/2));
  return base;
}

/* ===== computeVisMap を時間対応にラップ =====
 * 既存実装(v10.js)を上書きして SIGHT_RANGE 直接参照を getEffectiveSightRange に置き換える
 */
// v10.js の computeVisMap と同等の挙動 + SIGHT_RANGE → getEffectiveSightRange に置換のみ
function _computeVisMap_dayNight(pid){
  var vis=[];
  for(var r=0;r<ROWS;r++){vis[r]=[];for(var c=0;c<COLS;c++)vis[r][c]=false;}
  if(!GS)return vis;
  GS.units.forEach(function(u){
    if(u.owner!==pid||u.hp<=0)return;
    var sr=getEffectiveSightRange(u.type); // ★夜は半減
    for(var dr=-sr;dr<=sr;dr++)for(var dc=-sr;dc<=sr;dc++){
      if(Math.abs(dr)+Math.abs(dc)>sr)continue;
      var nr=u.row+dr,nc=u.col+dc;
      if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS)vis[nr][nc]=true;
    }
  });
  return vis;
}
// 既存 computeVisMap を置き換え（即時 + DOMContentLoaded 両方で確実に上書き）
function _installDayNightHooks(){
  // computeVisMap
  if(typeof window!=='undefined'&&typeof window.computeVisMap==='function'){
    window.computeVisMap=_computeVisMap_dayNight;
  }
  // advanceTurn ラッパ
  if(typeof window!=='undefined'&&typeof window.advanceTurn==='function'&&!window.advanceTurn._dayNightWrapped){
    var origAT=window.advanceTurn;
    window.advanceTurn=function(){
      var ret=origAT.apply(this,arguments);
      try{updateTimePhase();}catch(e){}
      return ret;
    };
    window.advanceTurn._dayNightWrapped=true;
  }
  // drawMap ラッパ（夜オーバーレイ）
  if(typeof window!=='undefined'&&typeof window.drawMap==='function'&&!window.drawMap._dayNightWrapped){
    var origDM=window.drawMap;
    window.drawMap=function(){
      var ret=origDM.apply(this,arguments);
      try{
        var cvs=document.getElementById('mapCanvas');
        if(cvs)drawNightOverlay(cvs.getContext('2d'));
      }catch(e){}
      return ret;
    };
    window.drawMap._dayNightWrapped=true;
  }
  // updUI ラッパ（時間帯アイコン）
  if(typeof window!=='undefined'&&typeof window.updUI==='function'&&!window.updUI._dayNightWrapped){
    var origUU=window.updUI;
    window.updUI=function(){
      var ret=origUU.apply(this,arguments);
      try{updateDayNightUI();}catch(e){}
      return ret;
    };
    window.updUI._dayNightWrapped=true;
  }
}
try{_installDayNightHooks();}catch(e){}
if(typeof window!=='undefined'){
  window.addEventListener('DOMContentLoaded',_installDayNightHooks);
}

/* advanceTurn ラップは _installDayNightHooks で行う */

/* ===== トップバーに時間帯アイコンを表示 =====
 * topWeather と並べて表示。既存の updUI 等から定期的に更新される。
 */
function updateDayNightUI(){
  if(!dayNightEnabled||!GS)return;
  var el=document.getElementById('topDayNight');
  if(!el){
    // 動的に作成（topWeather の隣に挿入）
    var tw=document.getElementById('topWeather');
    if(tw&&tw.parentElement){
      el=document.createElement('span');
      el.id='topDayNight';
      el.style.cssText='margin-left:8px;font-size:13px;display:inline-block';
      tw.parentElement.insertBefore(el,tw.nextSibling);
    }
  }
  if(el){
    var phase=getCurrentTimePhase();
    var roundsLeft=DAYNIGHT_CYCLE-((GS.round-1)%DAYNIGHT_CYCLE);
    if(phase==='night'){
      el.innerHTML='🌙<span style="font-size:8px;color:#88aacc">×0.5視界('+roundsLeft+'R)</span>';
      el.style.color='#88aacc';
    } else {
      el.innerHTML='☀<span style="font-size:8px;color:#ffcc44">('+roundsLeft+'R)</span>';
      el.style.color='#ffcc44';
    }
  }
}

/* ===== マップに夜の暗色オーバーレイを描く =====
 * drawMap の最後に呼ばれる想定（v10.js 末尾でラップ）
 */
function drawNightOverlay(c){
  if(!dayNightEnabled||!GS||getCurrentTimePhase()!=='night')return;
  if(typeof c==='undefined'){
    var cvs=document.getElementById('mapCanvas');
    if(!cvs)return;
    c=cvs.getContext('2d');
  }
  // 全マップに半透明の青黒オーバーレイ
  c.save();
  c.fillStyle='rgba(10,15,40,0.32)';
  c.fillRect(0,0,COLS*TW,ROWS*TH);
  // 月明かりの揺らぎ（軽め）
  var t=(Date.now()/3000)%(Math.PI*2);
  c.fillStyle='rgba(80,100,180,'+(0.03+0.02*Math.sin(t))+')';
  c.fillRect(0,0,COLS*TW,ROWS*TH);
  c.restore();
}

/* drawMap / updUI ラップは _installDayNightHooks で行う */

/* ===== 設定トグル ===== */
function toggleDayNight(){
  dayNightEnabled=!dayNightEnabled;
  if(GS)GS.timePhase=dayNightEnabled?getCurrentTimePhase(GS):'day';
  if(typeof updateVisMap==='function')updateVisMap();
  if(typeof render==='function')render();
  if(typeof updUI==='function')updUI();
  showMsg('🌙昼夜サイクル: '+(dayNightEnabled?'ON':'OFF'),1800);
}
