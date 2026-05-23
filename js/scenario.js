// ================================================================
//  キングオブキングス v10.2 - シナリオモード「中央城砦攻略」
// ================================================================
// 中央(9,11)(9,12)の城砦を75体のLv10守備隊が守護。
// プレイヤーは四隅から侵攻し、先に中央城砦を占拠したものが勝利。
// 守備隊は陣形を組み、有利属性ユニットでカウンター生産する。
'use strict';

/* ===== シナリオモード状態 ===== */
var scenarioMode=false;     // 現在シナリオ中か
var scenarioGoal=null;      // {r,c} 占拠目標
var SCENARIO_GARRISON_PID=null; // 中央軍のプレイヤーID（動的に決まる）
var scenarioMapSize='medium'; // 'small'|'medium'|'large'
var scenarioPlayerCount=4;   // 2-8

/* =====================================================================
 *  シナリオマップ — 大中小 3 サイズ
 *  tid: 0=平原 1=森 2=山岳 3=平原B 4=都市 5=城砦 6=丘 7=神殿
 *  各マップで中央に城砦×2、周囲を山岳と森で防衛。
 *  プレイヤーは外周の城砦から侵攻。
 * ================================================================== */

/* ----- 小マップ 16x12 / 中央(5,7)(5,8) / 守備隊 50体 ----- */
// ★山岳(tid=2)を削除し平原・森・丘に置換
var SCENARIO_MAP_S=[
  // 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15
  [ 5, 0, 1, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 1, 0, 5], // 0
  [ 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0], // 1
  [ 1, 0, 0, 4, 0, 6, 0, 7, 7, 0, 6, 0, 4, 0, 0, 1], // 2
  [ 0, 0, 0, 0, 0, 1, 6, 6, 6, 6, 1, 0, 0, 0, 0, 0], // 3
  [ 0, 0, 4, 0, 0, 0, 6, 0, 0, 6, 0, 0, 0, 4, 0, 0], // 4
  [ 0, 0, 0, 0, 0, 0, 0, 5, 5, 0, 0, 0, 0, 0, 0, 0], // 5 ★中央城砦
  [ 0, 0, 0, 0, 0, 0, 0, 5, 5, 0, 0, 0, 0, 0, 0, 0], // 6 ★中央城砦
  [ 0, 0, 4, 0, 0, 0, 6, 0, 0, 6, 0, 0, 0, 4, 0, 0], // 7
  [ 0, 0, 0, 0, 0, 1, 6, 6, 6, 6, 1, 0, 0, 0, 0, 0], // 8
  [ 1, 0, 0, 4, 0, 6, 0, 7, 7, 0, 6, 0, 4, 0, 0, 1], // 9
  [ 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0], //10
  [ 5, 0, 1, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 1, 0, 5], //11
];

/* ----- 中マップ 24x18 / 中央(9,11)(9,12) / 守備隊 50体 ----- */
// ★山岳(tid=2)を削除し、平原・森・丘に置換
var SCENARIO_MAP_M=[
  // 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23
  [ 5, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 5], // 0
  [ 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0], // 1
  [ 0, 1, 1, 0, 0, 4, 0, 6, 1, 1, 7, 0, 0, 7, 1, 1, 6, 0, 4, 0, 0, 1, 1, 0], // 2
  [ 1, 1, 0, 0, 0, 0, 0, 6, 1, 6, 6, 6, 6, 6, 6, 1, 6, 0, 0, 0, 0, 0, 1, 1], // 3
  [ 1, 0, 0, 0, 4, 0, 0, 0, 1, 6, 0, 0, 0, 0, 6, 1, 0, 0, 0, 4, 0, 0, 0, 1], // 4
  [ 0, 0, 0, 0, 0, 0, 6, 0, 1, 6, 0, 4, 4, 0, 6, 1, 0, 6, 0, 0, 0, 0, 0, 0], // 5
  [ 0, 0, 4, 0, 0, 0, 0, 0, 1, 6, 0, 7, 7, 0, 6, 1, 0, 0, 0, 0, 0, 4, 0, 0], // 6
  [ 0, 0, 0, 0, 0, 0, 0, 1, 1, 6, 6, 0, 0, 6, 6, 1, 1, 0, 0, 0, 0, 0, 0, 0], // 7
  [ 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 6, 0, 0, 6, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0], // 8
  [ 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 5, 5, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0], // 9 ★中央城砦
  [ 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 6, 0, 0, 6, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0], //10
  [ 0, 0, 0, 0, 0, 0, 0, 1, 1, 6, 6, 0, 0, 6, 6, 1, 1, 0, 0, 0, 0, 0, 0, 0], //11
  [ 0, 0, 4, 0, 0, 0, 0, 0, 1, 6, 0, 7, 7, 0, 6, 1, 0, 0, 0, 0, 0, 4, 0, 0], //12
  [ 0, 0, 0, 0, 0, 0, 6, 0, 1, 6, 0, 4, 4, 0, 6, 1, 0, 6, 0, 0, 0, 0, 0, 0], //13
  [ 1, 0, 0, 0, 4, 0, 0, 0, 1, 6, 0, 0, 0, 0, 6, 1, 0, 0, 0, 4, 0, 0, 0, 1], //14
  [ 1, 1, 0, 0, 0, 0, 0, 6, 1, 6, 6, 6, 6, 6, 6, 1, 6, 0, 0, 0, 0, 0, 1, 1], //15
  [ 0, 1, 1, 0, 0, 4, 0, 6, 1, 1, 7, 0, 0, 7, 1, 1, 6, 0, 4, 0, 0, 1, 1, 0], //16
  [ 5, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 5], //17
];

/* ----- 大マップ 32x24 / 中央(11,15)(11,16) / 守備隊 50体 ----- */
// ★山岳を削除 → 丘・森のみで防衛ラインを構成
var SCENARIO_MAP_L=(function(){
  var rows=24,cols=32;
  var m=[];
  for(var r=0;r<rows;r++){
    var row=[];
    for(var c=0;c<cols;c++){
      var tid=0;
      // 四隅に城砦
      if((r===0||r===rows-1)&&(c===0||c===cols-1))tid=5;
      // 中央 (11,15)(11,16) と (12,15)(12,16) に城砦
      else if((r===11||r===12)&&(c===15||c===16))tid=5;
      // 中央からの距離による地形配置
      else {
        var dr=r-11.5,dc=c-15.5;
        var d=Math.sqrt(dr*dr+dc*dc);
        if(d>=5&&d<6.5)tid=6;       // 丘（防衛ライン・旧山岳）
        else if(d>=6.5&&d<8)tid=1;  // 森
        else if(d>=3&&d<5){
          // 内環: 神殿と都市
          if(((r+c)%5)===0)tid=7;
          else if(((r+c)%7)===0)tid=4;
        }
        // 周辺都市
        else if(d>10){
          if((r===2||r===rows-3||r===Math.floor(rows/2))&&((c%6)===2))tid=4;
        }
      }
      row.push(tid);
    }
    m.push(row);
  }
  // 中央城砦を確実に配置
  m[11][15]=5;m[11][16]=5;m[12][15]=5;m[12][16]=5;
  // 四隅も
  m[0][0]=5;m[0][cols-1]=5;m[rows-1][0]=5;m[rows-1][cols-1]=5;
  // 中央軸の都市
  m[5][15]=4;m[5][16]=4;m[18][15]=4;m[18][16]=4;
  m[11][5]=4;m[11][26]=4;m[12][5]=4;m[12][26]=4;
  // 神殿
  m[8][15]=7;m[8][16]=7;m[15][15]=7;m[15][16]=7;
  return m;
})();

// シナリオ用城砦位置（プレイヤー城砦のみ。中央城砦は別管理）
// 各マップサイズで 2〜8 人分の位置を定義
var SCENARIO_CASTLE_POS_S=[ // 小マップ 16x12
  [0,0],[0,15],[11,0],[11,15],          // P1-4: 四隅
  [5,0],[6,15],                          // P5-6: 左右中央
  [0,7],[11,8],                          // P7-8: 上下中央
];
var SCENARIO_CASTLE_POS_M=[ // 中マップ 24x18
  [0,0],[0,23],[17,0],[17,23],           // P1-4: 四隅
  [8,0],[9,23],                          // P5-6: 左右中央
  [0,11],[17,12],                        // P7-8: 上下中央
];
var SCENARIO_CASTLE_POS_L=[ // 大マップ 32x24
  [0,0],[0,31],[23,0],[23,31],           // P1-4: 四隅
  [11,0],[12,31],                        // P5-6: 左右中央
  [0,15],[23,16],                        // P7-8: 上下中央
];

// 中央城砦座標（マップサイズ別）
var SCENARIO_GOAL_S={r:5,c:7,sec:{r:5,c:8}};
var SCENARIO_GOAL_M={r:9,c:11,sec:{r:9,c:12}};
var SCENARIO_GOAL_L={r:11,c:15,sec:{r:11,c:16}};

// プレイヤー初期25体配備の構成（攻撃に必要な兵種をバランスよく）
var SCENARIO_PLAYER_UNITS=[
  'soldier','soldier','soldier','soldier', // 主力歩兵×4
  'archer','archer','archer',              // 弓兵×3
  'knight','knight',                       // 騎士×2
  'mage','mage',                           // 魔法×2
  'healer','healer',                       // 回復×2
  'paladin','paladin',                     // 聖騎士×2
  'monk',                                  // モンク（重装特効）
  'ninja',                                 // 忍者（ステルス）
  'spy',                                   // スパイ（偵察）
  'witch',                                 // 魔女
  'catapult',                              // 投石機
  'berserker',                             // 狂戦士
  'dualblader',                            // 二刀士
  'hero',                                  // 英雄
  'valkyrie',                              // ヴァルキリー（飛行）
];

// 旧名互換用エイリアス
var SCENARIO_MAP=SCENARIO_MAP_M;
var SCENARIO_CASTLE_POS=SCENARIO_CASTLE_POS_M;
var SCENARIO_GOAL={r:9,c:11};
var SCENARIO_GOAL_SECONDARY={r:9,c:12};

// =====================================================================
// ★中央軍配備: 全サイズ 50体・Lv10 で統一
// 構成（合計50体）:
//   内環 14体: paladin*4 / titan*4 / king*1 / arcanelord*1 / hero*2 / valkyrie*2
//   中環 16体: knight*4 / monk*4 / mage*2 / healer*4 / dualblader*2
//   外環 10体: archer*4 / witch*2 / necromancer*2 / assassin*2
//   神殿  4体: paladin*2 / phoenix*2
//   切り札 6体: dragon*4 / berserker*2
// =====================================================================

/* ----- 中マップ 24x18 用守備隊 30体 / 中央(9,11)(9,12) ----- */
var SCENARIO_GARRISON_M=[
  // 内環 8体（王の直接護衛）
  [8,11,'titan'],[8,12,'titan'],
  [9,10,'king'],[9,13,'arcanelord'],
  [10,11,'titan'],[10,12,'titan'],
  [7,11,'valkyrie'],[7,12,'valkyrie'],
  // 中環 10体
  [7,10,'knight'],[7,13,'knight'],[11,10,'knight'],[11,13,'knight'],
  [8,9,'mage'],[8,14,'mage'],
  [9,9,'healer'],[9,14,'healer'],
  [11,11,'monk'],[11,12,'monk'],
  // 外環 6体
  [6,11,'archer'],[6,12,'archer'],
  [9,7,'witch'],[9,16,'witch'],
  [9,4,'assassin'],[9,18,'assassin'],
  // 切り札 6体（外側ドラゴン4 + hero2）
  [0,11,'dragon'],[0,12,'dragon'],
  [17,11,'dragon'],[17,12,'dragon'],
  [4,11,'hero'],[14,12,'hero'],
];

// 旧名互換用エイリアス
var SCENARIO_GARRISON=SCENARIO_GARRISON_M;

/* ----- 小マップ 16x12 用守備隊 30体 / 中央(5,7)(5,8) ----- */
var SCENARIO_GARRISON_S=[
  // 内環 8体
  [4,7,'titan'],[4,8,'titan'],
  [5,6,'king'],[5,9,'arcanelord'],
  [6,7,'titan'],[6,8,'titan'],
  [3,7,'valkyrie'],[3,8,'valkyrie'],
  // 中環 10体
  [3,6,'knight'],[3,9,'knight'],[7,6,'knight'],[7,9,'knight'],
  [4,5,'mage'],[4,10,'mage'],
  [5,5,'healer'],[5,10,'healer'],
  [6,5,'monk'],[6,10,'monk'],
  // 外環 6体
  [2,7,'archer'],[2,8,'archer'],
  [5,3,'witch'],[5,12,'witch'],
  [5,2,'assassin'],[5,13,'assassin'],
  // 切り札 6体
  [0,7,'dragon'],[0,8,'dragon'],
  [11,7,'dragon'],[11,8,'dragon'],
  [8,6,'hero'],[8,9,'hero'],
];

/* ----- 大マップ 32x24 用守備隊 30体 / 中央(11,15)(11,16) ----- */
var SCENARIO_GARRISON_L=[
  // 内環 8体
  [10,15,'titan'],[10,16,'titan'],
  [11,14,'king'],[11,17,'arcanelord'],
  [12,15,'titan'],[12,16,'titan'],
  [9,15,'valkyrie'],[9,16,'valkyrie'],
  // 中環 10体
  [9,14,'knight'],[9,17,'knight'],[13,14,'knight'],[13,17,'knight'],
  [10,13,'mage'],[10,18,'mage'],
  [11,13,'healer'],[11,18,'healer'],
  [12,13,'monk'],[12,18,'monk'],
  // 外環 6体
  [8,15,'archer'],[8,16,'archer'],
  [11,11,'witch'],[12,20,'witch'],
  [11,5,'assassin'],[12,26,'assassin'],
  // 切り札 6体
  [0,15,'dragon'],[0,16,'dragon'],
  [23,15,'dragon'],[23,16,'dragon'],
  [5,15,'hero'],[18,16,'hero'],
];

/* ===== マップサイズ別データ取得 ===== */
function getScenarioData(size){
  if(size==='small')return{
    map:SCENARIO_MAP_S, castlePos:SCENARIO_CASTLE_POS_S,
    goal:SCENARIO_GOAL_S, garrison:SCENARIO_GARRISON_S,
    tw:68, th:68
  };
  if(size==='large')return{
    map:SCENARIO_MAP_L, castlePos:SCENARIO_CASTLE_POS_L,
    goal:SCENARIO_GOAL_L, garrison:SCENARIO_GARRISON_L,
    tw:42, th:42
  };
  // medium デフォルト
  return{
    map:SCENARIO_MAP_M, castlePos:SCENARIO_CASTLE_POS_M,
    goal:{r:9,c:11,sec:{r:9,c:12}}, garrison:SCENARIO_GARRISON_M,
    tw:52, th:52
  };
}

/* ===== シナリオモード開始 =====
 *  np: 攻撃側プレイヤー数（2〜8）
 *  size: 'small'|'medium'|'large'
 *  onlineSetup: { isHost:true, conns:[...], playerNames:[...] } — オンラインホスト時のみ
 */
function startScenarioMode(np,size,onlineSetup){
  try{
    np=Math.max(2,Math.min(8,np|0||4));
    size=size||scenarioMapSize||'medium';
    scenarioMapSize=size;
    scenarioPlayerCount=np;
    scenarioMode=true;
    SCENARIO_GARRISON_PID=np; // 最後尾シートが守備隊
    var isOnlineHost=!!(onlineSetup&&onlineSetup.isHost);

    // ★1. マップサイズ別データを取得
    var sdata=getScenarioData(size);
    MAP=JSON.parse(JSON.stringify(sdata.map));
    ROWS=MAP.length; COLS=MAP[0].length;
    TW=sdata.tw; TH=sdata.th;
    if(typeof mapSizeKey!=='undefined')mapSizeKey=(size==='small'?'small':size==='large'?'large':'medium');
    if(typeof mapMode!=='undefined')mapMode='fixed';

    var goalR=sdata.goal.r, goalC=sdata.goal.c;
    var goalSecR=sdata.goal.sec.r, goalSecC=sdata.goal.sec.c;

    // ★2. CASTLE_POS — プレイヤー(np人) + 中央軍(np番目)
    if(sdata.castlePos.length<np){
      throw new Error('このマップサイズでは最大'+sdata.castlePos.length+'人まで');
    }
    CASTLE_POS=sdata.castlePos.slice(0,np);
    CASTLE_POS.push([goalR,goalC]); // 中央軍は中央城砦から
    scenarioGoal={r:goalR,c:goalC};

    // ★3. INIT_UNITS — 全プレイヤー(np+1)分。後で 25体配備に置き換え
    INIT_UNITS=CASTLE_POS.map(function(cp){
      var r=cp[0],c=cp[1];
      var dirs=[[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]];
      var pos=[];
      for(var i=0;i<dirs.length&&pos.length<2;i++){
        var nr=r+dirs[i][0],nc=c+dirs[i][1];
        if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS)pos.push([nr,nc]);
      }
      return pos;
    });

    // ★4. プレイヤー設定 + 中央軍
    // _scnPlayerSettings がある場合はそれを優先（CPU性格を反映）
    var settings=[];
    var aiCycle=['aggressive','cautious','genius','aggressive'];
    for(var i=0;i<np;i++){
      var typ;
      if(typeof _scnPlayerSettings!=='undefined'&&_scnPlayerSettings[i]&&_scnPlayerSettings[i].type){
        typ=_scnPlayerSettings[i].type;
      } else {
        typ=(i===0?'human':aiCycle[(i-1)%aiCycle.length]);
      }
      settings.push({name:PCOLS[i].name||('P'+(i+1)),type:typ});
    }
    settings.push({name:'⚔ 中央守備隊',type:'fortress'});

    // ★5. GS 生成（守備隊込み = np+1 プレイヤー）
    GS=newGS(np+1,settings);

    // ★6. 守備隊の通常生成された王様＋兵士を削除（中央配備で再構成）
    GS.units=GS.units.filter(function(u){return u.owner!==SCENARIO_GARRISON_PID;});

    // ★7. 中央城砦の所有権を守備隊に設定
    if(GS.own[goalR])GS.own[goalR][goalC]=SCENARIO_GARRISON_PID;
    if(GS.own[goalSecR])GS.own[goalSecR][goalSecC]=SCENARIO_GARRISON_PID;
    // 大マップの場合 12,15 と 12,16 も追加
    if(size==='large'){
      if(GS.own[12])GS.own[12][15]=SCENARIO_GARRISON_PID;
      if(GS.own[12])GS.own[12][16]=SCENARIO_GARRISON_PID;
    }

    // ★8. 守備隊の軍資金・士気
    // ★最弱化: 軍資金 0 + 士気低下（生産も不可）
    if(GS.players[SCENARIO_GARRISON_PID]){
      GS.players[SCENARIO_GARRISON_PID].gold=0;
      GS.players[SCENARIO_GARRISON_PID].morale=90; // 士気低下で攻撃力さらに減
    }

    // ★9. 守備隊配備（Lv1・HP100%）
    var placed=0;
    sdata.garrison.forEach(function(spec){
      var r=spec[0],c=spec[1],type=spec[2];
      if(r<0||r>=ROWS||c<0||c>=COLS)return;
      if(!UDEFS[type])return;
      if(uAt(GS,r,c))return;
      var u=mkU(GS,type,SCENARIO_GARRISON_PID,r,c,false);
      // ★HP は基本値（mkU 内で mhp=UDEFS[type].hp が設定済み）
      if(typeof recalcSquadAlive==='function')recalcSquadAlive(u);
      GS.units.push(u);
      placed++;
    });

    // ★10. プレイヤー側に 25体配備（カスタム選択 or デフォルト構成）
    var playerUnitCount=0;
    for(var pid=0;pid<np;pid++){
      var existing=GS.units.filter(function(u){return u.owner===pid;}).length;
      var addCount=Math.max(0,25-existing);
      // ★カスタム選択があればそれを使用、無ければデフォルト
      var picksBase=SCENARIO_PLAYER_UNITS;
      if(typeof _scnPlayerSettings!=='undefined'&&_scnPlayerSettings[pid]&&_scnPlayerSettings[pid].customUnits&&_scnPlayerSettings[pid].customUnits.length){
        // 選択されたユニットで25体を埋める（不足分は繰り返し配置）
        var custom=_scnPlayerSettings[pid].customUnits;
        picksBase=[];
        for(var k=0;k<addCount;k++)picksBase.push(custom[k%custom.length]);
      }
      if(addCount>0&&typeof placeUnitsNear==='function'){
        var picks=picksBase.slice(0,addCount);
        placeUnitsNear(GS,pid,picks);
      }
      // ★バランス調整: 攻撃側の軍資金を大幅増額
      GS.players[pid].gold=(size==='small'?900:size==='large'?2000:1500);
      // ★バランス調整: 攻撃側ユニットの初期Lvを Lv3 に底上げ（Lv5守備隊と差4）
      GS.units.filter(function(u){return u.owner===pid;}).forEach(function(u){
        u.level=3;
        u.mhp=UDEFS[u.type].hp+2*3; // +3 HP/Lv × 2
        u.hp=u.mhp;
        if(typeof recalcSquadAlive==='function')recalcSquadAlive(u);
      });
      playerUnitCount+=GS.units.filter(function(u){return u.owner===pid;}).length;
    }

    // ★11. シナリオ情報を GS に保存
    GS.scenarioMode=true;
    GS.scenarioMapSize=size;
    GS.scenarioGoal={r:goalR,c:goalC};
    GS.scenarioGoalSec={r:goalSecR,c:goalSecC};
    GS.scenarioGarrisonPid=SCENARIO_GARRISON_PID;

    // ★12. 天候・イベント 有効化（索敵・戦闘演出は UI 設定に従う）
    useWeather=true;useEvent=true;
    // ★useFoW / useAmbush / battleSpeedMode は scenarioBox UI で設定された値をそのまま使う
    // _scnBattleMode が設定されていればそれを優先（未設定なら skip がデフォルト）
    if(typeof _scnBattleMode==='string'&&typeof battleSpeedMode!=='undefined'){
      battleSpeedMode=_scnBattleMode;
    }

    // ★13. ゲーム画面へ
    hideAllBoxes();
    if(!isOnlineHost){
      onlineMode=false;
    } else {
      // ★オンラインホスト: 全クライアントへ start を配布（GS + scenario メタ）
      var gsSer=serGS();
      onlineConns.forEach(function(c){
        try{c.conn.send({
          type:'start',
          gs:gsSer,
          seat:c.seat,
          np:np+1, // 中央軍を含む
          settings:settings,
          serverVersion:KOK_VERSION,
          useFoW:useFoW,
          useAmbush:useAmbush,
          // ★Fix#4: 戦闘演出モードを共有
          battleSpeedMode:(typeof battleSpeedMode!=='undefined'?battleSpeedMode:'skip'),
          // ★シナリオメタ情報
          scenarioMode:true,
          scenarioMapSize:size,
          scenarioGoal:{r:goalR,c:goalC},
          scenarioGoalSec:{r:goalSecR,c:goalSecC},
          scenarioGarrisonPid:SCENARIO_GARRISON_PID,
          scenarioMap:MAP,  // マップも配布（クライアントは MAP を持っていない可能性あり）
          scenarioTW:TW, scenarioTH:TH,
          scenarioRows:ROWS, scenarioCols:COLS,
          scenarioCastlePos:CASTLE_POS
        });}catch(e){console.warn('scenario start send failed:',e);}
      });
    }
    if(typeof startGame==='function'){
      startGame();
    } else {
      if(typeof switchScreen==='function')switchScreen('gameScreen');
      if(typeof initMap==='function')initMap();
      if(typeof render==='function')render();
      if(typeof updUI==='function')updUI();
    }
    // ★ホスト: ackResendLoop / heartbeat を確実に開始
    if(isOnlineHost){
      if(typeof startAckResendLoop==='function')startAckResendLoop();
      if(typeof startHeartbeat==='function')startHeartbeat();
    }

    // ★13.5 初期描画を確実に（useFoW ON時の _visMap 生成）
    setTimeout(function(){
      if(typeof updateVisMap==='function')updateVisMap();
      if(typeof render==='function')render();
      if(typeof updUI==='function')updUI();
    },50);

    // ★14. 説明ポップアップ
    setTimeout(function(){
      if(typeof showEvt==='function'){
        var sizeLabel={'small':'小','medium':'中','large':'大'}[size];
        // 観戦モード（全員CPU）判定
        var hasHuman=false;
        for(var pi=0;pi<np;pi++){if(GS.players[pi]&&GS.players[pi].aiType==='human'){hasHuman=true;break;}}
        var modeLabel=hasHuman?'':'\n🎬【観戦モード】全員CPUの戦いを観戦できます';
        showEvt('⚔ シナリオ: 中央王討伐 ['+sizeLabel+']',
          '中央の城砦を'+placed+'体の Lv1 守備隊が守護している。\n' +
          '攻撃側'+np+'人 × 25体 = 計'+playerUnitCount+'体で侵攻！\n' +
          '👑 中央軍の王を倒した国が優勝 👑\n' +
          '★Lv上限: 20\n' +
          (useFoW?'【索敵ON】霧と待ち伏せに注意。':'【索敵OFF】全マップが見えます。') +
          modeLabel);
      }
    },300);
  } catch(e){
    console.error('[scenario] startScenarioMode failed:',e);
    if(typeof showMsg==='function')showMsg('シナリオ開始エラー: '+(e.message||e),3500);
    else alert('シナリオ開始エラー: '+(e.message||e));
  }
}

/* ===== シナリオモード勝利判定 =====
 *  ★勝利条件変更: 「中央軍の王を倒した国が優勝」
 *  scenarioKingKiller に最後に中央王を撃破したプレイヤーIDを記録
 */
function checkScenarioWin(gs){
  if(!gs||!gs.scenarioMode||gs.scenarioGarrisonPid==null)return false;
  // ★中央軍の王の生存チェック
  var fortressKing=null;
  for(var i=0;i<gs.units.length;i++){
    var u=gs.units[i];
    if(u.owner===gs.scenarioGarrisonPid&&u.type==='king'&&u.hp>0){fortressKing=u;break;}
  }
  if(!fortressKing){
    // 中央王が倒れた → 撃破者が勝利
    var winner=gs.scenarioKingKiller;
    if(winner==null||winner<0||winner===gs.scenarioGarrisonPid){
      // 撃破者不明（例: フィールド魔法・他要因）→ 最も中央軍を倒したプレイヤーを勝者に
      var bestKills=-1, bestPid=-1;
      for(var pi=0;pi<gs.np;pi++){
        if(pi===gs.scenarioGarrisonPid)continue;
        if(!gs.players[pi].alive)continue;
        var k=(gs.stats[pi]&&gs.stats[pi].killed)||0;
        if(k>bestKills){bestKills=k;bestPid=pi;}
      }
      winner=bestPid;
    }
    gs.over=true;
    gs.winner=winner;
    if(winner>=0&&gs.players[winner]){
      addLog('🎉 '+gs.players[winner].name+' が中央軍の王を討伐！シナリオクリア！',{hot:true});
    } else {
      addLog('💀 中央軍の王が倒れた',{hot:true});
    }
    return true;
  }
  // 全攻撃側プレイヤー全滅 → シナリオ失敗
  var aliveAttackers=0;
  for(var pi=0;pi<gs.np;pi++){
    if(pi!==gs.scenarioGarrisonPid&&gs.players[pi].alive)aliveAttackers++;
  }
  if(aliveAttackers===0){
    gs.over=true;
    gs.winner=gs.scenarioGarrisonPid;
    addLog('💀 全攻撃側が壊滅。中央守備隊の勝利。',{hot:true});
    return true;
  }
  return false;
}

/* ===== シナリオ: 中央軍の checkWin 特例 =====
 * 中央軍は王様が死んでも滅亡しない（拠点防衛特化）
 */
function applyScenarioWinOverride(){
  if(typeof checkWin!=='function')return;
  if(checkWin._scenarioWrapped)return;
  var orig=checkWin;
  checkWin=function(gs){
    if(gs&&gs.scenarioMode&&gs.scenarioGarrisonPid!=null){
      // 中央軍のみ: alive=true を維持（城砦を持つ限り敗北しない判定はオリジナルでもOKだが、王様喪失で消えるのを防ぐ）
      var keepAlive=gs.players[gs.scenarioGarrisonPid]&&gs.players[gs.scenarioGarrisonPid].alive;
      var origUnitsCount=gs.units.length;
      orig(gs);
      // 中央軍は城砦を保持していれば生き残らせる
      if(keepAlive&&gs.players[gs.scenarioGarrisonPid]){
        var g=gs.scenarioGoal;
        var hasCentral=g&&gs.own[g.r]&&gs.own[g.r][g.c]===gs.scenarioGarrisonPid;
        if(hasCentral){
          gs.players[gs.scenarioGarrisonPid].alive=true;
          // 王様喪失で消されたユニットは復元しない（再生は別途）が、alive 維持で生産・行動は可能
        }
      }
    } else {
      orig(gs);
    }
    // シナリオ勝利判定
    if(gs&&gs.scenarioMode)checkScenarioWin(gs);
  };
  checkWin._scenarioWrapped=true;
}
// 起動時にラップ適用（即時 + DOMContentLoaded 両方で）
try{applyScenarioWinOverride();}catch(e){}
if(typeof window!=='undefined'){
  window.addEventListener('DOMContentLoaded',function(){applyScenarioWinOverride();});
}

/* ===== シナリオ: 中央軍AI 'fortress' =====
 * - 陣形維持（外周ユニットは城砦から半径3〜5を維持）
 * - 接近する敵プレイヤーユニットへ集中攻撃
 * - 有利属性のカウンターユニットを生産
 * - HP低下時は神殿/城砦内へ後退
 */
function isScenarioGarrison(pid){
  return GS&&GS.scenarioMode&&pid===GS.scenarioGarrisonPid;
}

// 攻撃側ユニットの統計を取って弱点をついた生産タイプを返す
function fortressPickProd(){
  if(!GS)return 'soldier';
  var enemies=GS.units.filter(function(u){return u.owner!==GS.scenarioGarrisonPid&&u.hp>0;});
  if(enemies.length===0)return 'paladin'; // デフォルト
  // 属性別カウント
  var elemCt={};
  enemies.forEach(function(e){
    var el=UDEFS[e.type]?UDEFS[e.type].elem:'none';
    elemCt[el]=(elemCt[el]||0)+1;
  });
  // 最も多い属性に対するカウンター
  var dom=Object.keys(elemCt).sort(function(a,b){return elemCt[b]-elemCt[a];})[0]||'none';
  var counterByElem={
    fire:'archer',     // 火 → 自然(archer)
    ice:'mage',        // 氷 → 火(mage)
    thunder:'monk',    // 雷 → 物理重装(monk)
    nature:'mage',     // 自然 → 火
    earth:'mage',      // 大地 → 魔法
    holy:'witch',      // 聖 → 闇(witch)
    dark:'paladin',    // 闇 → 聖(paladin)
    none:'knight'
  };
  // 3すくみのカテゴリ別
  var catCt={heavy:0,magic:0,swift:0};
  enemies.forEach(function(e){var cc=TYPE_CAT[e.type];if(cc)catCt[cc]++;});
  var domCat=Object.keys(catCt).sort(function(a,b){return catCt[b]-catCt[a];})[0];
  // heavy相手はswift(monk), magic相手はheavy(paladin), swift相手はmagic(mage)
  var counterByCat={heavy:'monk',magic:'paladin',swift:'mage'};
  // 高レベル敵には特化カウンター
  var hi=enemies.slice().sort(function(a,b){return(b.level||1)-(a.level||1);})[0];
  if(hi&&(hi.level||1)>=4){
    var found=Object.entries(UDEFS).find(function(e){return getAffMult(e[0],hi.type)>=3&&e[0]!=='king'&&e[0]!=='skeleton';});
    if(found)return found[0];
  }
  // ゴールドに応じて選択
  var gold=GS.players[GS.scenarioGarrisonPid].gold;
  // ★バランス再調整: 高額切り札はめったに出ない（攻略可能なバランス）
  if(gold>=1200&&Math.random()<0.05)return 'arcanelord';
  if(gold>=800&&Math.random()<0.05)return 'dragon';
  if(gold>=700&&Math.random()<0.10)return 'titan';
  if(gold>=560&&Math.random()<0.10)return 'valkyrie';
  // 通常: 属性カウンター優先 → カテゴリカウンター
  if(elemCt[dom]>=3&&counterByElem[dom]&&gold>=UDEFS[counterByElem[dom]].cost)return counterByElem[dom];
  if(domCat&&counterByCat[domCat]&&gold>=UDEFS[counterByCat[domCat]].cost)return counterByCat[domCat];
  // フォールバック
  var fallback=['paladin','knight','archer','soldier'];
  for(var i=0;i<fallback.length;i++){if(gold>=UDEFS[fallback[i]].cost)return fallback[i];}
  return 'soldier';
}

// 中央軍ターン処理（既存 runCPUTurn を拡張）
// ★最弱化: 生産は完全停止、移動と攻撃のみ
function runFortressTurn(pid,callback){
  if(!GS||GS.over){if(callback)callback();return;}
  var goal=GS.scenarioGoal;
  // ★生産は一切行わない（ゴールド0 + 戦力固定）
  // フェーズ2: ★関心圏内ユニットを抽出（敵が近い・城砦が攻められそう）
  // 敵プレイヤーの全ユニットから「最も近い敵」を計算し、自軍ユニットに分配
  var enemies=GS.units.filter(function(e){return e.owner!==pid&&e.hp>0;});
  // 敵が城砦から遠ければ守備隊は動かない（高速化の鍵）
  var nearestEnemyToGoal=999;
  enemies.forEach(function(e){
    var d=mdist(e.row,e.col,goal.r,goal.c);
    if(d<nearestEnemyToGoal)nearestEnemyToGoal=d;
  });
  // 警戒範囲: 敵が近づくほど広く（最低5マス、最大12マス）
  var alertRange=Math.max(5,Math.min(12,nearestEnemyToGoal+3));
  // 自軍ユニットから「関心圏内」だけ抽出
  var activeUnits=GS.units.filter(function(u){
    if(u.owner!==pid||u.hp<=0)return false;
    // 城砦からalertRange内、または敵から rng+mov 内なら active
    var dToGoal=mdist(u.row,u.col,goal.r,goal.c);
    if(dToGoal>alertRange)return false;
    return true;
  });
  // 攻撃可能ユニットを優先順位ソート（攻撃射程に敵がいる→近い→高Lv）
  activeUnits.sort(function(a,b){
    var aCanAtk=getAttackable(GS,a).length>0?1:0;
    var bCanAtk=getAttackable(GS,b).length>0?1:0;
    if(aCanAtk!==bCanAtk)return bCanAtk-aCanAtk;
    return (b.level||1)-(a.level||1);
  });
  // ★最大25体まで（高速化）
  activeUnits=activeUnits.slice(0,25);
  var ids=activeUnits.map(function(u){return u.id;});
  if(ids.length===0){if(callback)callback();return;}
  fortressActSeq(pid,ids,0,callback);
}

function fortressActSeq(pid,ids,idx,done){
  if(isPaused){setTimeout(function(){fortressActSeq(pid,ids,idx,done);},300);return;}
  if(!GS||GS.over||GS.turn!==pid||idx>=ids.length){if(done)done();return;}
  var u=null;for(var i=0;i<GS.units.length;i++){if(GS.units[i].id===ids[idx]){u=GS.units[i];break;}}
  if(!u||u.hp<=0||u.owner!==pid||(u.moved&&u.attacked)){
    setTimeout(function(){fortressActSeq(pid,ids,idx+1,done);},0);return;
  }
  fortressActOne(pid,u,function(){setTimeout(function(){fortressActSeq(pid,ids,idx+1,done);},60);});
}

function fortressActOne(pid,u,cb){
  if(!u||u.hp<=0){cb();return;}
  var goal=GS.scenarioGoal;
  // 1) 攻撃可能な敵を探す（最優先: 城砦付近の侵入者）
  if(!u.attacked){
    var tgts=getAttackable(GS,u);
    if(tgts.length>0){
      // 城砦に近い敵を優先
      var bestT=tgts.reduce(function(best,t){
        var tu=uAt(GS,t.r,t.c);if(!tu)return best;
        var distToGoal=mdist(t.r,t.c,goal.r,goal.c);
        var sc=fortressTargetScore(tu,u)-distToGoal*5;
        return(!best||sc>best.sc)?{r:t.r,c:t.c,sc:sc}:best;
      },null);
      if(bestT){
        var defU=uAt(GS,bestT.r,bestT.c);
        if(defU){cpuExecAtk(u,defU,function(){u.moved=true;u.attacked=true;cb();});return;}
      }
    }
  }
  // 2) 移動: 陣形維持 + 城砦防衛
  if(!u.moved){
    var movs=getMovable(GS,u);
    var dest=fortressBestDest(movs,u,goal);
    if(dest){
      var res=doMove(GS,u.id,dest.r,dest.c);
      if(onlineMode&&isHost){
        broadcastAction({type:'move',uid:u.id,r:dest.r,c:dest.c});
        if(typeof broadcastCursor==='function')broadcastCursor(dest.r,dest.c);
      }
      render();updUI();
    }
    // 移動後に攻撃チャレンジ
    if(!u.attacked){
      var tgts2=getAttackable(GS,u);
      if(tgts2.length>0){
        var b2=tgts2.reduce(function(best,t){
          var tu=uAt(GS,t.r,t.c);if(!tu)return best;
          var sc=fortressTargetScore(tu,u);
          return(!best||sc>best.sc)?{r:t.r,c:t.c,sc:sc}:best;
        },null);
        if(b2){
          var d2=uAt(GS,b2.r,b2.c);
          if(d2){cpuExecAtk(u,d2,function(){u.moved=true;u.attacked=true;cb();});return;}
        }
      }
    }
  }
  u.moved=true;u.attacked=true;cb();
}

function fortressTargetScore(def,atk){
  var sc=0;
  var aff=getAffMult(atk.type,def.type);
  var elem=getElemMult(UDEFS[atk.type].elem||'none',UDEFS[def.type].elem||'none');
  var mult=aff*elem;
  if(mult>=4)sc+=300;else if(mult>=2)sc+=180;else if(mult>=1.5)sc+=110;
  sc+=(1-def.hp/def.mhp)*100;
  if(def.type==='king')sc+=400; // 王を狙う
  if(def.type==='hero')sc+=250;
  sc+=(def.level||1)*40;
  // 城砦に近い敵を最優先
  if(GS&&GS.scenarioGoal){
    var d=mdist(def.row,def.col,GS.scenarioGoal.r,GS.scenarioGoal.c);
    sc+=(15-d)*15;
  }
  return sc;
}

// 移動先評価: 中央城砦からの距離・陣形維持・敵接近度
function fortressBestDest(movs,u,goal){
  if(!movs||!movs.length)return null;
  // 自軍の中央城砦座標
  var enemies=GS.units.filter(function(e){return e.owner!==u.owner&&e.hp>0;});
  // この兵種の理想距離（重装は内側 / 弓兵・遠距離は中間 / 偵察は外）
  var idealDist={
    titan:1,golem:1,paladin:2,king:1,arcanelord:2,
    knight:2,monk:2,hero:2,
    healer:1,mage:2,witch:2,
    archer:3,catapult:4,necromancer:4,
    valkyrie:3,phoenix:3,dragon:3,
    ninja:5,spy:6,assassin:5,
    pirate:3,berserker:2,soldier:2,dualblader:2,skeleton:2
  }[u.type]||3;
  return movs.reduce(function(best,m){
    var sc=0;
    var dToGoal=mdist(m.r,m.c,goal.r,goal.c);
    // 理想距離との誤差を罰則
    sc-=Math.abs(dToGoal-idealDist)*20;
    // 接近する敵に近いほど好（迎撃）
    if(enemies.length){
      var nearestEnemy=enemies.reduce(function(b,e){
        var d=mdist(m.r,m.c,e.row,e.col);
        return(!b||d<b)?d:b;
      },999);
      // 攻撃射程内なら大ボーナス
      if(nearestEnemy<=UDEFS[u.type].rng)sc+=120;
      else sc+=(10-nearestEnemy)*8;
    }
    // 地形ボーナス
    var tb=getTerrainBonus(u,m.r,m.c);
    sc+=(tb.atk+tb.pdef+tb.mdef)*7;
    // 神殿・城砦上は好む
    var t=TDEFS[MAP[m.r][m.c]];
    if(t.cap)sc+=80;else if(t.id===7)sc+=40;
    // HP低下時は城砦/神殿へ後退
    if(u.hp<u.mhp*0.35){
      if(t.cap||t.id===7)sc+=200;
      sc-=Math.abs(dToGoal-1)*30; // 城砦のすぐそばへ
    }
    return(!best||sc>best.sc)?{r:m.r,c:m.c,sc:sc}:best;
  },null);
}
