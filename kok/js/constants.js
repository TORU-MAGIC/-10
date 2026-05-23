// ================================================================
//  キングオブキングス v10.0 - 定数・マスターデータ
// ================================================================
'use strict';
// ================================================================
//  キングオブキングス v10.0 - 属性・物理/魔法・地形システム
//  v10.0: バグ修正 / オンライン同期堅牢化 / 戦闘ビュー切替 / 戦闘演出強化 / AI強化 / コンボ・シナジー
// ================================================================
var TW=52,TH=52,COLS=24,ROWS=18;

/* MAP安全アクセス（v10.0: 重複定義を1本化） */
function safeMAP(r,c){
  if(!MAP||r<0||r>=ROWS||c<0||c>=COLS)return 0;
  if(!MAP[r])return 0;
  return MAP[r][c]||0;
}
var GS=null,numPl=4,pSettings=[],useWeather=true,useEvent=true,isPaused=false;
var battleSpeedMode='normal'; // 'normal'=全表示, 'skip'=CPUスキップ
var isMyTurn=false,cpuTurnPid=-1;
// v10.0: 戦闘ビューモード（dual=両方 / self=自分のみ / enemy=敵のみ）
var battleViewMode=(function(){try{return localStorage.getItem('kok9_battleView')||'dual';}catch(e){return 'dual';}})();
// v10.0: クライアントPID（オンライン）— UI判定で参照
function getMyPid(){
  if(onlineMode)return myPeerIdx;
  if(!GS)return 0;
  for(var i=0;i<GS.np;i++)if(isHuman(i))return i;
  return 0;
}
// v10.0: 決定論的RNG（オンラインで同じシードを共有 → 戦闘結果が両者で一致）
function rnd(gs){
  if(!gs||typeof gs.rngSeed!=='number')return Math.random();
  gs.rngSeed=(gs.rngSeed*1664525+1013904223)|0;
  return ((gs.rngSeed>>>0)/4294967296);
}
// v10.0 ゲームバージョン（オンライン互換性チェック用）
var KOK_VERSION='10.0';
// ===== 属性システム =====
var ELEM_CHART={
  fire:   {fire:1.0,ice:1.5,thunder:0.7,nature:1.5,earth:1.0,holy:0.8,dark:1.2,none:1.0},
  ice:    {fire:0.7,ice:1.0,thunder:1.5,nature:1.0,earth:1.5,holy:0.8,dark:1.0,none:1.0},
  thunder:{fire:1.5,ice:0.7,thunder:1.0,nature:1.0,earth:1.3,holy:1.0,dark:1.2,none:1.0},
  nature: {fire:0.7,ice:1.0,thunder:1.0,nature:1.0,earth:1.5,holy:1.0,dark:1.3,none:1.0},
  earth:  {fire:1.0,ice:0.7,thunder:0.7,nature:0.7,earth:1.0,holy:1.0,dark:1.0,none:1.0},
  holy:   {fire:1.0,ice:1.0,thunder:1.0,nature:1.2,earth:1.0,holy:1.0,dark:1.8,none:1.0},
  dark:   {fire:0.8,ice:1.0,thunder:0.8,nature:0.7,earth:1.0,holy:0.6,dark:1.0,none:1.2},
  none:   {fire:1.0,ice:1.0,thunder:1.0,nature:1.0,earth:1.0,holy:0.9,dark:0.9,none:1.0},
};
var ELEM_INFO={
  fire:   {name:'🔥 火',  col:'#ff6644',desc:'氷・自然に強。雷に弱。闇を浄化'},
  ice:    {name:'❄️ 氷', col:'#88ddff',desc:'雷・大地に強。火に弱。冷気で鈍化'},
  thunder:{name:'⚡ 雷', col:'#ffee44',desc:'火・大地に強。氷に弱。暗に浸透'},
  nature: {name:'🌿 自然',col:'#44cc66',desc:'大地・闇に強。火に弱。自然の力'},
  earth:  {name:'🌍 大地',col:'#aa8844',desc:'重厚。雷・自然・氷に弱。安定型'},
  holy:   {name:'✨ 聖',  col:'#ffffaa',desc:'闇に大打撃×1.8。自然に強。加護'},
  dark:   {name:'🌑 闇',  col:'#aa44ff',desc:'自然に強×1.3。聖に極弱×0.6'},
  none:   {name:'⚪ 無',  col:'#888888',desc:'属性ボーナスなし。安定'},
};
function getElemMult(ae,de){return(ELEM_CHART[ae]&&ELEM_CHART[ae][de])?ELEM_CHART[ae][de]:1;}
// ===== 3すくみ =====
var TYPE_CAT={soldier:'swift',knight:'heavy',archer:'swift',mage:'magic',dragon:'swift',paladin:'heavy',ninja:'swift',catapult:'magic',golem:'heavy',healer:'magic',berserker:'swift',witch:'magic',pirate:'swift',phoenix:'magic',spy:'swift',titan:'heavy',necromancer:'magic',assassin:'swift',arcanelord:'magic',valkyrie:'heavy',monk:'swift',skeleton:'swift',dualblader:'swift',king:'heavy',hero:'swift'};
function getAffMult(a,d){
  var ac=TYPE_CAT[a],dc=TYPE_CAT[d];if(!ac||!dc)return 1;
  if(a==='monk'&&dc==='heavy')return 4;
  if(ac==='magic'&&d==='monk')return 4;
  if(d==='king'&&a==='hero')return 5;
  if((a==='ninja'||a==='assassin')&&dc==='heavy')return 3;
  if((ac==='heavy'&&dc==='magic')||(ac==='magic'&&dc==='swift')||(ac==='swift'&&dc==='heavy'))return 3;
  if((ac==='magic'&&dc==='heavy')||(ac==='swift'&&dc==='magic')||(ac==='heavy'&&dc==='swift'))return 0.4;
  return 1;
}
function getAffLabel(a,d){
  var m=getAffMult(a,d);
  if(m>=5)return{text:'絶対特効×5!!',col:'#ff4400'};
  if(m>=4)return{text:'特効×4!!',col:'#ff8800'};
  if(m>=3)return{text:'有利×3！',col:'#f0c840'};
  if(m<=0.4)return{text:'不利×0.4',col:'#e74c3c'};
  return{text:'互角',col:'#607090'};
}
// ===== 地形 =====
var TDEFS=[
  {id:0,name:'平原', cost:1, def:0,col:'#2a5c16',bdr:'#1a3c0a',incm:0,  prod:false,cap:false},
  {id:1,name:'森',   cost:2, def:1,col:'#0f3a08',bdr:'#0a2806',incm:0,  prod:false,cap:false},
  {id:2,name:'山岳', cost:3, def:2,col:'#5a4a2a',bdr:'#3d3018',incm:0,  prod:false,cap:false},
  {id:3,name:'平原B',cost:1, def:0,col:'#306618',bdr:'#204010',incm:0,  prod:false,cap:false},// no water, alt plain
  {id:4,name:'都市', cost:1, def:1,col:'#2a2e50',bdr:'#181c38',incm:60, prod:true, cap:false},
  {id:5,name:'城砦', cost:1, def:3,col:'#5c3a18',bdr:'#3d2010',incm:150,prod:true, cap:true },
  {id:6,name:'丘',   cost:2, def:1,col:'#3a5520',bdr:'#283c14',incm:0,  prod:false,cap:false},
  {id:7,name:'神殿', cost:1, def:2,col:'#3a2060',bdr:'#251040',incm:40, prod:true, cap:false},
];
// 地形ボーナス
function getTerrainBonus(u,r,c){
  var tid=MAP[r][c],t=u.type,b={atk:0,pdef:0,mdef:0};
  if(tid===0||tid===3){if(['knight','dragon','pirate','dualblader'].indexOf(t)>=0)b.atk+=1;}
  if(tid===1){if(['archer','spy','ninja','berserker'].indexOf(t)>=0){b.pdef+=2;b.atk+=2;}}
  if(tid===2){if(['catapult','arcanelord','mage','necromancer','archer'].indexOf(t)>=0)b.atk+=3;if(['titan','golem'].indexOf(t)>=0)b.pdef+=3;}
  if(tid===5){b.pdef+=2;b.mdef+=1;if(['king','paladin','knight','valkyrie'].indexOf(t)>=0){b.pdef+=3;b.mdef+=2;}}
  if(tid===6){if(['knight','monk','hero'].indexOf(t)>=0)b.pdef+=2;}
  if(tid===7){if(['mage','arcanelord','healer','necromancer','witch'].indexOf(t)>=0)b.atk+=3;if(['paladin','valkyrie','king','hero'].indexOf(t)>=0){b.mdef+=3;b.atk+=2;}}
  return b;
}
// 地形移動コスト
function movCost(unit,tid){
  if(tid===3){if(['knight','dragon','phoenix','valkyrie','pirate'].indexOf(unit.type)>=0)return 2;return 99;}
  return TDEFS[tid].cost;
}
// ===== マップ 24x18 (no water) =====
var MAP=[
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
var CASTLE_POS=[[0,0],[0,23],[17,0],[17,23],[9,0],[9,23],[0,11],[17,12]];
var INIT_UNITS=[[[1,0],[0,1]],[[1,23],[0,22]],[[16,0],[17,1]],[[16,23],[17,22]],[[8,0],[10,0]],[[8,23],[10,23]],[[1,11],[0,10]],[[16,12],[17,13]]];
// ===== ユニット定義 (物理/魔法・属性付き) =====
var UDEFS_BASE={
  soldier:    {name:'兵士',      sym:'⚔', hp:24,atk:7, pdef:3, mdef:2, atkType:'physical',elem:'none',    mov:3,rng:1,cost:100, desc:'コスパ最強・汎用歩兵'},
  knight:     {name:'騎士',      sym:'🐴', hp:36,atk:10,pdef:9, mdef:3, atkType:'physical',elem:'thunder', mov:4,rng:1,cost:260, desc:'⚡別の敵に2回攻撃・機動装甲'},
  archer:     {name:'弓兵',      sym:'🏹', hp:18,atk:9, pdef:1, mdef:2, atkType:'physical',elem:'nature',  mov:2,rng:2,cost:170, desc:'🌿射程2の安定火力・森で強化'},
  mage:       {name:'魔法使い',  sym:'🔮', hp:18,atk:14,pdef:0, mdef:5, atkType:'magic',   elem:'fire',    mov:2,rng:2,cost:280, desc:'🔥火魔法・守護光で味方を強化'},
  dragon:     {name:'ドラゴン',  sym:'🐉', hp:62,atk:18,pdef:9, mdef:6, atkType:'physical',elem:'fire',    mov:5,rng:1,cost:800, desc:'🔥直線炎ブレス3マス・飛行最強格'},
  paladin:    {name:'聖騎士',    sym:'✝',  hp:46,atk:10,pdef:14,mdef:5, atkType:'physical',elem:'holy',    mov:3,rng:1,cost:340, desc:'✨pdef14の鉄壁・物理を無効化'},
  ninja:      {name:'忍者',      sym:'🌀', hp:20,atk:11,pdef:2, mdef:3, atkType:'physical',elem:'dark',    mov:6,rng:1,cost:230, desc:'🌑攻撃まで不可視の暗殺奇襲'},
  catapult:   {name:'投石機',    sym:'💣', hp:26,atk:18,pdef:0, mdef:0, atkType:'physical',elem:'earth',   mov:1,rng:3,cost:380, desc:'🌍射程3の超火力砲・紙装甲'},
  golem:      {name:'ゴーレム',  sym:'🗿', hp:74,atk:9, pdef:16,mdef:1, atkType:'physical',elem:'earth',   mov:1,rng:1,cost:400, desc:'🌍pdef16の要塞・魔法に激弱'},
  healer:     {name:'僧侶',      sym:'💊', hp:16,atk:4, pdef:1, mdef:5, atkType:'magic',   elem:'holy',    mov:3,rng:2,cost:180, desc:'✨毎ターン回復・支援の要'},
  berserker:  {name:'狂戦士',    sym:'💪', hp:34,atk:18,pdef:1, mdef:1, atkType:'physical',elem:'fire',    mov:4,rng:1,cost:270, desc:'🔥atk18の超火力・打たれ弱い'},
  witch:      {name:'魔女',      sym:'🧙', hp:16,atk:10,pdef:0, mdef:6, atkType:'magic',   elem:'dark',    mov:3,rng:2,cost:250, desc:'🌑呪詛で隣接敵を全員弱体化'},
  pirate:     {name:'海賊',      sym:'🏴', hp:30,atk:10,pdef:3, mdef:2, atkType:'physical',elem:'thunder', mov:4,rng:1,cost:210, desc:'⚡敵のフィールド魔法を強奪'},
  phoenix:    {name:'不死鳥',    sym:'🦅', hp:46,atk:13,pdef:5, mdef:9, atkType:'magic',   elem:'fire',    mov:5,rng:2,cost:480, desc:'🔥1度復活・mdef9の魔法耐性'},
  spy:        {name:'スパイ',    sym:'🕵', hp:18,atk:8, pdef:2, mdef:3, atkType:'physical',elem:'dark',    mov:6,rng:1,cost:200, desc:'🌑忍者看破・最速の偵察'},
  titan:      {name:'タイタン',  sym:'👊', hp:108,atk:14,pdef:13,mdef:7,atkType:'physical',elem:'earth',   mov:2,rng:1,cost:700, desc:'🌍hp108の超重装・全てを耐える'},
  necromancer:{name:'死霊術師',  sym:'💀', hp:20,atk:17,pdef:0, mdef:4, atkType:'magic',   elem:'dark',    mov:2,rng:3,cost:490, desc:'🌑射程3・召喚・毒の死霊術'},
  assassin:   {name:'暗殺者',    sym:'🗡', hp:24,atk:24,pdef:1, mdef:1, atkType:'physical',elem:'dark',    mov:6,rng:1,cost:490, desc:'🌑atk24・会心20%の即死級'},
  arcanelord: {name:'魔法王',    sym:'👑', hp:38,atk:24,pdef:2, mdef:12,atkType:'magic',   elem:'ice',     mov:3,rng:3,cost:1200,desc:'❄️氷ミサイル・魔法2回・最強魔導'},
  valkyrie:   {name:'ヴァルキリー',sym:'⚡',hp:48,atk:15,pdef:9, mdef:7, atkType:'physical',elem:'holy',    mov:5,rng:2,cost:560, desc:'✨飛行射程2の万能戦士'},
  monk:       {name:'モンク',    sym:'👐', hp:40,atk:17,pdef:5, mdef:1, atkType:'physical',elem:'thunder', mov:4,rng:1,cost:330, desc:'⚡重装特効×4・物理貫通'},
  dualblader: {name:'二刀士',    sym:'⚔', hp:30,atk:14,pdef:2, mdef:2, atkType:'physical',elem:'thunder', mov:5,rng:1,cost:350, desc:'⚡同じ敵に2連撃・反撃前'},
  skeleton:   {name:'スケルトン',sym:'💀', hp:18,atk:7, pdef:2, mdef:0, atkType:'physical',elem:'dark',    mov:2,rng:1,cost:0,   desc:'🌑召喚ユニット・mdef0'},
  king:       {name:'王様',      sym:'👑', hp:58,atk:13,pdef:8, mdef:8, atkType:'physical',elem:'holy',    mov:3,rng:2,cost:0,   desc:'✨王の威令(広域)・倒されると即敗北'},
  hero:       {name:'英雄',      sym:'🦸', hp:48,atk:23,pdef:6, mdef:3, atkType:'physical',elem:'holy',    mov:5,rng:1,cost:560, desc:'✨王様特効×5・全軍の希望'},
};
var UDEFS=JSON.parse(JSON.stringify(UDEFS_BASE));
// カスタマイズされた値をlocalStorageから読み込む
function loadCustom(){try{var s=localStorage.getItem('kok9_custom');if(s){var d=JSON.parse(s);Object.keys(d).forEach(function(t){if(UDEFS[t])Object.assign(UDEFS[t],d[t]);});}}catch(e){}}
var UNIT_TIPS={
  soldier:'序盤の主力。コスパ最強で大量生産が鍵。城砦に配置して守備の核に。',
  knight:'⚡機動タンク。1ターンに別々の敵へ2回攻撃できる。pdef:9で物理に強い。雷属性で火系に有効。',
  archer:'🌿射程2の安定火力。森(tid=1)でATK+2/pdef+2の強化。前線は禁物。大地系に強い。',
  mage:'🔥火魔法ユニット。フィールド魔法で隣接する味方全員に2ターン物理防御+5を付与。pdef:0なので護衛必須。',
  dragon:'🔥フィールド魔法で直線3マスに炎ブレスを噴射。飛行で地形無視。コスト800Gの切り札。',
  paladin:'✨pdef:14で物理攻撃をほぼ無効化。Atktype:physicalだが聖属性で闇に1.8倍。魔法には注意（mdef:5）。',
  ninja:'🌑重装(heavy)に3倍特効。騎士も3倍。mov:6で先手必勝。森でpdef+2。物理貫通に注意。',
  catapult:'🌍射程3の最長砲撃。山でATK+3の強力ボーナス。pdef/mdef:0なので最後列に配置。',
  golem:'🌍pdef:16で物理攻撃を完全封殺。しかしmdef:1のため魔法攻撃で即死。魔法ユニットから遠ざけよ。',
  healer:'✨毎ターン隣接仲間を20%回復。神殿でATK+3。mdef:5で魔法に耐性。編成の中心に据えよ。',
  berserker:'🔥ATK:18の超攻撃型。森でATK+2の追加強化。pdef/mdef:1のガラス。使い捨て覚悟で突撃。',
  witch:'🌑フィールド魔法で隣接する敵全員に3ターンの呪い。攻撃・防御・移動が1〜10ランダムで低下。',
  pirate:'⚡フィールド魔法で隣接する敵のフィールド魔法を強奪。複数奪え、永久に使い続けられる。',
  phoenix:'🔥mdef:9の魔法耐久力が強み。HP40%で1度復活。射程2で安全な距離から魔法攻撃。',
  spy:'🌑スパイがいると敵忍者のステルスを看破できる。mov:5の高速偵察。占領・情報収集に使え。',
  titan:'🌍HP:108/pdef:13/mdef:7の全方位タンク。山でpdef+3。遅いがどこにでも置ける壁。',
  necromancer:'🌑射程3で後方から毒・呪い。敵撃破でスケルトン自動召喚。放置すると無限増殖の脅威。',
  assassin:'🌑会心率20%でATK:24。王様以外を一撃の恐れ。pdef/mdef:1のガラス砲。護衛付きで突撃。',
  arcanelord:'❄️フィールド魔法で2マス先の敵に氷ミサイル。火属性に特効。フィールド魔法を1ターン2回使用可。コスト1200G。',
  valkyrie:'✨飛行+射程2+重装の万能ユニット。神殿でATK+2/mdef+3。聖属性で闇に1.8倍。',
  monk:'⚡タイタン・ゴーレムを物理貫通で叩ける唯一の存在(×4)。mdef:1のため魔法には即死注意。',
  dualblader:'⚡2回攻撃で確実に仕留める。反撃前に2発。雷属性で火系の魔法ユニットに有効。',
  skeleton:'🌑ネクロマンサーが召喚する使い捨て。mdef:0で魔法に即死。数で圧力をかける戦略向け。',
  king:'✨「王の威令」で範囲2内の敵全員を一度に攻撃。倒されたら即敗北！常に護衛を。英雄に注意。',
  hero:'✨王様に×5特効。mov:5で敵王への突撃が得意。聖属性で闇系にも有効。広域スキルあり。',
};
var PCOLS=[
  {main:'#c0392b',light:'#ff7070',dark:'#8b1a1a',name:'赤王国'},
  {main:'#2471a3',light:'#6cb4e4',dark:'#145080',name:'青王国'},
  {main:'#1e8449',light:'#52d68a',dark:'#0f4a28',name:'緑王国'},
  {main:'#b7770d',light:'#f0c040',dark:'#7a4d08',name:'黄王国'},
  {main:'#8e44ad',light:'#c77dff',dark:'#5b2c6f',name:'紫王国'},
  {main:'#117a8b',light:'#40e0d0',dark:'#0a4a55',name:'青緑王国'},
  {main:'#e67e22',light:'#ffb066',dark:'#a04a08',name:'橙王国'},
  {main:'#d63384',light:'#ff80c0',dark:'#8b1f5a',name:'桃王国'},
  // ★シナリオモード: 中央軍（最大9番目のプレイヤー）用の色 — 暗紅/灰の威圧色
  {main:'#3a2828',light:'#9a7878',dark:'#1a1010',name:'⚔ 中央守備隊'},
];
var AI_TYPES=['aggressive','cautious','genius','aggressive'];
var WEATHERS=[{name:'晴天',icon:'☀',atk:0,mov:0,inc:0,def:0},{name:'大雨',icon:'🌧',atk:-1,mov:-1,inc:0,def:0},{name:'濃霧',icon:'🌫',atk:-2,mov:0,inc:0,def:1},{name:'嵐',icon:'⛈',atk:-2,mov:-2,inc:-20,def:0},{name:'好天',icon:'🌟',atk:2,mov:1,inc:10,def:0},{name:'地震',icon:'🌋',atk:-1,mov:-2,inc:-10,def:2},{name:'聖域',icon:'🏛',atk:0,mov:0,inc:5,def:0,sanctuary:true}];
var RAND_EVENTS=[{name:'行商人来訪',fn:'evMerchant'},{name:'疫病発生',fn:'evPlague'},{name:'義勇兵参集',fn:'evRecruit'},{name:'宝の発見',fn:'evTreasure'}];
function isMagicUnit(t){return['mage','witch','arcanelord','necromancer','healer','phoenix','catapult'].indexOf(t)>=0;}

/* ===== 分隊システム（大戦略風）=====
 *  各ユニットは「部隊」であり、内部に複数の個体を持つ。
 *   小型 (5体): soldier/archer/spy/ninja/healer/mage/witch/monk/pirate/dualblader/berserker/skeleton
 *   中型 (4体): knight/paladin/necromancer/assassin/valkyrie/hero/arcanelord
 *   大型 (2体): dragon/titan/golem/phoenix/catapult/king
 *  攻撃力は (squadAlive / squadSize) で減衰。
 *  ダメージは HP比率に応じて squadAlive を切り上げで再計算。
 *  → 大型は1体失うと攻撃力50%減という大幅ペナルティ。
 */
function getSquadSize(type){
  var big=['dragon','titan','golem','phoenix','catapult','king'];
  var mid=['knight','paladin','necromancer','assassin','valkyrie','hero','arcanelord'];
  if(big.indexOf(type)>=0)return 2;
  if(mid.indexOf(type)>=0)return 4;
  return 5; // 小型がデフォルト
}
// 部隊数係数 (1.0 = 完全編成, 0.0 = 全滅) — 切り捨てで連動
function squadMult(u){
  if(!u||!u.squadSize||u.squadSize<=0)return 1;
  var a=(u.squadAlive==null)?u.squadSize:u.squadAlive;
  return Math.max(0,a)/u.squadSize;
}
// HP 変動後の squadAlive を再計算（撃破時は0、それ以外は切り上げ）
function recalcSquadAlive(u){
  if(!u||!u.squadSize)return;
  if(u.hp<=0){u.squadAlive=0;return;}
  if(!u.mhp||u.mhp<=0){u.squadAlive=u.squadSize;return;}
  // HP比率を squadSize で割って切り上げ（1HP残でも1体生存扱い）
  u.squadAlive=Math.max(1,Math.ceil(u.hp/u.mhp*u.squadSize));
}

// ===== 配備モード =====
// 'normal'=通常, 'all'=全ユニット配備, 'pick'=ユニット選択
var startMode='normal';
// プレイヤー別の選択ユニットリスト（pick モード）
var pUnitPicks=[];

// ===== 索敵（Fog of War）=====
var useFoW=false;
var useAmbush=false; // 待ち伏せ（FoW と連動）

// ===== ユニット別索敵範囲 =====
// 飛行系・偵察系ほど広く、鈍足重装は狭い
var SIGHT_RANGE={
  soldier:3, knight:4, archer:5, mage:3, dragon:7,
  paladin:3, ninja:5, catapult:2, golem:2, healer:3,
  berserker:3, witch:3, pirate:4, phoenix:7, spy:8,
  titan:2, necromancer:3, assassin:5, arcanelord:4,
  valkyrie:7, monk:3, dualblader:4, skeleton:2,
  king:4, hero:6
};

// 全配備用のユニット順（コスト順）— skeleton/kingは除く
var ALL_DEPLOY_TYPES=[
  'soldier','archer','knight','ninja','spy','pirate','dualblader','berserker',
  'monk','mage','healer','witch','catapult','necromancer','arcanelord',
  'paladin','valkyrie','hero','phoenix','golem','titan','dragon','assassin','hero'
].filter(function(t,i,a){return a.indexOf(t)===i;});