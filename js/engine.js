// ================================================================
//  キングオブキングス v10.0 - ゲームエンジン（移動・戦闘・ターン管理）
// ================================================================
'use strict';
// ===== ゲーム状態 =====
function newGS(np,settings){
  var seed=(Date.now()^Math.floor(Math.random()*0xffffffff))|0;if(seed===0)seed=1;
  var gs={np:np,turn:0,round:1,players:[],units:[],uid:0,own:[],over:false,winner:-1,log:[],weather:WEATHERS[0],wTimer:3,settings:settings,stats:[],phxRevived:[],summonCounts:{},skillCD:{},rngSeed:seed,actionSeq:0,actionLog:[],subQuests:[],mapOverrides:{},chainKills:[]};
  for(var i=0;i<ROWS;i++){gs.own.push([]);for(var j=0;j<COLS;j++)gs.own[i].push(-1);}
  for(var i=0;i<np;i++){
    gs.stats.push({killed:0,lost:0,captured:0,kingKills:0});
    gs.players.push({id:i,gold:400,alive:true,aiType:settings[i].type,name:settings[i].name,morale:100});
    var cp=CASTLE_POS[i],cpR=cp[0],cpC=cp[1];
    // 境界チェック（マップサイズが変わった際の安全策）
    if(cpR<0)cpR=0;if(cpR>=ROWS)cpR=ROWS-1;if(cpC<0)cpC=0;if(cpC>=COLS)cpC=COLS-1;
    gs.own[cpR][cpC]=i;
    // King spawns at castle
    gs.units.push(mkU(gs,'king',i,cpR,cpC,true));
    // Other units
    for(var j=0;j<INIT_UNITS[i].length;j++){
      var rc=INIT_UNITS[i][j],rr=rc[0],cc=rc[1];
      if(rr>=0&&rr<ROWS&&cc>=0&&cc<COLS&&!uAt(gs,rr,cc))
        gs.units.push(mkU(gs,'soldier',i,rr,cc,true));
    }
  }
  return gs;
}
function mkU(gs,type,owner,r,c,spent){return{id:gs.uid++,type:type,owner:owner,row:r,col:c,hp:UDEFS[type].hp,mhp:UDEFS[type].hp,moved:!!spent,attacked:!!spent,status:[],xp:0,level:1,kingAoeCD:0};}
function uAt(gs,r,c){for(var i=0;i<gs.units.length;i++){var u=gs.units[i];if(u.row===r&&u.col===c&&u.hp>0)return u;}return null;}
function td(r,c){if(!MAP||!MAP[r]||r<0||r>=ROWS||c<0||c>=COLS)return TDEFS[0];return TDEFS[MAP[r][c]||0]||TDEFS[0];}
function isHuman(pid){return GS&&GS.players[pid]&&GS.players[pid].aiType==='human';}
function allCPU(){if(!GS)return false;return GS.players.filter(function(p){return p.alive;}).every(function(p){return p.aiType!=='human';});}
function effAtk(u){
  var b=UDEFS[u.type].atk+(GS?GS.weather.atk||0:0)+Math.round(((GS?GS.players[u.owner].morale:100)-100)*0.05)+(u.level-1);
  if(u.status&&u.status.indexOf('cursed')>=0)b-=3;
  if(u.status&&u.status.indexOf('weakened')>=0)b-=4;
  return Math.max(1,b);
}
function effMov(u){return Math.max(1,UDEFS[u.type].mov+(GS?GS.weather.mov||0:0));}
function mdist(r1,c1,r2,c2){return Math.abs(r1-r2)+Math.abs(c1-c2);}
function critRate(u){return(u.type==='assassin'||u.type==='monk')?0.20:u.type==='hero'?0.15:0.10;}
function formationBonus(gs,u){var dirs=[[0,1],[0,-1],[1,0],[-1,0]];for(var i=0;i<dirs.length;i++){var nr=u.row+dirs[i][0],nc=u.col+dirs[i][1];if(nr<0||nr>=ROWS||nc<0||nc>=COLS)continue;var adj=uAt(gs,nr,nc);if(adj&&adj.owner===u.owner&&adj.hp>0)return true;}return false;}
function addLog(msg,opt){opt=opt||{};if(GS&&GS.log)GS.log.unshift({msg:msg,opt:opt});}
// ===== 移動範囲 =====
function getMovable(gs,unit){
  var mv=effMov(unit),dist={},q=[{r:unit.row,c:unit.col,rem:mv}],res=[];
  dist[unit.row+','+unit.col]=mv;
  var flying=['dragon','phoenix','valkyrie'];
  while(q.length>0){
    var cur=q.shift(),r=cur.r,c=cur.c,rem=cur.rem;
    if(r!==unit.row||c!==unit.col){var occ=uAt(gs,r,c);if(!occ)res.push({r:r,c:c});else continue;}
    if(rem<=0)continue;
    var dirs=[[0,1],[0,-1],[1,0],[-1,0]];
    for(var i=0;i<dirs.length;i++){
      var nr=r+dirs[i][0],nc=c+dirs[i][1];
      if(nr<0||nr>=ROWS||nc<0||nc>=COLS)continue;
      var cost2=(flying.indexOf(unit.type)>=0)?1:movCost(unit,safeMAP(nr,nc));
      if(cost2>=99)continue;
      var nr2=rem-cost2;if(nr2<0)continue;
      var key=nr+','+nc,prev=dist[key]!==undefined?dist[key]:-1;
      if(prev>=nr2)continue;
      var occ2=uAt(gs,nr,nc);if(occ2&&occ2.owner!==unit.owner)continue;
      dist[key]=nr2;q.push({r:nr,c:nc,rem:nr2});
    }
  }
  return res;
}
function getAttackable(gs,unit){
  var rng=UDEFS[unit.type].rng,res=[];
  for(var dr=-rng;dr<=rng;dr++)for(var dc=-rng;dc<=rng;dc++){
    var d=Math.abs(dr)+Math.abs(dc);if(d===0||d>rng)continue;
    var nr=unit.row+dr,nc=unit.col+dc;if(nr<0||nr>=ROWS||nc<0||nc>=COLS||!MAP||!MAP[nr])continue;
    var tgt=uAt(gs,nr,nc);if(tgt&&tgt.owner!==unit.owner)res.push({r:nr,c:nc});
  }
  return res;
}
function getFieldMagicTargets(gs,unit){
  // ★攻撃範囲設定: 以下の数値「2」を変えるとフィールド魔法の範囲が変わります
  var FIELD_RANGE=2;
  var res=[];
  for(var dr=-FIELD_RANGE;dr<=FIELD_RANGE;dr++)for(var dc=-FIELD_RANGE;dc<=FIELD_RANGE;dc++){
    if(Math.abs(dr)+Math.abs(dc)>FIELD_RANGE)continue;
    var nr=unit.row+dr,nc=unit.col+dc;if(nr<0||nr>=ROWS||nc<0||nc>=COLS||!MAP||!MAP[nr])continue;
    var tgt=uAt(gs,nr,nc);if(tgt&&tgt.owner!==unit.owner)res.push(tgt);
  }
  return res;
}
// ===== ダメージ計算 (物理/魔法・属性・地形) =====
// ===== 王の威令 (範囲攻撃) =====
// ★王の威令の範囲設定: 以下の数値「2」を変えると王の威令の範囲が変わります
var KING_AOE_RANGE=2;
function doKingAoEAction(gs,uid){
  var u=null;for(var i=0;i<gs.units.length;i++){if(gs.units[i].id===uid){u=gs.units[i];break;}}
  if(!u||u.type!=='king'||u.attacked)return null;
  var targets=[],results=[];
  for(var dr=-KING_AOE_RANGE;dr<=KING_AOE_RANGE;dr++)for(var dc=-KING_AOE_RANGE;dc<=KING_AOE_RANGE;dc++){
    if(Math.abs(dr)+Math.abs(dc)>KING_AOE_RANGE)continue;
    var nr=u.row+dr,nc=u.col+dc;if(nr<0||nr>=ROWS||nc<0||nc>=COLS)continue;
    var tgt=uAt(gs,nr,nc);if(tgt&&tgt.owner!==u.owner)targets.push(tgt);
  }
  targets.forEach(function(tgt){
    var h=calcOneDmg(u,tgt,gs,.65);tgt.hp-=h.dmg;results.push({target:tgt,dmg:h.dmg,dkill:tgt.hp<=0});
    if(tgt.hp<=0){gs.stats[u.owner].killed++;gs.stats[tgt.owner].lost++;}
  });
  u.attacked=true;u.moved=true;
  gs.units=gs.units.filter(function(u2){return u2.hp>0;});
  checkWin(gs);
  addLog(PCOLS[u.owner].name+'の王が「王の威令」！'+targets.length+'体に広域攻撃！',{hot:true});
  SFX.magic();return results;
}
// ===== フィールド魔法 =====
function doFieldMagicAction(gs,uid){
  var u=null;for(var i=0;i<gs.units.length;i++){if(gs.units[i].id===uid){u=gs.units[i];break;}}
  if(!u||!isMagicUnit(u.type))return{count:0};
  var targets=getFieldMagicTargets(gs,u);
  targets.forEach(function(t){if(t.status.indexOf('weakened')<0)t.status.push('weakened');if(t.status.indexOf('enfeebled')<0)t.status.push('enfeebled');});
  u.attacked=true;addLog(UDEFS[u.type].name+'がフィールド魔法！'+targets.length+'体を弱体化！',{hot:true});SFX.magic();return{count:targets.length};
}
// ===== スケルトン召喚 =====
function doNecroSummonAction(gs,uid){
  var u=null;for(var i=0;i<gs.units.length;i++){if(gs.units[i].id===uid){u=gs.units[i];break;}}
  if(!u||u.type!=='necromancer'||(gs.summonCounts[u.id]||0)>=3)return false;
  var pl=gs.players[u.owner];if(pl.gold<80)return false;
  var dirs=[[0,1],[0,-1],[1,0],[-1,0],[-1,-1],[-1,1],[1,-1],[1,1]];
  for(var i=0;i<dirs.length;i++){var nr=u.row+dirs[i][0],nc=u.col+dirs[i][1];if(nr<0||nr>=ROWS||nc<0||nc>=COLS)continue;if(!uAt(gs,nr,nc)&&MAP[nr][nc]!==3){pl.gold-=80;gs.units.push(mkU(gs,'skeleton',u.owner,nr,nc,true));gs.summonCounts[u.id]=(gs.summonCounts[u.id]||0)+1;u.attacked=true;u.moved=true;addLog('スケルトン召喚！(-80G)',{sys:true});SFX.magic();return true;}}
  return false;
}
function gainXP(gs,u,amt){if(!u||u.hp<=0)return;u.xp=(u.xp||0)+amt;if(u.xp>=100*(u.level||1)){u.xp=0;u.level=(u.level||1)+1;u.mhp+=5;u.hp=Math.min(u.hp+5,u.mhp);addLog(PCOLS[u.owner].name+'の'+UDEFS[u.type].name+'がLv'+u.level+'に！',{sys:true});SFX.levelup();}}
function doMove(gs,uid,r,c){
  var u=null;for(var i=0;i<gs.units.length;i++){if(gs.units[i].id===uid){u=gs.units[i];break;}}
  if(!u)return{captured:false};u.row=r;u.col=c;u.moved=true;
  var t=td(r,c);if(t.prod){var prev=gs.own[r][c];gs.own[r][c]=u.owner;if(prev!==u.owner){gs.stats[u.owner].captured++;return{captured:true,terrain:t};}}
  checkWin(gs);return{captured:false};
}
function startOfTurn(gs,pid){
  var pl=gs.players[pid],inc=0;
  for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){if(gs.own[r]&&gs.own[r][c]===pid){var t=TDEFS[safeMAP(r,c)]||TDEFS[0];if(t.incm)inc+=t.incm+(gs.weather.inc||0);}}
  pl.gold+=inc;
  for(var i=0;i<gs.units.length;i++){
    var u=gs.units[i];if(u.owner!==pid)continue;
    var t2=TDEFS[safeMAP(u.row,u.col)]||TDEFS[0];
    if(t2.id===4&&u.hp<u.mhp)u.hp=Math.min(u.mhp,u.hp+Math.floor(u.mhp*.25));
    if(t2.id===7&&u.hp<u.mhp)u.hp=Math.min(u.mhp,u.hp+Math.floor(u.mhp*.12));
    if(u.status.indexOf('poisoned')>=0)u.hp=Math.max(1,u.hp-4);
    ['cursed','weakened','enfeebled'].forEach(function(s){if(u.status.indexOf(s)>=0&&rnd(gs)<.45)u.status=u.status.filter(function(x){return x!==s;});});
    if(u.kingAoeCD>0)u.kingAoeCD--;
  }
  for(var i=0;i<gs.units.length;i++){var h=gs.units[i];if(h.owner!==pid||h.type!=='healer')continue;for(var j=0;j<gs.units.length;j++){var a=gs.units[j];if(a.owner!==pid||a.id===h.id)continue;if(mdist(h.row,h.col,a.row,a.col)<=2&&a.hp<a.mhp)a.hp=Math.min(a.mhp,a.hp+Math.floor(a.mhp*.2));}}
  return inc;
}
// ===== 勝利条件: 王様撃破 OR 全城砦占拠 =====
function checkWin(gs){
  for(var p=0;p<gs.np;p++){
    if(!gs.players[p].alive)continue;
    var kingAlive=gs.units.some(function(u){return u.owner===p&&u.type==='king';});
    var hasCastle=false;for(var r=0;r<ROWS&&!hasCastle;r++)for(var c=0;c<COLS&&!hasCastle;c++)if(gs.own[r][c]===p&&TDEFS[MAP[r][c]].cap)hasCastle=true;
    if(!kingAlive||!hasCastle){
      gs.players[p].alive=false;
      addLog(gs.players[p].name+'が'+(!kingAlive?'王様を失い':'全城砦を失い')+'滅亡！',{hot:true});
      gs.units=gs.units.filter(function(u){return u.owner!==p;});
    }
  }
  var alive=gs.players.filter(function(p){return p.alive;});
  if(alive.length===1){gs.over=true;gs.winner=alive[0].id;}
}
/* ===== レベルシステム（撃破=レベルアップ） ===== */
function killLevelUp(gs,killer,killed){
  if(!killer||killer.hp<=0)return;
  var gained=killed.level||1;
  var oldLv=killer.level||1;
  for(var i=0;i<gained;i++){
    killer.level=(killer.level||1)+1;
    killer.mhp+=3;killer.hp=Math.min(killer.hp+3,killer.mhp);
  }
  var msg=PCOLS[killer.owner].name+'の'+UDEFS[killer.type].name+' Lv'+oldLv+'→Lv'+killer.level+'！';
  if(gained>1)msg+=' (★+'+gained+'レベル連続上昇！)';
  addLog(msg,{hot:true});
  SFX.levelup();
  // マップ上にレベルアップフラッシュ
  if(typeof lvUpFlash==='function')lvUpFlash(killer,gained);
}
function effPDef(u){return Math.max(0,(UDEFS[u.type].pdef||0)+(u.level-1));}
function effMDef(u){return Math.max(0,(UDEFS[u.type].mdef||0)+(u.level-1));}
// calcOneDmg をレベル対応版に更新
function calcOneDmg(atk,def,gs,mult){
  mult=mult||1;
  var ud=UDEFS[atk.type],dd=UDEFS[def.type];
  var baseAtk=effAtk(atk);
  var tboA=getTerrainBonus(atk,atk.row,atk.col);baseAtk+=tboA.atk;
  var tboD=getTerrainBonus(def,def.row,def.col);
  // 物理/魔法防御をレベル反映
  var defVal=(ud.atkType==='magic')?(effMDef(def)+tboD.mdef):(effPDef(def)+tboD.pdef);
  if(atk.type==='monk'&&TYPE_CAT[def.type]==='heavy')defVal=Math.floor(defVal/2);
  defVal+=(TDEFS[safeMAP(def.row,def.col)]||TDEFS[0]).def+(GS?GS.weather.def||0:0);
  var raw=Math.max(1,Math.round(baseAtk)-defVal+Math.floor(rnd(gs)*5)-2);
  var affMult=getAffMult(atk.type,def.type);
  var elemMult=getElemMult(ud.elem||'none',dd.elem||'none');
  var fBonus=formationBonus(gs,atk)?1.08:1.0;
  var isCrit=rnd(gs)<critRate(atk);
  var critMult=isCrit?1.35:1.0;
  var finalDmg=Math.max(1,Math.round(raw*affMult*elemMult*fBonus*critMult*mult));
  return{dmg:finalDmg,affMult:affMult,elemMult:elemMult,isCrit:isCrit};
}
// calcAttack にkillLevelUpを統合
function calcAttack(gs,atkId,defId){
  var atk=null,def=null;
  for(var i=0;i<gs.units.length;i++){if(gs.units[i].id===atkId)atk=gs.units[i];if(gs.units[i].id===defId)def=gs.units[i];}
  if(!atk||!def||atk.hp<=0||def.hp<=0)return null;
  var ud=UDEFS[atk.type],dd=UDEFS[def.type];
  var h1=calcOneDmg(atk,def,gs,1);def.hp-=h1.dmg;
  if((atk.type==='necromancer'||atk.type==='witch')&&def.status.indexOf('cursed')<0&&rnd(gs)<(atk.type==='necromancer'?0.7:0.5))def.status.push('cursed');
  if(atk.type==='necromancer'&&def.status.indexOf('poisoned')<0&&rnd(gs)<0.5)def.status.push('poisoned');
  var dmg2=0;
  if(atk.type==='dualblader'&&def.hp>0){var h2=calcOneDmg(atk,def,gs,.8);dmg2=h2.dmg;def.hp-=dmg2;}
  var totalDmg=h1.dmg+dmg2,dkill=def.hp<=0,phxRev=false,defRow=def.row,defCol=def.col,defLevel=def.level||1;
  if(dkill&&def.type==='phoenix'&&gs.phxRevived.indexOf(def.id)<0){def.hp=Math.floor(def.mhp*.4);gs.phxRevived.push(def.id);phxRev=true;dkill=false;}
  var cdmg=0,ckill=false,isCritC=false;
  if(!dkill&&!phxRev&&mdist(atk.row,atk.col,def.row,def.col)<=UDEFS[def.type].rng){
    var hc=calcOneDmg(def,atk,gs,1);cdmg=hc.dmg;isCritC=hc.isCrit;atk.hp-=cdmg;ckill=atk.hp<=0;
  }
  var atkLevel=atk.level||1;
  if(dkill){
    gs.stats[atk.owner].killed++;gs.stats[def.owner].lost++;
    if(def.type==='king')gs.stats[atk.owner].kingKills=(gs.stats[atk.owner].kingKills||0)+1;
    gs.players[atk.owner].morale=Math.min(150,gs.players[atk.owner].morale+6);
    gs.players[def.owner].morale=Math.max(50,gs.players[def.owner].morale-6);
    killLevelUp(gs,atk,def); // ★レベルアップ
    if(atk.type==='necromancer'){var cnt=(gs.summonCounts[atk.id]||0);if(cnt<3&&!uAt(gs,defRow,defCol)){gs.units.push(mkU(gs,'skeleton',atk.owner,defRow,defCol,true));gs.summonCounts[atk.id]=(cnt+1);addLog('スケルトン召喚！',{sys:true});}}
  }
  if(ckill){gs.stats[def.owner].killed++;gs.stats[atk.owner].lost++;killLevelUp(gs,def,atk);}
  var res={dmg:totalDmg,cdmg:cdmg,dkill:dkill,ckill:ckill,phxRev:phxRev,affMult:h1.affMult,elemMult:h1.elemMult,isCrit:h1.isCrit,isCritC:isCritC,isDual:atk.type==='dualblader'&&dmg2>0,atkOwner:atk.owner,defOwner:def.owner,atkType:atk.type,defType:def.type,atkHpBef:Math.max(0,atk.hp+cdmg),atkHpAft:Math.max(0,atk.hp),defHpBef:Math.max(0,def.hp+totalDmg),defHpAft:Math.max(0,def.hp),atkMhp:atk.mhp,defMhp:def.mhp,atkStatus:atk.status.slice(),defStatus:def.status.slice(),atkElem:ud.elem,defElem:dd.elem,atkAtkType:ud.atkType,defEnemyLevel:defLevel,tid:MAP[def.row][def.col]};
  gs.units=gs.units.filter(function(u){return u.hp>0;});
  if(atk.hp>0){atk.moved=true;atk.attacked=true;}
  checkWin(gs);return res;
}
/* ===== 天候・イベント ===== */
function advWeather(){if(!useWeather)return;GS.wTimer--;if(GS.wTimer<=0){GS.weather=WEATHERS[Math.floor(Math.random()*WEATHERS.length)];GS.wTimer=3+Math.floor(Math.random()*4);addLog('天候: '+GS.weather.icon+GS.weather.name,{sys:true});}document.getElementById('topWeather').textContent=useWeather?GS.weather.icon:'';}
function trigEvt(){if(!useEvent||Math.random()>.35)return;var ev=RAND_EVENTS[Math.floor(Math.random()*RAND_EVENTS.length)];if(window[ev.fn])window[ev.fn](ev);}
function evMerchant(ev){var al=GS.players.filter(function(p){return p.alive;});var pl=al[Math.floor(Math.random()*al.length)];pl.gold+=200;showEvt(ev.name,pl.name+'に+200G！');}
function evPlague(ev){var al=GS.players.filter(function(p){return p.alive;});var pl=al[Math.floor(Math.random()*al.length)];GS.units.filter(function(u){return u.owner===pl.id;}).forEach(function(u){u.hp=Math.max(1,u.hp-6);});showEvt(ev.name,pl.name+'の全ユニット-6HP！');}
function evRecruit(ev){var mn=999,mp=null;GS.players.filter(function(p){return p.alive;}).forEach(function(pl){var ct=0;for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++)if(GS.own[r][c]===pl.id&&TDEFS[MAP[r][c]].cap)ct++;if(ct<mn){mn=ct;mp=pl;}});if(!mp)return;var placed=0;outer:for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){if(GS.own[r][c]===mp.id&&!uAt(GS,r,c)){GS.units.push(mkU(GS,'soldier',mp.id,r,c,true));placed++;if(placed>=2)break outer;}}showEvt(ev.name,mp.name+'に兵士'+placed+'体！');}
function evTreasure(ev){var al=GS.players.filter(function(p){return p.alive;});var pl=al[Math.floor(Math.random()*al.length)];pl.gold+=350;showEvt(ev.name,pl.name+'が+350Gの宝！');}
function showEvt(t,d){document.getElementById('evtTitle').textContent=t;document.getElementById('evtDesc').textContent=d;document.getElementById('evtPopup').classList.add('show');addLog('【イベント】'+t+': '+d,{sys:true});}
function closeEvt(){document.getElementById('evtPopup').classList.remove('show');}
/* ===== ポーズ ===== */
function togglePause(){
  isPaused=!isPaused;
  var btn=document.getElementById('pauseBtn'),ov=document.getElementById('pauseOv');
  if(isPaused){btn.textContent='▶';btn.classList.add('paused');ov.classList.add('show');drawPauseField();}
  else{btn.textContent='⏸';btn.classList.remove('paused');ov.classList.remove('show');if(GS&&!GS.over&&!isHuman(GS.turn))setTimeout(function(){runCPUTurn(GS.turn);},400);}
  if(onlineMode)broadcastAction({type:'pause',paused:isPaused});
}
function drawPauseField(){
  var cvs=document.getElementById('pauseFieldCanvas');if(!cvs||!GS)return;
  var c=cvs.getContext('2d'),w=cvs.width,h=cvs.height;
  var tw=w/COLS,th=h/ROWS;
  c.clearRect(0,0,w,h);
  for(var r=0;r<ROWS;r++)for(var col2=0;col2<COLS;col2++){
    var tid=MAP[r][col2],own=GS.own[r][col2];
    c.fillStyle=TDEFS[tid].col;c.fillRect(col2*tw,r*th,tw,th);
    if(own>=0){c.fillStyle=PCOLS[own].main+'44';c.fillRect(col2*tw,r*th,tw,th);c.strokeStyle=PCOLS[own].main;c.lineWidth=1.5;c.strokeRect(col2*tw,r*th,tw,th);}
  }
  GS.units.forEach(function(u){
    var cx=u.col*tw+tw/2,cy=u.row*th+th/2,pc=PCOLS[u.owner];
    c.fillStyle=pc.main;c.beginPath();c.arc(cx,cy,Math.min(tw,th)*.38,0,Math.PI*2);c.fill();
    c.fillStyle=pc.light;c.font='bold '+Math.floor(Math.min(tw,th)*.4)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';
    c.fillText(u.type==='king'?'👑':UDEFS[u.type].sym,cx,cy);
    if(u.level>3){c.fillStyle='#ffdd44';c.font='bold '+Math.floor(Math.min(tw,th)*.25)+'px sans-serif';c.fillText('★'+u.level,u.col*tw+1,r*th+1);}
  });
  // 現在ターンのプレイヤー表示
  var pl=GS.players[GS.turn],pc=PCOLS[GS.turn];
  c.fillStyle='rgba(0,0,0,.65)';c.fillRect(0,h-18,w,18);
  c.fillStyle=pc.light;c.font='bold 9px sans-serif';c.textAlign='left';c.textBaseline='middle';
  c.fillText('▶ '+pl.name+' のターン (R'+GS.round+')',4,h-9);
}
/* ===== ターン進行 ===== */
var turnDelayTimer=null;
function advanceTurn(){
  if(!GS||GS.over)return;
  if(checkWinFull())return;
  var next=(GS.turn+1)%GS.np,checked=0;
  while(!GS.players[next].alive&&checked<GS.np){next=(next+1)%GS.np;checked++;}
  if(checked>=GS.np){checkWinFull();return;}
  if(next<=GS.turn)GS.round++;
  GS.turn=next;
  GS.units.forEach(function(u){if(u.owner===GS.turn){u.moved=false;u.attacked=false;}});
  advWeather();if(GS.round%4===0)trigEvt();
  var inc=startOfTurn(GS,GS.turn);if(inc>0)addLog(GS.players[GS.turn].name+': +'+inc+'G',{sys:true});
  // ★FIX: オンラインでは自分のシート（myPeerIdx）と一致した時のみ操作可。
  //   従来 isHuman(GS.turn) は全オンラインプレイヤーが 'human' のため、
  //   ホスト画面で他プレイヤー(P2/P3..)を操作できてしまっていた。
  isMyTurn = onlineMode ? (GS.turn===myPeerIdx) : isHuman(GS.turn);
  cancelSel(); // ターン切替時に選択・モードを必ず解除
  document.getElementById('pauseBtn').style.display=allCPU()?'block':'none';
  render();updUI();showTurnNotif(GS.turn);
  if(GS.over){showGameOver();return;}
  if(onlineMode&&isHost)broadcastState();
  // ★FIX: CPU はホストのみが実行（クライアントで重複実行しない）
  if(!isHuman(GS.turn)&&!isPaused){
    if(!onlineMode||isHost)setTimeout(function(){runCPUTurn(GS.turn);},800);
  }
}
// 確実にゲームオーバーをチェック
function checkWinFull(){
  if(!GS)return false;
  checkWin(GS);
  if(GS.over){showGameOver();return true;}
  var alive=GS.players.filter(function(p){return p.alive;});
  if(alive.length<=1){
    GS.over=true;
    GS.winner=alive.length===1?alive[0].id:-1;
    if(GS.winner<0)addLog('全勢力が滅亡。引き分け終戦。',{hot:true});
    showGameOver();return true;
  }
  return false;
}
function humanEndTurn(){
  if(!GS||GS.over)return;
  if(!isMyTurn){showMsg('あなたのターンではありません',1500);return;}
  // ★FIX: オンライン時は GS.turn と myPeerIdx の二重チェック（CPU乗っ取り防止）
  if(onlineMode&&GS.turn!==myPeerIdx){showMsg('あなたのターンではありません',1500);return;}
  cancelSel();SFX.turnEnd();
  if(onlineMode&&!isHost){
    // ★FIX: owner を明示送信し、レース時の重複advanceTurnを防止
    broadcastAction({type:'end_turn',owner:myPeerIdx});
    isMyTurn=false;updUI();return;
  }
  // 3秒カウントダウン後にターンチェンジ
  showTurnDelay(GS.players[GS.turn].name,function(){advanceTurn();});
}
var _tdEl=null,_tdTimer=null;
function showTurnDelay(name,cb){
  _tdEl=document.getElementById('turnDelay');
  _tdEl.style.display='block';
  var pid=-1;if(GS)pid=GS.turn;
  var col=pid>=0?PCOLS[pid].light:'#c8dff0';
  _tdEl.style.color=col;_tdEl.style.borderColor=col+'80';
  var cnt=3;
  function tick(){
    _tdEl.innerHTML='<span style="color:'+col+'">'+name+'</span><br><span style="font-size:0.7em;color:var(--dim)">ターン終了 </span><span style="font-size:1.2em">'+cnt+'</span>';
    cnt--;if(cnt<0){_tdEl.style.display='none';cb();}else{_tdTimer=setTimeout(tick,1000);}
  }
  tick();
}
/* ===== CPU AI ===== */