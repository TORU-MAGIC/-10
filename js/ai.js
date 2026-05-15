// ================================================================
//  キングオブキングス v10.0 - CPU AI
// ================================================================
'use strict';
function runCPUTurn(pid){
  // v10.0: 多重起動の徹底防止（同じpidの再入も含む）
  if(cpuTurnPid===pid)return;
  if(cpuTurnPid>=0||isPaused)return;
  if(!GS||GS.over||GS.turn!==pid||isHuman(pid)){cpuTurnPid=-1;return;}
  // オンラインクライアントはCPU処理しない（ホスト権威）
  if(onlineMode&&!isHost){cpuTurnPid=-1;return;}
  cpuTurnPid=pid;
  var el=document.getElementById('cpuLabel');el.textContent='🤖 '+GS.players[pid].name+' (Lv'+(avgLevel(pid).toFixed(1))+') 思考中...';el.style.display='block';
  setTimeout(function(){
    if(!GS||GS.over){el.style.display='none';cpuTurnPid=-1;return;}
    cpuProduceAll(pid,function(){cpuSpecialAll(pid,function(){
      var ids=GS.units.filter(function(u){return u.owner===pid&&u.hp>0;}).sort(function(a,b){return (b.level||1)-(a.level||1);}).map(function(u){return u.id;});
      cpuActSeq(pid,ids,0,function(){el.style.display='none';cpuTurnPid=-1;SFX.turnEnd();showTurnDelay(GS.players[pid].name,function(){if(!isPaused)advanceTurn();});});
    });});
  },400);
}
function avgLevel(pid){var us=GS.units.filter(function(u){return u.owner===pid&&u.hp>0;});return us.length?us.reduce(function(s,u){return s+(u.level||1);},0)/us.length:1;}
function cpuSpecialAll(pid,cb){
  // King AoE if surrounded
  GS.units.filter(function(u){return u.owner===pid&&u.type==='king'&&!u.attacked;}).forEach(function(u){
    var targets=[];for(var dr=-KING_AOE_RANGE;dr<=KING_AOE_RANGE;dr++)for(var dc=-KING_AOE_RANGE;dc<=KING_AOE_RANGE;dc++){if(Math.abs(dr)+Math.abs(dc)>KING_AOE_RANGE)continue;var nr=u.row+dr,nc=u.col+dc;if(nr<0||nr>=ROWS||nc<0||nc>=COLS)continue;var tgt=uAt(GS,nr,nc);if(tgt&&tgt.owner!==pid)targets.push(tgt);}
    if(targets.length>=2){
      doKingAoEAction(GS,u.id);
      if(onlineMode&&isHost)broadcastAction({type:'king_aoe',uid:u.id});
      render();updUI();
    }
  });
  GS.units.filter(function(u){return u.owner===pid&&isMagicUnit(u.type)&&!u.attacked;}).forEach(function(u){
    if(getFieldMagicTargets(GS,u).length>=2){
      doFieldMagicAction(GS,u.id);
      if(onlineMode&&isHost)broadcastAction({type:'field_magic',uid:u.id});
      render();updUI();
    }
  });
  GS.units.filter(function(u){return u.owner===pid&&u.type==='necromancer';}).forEach(function(u){
    var sk=GS.units.filter(function(s){return s.owner===pid&&s.type==='skeleton';}).length;
    if(sk<2&&GS.players[pid].gold>=80&&(GS.summonCounts[u.id]||0)<3){
      doNecroSummonAction(GS,u.id);
      if(onlineMode&&isHost)broadcastAction({type:'necro_summon',uid:u.id});
      render();updUI();
    }
  });
  setTimeout(cb,80);
}
function cpuProduceAll(pid,cb){
  if(!GS||GS.over||GS.turn!==pid){cb();return;}
  var cnt=GS.units.filter(function(u){return u.owner===pid;}).length;
  if(cnt<12){
    for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){
      if(GS.own[r][c]===pid&&td(r,c).prod){
        var eu=uAt(GS,r,c);
        if(!eu||eu.owner===pid){
          var type=cpuPickProd(pid,GS.players[pid].aiType);
          if(type&&doProd(GS,type,r,c)){
            addLog(GS.players[pid].name+'が'+UDEFS[type].name+'を生産',{cpu:true});
            SFX.produce();
            if(onlineMode&&isHost)broadcastAction({type:'produce',unitType:type,r:r,c:c});
          }
        }
      }
    }
    render();updUI();
  }
  setTimeout(cb,80);
}
function cpuActSeq(pid,ids,idx,done){
  if(isPaused){setTimeout(function(){cpuActSeq(pid,ids,idx,done);},300);return;}
  if(!GS||GS.over||GS.turn!==pid||idx>=ids.length){done();return;}
  var u=null;for(var i=0;i<GS.units.length;i++){if(GS.units[i].id===ids[idx]){u=GS.units[i];break;}}
  if(!u||u.hp<=0||u.owner!==pid||(u.moved&&u.attacked)){setTimeout(function(){cpuActSeq(pid,ids,idx+1,done);},0);return;}
  cpuActOne(pid,u,function(){setTimeout(function(){cpuActSeq(pid,ids,idx+1,done);},80);});
}
function cpuActOne(pid,u,cb){
  if(!u||u.hp<=0){cb();return;}
  var at=GS.players[pid].aiType;
  if(!u.attacked){var tgts=getAttackable(GS,u);if(tgts.length>0){var best=cpuBestTarget(tgts,at,u);if(best){var d=uAt(GS,best.r,best.c);if(d){cpuExecAtk(u,d,function(){u.moved=true;u.attacked=true;cb();});return;}}}}
  if(!u.moved){
    var movs=getMovable(GS,u),dest=cpuBestDest(movs,pid,at,u);
    if(dest){var res=doMove(GS,u.id,dest.r,dest.c);if(res.captured){addLog(GS.players[pid].name+'の'+UDEFS[u.type].name+'が'+res.terrain.name+'を占領！',{cpu:true});SFX.capture();}if(onlineMode&&isHost){broadcastAction({type:'move',uid:u.id,r:dest.r,c:dest.c});if(typeof broadcastCursor==='function')broadcastCursor(dest.r,dest.c);}focusOnUnit(u,true);render();updUI();}
    if(!u.attacked){var tgts2=getAttackable(GS,u);if(tgts2.length>0){var best2=cpuBestTarget(tgts2,at,u);if(best2){var d2=uAt(GS,best2.r,best2.c);if(d2){cpuExecAtk(u,d2,function(){u.moved=true;u.attacked=true;cb();});return;}}}}
  }
  u.moved=true;u.attacked=true;cb();
}
function cpuExecAtk(atk,def,cb){
  if(!atk||!def||atk.hp<=0||def.hp<=0){cb();return;}
  var res=calcAttack(GS,atk.id,def.id);if(!res){cb();return;}
  var m=GS.players[atk.owner].name+'の'+UDEFS[atk.type].name+'[Lv'+atk.level+']→'+UDEFS[def.type].name+'[Lv'+(def.level||1)+'](-'+res.dmg+')';
  if(res.isCrit)m+='💥会心';if(res.dkill)m+='【撃破】';if(res.cdmg)m+=' 反撃-'+res.cdmg+(res.ckill?'【撃破】':'');
  addLog(m,{hot:true});
  if(onlineMode&&isHost){broadcastAction({type:'attack',atkId:atk.id,defId:def.id});if(typeof broadcastCursor==='function')broadcastCursor(def.row,def.col);}
  // CPU対CPU: バトル画面スキップ、人間のターン or 自分が関与する場合のみ表示
  var humanIsAtk=isHuman(atk.owner),humanIsDef=isHuman(def.owner);
  var iAmInvolved=onlineMode&&(atk.owner===myPeerIdx||def.owner===myPeerIdx);
  if(humanIsAtk||humanIsDef||iAmInvolved){
    showBattle(res,function(){render();updUI();if(GS.over)showGameOver();else cb();});
  }else{render();updUI();if(GS.over)showGameOver();else cb();}
}
function cpuBestTarget(targets,at,atkU){
  return targets.reduce(function(best,t){
    var u=uAt(GS,t.r,t.c);if(!u)return best;var bu=best?uAt(GS,best.r,best.c):null;if(!bu)return t;
    return cpuTargetScore(u,atkU,at)>cpuTargetScore(bu,atkU,at)?t:best;
  },null);
}
function cpuTargetScore(def,atk,at){
  var sc=0,aff=getAffMult(atk.type,def.type),elem=getElemMult((UDEFS[atk.type].elem||'none'),(UDEFS[def.type].elem||'none'));
  var totalMult=aff*elem;
  if(totalMult>=4)sc+=200;else if(totalMult>=2)sc+=120;else if(totalMult>=1.5)sc+=80;else if(totalMult<=0.5)sc-=100;
  sc+=(1-def.hp/def.mhp)*80;
  if(def.type==='king')sc+=250; // 王様を優先攻撃
  if(TDEFS[MAP[def.row][def.col]].cap)sc+=160;if(TDEFS[MAP[def.row][def.col]].prod)sc+=60;
  sc+=(def.level||1)*30; // 高レベルを狙う
  if(at==='genius'){var dmgEst=Math.max(1,effAtk(atk)*totalMult-effPDef(def));sc+=dmgEst>=def.hp?150:dmgEst*2;}
  return sc;
}
function cpuBestDest(movs,pid,at,u){
  if(!movs||!movs.length)return null;
  var ecs=[],ncs=[],ekings=[];
  for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){var ow=GS.own[r][c],t=TDEFS[MAP[r][c]];if(t.cap&&ow>=0&&ow!==pid)ecs.push({r:r,c:c});if(t.prod&&!t.cap&&ow!==pid&&!uAt(GS,r,c))ncs.push({r:r,c:c});}
  GS.units.forEach(function(eu){if(eu.owner!==pid&&eu.type==='king')ekings.push({r:eu.row,c:eu.col});});
  return movs.reduce(function(best,m){
    var sc=0,t=TDEFS[MAP[m.r][m.c]],mow=GS.own[m.r][m.c];
    if(t.cap&&mow!==pid)sc+=600;if(t.prod&&!t.cap&&mow!==pid)sc+=220;sc+=t.def*5;
    if(ecs.length){var mn=999;for(var i=0;i<ecs.length;i++)mn=Math.min(mn,mdist(m.r,m.c,ecs[i].r,ecs[i].c));sc+=(30-mn)*(at==='aggressive'?12:8);}
    if(ekings.length){var mkd=999;for(var i=0;i<ekings.length;i++)mkd=Math.min(mkd,mdist(m.r,m.c,ekings[i].r,ekings[i].c));if(u.type==='hero'||u.type==='assassin')sc+=(30-mkd)*15;}
    var tb=getTerrainBonus(u,m.r,m.c);sc+=(tb.atk+tb.pdef+tb.mdef)*6;
    if(at==='cautious'&&u.hp<u.mhp*.4)sc+=t.def*12;
    return (!best||sc>best.sc)?Object.assign({},m,{sc:sc}):best;
  },null);
}
function cpuPickProd(pid,at){
  var cnt=GS.units.filter(function(u){return u.owner===pid;}).length;if(cnt>=12)return null;
  var gold=GS.players[pid].gold;
  var avail=Object.entries(UDEFS).filter(function(e){return gold>=e[1].cost&&e[0]!=='skeleton'&&e[0]!=='king';}).sort(function(a,b){return b[1].cost-a[1].cost;});
  if(!avail.length)return null;
  if(at==='aggressive'){if(GS.round<=2){var f=avail.find(function(e){return['knight','berserker','ninja'].indexOf(e[0])>=0;});if(f)return f[0];}if(GS.round<=5){var f2=avail.find(function(e){return['assassin','dualblader','dragon','hero'].indexOf(e[0])>=0;});if(f2)return f2[0];}return avail[0][0];}
  if(at==='cautious'){var prefs=['titan','golem','paladin','knight','healer','monk','soldier'];for(var i=0;i<prefs.length;i++)if(avail.some(function(e){return e[0]===prefs[i];}))return prefs[i];return avail[avail.length-1][0];}
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
  return avail[0][0];
}
/* ===== 効果音 ===== */