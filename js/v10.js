// ================================================================
//  キングオブキングス v10.0 - 拡張ブロック
//  戦闘ビュー / 演出強化 / AI強化 / チェーン / シナジー / 実績 / サブクエスト
// ================================================================
'use strict';

/* ======================================================================
 * v10.0 拡張ブロック - 戦闘ビュー / 戦闘演出 / AI強化 / コンボ・シナジー
 * ====================================================================== */

/* ========================================================================
 * BGM: 竜王の戦歌 / 竜王の戦歌2 を連続再生
 * ====================================================================== */
var bgmEnabled = (localStorage.getItem('kok9_bgm') !== '0'); // デフォルトON
var _bgmFadeRaf = null;
var _bgmTracks = ['bgm','bgm2'];
var _bgmIdx = 0;

function _bgmEl(){ return document.getElementById(_bgmTracks[_bgmIdx]); }

// 各トラックの終了時に次の曲へ自動切替
function _bgmInitEnded(){
  _bgmTracks.forEach(function(id){
    var el = document.getElementById(id);
    if(el && !el._endedHooked){
      el._endedHooked = true;
      el.addEventListener('ended', function(){
        _bgmIdx = (_bgmIdx + 1) % _bgmTracks.length;
        if(bgmEnabled) bgmPlay();
      });
    }
  });
}

function bgmPlay(){
  if(!bgmEnabled) return;
  _bgmInitEnded();
  var a = _bgmEl(); if(!a) return;
  a.volume = 0;
  var p = a.play();
  if(p instanceof Promise){
    p.then(function(){
      _bgmFadeIn(a, 0.55);
    }).catch(function(){
      // 自動再生ブロック → ボタン表示を「▶BGM」に切替
      var btn = document.getElementById('bBGM');
      if(btn){ btn.textContent = '▶BGM'; btn.classList.remove('sel'); }
    });
  } else {
    _bgmFadeIn(a, 0.55);
  }
}

function bgmStop(){
  _bgmTracks.forEach(function(id){
    var a = document.getElementById(id);
    if(a){ a.pause(); a.currentTime = 0; }
  });
  if(_bgmFadeRaf){ cancelAnimationFrame(_bgmFadeRaf); _bgmFadeRaf = null; }
}

function bgmPause(){
  var a = _bgmEl(); if(!a) return;
  _bgmFadeOut(a, function(){ a.pause(); });
}

function bgmResume(){
  if(!bgmEnabled) return;
  var a = _bgmEl(); if(!a || !a.paused) return;
  var p = a.play();
  if(p instanceof Promise) p.then(function(){ _bgmFadeIn(a, 0.55); }).catch(function(){});
  else _bgmFadeIn(a, 0.55);
}

function bgmToggle(){
  bgmEnabled = !bgmEnabled;
  try{ localStorage.setItem('kok9_bgm', bgmEnabled ? '1' : '0'); }catch(e){}
  if(bgmEnabled){ bgmPlay(); } else { bgmPause(); }
  _bgmUpdBtn();
}

function _bgmUpdBtn(){
  var btn = document.getElementById('bBGM');
  if(!btn) return;
  btn.textContent = bgmEnabled ? '🎵BGM' : '🔇BGM';
  btn.classList.toggle('sel', bgmEnabled);
}

function _bgmFadeIn(a, target){
  if(_bgmFadeRaf){ cancelAnimationFrame(_bgmFadeRaf); _bgmFadeRaf = null; }
  var step = function(){
    a.volume = Math.min(target, a.volume + 0.015);
    if(a.volume < target - 0.001) _bgmFadeRaf = requestAnimationFrame(step);
    else { a.volume = target; _bgmFadeRaf = null; }
  };
  _bgmFadeRaf = requestAnimationFrame(step);
}

function _bgmFadeOut(a, cb){
  if(_bgmFadeRaf){ cancelAnimationFrame(_bgmFadeRaf); _bgmFadeRaf = null; }
  var step = function(){
    a.volume = Math.max(0, a.volume - 0.025);
    if(a.volume > 0.001) _bgmFadeRaf = requestAnimationFrame(step);
    else { a.volume = 0; _bgmFadeRaf = null; if(cb) cb(); }
  };
  _bgmFadeRaf = requestAnimationFrame(step);
}

// 初期化: ページロード完了後にボタン状態を更新
document.addEventListener('DOMContentLoaded', function(){ _bgmUpdBtn(); });

/* ========================================================================
 * 索敵 / Fog of War システム
 * ====================================================================== */

// 現在の表示プレイヤーの可視マップ（2D boolean[][]）
var _visMap=null;

// pid のユニット索敵範囲から可視セルを計算
function computeVisMap(pid){
  var vis=[];
  for(var r=0;r<ROWS;r++){vis[r]=[];for(var c=0;c<COLS;c++)vis[r][c]=false;}
  if(!GS)return vis;
  GS.units.forEach(function(u){
    if(u.owner!==pid||u.hp<=0)return;
    var sr=SIGHT_RANGE[u.type]||3;
    for(var dr=-sr;dr<=sr;dr++)for(var dc=-sr;dc<=sr;dc++){
      // マンハッタン距離で円形索敵
      if(Math.abs(dr)+Math.abs(dc)>sr)continue;
      var nr=u.row+dr,nc=u.col+dc;
      if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS)vis[nr][nc]=true;
    }
  });
  return vis;
}

// 毎フレーム render() から呼ばれる（ゲームが動いている間のみ）
function updateVisMap(){
  if(!useFoW||!GS){_visMap=null;return;}
  _visMap=computeVisMap(getMyPid());
}

// セルが現在のプレイヤーから見えているか
function isCellVisible(r,c){
  if(!useFoW)return true;
  if(!_visMap)return true;
  return !!(_visMap[r]&&_visMap[r][c]);
}

// ユニットが霧の中に隠れているか（FoW 版）
// render.js の isUnitHidden より優先
function isCellHiddenByFoW(u){
  if(!useFoW)return false;
  if(!GS)return false;
  var myPid=getMyPid();
  if(u.owner===myPid)return false; // 自軍は常に表示
  return !isCellVisible(u.row,u.col);
}

/* ========================================================================
 * 待ち伏せ（Ambush）チェック
 * 移動後に呼ばれる。移動先に近い霧の中の敵が先制攻撃してくる。
 * ====================================================================== */

// moveUnit 実行前の可視マップを一時保存
var _prevVisMap=null;
function savePrevVisMap(){
  if(!useFoW||!useAmbush||!GS){_prevVisMap=null;return;}
  _prevVisMap=computeVisMap(getMyPid());
}

// execMove 後に呼ぶ: 待ち伏せを検出して先制攻撃を実行
// ★Bug#1: オンラインでは ambush 自体を broadcast して全員でcalcAttackを実行
//   （ローカル限定のcalcAttackがホストRNGseedをずらすデシンクを解消）
function checkAndDoAmbush(movedUnit,callback){
  if(!useFoW||!useAmbush||!_prevVisMap||!GS){if(callback)callback();return;}
  var myPid=getMyPid();
  // 移動先の周囲にいる敵で、移動前は見えなかった（霧の中）敵を検索
  var ambushers=[];
  GS.units.forEach(function(u){
    if(u.owner===myPid||u.hp<=0)return;
    // 移動前は不可視、かつ攻撃射程内に入った
    var wasHidden=!(_prevVisMap[u.row]&&_prevVisMap[u.row][u.col]);
    var rng=UDEFS[u.type]?UDEFS[u.type].rng:1;
    var inRange=mdist(movedUnit.row,movedUnit.col,u.row,u.col)<=rng;
    if(wasHidden&&inRange&&!u.attacked)ambushers.push(u);
  });
  _prevVisMap=null;
  if(ambushers.length===0){if(callback)callback();return;}
  // 待ち伏せ発動: 最初の1体が先制攻撃
  var ambusher=ambushers[0];
  showMsg('⚠ 待ち伏せ！'+UDEFS[ambusher.type].name+'が先制攻撃！',2500);
  // 少し遅延してから先制攻撃を実行
  setTimeout(function(){
    // ★Bug#1: オンライン時は ambush action を broadcast（全員のRNGを同期させる）
    if(onlineMode){
      broadcastAction({type:'ambush',atkId:ambusher.id,defId:movedUnit.id});
    }
    // ローカルでも即時実行（オフライン兼用 / 自分のクライアントの演出表示用）
    executeAmbush(ambusher.id, movedUnit.id, callback);
  },600);
}

// 待ち伏せの攻撃実行（applyRemoteAction からも呼ばれる）
function executeAmbush(atkId, defId, callback){
  var atk=GS.units.find(function(u){return u.id===atkId;});
  var def=GS.units.find(function(u){return u.id===defId;});
  if(!atk||!def||atk.hp<=0||def.hp<=0){if(callback)callback();return;}
  var atkType=atk.type, atkOwner=atk.owner;
  var res=calcAttack(GS,atkId,defId);
  if(res){
    addLog('⚠ 待ち伏せ！'+PCOLS[atkOwner].name+'の'+UDEFS[atkType].name+'が先制攻撃(-'+res.dmg+')',{hot:true});
    // 先制攻撃では反撃ダメージの表示を抑制（HP変動はcalcAttack内で既に適用済み）
    res.cdmg=0;res.ckill=false;
    // 戦闘画面は battleViewMode に従う（observer 含む全員で表示）
    var iAmInv=(atkOwner===myPeerIdx||def.owner===myPeerIdx);
    var humanInv=(typeof isHuman==='function')&&(isHuman(atkOwner)||isHuman(def.owner));
    var show=(!onlineMode)||iAmInv||(humanInv&&battleViewMode!=='self'&&battleSpeedMode!=='skip');
    if(show){
      showBattle(res,function(){
        render();updUI();
        if(GS.over){showGameOver();return;}
        if(callback)callback();
      });
    } else {
      render();updUI();
      if(GS.over){showGameOver();return;}
      if(callback)callback();
    }
  } else {
    if(callback)callback();
  }
}

/* ========================================================================
 * v10.1: フィールド魔法システム（ユニット別）
 * ====================================================================== */
var FM_SPELLS={
  dragon:    {name:'🔥炎ブレス',  mode:'dir',    desc:'直線3マスを焼く'},
  mage:      {name:'🛡守護光',    mode:'instant',desc:'隣接味方に物防+5(2T)'},
  witch:     {name:'💀呪詛',      mode:'instant',desc:'隣接敵全員を呪う(3T)'},
  arcanelord:{name:'❄氷ミサイル', mode:'target', desc:'2マス先の敵を撃つ'},
  weaken:    {name:'✨弱体魔法',   mode:'instant',desc:'範囲内の敵を弱体化'}
};
function fmNativeSpell(type){
  return {dragon:'dragon',mage:'mage',witch:'witch',arcanelord:'arcanelord',
          necromancer:'weaken',healer:'weaken',phoenix:'weaken',catapult:'weaken'}[type]||null;
}
// このユニットが使えるフィールド魔法スペル一覧
function fmSpellsFor(u){
  var list=[];if(!u)return list;
  var nat=fmNativeSpell(u.type);
  if(nat&&!u.fmStolen)list.push(nat);
  if(u.stolenMagic)u.stolenMagic.forEach(function(s){if(list.indexOf(s)<0)list.push(s);});
  return list;
}
function fmMaxUses(u){return (u&&u.type==='arcanelord')?2:1;}
function canFieldMagic(u){
  if(!u)return false;
  if(fmSpellsFor(u).length===0)return false;
  if((u.fmUsed||0)>=fmMaxUses(u))return false;
  if(u.attacked)return false;
  return true;
}
// 海賊が強奪できる隣接敵（フィールド魔法持ち）
function pirateStealTargets(p){
  if(!GS||!p)return [];
  var dirs=[[0,1],[0,-1],[1,0],[-1,0]],res=[];
  dirs.forEach(function(d){
    var u=uAt(GS,p.row+d[0],p.col+d[1]);
    if(u&&u.owner!==p.owner&&u.hp>0&&fmSpellsFor(u).length>0)res.push(u);
  });
  return res;
}

// ===== フィールド魔法 実行（engine の doFieldMagicAction を上書き）=====
function doFieldMagicAction(gs,uid,opt){
  opt=opt||{};
  var u=null;for(var i=0;i<gs.units.length;i++){if(gs.units[i].id===uid){u=gs.units[i];break;}}
  if(!u)return{ok:false,msg:'対象がいません'};
  var spell=opt.spell||fmSpellsFor(u)[0];
  if(!spell)return{ok:false,msg:'フィールド魔法を持っていません'};
  var r;
  if(spell==='dragon')r=_fmDragon(gs,u,opt.dir);
  else if(spell==='mage')r=_fmMage(gs,u);
  else if(spell==='witch')r=_fmWitch(gs,u);
  else if(spell==='arcanelord')r=_fmArcane(gs,u,opt.targetId);
  else r=_fmWeaken(gs,u);
  if(r&&r.ok){
    u.fmUsed=(u.fmUsed||0)+1;u.moved=true;
    if((u.fmUsed)>=fmMaxUses(u))u.attacked=true;
    checkWin(gs);
  }
  return r;
}
function _fmDragon(gs,u,dir){
  if(!dir)return{ok:false,msg:'方向を選択してください'};
  var cells=[],hits=[];
  for(var s=1;s<=3;s++){
    var nr=u.row+dir.dr*s,nc=u.col+dir.dc*s;
    if(nr<0||nr>=ROWS||nc<0||nc>=COLS)break;
    cells.push({r:nr,c:nc});
    var t=uAt(gs,nr,nc);
    if(t&&t.owner!==u.owner&&t.hp>0)hits.push(t);
  }
  if(cells.length===0)return{ok:false,msg:'その方向には撃てません'};
  var killed=0;
  hits.forEach(function(t){
    var base=Math.round(effAtk(u)*1.15);
    var dmg=Math.max(7,base-Math.floor(effMDef(t)/2)+Math.floor(rnd(gs)*7)-3);
    dmg=Math.round(dmg*getElemMult('fire',UDEFS[t.type].elem||'none'));
    t.hp-=dmg;
    if(typeof recalcSquadAlive==='function')recalcSquadAlive(t); // ★分隊更新
    if(t.hp<=0){
      gs.stats[u.owner].killed++;gs.stats[t.owner].lost++;
      if(t.type==='king')gs.stats[u.owner].kingKills=(gs.stats[u.owner].kingKills||0)+1;
      // ★シナリオ: 炎ブレスで中央王撃破
      if(gs.scenarioMode&&t.type==='king'&&t.owner===gs.scenarioGarrisonPid){
        gs.scenarioKingKiller=u.owner;
        addLog('🔥👑 '+PCOLS[u.owner].name+' のドラゴンが中央王を焼き払った！',{hot:true});
      }
      killLevelUp(gs,u,t);killed++;
    }
  });
  gs.units=gs.units.filter(function(x){return x.hp>0;});
  if(typeof spawnMapFx==='function')spawnMapFx({kind:'linefire',cells:cells,dur:1000});
  if(typeof SFX!=='undefined'&&SFX.dragon)SFX.dragon();
  addLog(PCOLS[u.owner].name+'のドラゴンが炎ブレス！'+hits.length+'体直撃'+(killed?'（'+killed+'撃破）':''),{hot:true});
  return{ok:true,msg:'🔥炎ブレス！'+hits.length+'体に直撃！',hits:hits.length};
}
function _fmMage(gs,u){
  var dirs=[[0,1],[0,-1],[1,0],[-1,0]],cells=[],n=0;
  dirs.forEach(function(d){
    var a=uAt(gs,u.row+d[0],u.col+d[1]);
    if(a&&a.owner===u.owner&&a.hp>0){
      a.fx=a.fx||[];a.fx.push({k:'guard',t:2,pdef:5});
      cells.push({r:a.row,c:a.col});n++;
    }
  });
  if(n===0)return{ok:false,msg:'隣接する味方がいません'};
  if(typeof spawnMapFx==='function')spawnMapFx({kind:'guard',cells:cells,dur:1100});
  if(typeof SFX!=='undefined'&&SFX.magic)SFX.magic();
  addLog(PCOLS[u.owner].name+'の魔法使いが守護光！味方'+n+'体に物防+5(2T)',{hot:true});
  return{ok:true,msg:'🛡守護光！味方'+n+'体に物理防御+5(2ターン)',hits:n};
}
function _fmWitch(gs,u){
  var dirs=[[0,1],[0,-1],[1,0],[-1,0]],cells=[],n=0;
  dirs.forEach(function(d){
    var e=uAt(gs,u.row+d[0],u.col+d[1]);
    if(e&&e.owner!==u.owner&&e.hp>0){
      var a=1+Math.floor(rnd(gs)*10),df=1+Math.floor(rnd(gs)*10),mv=1+Math.floor(rnd(gs)*10);
      e.fx=e.fx||[];e.fx.push({k:'curse',t:3,atk:-a,pdef:-df,mdef:-df,mov:-mv});
      if(e.status.indexOf('cursed')<0)e.status.push('cursed');
      cells.push({r:e.row,c:e.col});n++;
    }
  });
  if(n===0)return{ok:false,msg:'隣接する敵がいません'};
  if(typeof spawnMapFx==='function')spawnMapFx({kind:'curse',cells:cells,dur:1100});
  if(typeof SFX!=='undefined'&&SFX.magic)SFX.magic();
  addLog(PCOLS[u.owner].name+'の魔女が呪詛！敵'+n+'体を3ターン呪う',{hot:true});
  return{ok:true,msg:'💀呪詛！隣接する敵'+n+'体を3ターン呪う',hits:n};
}
function _fmArcane(gs,u,targetId){
  var t=null;for(var i=0;i<gs.units.length;i++){if(gs.units[i].id===targetId){t=gs.units[i];break;}}
  if(!t||t.owner===u.owner||t.hp<=0)return{ok:false,msg:'対象を選択してください'};
  if(mdist(u.row,u.col,t.row,t.col)>2)return{ok:false,msg:'射程外（2マス以内の敵）'};
  var base=Math.round(effAtk(u)*1.1);
  var dmg=Math.max(8,base-effMDef(t)+Math.floor(rnd(gs)*6)-2);
  dmg=Math.round(dmg*getElemMult('ice',UDEFS[t.type].elem||'none'));
  if((UDEFS[t.type].elem||'none')==='fire')dmg=Math.round(dmg*1.5); // 火に強い
  var fromCell={r:u.row,c:u.col},toCell={r:t.row,c:t.col};
  t.hp-=dmg;var killed=false;
  if(typeof recalcSquadAlive==='function')recalcSquadAlive(t); // ★分隊更新
  if(t.hp<=0){
    gs.stats[u.owner].killed++;gs.stats[t.owner].lost++;
    if(t.type==='king')gs.stats[u.owner].kingKills=(gs.stats[u.owner].kingKills||0)+1;
    // ★シナリオ: 氷ミサイルで中央王撃破
    if(gs.scenarioMode&&t.type==='king'&&t.owner===gs.scenarioGarrisonPid){
      gs.scenarioKingKiller=u.owner;
      addLog('❄👑 '+PCOLS[u.owner].name+' の魔法王が中央王を凍結撃破！',{hot:true});
    }
    killLevelUp(gs,u,t);killed=true;
  }
  else{t.fx=t.fx||[];t.fx.push({k:'curse',t:2,mov:-2});} // 凍結スロー
  gs.units=gs.units.filter(function(x){return x.hp>0;});
  if(typeof spawnMapFx==='function')spawnMapFx({kind:'ice',from:fromCell,to:toCell,dur:1050});
  if(typeof SFX!=='undefined'&&SFX.magic)SFX.magic();
  addLog(PCOLS[u.owner].name+'の魔法王が氷ミサイル！-'+dmg+(killed?'【撃破】':''),{hot:true});
  return{ok:true,msg:'❄氷ミサイル！-'+dmg+(killed?' 撃破！':''),hits:1};
}
function _fmWeaken(gs,u){
  var targets=getFieldMagicTargets(gs,u);
  targets.forEach(function(t){
    if(t.status.indexOf('weakened')<0)t.status.push('weakened');
    if(t.status.indexOf('enfeebled')<0)t.status.push('enfeebled');
  });
  if(targets.length){
    var cells=targets.map(function(t){return{r:t.row,c:t.col};});
    if(typeof spawnMapFx==='function')spawnMapFx({kind:'curse',cells:cells,dur:900});
    if(typeof SFX!=='undefined'&&SFX.magic)SFX.magic();
    addLog(UDEFS[u.type].name+'がフィールド魔法！'+targets.length+'体を弱体化',{hot:true});
  }
  return{ok:targets.length>0,msg:targets.length?('✨'+targets.length+'体を弱体化！'):'範囲内に敵がいません',hits:targets.length};
}
// ===== 海賊: フィールド魔法の強奪 =====
function doPirateStealAction(gs,uid,victimId){
  var u=null,v=null;
  for(var i=0;i<gs.units.length;i++){if(gs.units[i].id===uid)u=gs.units[i];if(gs.units[i].id===victimId)v=gs.units[i];}
  if(!u||!v||u.type!=='pirate')return{ok:false,msg:'強奪に失敗しました'};
  if(mdist(u.row,u.col,v.row,v.col)!==1)return{ok:false,msg:'隣接していません'};
  var spells=fmSpellsFor(v);
  if(spells.length===0)return{ok:false,msg:'相手はフィールド魔法を持っていません'};
  u.stolenMagic=u.stolenMagic||[];
  var got=[];
  spells.forEach(function(s){if(u.stolenMagic.indexOf(s)<0){u.stolenMagic.push(s);got.push(s);}});
  v.fmStolen=true;if(v.stolenMagic)v.stolenMagic=[];
  u.moved=true;u.attacked=true;
  var names=got.map(function(s){return (FM_SPELLS[s]||{name:s}).name;}).join('・');
  addLog(PCOLS[u.owner].name+'の海賊が'+UDEFS[v.type].name+'のフィールド魔法を強奪！',{hot:true});
  if(typeof SFX!=='undefined'&&SFX.capture)SFX.capture();
  return{ok:true,msg:'🏴強奪成功！'+(names||'魔法')+'を奪った！',got:got};
}

/* ========================================================================
 * v10.1: 忍者ステルス
 * ====================================================================== */
function isUnitHidden(u){
  if(!u||u.type!=='ninja'||u.hp<=0)return false;
  if(!GS)return false;
  var viewer=(typeof onlineMode!=='undefined'&&onlineMode)?myPeerIdx:GS.turn;
  if(u.owner===viewer)return false;   // 自分の忍者は常に見える
  if(u.attacked)return false;          // 攻撃したら姿を現す
  // スパイを保有するプレイヤーには看破される
  var hasSpy=GS.units.some(function(s){return s.owner===viewer&&s.type==='spy'&&s.hp>0;});
  if(hasSpy)return false;
  return true;
}

/* ========================================================================
 * v10.1: ステータス増減量（バフ/デバフの合算）— 表示用
 * ====================================================================== */
function statDelta(u){
  var d={atk:0,pdef:0,mdef:0,mov:0};
  if(!u)return d;
  if(u.status){
    if(u.status.indexOf('cursed')>=0)d.atk-=3;
    if(u.status.indexOf('weakened')>=0)d.atk-=4;
  }
  if(typeof fxSum==='function'){
    d.atk+=fxSum(u,'atk');d.pdef+=fxSum(u,'pdef');
    d.mdef+=fxSum(u,'mdef');d.mov+=fxSum(u,'mov');
  }
  return d;
}
function hasStatDelta(u){
  var d=statDelta(u);return !!(d.atk||d.pdef||d.mdef||d.mov);
}

/* ---------- D: 戦闘ビューモード ---------- */
function setBView(m){
  if(['dual','self','enemy'].indexOf(m)<0)m='dual';
  battleViewMode=m;
  try{localStorage.setItem('kok9_battleView',m);}catch(e){}
  ['bvDual','bvSelf','bvEnemy'].forEach(function(id){var b=document.getElementById(id);if(b)b.classList.toggle('sel',id==='bv'+m.charAt(0).toUpperCase()+m.slice(1));});
  var lbl={dual:'🎥両方',self:'🛡自分のみ',enemy:'⚔敵のみ'}[m];
  var btn=document.getElementById('bView');if(btn)btn.textContent=lbl;
  if(GS)showMsg('戦闘ビュー: '+lbl,1400);
}
function cycleBView(){
  var nx={dual:'self',self:'enemy',enemy:'dual'}[battleViewMode]||'dual';
  setBView(nx);
}
function applyBattleView(res){
  var bv=battleViewMode;
  var myPid=getMyPid();
  var iAmAtk=(res.atkOwner===myPid);
  var iAmDef=(res.defOwner===myPid);
  var showLeft=true,showRight=true;
  if(bv==='self'){
    // 自分が関与する戦闘: 自分のユニットだけ大きく表示
    if(iAmAtk){showLeft=true;showRight=false;}
    else if(iAmDef){showLeft=false;showRight=true;}
    else {showLeft=true;showRight=false;} // 自分が関与しない場合は左のみ
  } else if(bv==='enemy'){
    // 敵側のユニットだけ大きく表示
    if(iAmAtk){showLeft=false;showRight=true;}
    else if(iAmDef){showLeft=true;showRight=false;}
    else {showLeft=false;showRight=true;}
  }
  var lwParent=document.getElementById('bLWrap').closest('.b-fighter');
  var rwParent=document.getElementById('bRWrap').closest('.b-fighter');
  if(lwParent)lwParent.style.display=showLeft?'flex':'none';
  if(rwParent)rwParent.style.display=showRight?'flex':'none';
  var vsc=document.querySelector('.b-vsc');if(vsc)vsc.style.display=(showLeft&&showRight)?'flex':'none';
  var arena=document.querySelector('.b-arena');
  if(arena)arena.classList.toggle('b-solo',!(showLeft&&showRight));
}

/* ---------- C: 戦闘演出強化 ---------- */
function applyVsIntro(){
  var lw=document.getElementById('bLWrap'),rw=document.getElementById('bRWrap');
  if(lw){lw.classList.remove('do-vs-intro-l');void lw.offsetWidth;lw.classList.add('do-vs-intro-l');}
  if(rw){rw.classList.remove('do-vs-intro-r');void rw.offsetWidth;rw.classList.add('do-vs-intro-r');}
}
function applyScreenShake(strong){
  var bs=document.getElementById('battleScreen');if(!bs)return;
  bs.classList.remove('do-screen-shake');void bs.offsetWidth;bs.classList.add('do-screen-shake');
  setTimeout(function(){bs.classList.remove('do-screen-shake');},600);
}
function applyCritZoom(side){
  var w=document.getElementById(side==='L'?'bLWrap':'bRWrap');if(!w)return;
  w.classList.add('do-zoom');
  setTimeout(function(){w.classList.remove('do-zoom');w.style.transform='';},700);
}
function showKillBanner(name){
  var el=document.getElementById('bKillBanner');if(!el)return;
  el.textContent='⚔ '+name+' 撃破！';el.style.display='block';
  void el.offsetWidth;
  setTimeout(function(){el.style.display='none';},1100);
}
function applyElementFlash(elem){
  if(!bBGCtx||!bBGCvs)return;
  var info=ELEM_INFO[elem||'none']||ELEM_INFO.none;
  bBGCtx.fillStyle=info.col+'33';bBGCtx.fillRect(0,0,bBGCvs.width,bBGCvs.height);
}
// 大ダメージ判定 → 数値ポップを大型化
function maybeBigDamage(elemId,res){
  var el=document.getElementById(elemId);if(!el)return;
  var threshold=Math.max(8,res.defMhp*0.4);
  if(res.dmg>=threshold){el.classList.add('dmg-big');setTimeout(function(){el.classList.remove('dmg-big');},1500);}
  else{el.classList.remove('dmg-big');}
}

/* ---------- B: AI強化（脅威マップ、交換評価、撤退、王護衛、フォーカスファイア） ---------- */

// 軽量GSコピー（units / players のみ複製、MAPは共有）
function shallowCloneGS(gs){
  return {
    np:gs.np, turn:gs.turn, round:gs.round, rngSeed:gs.rngSeed,
    units:gs.units.map(function(u){return Object.assign({},u,{status:u.status?u.status.slice():[]});}),
    own:gs.own, // 読み取り専用想定
    players:gs.players.map(function(p){return Object.assign({},p);}),
    weather:gs.weather, settings:gs.settings,
    stats:gs.stats.map(function(s){return Object.assign({},s);}),
    phxRevived:gs.phxRevived?gs.phxRevived.slice():[],
    summonCounts:Object.assign({},gs.summonCounts||{}),
    over:false, winner:-1, log:[]
  };
}
function uById(gs,id){for(var i=0;i<gs.units.length;i++)if(gs.units[i].id===id)return gs.units[i];return null;}
function unitValue(u){
  if(!u||u.hp<=0)return 0;
  var d=UDEFS[u.type];if(!d)return 0;
  var base=(d.cost||100);
  if(u.type==='king')base=2000; // 王様は無限価値
  return base*(0.4+0.6*u.hp/u.mhp)*Math.pow(1.18,(u.level||1)-1);
}
// 1.5手読み: 攻撃シミュレーション + 敵の最良反撃を考慮
function evaluateExchange(atkId,defId,gs){
  try{
    var sim=shallowCloneGS(gs);
    var a0=unitValue(uById(sim,atkId)), d0=unitValue(uById(sim,defId));
    var res=calcAttack(sim,atkId,defId);if(!res)return -999;
    var aL=uById(sim,atkId), dL=uById(sim,defId);
    var a1=unitValue(aL), d1=unitValue(dL);
    var score=(d0-d1)-(a0-a1);
    // 敵の最良反撃ペナルティ（自軍の高Lvユニットが反撃で死ぬリスク）
    if(aL&&aL.hp>0){
      var enemyBest=0;
      for(var i=0;i<sim.units.length;i++){
        var e=sim.units[i];if(e.owner===aL.owner||e.hp<=0)continue;
        var rng=UDEFS[e.type].rng,d=mdist(e.row,e.col,aL.row,aL.col);
        if(d<=rng+UDEFS[e.type].mov){
          // 敵が攻撃した場合のダメージ概算
          var dmg=Math.max(1,effAtk(e)-effPDef(aL));
          if(dmg>enemyBest)enemyBest=dmg;
        }
      }
      score-=enemyBest*0.7;
    }
    return score;
  }catch(e){return -999;}
}
// 脅威マップ: 各セルへ届く敵の総攻撃力
function buildThreatMap(pid){
  var T=[];for(var r=0;r<ROWS;r++){var row=[];for(var c=0;c<COLS;c++)row.push(0);T.push(row);}
  if(!GS)return T;
  GS.units.forEach(function(e){
    if(e.owner===pid||e.hp<=0)return;
    var rng=UDEFS[e.type].rng||1,mov=UDEFS[e.type].mov||1,reach=rng+mov;
    var atkVal=effAtk(e)*(1+((e.level||1)-1)*0.18);
    for(var dr=-reach;dr<=reach;dr++)for(var dc=-reach;dc<=reach;dc++){
      var nr=e.row+dr,nc=e.col+dc;
      if(nr<0||nr>=ROWS||nc<0||nc>=COLS)continue;
      if(Math.abs(dr)+Math.abs(dc)>reach)continue;
      T[nr][nc]+=atkVal;
    }
  });
  return T;
}
// セーフキャッシュ: 1ターン内の脅威マップを再利用
var _threatCache={pid:-1,turn:-1,round:-1,map:null};
function getThreat(pid){
  if(!GS)return null;
  if(_threatCache.pid===pid&&_threatCache.turn===GS.turn&&_threatCache.round===GS.round&&_threatCache.map)return _threatCache.map;
  _threatCache={pid:pid,turn:GS.turn,round:GS.round,map:buildThreatMap(pid)};
  return _threatCache.map;
}

// ★cpuTargetScore を強化版でオーバーライド（var 経由で再代入）
cpuTargetScore=function(def,atk,at){
  var sc=0;
  var aff=getAffMult(atk.type,def.type);
  var elem=getElemMult((UDEFS[atk.type].elem||'none'),(UDEFS[def.type].elem||'none'));
  var totalMult=aff*elem;
  if(totalMult>=4)sc+=200;else if(totalMult>=2)sc+=120;else if(totalMult>=1.5)sc+=80;else if(totalMult<=0.5)sc-=100;
  sc+=(1-def.hp/def.mhp)*80;
  if(def.type==='king')sc+=350; // 王様優先
  if(MAP&&MAP[def.row]&&TDEFS[MAP[def.row][def.col]]){
    if(TDEFS[MAP[def.row][def.col]].cap)sc+=160;
    if(TDEFS[MAP[def.row][def.col]].prod)sc+=60;
  }
  sc+=(def.level||1)*30;
  // v10.0: 交換評価 - 損益で大きく加減
  if(at==='genius'||at==='cautious'){
    var ex=evaluateExchange(atk.id,def.id,GS);
    sc+=ex*0.5;
    // 撃破できる場合の確実ボーナス
    var dmgEst=Math.max(1,effAtk(atk)*totalMult-effPDef(def));
    if(dmgEst>=def.hp)sc+=200;
    // オーバーキル抑制（HP10の敵にATK100の英雄を当てない）
    if(dmgEst>def.hp*2&&def.type!=='king')sc-=Math.min(80,(dmgEst-def.hp)*0.5);
  }else{
    // 攻撃型は単純にダメージ重視
    var dmgEst2=Math.max(1,effAtk(atk)*totalMult-effPDef(def));
    sc+=dmgEst2>=def.hp?150:dmgEst2*2;
  }
  // 反撃で自分が死ぬリスク（cautious 重視）
  if(at==='cautious'){
    var defAtk=effAtk(def),atkDef=(UDEFS[def.type].atkType==='magic')?effMDef(atk):effPDef(atk);
    var counter=Math.max(1,defAtk-atkDef);
    if(counter>=atk.hp)sc-=180;
  }
  return sc;
};

// ★cpuBestDest を強化版でオーバーライド（脅威マップ、撤退、王護衛、シナジー考慮）
cpuBestDest=function(movs,pid,at,u){
  if(!movs||!movs.length)return null;
  var ecs=[],ncs=[],ekings=[],myKing=null,myHealers=[],myCastles=[],mySafeSpots=[];
  for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){
    var ow=GS.own[r][c],t=TDEFS[MAP[r][c]];
    if(t.cap&&ow>=0&&ow!==pid)ecs.push({r:r,c:c});
    if(t.prod&&!t.cap&&ow!==pid&&!uAt(GS,r,c))ncs.push({r:r,c:c});
    if(t.cap&&ow===pid)myCastles.push({r:r,c:c});
    if(t.id===7&&ow===pid)mySafeSpots.push({r:r,c:c});
  }
  GS.units.forEach(function(eu){
    if(eu.owner!==pid&&eu.type==='king')ekings.push({r:eu.row,c:eu.col});
    if(eu.owner===pid&&eu.type==='king')myKing={r:eu.row,c:eu.col,unit:eu};
    if(eu.owner===pid&&eu.type==='healer')myHealers.push({r:eu.row,c:eu.col});
  });
  var T=getThreat(pid);
  var hpRatio=u.hp/u.mhp;
  var inDanger=hpRatio<0.35;
  var riskFactor={cautious:2.0,aggressive:0.5,genius:1.2}[at]||1.0;
  if(inDanger)riskFactor*=1.6;
  return movs.reduce(function(best,m){
    var sc=0,t=TDEFS[MAP[m.r][m.c]],mow=GS.own[m.r][m.c];
    if(t.cap&&mow!==pid)sc+=600;
    if(t.prod&&!t.cap&&mow!==pid)sc+=220;
    sc+=t.def*5;
    if(ecs.length){var mn=999;for(var i=0;i<ecs.length;i++)mn=Math.min(mn,mdist(m.r,m.c,ecs[i].r,ecs[i].c));sc+=(30-mn)*(at==='aggressive'?12:8);}
    if(ekings.length){var mkd=999;for(var i=0;i<ekings.length;i++)mkd=Math.min(mkd,mdist(m.r,m.c,ekings[i].r,ekings[i].c));if(u.type==='hero'||u.type==='assassin')sc+=(30-mkd)*15;}
    var tb=getTerrainBonus(u,m.r,m.c);sc+=(tb.atk+tb.pdef+tb.mdef)*6;
    if(at==='cautious'&&u.hp<u.mhp*.4)sc+=t.def*12;
    // v10.0: 脅威マップのリスクペナルティ
    if(T&&T[m.r])sc-=T[m.r][m.c]*riskFactor*0.3;
    // v10.0: 撤退ロジック
    if(inDanger){
      // 自城/神殿/healer隣接に大きなボーナス
      myCastles.forEach(function(p){if(mdist(m.r,m.c,p.r,p.c)<=1)sc+=400;});
      mySafeSpots.forEach(function(p){if(mdist(m.r,m.c,p.r,p.c)<=1)sc+=250;});
      myHealers.forEach(function(p){if(mdist(m.r,m.c,p.r,p.c)<=1)sc+=300;});
    }
    // v10.0: 王様護衛（自分が前衛タンクの場合）
    if(myKing&&u.type!=='king'&&['paladin','golem','knight','valkyrie','titan','monk'].indexOf(u.type)>=0){
      var kingHpRatio=myKing.unit.hp/myKing.unit.mhp;
      var d2k=mdist(m.r,m.c,myKing.r,myKing.c);
      if(d2k===1)sc+=Math.round(250*(1-kingHpRatio*0.5));
      else if(d2k===2)sc+=80;
    }
    // v10.0: シナジー（隣接友軍ボーナス）
    var fb=0,dirs=[[0,1],[0,-1],[1,0],[-1,0]];
    for(var di=0;di<dirs.length;di++){
      var nr=m.r+dirs[di][0],nc=m.c+dirs[di][1];
      if(nr<0||nr>=ROWS||nc<0||nc>=COLS)continue;
      var adj=uAt(GS,nr,nc);
      if(adj&&adj.owner===pid&&adj.id!==u.id)fb+=8;
    }
    sc+=fb;
    return (!best||sc>best.sc)?Object.assign({},m,{sc:sc}):best;
  },null);
};

// ★cpuPickProd を強化版でオーバーライド
cpuPickProd=function(pid,at){
  var cnt=GS.units.filter(function(u){return u.owner===pid;}).length;
  if(cnt>=12)return null;
  var gold=GS.players[pid].gold;
  // v10.0: 序盤(R<=3)以外は金を貯める（200G未満なら生産しない場合あり）
  if(gold<200&&GS.round>=3&&cnt>=6)return null;
  var avail=Object.entries(UDEFS).filter(function(e){return gold>=e[1].cost&&e[0]!=='skeleton'&&e[0]!=='king';}).sort(function(a,b){return b[1].cost-a[1].cost;});
  if(!avail.length)return null;
  // v10.0: healer 不在なら最優先
  var myUnits=GS.units.filter(function(u){return u.owner===pid&&u.hp>0;});
  var hasHealer=myUnits.some(function(u){return u.type==='healer';});
  if(!hasHealer&&gold>=180&&avail.find(function(e){return e[0]==='healer';})){return 'healer';}
  // v10.0: 敵に dragon 検知 → counter
  var enemyHasDragon=GS.units.some(function(u){return u.owner!==pid&&u.hp>0&&u.type==='dragon';});
  if(enemyHasDragon){var c1=avail.find(function(e){return ['arcanelord','monk','mage'].indexOf(e[0])>=0;});if(c1)return c1[0];}
  // 既存の AI種別ロジック
  if(at==='aggressive'){
    if(GS.round<=2){var f=avail.find(function(e){return['knight','berserker','ninja'].indexOf(e[0])>=0;});if(f)return f[0];}
    if(GS.round<=5){var f2=avail.find(function(e){return['assassin','dualblader','dragon','hero'].indexOf(e[0])>=0;});if(f2)return f2[0];}
    return avail[0][0];
  }
  if(at==='cautious'){
    var prefs=['titan','golem','paladin','knight','healer','monk','soldier'];
    for(var i=0;i<prefs.length;i++)if(avail.some(function(e){return e[0]===prefs[i];}))return prefs[i];
    return avail[avail.length-1][0];
  }
  // genius: counter enemy
  var enemies=GS.units.filter(function(u){return u.owner!==pid&&u.hp>0;});
  if(enemies.length){
    var eHighLevel=enemies.slice().sort(function(a,b){return(b.level||1)-(a.level||1);})[0];
    if((eHighLevel.level||1)>=3){var counter=avail.find(function(e){return getAffMult(e[0],eHighLevel.type)>=3;});if(counter)return counter[0];}
    var cats={heavy:0,magic:0,swift:0};enemies.forEach(function(e){var cc=TYPE_CAT[e.type];if(cc)cats[cc]++;});
    var dom=Object.entries(cats).sort(function(a,b){return b[1]-a[1];})[0][0];
    if(dom==='heavy'){var mc=avail.find(function(e){return e[0]==='monk';});if(mc)return 'monk';}
    var counter2={heavy:'swift',magic:'heavy',swift:'magic'}[dom];
    var cu=avail.find(function(e){return TYPE_CAT[e[0]]===counter2;});if(cu)return cu[0];
  }
  // 多様化: 同種が3体以上いるなら異種を選ぶ
  var typeCounts={};myUnits.forEach(function(u){typeCounts[u.type]=(typeCounts[u.type]||0)+1;});
  var sortedAvail=avail.slice().sort(function(a,b){
    return (typeCounts[a[0]]||0)-(typeCounts[b[0]]||0);
  });
  return sortedAvail[0][0];
};

/* ---------- A: コンボ・チェーン / シナジー / 実績 / クエスト ---------- */

// チェーンキル: 撃破成功時にカウント、calcAttack でダメージ補正
function applyChainBonus(gs,atk){
  if(!gs||!gs.players[atk.owner])return 1.0;
  var ch=gs.players[atk.owner]._chain||0;
  if(ch>=3)return 1.20;
  if(ch>=2)return 1.10;
  return 1.0;
}

// シナジー（隣接友軍によるバフ） - 戦闘以外でも使える形式
function getSynergyAtk(u,gs){
  if(!u||!gs)return 0;
  var b=0,dirs=[[0,1],[0,-1],[1,0],[-1,0]];
  for(var i=0;i<dirs.length;i++){
    var nr=u.row+dirs[i][0],nc=u.col+dirs[i][1];
    if(nr<0||nr>=ROWS||nc<0||nc>=COLS)continue;
    var adj=uAt(gs,nr,nc);
    if(!adj||adj.owner!==u.owner||adj.id===u.id)continue;
    if(adj.type==='healer')b+=1;
    if(adj.type==='king')b+=2;
    if(adj.type==='paladin'&&isMagicUnit(u.type))b+=1;
  }
  return b;
}

// 実績システム
var ACHIEVEMENTS=[
  {id:'first_kill',  name:'初撃破',       desc:'敵ユニットを初めて撃破した',   check:function(s){return s.totalKills>=1;}},
  {id:'crit_master', name:'会心の達人',   desc:'会心攻撃を10回成功',           check:function(s){return s.totalCrits>=10;}},
  {id:'king_slayer', name:'王殺し',       desc:'敵の王様を撃破した',           check:function(s){return s.kingKills>=1;}},
  {id:'castle_lord', name:'城砦王',       desc:'城砦を5箇所占領',               check:function(s){return s.totalCaptures>=5;}},
  {id:'chain3',      name:'三連撃',       desc:'チェーン×3を達成',             check:function(s){return s.maxChain>=3;}},
  {id:'overkill',    name:'圧倒',         desc:'1ターンで5体撃破',             check:function(s){return s.maxTurnKills>=5;}},
  {id:'survivor',    name:'不屈',         desc:'HP10%以下から復帰してKill',     check:function(s){return s.lowHpKills>=1;}},
  {id:'flawless',    name:'完璧勝利',     desc:'1体も失わずに勝利',            check:function(s){return s.flawlessWin;}}
];
function getAchvStats(){
  try{var s=localStorage.getItem('kok9_achv_stats');if(s)return JSON.parse(s);}catch(e){}
  return {totalKills:0,totalCrits:0,kingKills:0,totalCaptures:0,maxChain:0,maxTurnKills:0,lowHpKills:0,flawlessWin:false,unlocked:[]};
}
function saveAchvStats(s){try{localStorage.setItem('kok9_achv_stats',JSON.stringify(s));}catch(e){}}
function checkAchievements(){
  var s=getAchvStats();var newly=[];
  ACHIEVEMENTS.forEach(function(a){
    if(s.unlocked.indexOf(a.id)<0&&a.check(s)){s.unlocked.push(a.id);newly.push(a);}
  });
  saveAchvStats(s);
  newly.forEach(function(a){showMsg('🏆 実績解除: '+a.name+' - '+a.desc,3500);});
}
function recordKill(killerOwner,killedType,wasCrit,fromLowHp){
  var s=getAchvStats();
  s.totalKills=(s.totalKills||0)+1;
  if(wasCrit)s.totalCrits=(s.totalCrits||0)+1;
  if(killedType==='king')s.kingKills=(s.kingKills||0)+1;
  if(fromLowHp)s.lowHpKills=(s.lowHpKills||0)+1;
  if(GS&&GS.players[killerOwner]){
    var ch=GS.players[killerOwner]._chain||0;
    if(ch>(s.maxChain||0))s.maxChain=ch;
  }
  saveAchvStats(s);checkAchievements();
}

/* ---------- A-3: 地形ハザード（嵐ダメージ / 地震スタン / 聖域バフ） ---------- */
var _FLYING_TYPES=['dragon','phoenix','valkyrie'];
function applyTerrainHazards(gs,pid){
  if(!gs||!MAP||!gs.weather)return;
  var wn=gs.weather.name;
  if(wn!=='嵐'&&wn!=='地震')return;
  gs.units.forEach(function(u){
    if(u.hp<=0||u.owner!==pid)return;
    var r=u.row,c=u.col;
    if(r<0||r>=ROWS||c<0||c>=COLS)return;
    var tid=MAP[r][c];
    var isFlying=_FLYING_TYPES.indexOf(u.type)>=0;
    if(wn==='嵐'){
      // 嵐: 開けた地形（平原/平原B、tid=0 or 3）の非飛行ユニットが HP-3
      if(!isFlying&&(tid===0||tid===3)){
        var dmg=3;u.hp=Math.max(1,u.hp-dmg);
        addLog('⛈ 嵐の猛威: '+UDEFS[u.type].name+' -'+dmg+'HP',{sys:true});
      }
    } else if(wn==='地震'){
      // 地震: 山岳（tid=2）の非飛行ユニットがスタン（行動済み扱い）
      if(!isFlying&&tid===2){
        u.moved=true;u.attacked=true;
        addLog('🌋 地震スタン: '+UDEFS[u.type].name+' 行動不能',{sys:true});
      }
    }
  });
}
/* startOfTurn ラップ（地形ハザード適用） */
var _origStartOfTurn=startOfTurn;
startOfTurn=function(gs,pid){
  var inc=_origStartOfTurn(gs,pid);
  if(gs&&gs.weather)applyTerrainHazards(gs,pid);
  return inc;
};

/* ---------- v10.0: calcAttack をラップしてチェーン・シナジー・聖域・実績を統合 ---------- */
var _origCalcAttack=calcAttack;
calcAttack=function(gs,atkId,defId){
  var atk=null,def=null;
  for(var i=0;i<gs.units.length;i++){if(gs.units[i].id===atkId)atk=gs.units[i];if(gs.units[i].id===defId)def=gs.units[i];}
  if(!atk||!def||atk.hp<=0||def.hp<=0)return null;
  // チェーンボーナス: 攻撃前のATKを一時的に水増し（try/finallyで確実に戻す）
  var chainMult=applyChainBonus(gs,atk);
  var synergyAtk=getSynergyAtk(atk,gs);
  // A-3 聖域: holy属性ユニットのATKを+15%
  var sanctuaryAtk=0;
  if(gs.weather&&gs.weather.sanctuary&&UDEFS[atk.type]&&UDEFS[atk.type].elem==='holy'){
    sanctuaryAtk=Math.max(1,Math.round(UDEFS[atk.type].atk*0.15));
  }
  var atkLowHpBefore=(atk.hp/atk.mhp)<0.15;
  var origAtk=UDEFS[atk.type].atk;
  var res=null;
  try{
    if(chainMult>1.0||synergyAtk>0||sanctuaryAtk>0){
      UDEFS[atk.type].atk=Math.round(origAtk*chainMult)+synergyAtk+sanctuaryAtk;
    }
    res=_origCalcAttack(gs,atkId,defId);
  }finally{
    UDEFS[atk.type].atk=origAtk;
  }
  if(!res)return res;
  // シミュレーション(評価関数)からの呼び出しは副作用なし
  var isSim=(gs!==GS);
  // 撃破時: チェーン更新
  if(res.dkill){
    gs.players[atk.owner]._chain=(gs.players[atk.owner]._chain||0)+1;
    if(!isSim){
      var ch=gs.players[atk.owner]._chain;
      if(ch>=2)addLog('🔥CHAIN ×'+ch+'！ '+PCOLS[atk.owner].name,{hot:true});
      if(ch>=3){gs.players[atk.owner].gold+=50;addLog('連撃ボーナス +50G！',{sys:true});}
      recordKill(atk.owner,res.defType,res.isCrit,atkLowHpBefore);
    }
  }
  if(res.ckill&&!isSim)recordKill(def.owner,res.atkType,res.isCritC,false);
  return res;
};

/* ---------- v10.0: showBattle にチェーン表示フック ---------- */
// ※ applyVsIntro / applyScreenShake / applyCritZoom / applyElementFlash /
//    maybeBigDamage / showKillBanner は battle.js 内で適切なタイミングで呼ばれる
var _origShowBattle=showBattle;
showBattle=function(res,cb,fast){
  if(!res){if(cb)cb();return;}
  _origShowBattle(res,function(){if(cb)cb();},fast);
  // チェーン表示（battle.js が bAffinityTxt.textContent を設定した直後に追加）
  if(GS&&GS.players&&GS.players[res.atkOwner]){
    var ch=GS.players[res.atkOwner]._chain||0;
    if(ch>=2){
      setTimeout(function(){
        var affEl=document.getElementById('bAffinityTxt');
        if(affEl){
          var existing=affEl.querySelector('.b-chain');if(existing)existing.remove();
          var span=document.createElement('span');span.className='b-chain';
          span.textContent='🔥CHAIN ×'+ch;affEl.appendChild(span);
        }
      },40);
    }
  }
};

/* ---------- v10.0: advanceTurn にチェーンリセット + サブクエスト判定 ---------- */
var _origAdvanceTurn=advanceTurn;
advanceTurn=function(){
  if(GS&&GS.players){
    // チェーンリセット（ターン終了プレイヤーのみ）
    if(GS.players[GS.turn]){
      var lastChain=GS.players[GS.turn]._chain||0;
      if(lastChain>0&&lastChain<2){GS.players[GS.turn]._chain=0;}
      else if(lastChain>=2){GS.players[GS.turn]._chain=Math.floor(lastChain/2);} // 半減
    }
    // サブクエスト発動チェック
    if(GS.round>0&&GS.round%4===0&&useEvent&&(!GS.subQuests||GS.subQuests.length===0)){
      maybeSpawnSubQuest();
    }
    // サブクエスト達成チェック
    checkSubQuests();
  }
  _origAdvanceTurn();
};

/* ---------- A-2: サブクエストシステム ---------- */
var SUB_QUEST_TEMPLATES=[
  {id:'capture_castle',name:'城砦の制圧',desc:'3ターン以内に新規城砦を1つ占拠する',deadline:3,reward:'+150G',
   check:function(gs,start){var pid=start.pid;var got=0;for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){if(gs.own[r][c]===pid&&TDEFS[MAP[r][c]].cap)got++;}return got>start.castleCount;},
   reward_fn:function(gs,start){gs.players[start.pid].gold+=150;}},
  {id:'kill_3',name:'三騎討',desc:'3ターン以内に敵を3体撃破',deadline:3,reward:'+200G',
   check:function(gs,start){return gs.stats[start.pid].killed>=start.kills+3;},
   reward_fn:function(gs,start){gs.players[start.pid].gold+=200;}},
  {id:'crit_2',name:'必殺の覚醒',desc:'2回会心を成功させる',deadline:4,reward:'+150G',
   check:function(gs,start){var s=getAchvStats();return s.totalCrits>=start.crits+2;},
   reward_fn:function(gs,start){gs.players[start.pid].gold+=150;}},
  {id:'survive_3',name:'不屈の意志',desc:'3ターン無傷で生き残る',deadline:3,reward:'+全軍HP回復',
   check:function(gs,start){return gs.stats[start.pid].lost===start.lost;},
   reward_fn:function(gs,start){gs.units.filter(function(u){return u.owner===start.pid;}).forEach(function(u){u.hp=u.mhp;});}}
];
function maybeSpawnSubQuest(){
  if(!GS||!useEvent)return;if(rnd(GS)>0.65)return;
  var template=SUB_QUEST_TEMPLATES[Math.floor(rnd(GS)*SUB_QUEST_TEMPLATES.length)];
  // 人間プレイヤー（オフライン）またはホスト視点で発動
  var pid=getMyPid();if(pid<0||pid>=GS.np)pid=0;
  if(!GS.players[pid]||!GS.players[pid].alive)return;
  var castleCount=0;for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++)if(GS.own[r][c]===pid&&TDEFS[MAP[r][c]].cap)castleCount++;
  var quest={id:template.id,name:template.name,desc:template.desc,deadline:GS.round+template.deadline,reward:template.reward,
             start:{pid:pid,round:GS.round,kills:GS.stats[pid].killed,lost:GS.stats[pid].lost,castleCount:castleCount,crits:getAchvStats().totalCrits||0},
             tplId:template.id};
  GS.subQuests.push(quest);
  showEvt('📜 サイドクエスト',quest.name+'\n'+quest.desc+'\n報酬: '+quest.reward);
}
function checkSubQuests(){
  if(!GS||!GS.subQuests||GS.subQuests.length===0)return;
  var remaining=[];
  GS.subQuests.forEach(function(q){
    var tpl=SUB_QUEST_TEMPLATES.find(function(t){return t.id===q.tplId;});if(!tpl)return;
    if(tpl.check(GS,q.start)){
      tpl.reward_fn(GS,q.start);
      addLog('🎯 サブクエスト達成: '+q.name+' / 報酬 '+q.reward,{hot:true});
      showMsg('🎯 達成: '+q.name+' / '+q.reward,3000);
    }else if(GS.round>q.deadline){
      addLog('⏰ サブクエスト失敗: '+q.name,{sys:true});
    }else{
      remaining.push(q);
    }
  });
  GS.subQuests=remaining;
}

/* ---------- ゲーム開始時に戦闘ビュー設定をUIに反映 ---------- */
var _origBuildPSetup=buildPSetup;
buildPSetup=function(n){_origBuildPSetup(n);setBView(battleViewMode);};

/* ---------- 初期化: ゲームオーバー画面に実績バッジ表示 ---------- */
var _origShowGameOver=null; // 後でラップ
window.addEventListener('DOMContentLoaded',function(){
  // ビューモードボタンの初期状態反映
  setTimeout(function(){setBView(battleViewMode);},100);
  // showGameOver を後追いラップ（存在を確認してから）
  if(typeof showGameOver==='function'){
    _origShowGameOver=showGameOver;
    window.showGameOver=function(){
      var ret=_origShowGameOver();
      try{
        var stats=getAchvStats();var stEl=document.getElementById('goStats');
        if(stEl&&stats.unlocked&&stats.unlocked.length>0){
          var html='<div style="margin-top:10px;border-top:1px solid rgba(80,140,180,.3);padding-top:8px"><div style="color:var(--gold);margin-bottom:4px;font-size:11px">🏆 解除済み実績 ('+stats.unlocked.length+'/'+ACHIEVEMENTS.length+')</div>';
          ACHIEVEMENTS.forEach(function(a){
            var got=stats.unlocked.indexOf(a.id)>=0;
            html+='<div style="display:inline-block;margin:3px;padding:3px 8px;border-radius:10px;font-size:9px;'+(got?'background:rgba(240,200,64,.18);border:1px solid rgba(240,200,64,.6);color:var(--gold)':'background:rgba(20,30,50,.5);border:1px solid rgba(60,80,110,.4);color:var(--dim);opacity:.5')+'" title="'+a.desc+'">'+(got?'🏆 ':'🔒 ')+a.name+'</div>';
          });
          html+='</div>';
          stEl.innerHTML+=html;
        }
        // フローレス勝利判定
        if(GS&&GS.over&&GS.winner>=0){
          var winnerStats=GS.stats[GS.winner];
          if(winnerStats&&winnerStats.lost===0){var s=getAchvStats();s.flawlessWin=true;saveAchvStats(s);checkAchievements();}
        }
      }catch(e){console.warn('[v10] showGameOver wrap err',e);}
      return ret;
    };
  }
});

/* ---------- 初期化: バトル画面の VS テキストにフォーカス効果 ---------- */
function getVsAffRing(affMult){
  if(affMult>=4)return '<span class="b-aff-ring" style="background:#ff4400;color:#ff4400"></span>';
  if(affMult>=3)return '<span class="b-aff-ring" style="background:#f0c840;color:#f0c840"></span>';
  if(affMult>=1.5)return '<span class="b-aff-ring" style="background:#fff;color:#fff"></span>';
  if(affMult<=0.5)return '<span class="b-aff-ring" style="background:#3a4a5a;color:#3a4a5a"></span>';
  return '';
}
