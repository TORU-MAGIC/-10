// ================================================================
//  キングオブキングス v10.0 - オンライン対戦（PeerJS）
// ================================================================
'use strict';

/* ===== ブロードキャストヘルパー ===== */
function broadcastToAll(msg){onlineConns.forEach(function(c){try{c.conn.send(msg);}catch(e){}});}
function sendToHost(msg){if(onlineConns.length>0)try{onlineConns[0].conn.send(msg);}catch(e){}}

/* ===== オンライン状態・ACK・ハッシュ ===== */
/* ===== リアルタイムオンライン (PeerJS) ===== */
var onlineMode=false,isHost=false,myPeerIdx=0,myPeer=null,onlineConns=[],hostNp=4,hostCode='';
var pendingActions={};  // {seq:{msg,t}} v10.0: ACK待ち未確認アクション
var ackedSeq=-1;        // v10.0: 最後にACKされたシーケンス番号
var ackResendTimer=null;// v10.0: 5秒未ACKで再送するタイマー

/* ===== プレイヤー名管理 ===== */
var myPlayerName='';
function loadPlayerName(){try{myPlayerName=localStorage.getItem('kok_pname')||'';}catch(e){myPlayerName='';}return myPlayerName;}
function savePlayerName(){var el=document.getElementById('playerNameInp');if(!el)return;myPlayerName=(el.value||'').trim().slice(0,10);try{localStorage.setItem('kok_pname',myPlayerName);}catch(e){}var el2=document.getElementById('playerNameInp2');if(el2)el2.value=myPlayerName;}
function savePlayerName2(){var el=document.getElementById('playerNameInp2');if(!el)return;myPlayerName=(el.value||'').trim().slice(0,10);try{localStorage.setItem('kok_pname',myPlayerName);}catch(e){}var el1=document.getElementById('playerNameInp');if(el1)el1.value=myPlayerName;}
function fillPlayerNameInputs(){loadPlayerName();var el=document.getElementById('playerNameInp');if(el)el.value=myPlayerName;var el2=document.getElementById('playerNameInp2');if(el2)el2.value=myPlayerName;}

/* ===== カーソル追従（操作中ユニットを他クライアントへ通知） ===== */
function broadcastCursor(r,c){
  if(!onlineMode||!GS)return;
  var msg={type:'cursor',row:r,col:c,seat:isHost?0:myPeerIdx,t:Date.now()};
  if(isHost){onlineConns.forEach(function(conn){try{conn.conn.send(msg);}catch(e){}});}
  else if(onlineConns[0]){try{onlineConns[0].conn.send(msg);}catch(e){}}
}
function startAckResendLoop(){
  if(ackResendTimer)return;
  ackResendTimer=setInterval(function(){
    var now=Date.now();
    Object.keys(pendingActions).forEach(function(seq){
      var p=pendingActions[seq];if(!p)return;
      if(now-p.t>5000){
        // 5秒未ACK: 再送
        if(isHost){
          // ★Bug#4: 未ACKのクライアントのみ再送
          onlineConns.forEach(function(c){
            if(p.acked&&p.acked[c.seat])return;
            try{c.conn.send(p.msg);}catch(e){}
          });
        }
        else if(onlineConns[0]){try{onlineConns[0].conn.send(p.msg);}catch(e){}}
        p.t=now;p.retries=(p.retries||0)+1;
        if(p.retries>=3){
          // ★Bug#6: 3回失敗 → クライアントはフル状態同期を要求してリカバリ
          delete pendingActions[seq];
          if(!isHost&&onlineConns[0]){
            console.warn('[v10] action retry exhausted, requesting full state');
            try{onlineConns[0].conn.send({type:'request_state'});}catch(e){}
          } else if(isHost){
            // ホスト: 未ACKのクライアントへフル状態を再送
            console.warn('[v10] host: action retry exhausted, pushing full state to lagging clients');
            onlineConns.forEach(function(c){
              if(p.acked&&p.acked[c.seat])return;
              try{c.conn.send({type:'state',gs:serGS(),hash:hashGS(GS)});}catch(e){}
            });
          }
        }
      }
    });
  },2000);
}
function stopAckResendLoop(){if(ackResendTimer){clearInterval(ackResendTimer);ackResendTimer=null;}}

/* ===== Bug#13: PING/PONG ハートビート =====
 *  10秒毎に ping、20秒返信無しのクライアントは切断扱い → CPU代行
 *  クライアントは20秒ホストから ping を受け取らないと再接続を試みる
 */
var heartbeatTimer=null;
var lastPongAt={};      // ホスト用: {seat: timestamp}
var lastPingAt=0;       // クライアント用: 最後に ping を受信した時刻
function startHeartbeat(){
  if(heartbeatTimer)return;
  lastPingAt=Date.now();
  heartbeatTimer=setInterval(function(){
    var now=Date.now();
    if(isHost){
      // ホスト: 全クライアントへ ping
      onlineConns.forEach(function(c){
        try{c.conn.send({type:'ping',t:now});}catch(e){}
        // 20秒 PONG 無し → 切断扱い
        var last=lastPongAt[c.seat];
        if(last&&now-last>20000){
          console.warn('[v10] heartbeat lost from seat '+c.seat+' → CPU 代行');
          try{c.conn.close();}catch(e){}// close ハンドラで CPU 代行へ
        }
      });
    } else if(onlineConns[0]){
      // クライアント: ホストから 20秒 ping 無し → 再接続試行
      try{onlineConns[0].conn.send({type:'ping',t:now});}catch(e){}
      if(now-lastPingAt>20000){
        console.warn('[v10] heartbeat lost from host → attempting reconnect');
        if(myPeer&&!myPeer.destroyed){try{myPeer.reconnect();}catch(e){}}
        lastPingAt=now;// 再試行間隔リセット
      }
    }
  },10000);
}
function stopHeartbeat(){if(heartbeatTimer){clearInterval(heartbeatTimer);heartbeatTimer=null;}lastPongAt={};lastPingAt=0;}
// v10.0/Bug#5: 状態ハッシュ（拡張版チェックサム）
// gold/morale/own/status/fx/attacked/moved/fmUsed/atkCount/xp/uid を含めデシンク検出感度を上げる
function hashGS(gs){
  if(!gs)return 0;
  var parts=[gs.turn,gs.round,gs.rngSeed|0,gs.uid|0,gs.actionSeq|0,
    'sk:'+(gs.scenarioKingKiller==null?'-':gs.scenarioKingKiller)]; // ★シナリオ王撃破者
  // プレイヤー: gold + morale + alive
  if(gs.players)gs.players.forEach(function(p){parts.push(p.id+'#'+p.gold+'#'+p.morale+'#'+(p.alive?1:0));});
  // 占領タイル: own[][] を1次元に圧縮
  if(gs.own){
    var ownStr='';
    for(var r=0;r<gs.own.length;r++){
      var row=gs.own[r];if(!row)continue;
      for(var c=0;c<row.length;c++){var v=row[c];ownStr+=(v<0?'.':v);}
    }
    parts.push('OWN:'+ownStr);
  }
  // ユニット: 状態フラグまで含む
  if(gs.units){
    parts.push(gs.units.map(function(u){
      var st=u.status?u.status.slice().sort().join('+'):'';
      var fx=u.fx?u.fx.length:0;
      return u.id+':'+u.hp+':'+u.row+','+u.col+':L'+(u.level||1)+
             ':m'+(u.moved?1:0)+'a'+(u.attacked?1:0)+
             ':fm'+(u.fmUsed||0)+':ac'+(u.atkCount||0)+
             ':xp'+(u.xp||0)+':o'+u.owner+
             ':S'+st+':F'+fx+
             ':sq'+(u.squadAlive!=null?u.squadAlive:'-')+'/'+(u.squadSize||'-'); // ★分隊
    }).join(','));
  }
  // 天候・サマリ
  if(gs.weather)parts.push('W:'+(gs.weather.name||'')+'/'+(gs.wTimer|0));
  var s=parts.join('|');
  var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;
  return h;
}

function createOnlineRoom(){
  if(typeof Peer==='undefined'){alert('PeerJSが読み込めません');return;}
  loadPlayerName(); // ★名前を読込
  var code=String(Math.floor(100+Math.random()*900));hostCode=code;
  var peerId='kok9v'+code;
  try{myPeer=new Peer(peerId);}catch(e){document.getElementById('onlineStatus').textContent='エラー: '+e.message;return;}
  myPeer.on('error',function(err){
    if(err.type==='unavailable-id'){var c2=String(Math.floor(100+Math.random()*900));hostCode=c2;try{myPeer=new Peer('kok9v'+c2);}catch(e2){}}
    else showMsg('接続エラー: '+err.message,3000);
  });
  // E-6: 自動再接続（ホスト側）
  myPeer.on('disconnected',function(){
    if(myPeer&&!myPeer.destroyed){showMsg('📡 接続切断 - 再接続中...',2000);myPeer.reconnect();}
  });
  myPeer.on('open',function(){
    hideAllBoxes();document.getElementById('hostBox').style.display='flex';
    document.getElementById('hostCodeDisplay').textContent=hostCode;
    onlineMode=true;isHost=true;myPeerIdx=0;onlineConns=[];updateHostList();
  });
  myPeer.on('connection',function(conn){
    if(onlineConns.length>=hostNp-1){conn.send({type:'full'});return;}
    var seat=onlineConns.length+1;onlineConns.push({conn:conn,seat:seat});
    conn.on('open',function(){conn.send({type:'assign',seat:seat});updateHostList();});
    conn.on('data',function(data){handleHostMsg(conn,data,seat);});
    conn.on('close',function(){
      onlineConns=onlineConns.filter(function(c){return c.conn!==conn;});
      if(lastPongAt[seat])delete lastPongAt[seat];
      updateHostList();
      // ★FIX: 切断プレイヤーをCPU(慎重型)代行に切替（ゲーム停止防止）
      if(GS&&GS.players[seat]&&GS.players[seat].aiType==='human'){
        GS.players[seat].aiType='cautious';
        GS.players[seat].disconnected=true;
        addLog('P'+(seat+1)+' 切断 → CPU(慎重型)が代行',{sys:true});
        showMsg('⚠ P'+(seat+1)+' が切断されました（CPU代行）',2500);
        broadcastState();
        // 切断プレイヤーのターン中なら CPU で進行
        if(GS.turn===seat&&!isPaused&&!GS.over){
          setTimeout(function(){runCPUTurn(GS.turn);},600);
        }
      }
    });
    updateHostList();
  });
}
function updateHostList(){
  loadPlayerName();
  var meName=myPlayerName||'あなた';
  var html='<div style="color:var(--gold);margin-bottom:4px">参加者:</div><div>👤 '+meName+' (P1・ホスト)</div>';
  onlineConns.forEach(function(c){
    var nm=c.playerName||('P'+(c.seat+1));
    html+='<div>👤 '+nm+' (P'+(c.seat+1)+')</div>';
  });
  for(var i=onlineConns.length+1;i<hostNp;i++)html+='<div style="color:var(--dim)">🤖 CPU（空き待ち）</div>';
  document.getElementById('hostPlayerList').innerHTML=html;
}
function setHostPC(btn,n){hostNp=n;document.querySelectorAll('#hostBox .pcb').forEach(function(b){b.classList.toggle('sel',b===btn);});updateHostList();}
function startOnlineGame(){
  // ★FIX: シート順を正規化（接続順に1,2,3...と割り直し）
  onlineConns.sort(function(a,b){return a.seat-b.seat;});
  onlineConns.forEach(function(c,i){c.seat=i+1;});

  loadPlayerName();
  var hostName=myPlayerName||'P1';
  var settings=[{name:hostName,type:'human'}];
  onlineConns.forEach(function(c){
    var nm=(c.playerName||'').trim()||('P'+(c.seat+1));
    settings.push({name:nm,type:'human'});
  });
  var aiTypes=['aggressive','cautious','genius'];
  while(settings.length<hostNp)settings.push({name:PCOLS[settings.length].name+'CPU',type:aiTypes[Math.floor(Math.random()*aiTypes.length)]});
  GS=newGS(hostNp,settings);useWeather=true;useEvent=true;
  var gs=serGS();
  // ★FIX: シート番号を c.seat から取得（disconnect/reconnect の整合性）
  // ★Bug#2: useFoW / useAmbush をホストから配布（全員で同一フラグに揃える）
  onlineConns.forEach(function(c){
    try{c.conn.send({type:'start',gs:gs,seat:c.seat,np:hostNp,settings:settings,serverVersion:KOK_VERSION,useFoW:useFoW,useAmbush:useAmbush});}catch(e){}
  });
  hideAllBoxes();startGame();startAckResendLoop();startHeartbeat();
}
function showJoinRoom(){hideAllBoxes();document.getElementById('joinBox').style.display='flex';document.getElementById('joinCodeInp').value='';document.getElementById('joinStatus').textContent='';fillPlayerNameInputs();}
function joinOnlineRoom(){
  var code=document.getElementById('joinCodeInp').value.trim();
  if(code.length!==3){document.getElementById('joinStatus').textContent='3桁のコードを入力';return;}
  if(typeof Peer==='undefined'){document.getElementById('joinStatus').textContent='PeerJSが利用不可';return;}
  document.getElementById('joinStatus').textContent='接続中...';
  try{myPeer=new Peer();}catch(e){document.getElementById('joinStatus').textContent='エラー: '+e.message;return;}
  // ★FIX(致命的): クライアント側でも onlineMode=true を設定。これが無いと
  //   broadcastAction の冒頭 if(!onlineMode)return; で全送信が抑止され、
  //   P2 の操作がホストに届かない＆クライアントが勝手にローカル advanceTurn する。
  onlineMode=true;isHost=false;
  loadPlayerName();
  // ★Bug#17: peer.on('error') を外側1箇所だけに統一（open ハンドラ内で重複登録すると挙動が不定）
  myPeer.on('error',function(e){
    var stEl=document.getElementById('joinStatus');
    if(stEl)stEl.textContent='エラー: '+(e&&e.message?e.message:e);
  });
  myPeer.on('open',function(){
    var conn=myPeer.connect('kok9v'+code,{reliable:true,serialization:'json'});
    onlineConns=[{conn:conn,seat:0}];
    conn.on('open',function(){
      document.getElementById('joinStatus').textContent='接続完了！ホスト待機中...';
      // ★名前同梱
      conn.send({type:'join',playerName:myPlayerName||''});
    });
    conn.on('data',function(data){handleClientMsg(data);});
    conn.on('error',function(e){document.getElementById('joinStatus').textContent='接続失敗: '+e;});
  });
  // E-6: 自動再接続（クライアント側）- 再接続後にホストへ状態要求
  myPeer.on('disconnected',function(){
    if(myPeer&&!myPeer.destroyed){
      showMsg('📡 接続切断 - 再接続中...',2000);
      myPeer.reconnect();
      setTimeout(function(){
        if(onlineConns[0]&&onlineConns[0].conn){
          try{onlineConns[0].conn.send({type:'request_state'});}catch(e){}
        }
      },2500);
    }
  });
}
// ★リアルタイム: ホストがクライアントメッセージを受信
function handleHostMsg(conn,data,seat){
  // ★Bug#13: ハートビート
  if(data.type==='ping'){try{conn.send({type:'pong',t:data.t});}catch(e){}return;}
  if(data.type==='pong'){lastPongAt[seat]=Date.now();return;}
  if(!GS&&data.type!=='join'&&data.type!=='version_check')return;
  // v10.0/Bug#4: ACK は seat 別に集計。全員ACKで初めて pendingActions から削除
  if(data.type==='ack'){
    if(data.seq!=null&&pendingActions[data.seq]){
      var p=pendingActions[data.seq];
      if(!p.acked)p.acked={};
      if(!p.acked[seat]){p.acked[seat]=true;p.pending=(p.pending|0)-1;}
      // Bug#7: ハッシュ照合 — クライアント側でズレ検出時は state を再送
      if(data.hash!=null&&hashGS(GS)!==data.hash){
        console.warn('[v10] host detected hash mismatch from seat '+seat+', resending state');
        try{conn.send({type:'state',gs:serGS(),hash:hashGS(GS)});}catch(e){}
      }
      if(p.pending<=0)delete pendingActions[data.seq];
    }
    return;
  }
  if(data.type==='version_check'){
    if(data.version!==KOK_VERSION){conn.send({type:'reject',reason:'version_mismatch',version:KOK_VERSION});}
    else conn.send({type:'version_ok'});
    return;
  }
  // ★参加時の名前を保存
  if(data.type==='join'){
    var co=onlineConns.find(function(c){return c.conn===conn;});
    if(co){co.playerName=(data.playerName||'').trim().slice(0,10);}
    updateHostList();
    return;
  }
  if(data.type==='request_state'){
    conn.send({type:'state',gs:serGS(),hash:hashGS(GS)});
    return;
  }
  // ★カーソル位置: 全クライアントへブロードキャスト（送信者除く）
  if(data.type==='cursor'){
    onlineConns.forEach(function(c){if(c.conn!==conn){try{c.conn.send(data);}catch(e){}}});
    // ホスト自身も追従描画
    if(typeof handleRemoteCursor==='function')handleRemoteCursor(data);
    return;
  }
  if(data.type==='action'){
    if(!GS)return;
    var act=data.action;
    // v10.0: ターンロック（end_turn と pause 以外は本人のシート中のみ受理）
    // ★FIX: end_turn も「自分のターン中の自分」しか受け付けない（他人がターンを進められないように）
    if(act.type!=='pause'&&GS.turn!==seat){
      conn.send({type:'reject',seq:data.seq,reason:'not_your_turn'});
      conn.send({type:'state',gs:serGS(),hash:hashGS(GS)});
      return;
    }
    // ★FIX: 攻撃・移動・特殊アクション系は、対象ユニット所有者がシートと一致しているか検証
    if(act.type==='move'||act.type==='wait'||act.type==='field_magic'||act.type==='king_aoe'||act.type==='necro_summon'||act.type==='pirate_steal'){
      var u0=GS.units.find(function(u){return u.id===act.uid;});
      if(!u0||u0.owner!==seat){conn.send({type:'reject',seq:data.seq,reason:'not_your_unit'});conn.send({type:'state',gs:serGS(),hash:hashGS(GS)});return;}
    }
    if(act.type==='attack'){
      var au=GS.units.find(function(u){return u.id===act.atkId;});
      if(!au||au.owner!==seat){conn.send({type:'reject',seq:data.seq,reason:'not_your_unit'});conn.send({type:'state',gs:serGS(),hash:hashGS(GS)});return;}
    }
    // ★Bug#1: ambush 検証 — defender が送信者自身のユニット、attacker は敵軍であること
    if(act.type==='ambush'){
      var ambDef=GS.units.find(function(u){return u.id===act.defId;});
      var ambAtk=GS.units.find(function(u){return u.id===act.atkId;});
      if(!ambDef||ambDef.owner!==seat||!ambAtk||ambAtk.owner===seat){
        conn.send({type:'reject',seq:data.seq,reason:'invalid_ambush'});
        conn.send({type:'state',gs:serGS(),hash:hashGS(GS)});
        return;
      }
    }
    if(act.type==='produce'){
      // 生産: 占領タイルが本人所有か検証
      if(GS.own[act.r]==null||GS.own[act.r][act.c]!==seat){conn.send({type:'reject',seq:data.seq,reason:'not_your_tile'});conn.send({type:'state',gs:serGS(),hash:hashGS(GS)});return;}
    }
    applyRemoteAction(act);
    // ACK返送 + 同アクションを他クライアントへ転送
    conn.send({type:'ack',seq:data.seq,hash:hashGS(GS)});
    // ★Bug#3: 転送用 seq はループ外で1回だけ採番（forEach内で++すると人数分消費されてactionSeqがズレる）
    var fwdSeq=GS.actionSeq++;
    var fwdMsg={type:'action',action:act,seq:fwdSeq};
    // ★Bug#8: 転送 action も pendingActions に登録 → 失われた場合 ackResendLoop で再送される
    var fwdTargets=onlineConns.filter(function(c){return c.conn!==conn;});
    if(fwdTargets.length>0){
      pendingActions[fwdSeq]={msg:fwdMsg,t:Date.now(),retries:0,pending:fwdTargets.length,acked:{}};
      if(GS.actionLog){GS.actionLog.push({seq:fwdSeq,action:act});if(GS.actionLog.length>100)GS.actionLog.shift();}
      fwdTargets.forEach(function(c){try{c.conn.send(fwdMsg);}catch(e){}});
    }
    // ★FIX: end_turn 後の state は advanceTurn 内で送信済みのため重複削除
  }
}
// ★リアルタイム: クライアントがホストから受信
function handleClientMsg(data){
  // ★Bug#13: ハートビート
  if(data.type==='ping'){
    lastPingAt=Date.now();
    if(onlineConns[0])try{onlineConns[0].conn.send({type:'pong',t:data.t});}catch(e){}
    return;
  }
  if(data.type==='pong'){lastPingAt=Date.now();return;}
  if(data.type==='assign'){
    myPeerIdx=data.seat;document.getElementById('joinStatus').textContent='P'+(myPeerIdx+1)+'として参加！ゲーム開始待ち...';
    // v10.0: バージョンチェック
    if(onlineConns[0])try{onlineConns[0].conn.send({type:'version_check',version:KOK_VERSION});}catch(e){}
  }
  else if(data.type==='version_ok'){/* OK */}
  else if(data.type==='start'){
    // ★Bug#16: バージョン不一致は接続拒否（整合性破綻を未然防止）
    if(typeof data.serverVersion==='string'&&data.serverVersion!==KOK_VERSION){
      showMsg('⚠ バージョン不一致のため接続を切断 (host:'+data.serverVersion+' / you:'+KOK_VERSION+')',4000);
      if(onlineConns[0])try{onlineConns[0].conn.send({type:'reject',reason:'version_mismatch',version:KOK_VERSION});}catch(e){}
      closeOnlineRoom();
      return;
    }
    GS=desGS(data.gs);myPeerIdx=data.seat;useWeather=true;useEvent=true;
    // ★Bug#2: ホストの FoW/Ambush 設定をクライアントに反映（未送信時は false で初期化）
    useFoW=!!data.useFoW; useAmbush=!!data.useAmbush;
    // ★Fix#4: 戦闘演出モードもホストの設定を引き継ぐ
    if(typeof data.battleSpeedMode==='string'&&typeof battleSpeedMode!=='undefined'){
      battleSpeedMode=data.battleSpeedMode;
    }
    // ★シナリオモード受信: マップ・サイズ・占拠目標を反映
    if(data.scenarioMode){
      scenarioMode=true;
      if(data.scenarioMap)MAP=data.scenarioMap;
      if(typeof data.scenarioRows==='number')ROWS=data.scenarioRows;
      if(typeof data.scenarioCols==='number')COLS=data.scenarioCols;
      if(typeof data.scenarioTW==='number')TW=data.scenarioTW;
      if(typeof data.scenarioTH==='number')TH=data.scenarioTH;
      if(data.scenarioCastlePos)CASTLE_POS=data.scenarioCastlePos;
      if(data.scenarioGoal)scenarioGoal=data.scenarioGoal;
      if(typeof data.scenarioGarrisonPid==='number')SCENARIO_GARRISON_PID=data.scenarioGarrisonPid;
      // GS にもメタ情報を保存（既に desGS で復元されているはずだが念のため）
      GS.scenarioMode=true;
      if(data.scenarioGoal)GS.scenarioGoal=data.scenarioGoal;
      if(data.scenarioGoalSec)GS.scenarioGoalSec=data.scenarioGoalSec;
      if(typeof data.scenarioGarrisonPid==='number')GS.scenarioGarrisonPid=data.scenarioGarrisonPid;
      if(data.scenarioMapSize)GS.scenarioMapSize=data.scenarioMapSize;
    }
    hideAllBoxes();startGame();isMyTurn=(GS.turn===myPeerIdx);
    startAckResendLoop();startHeartbeat();
  }
  else if(data.type==='state'){
    // ★フル状態同期
    GS=desGS(data.gs);isMyTurn=(GS.turn===myPeerIdx);
    render();updUI();if(isMyTurn)showTurnNotif(myPeerIdx);if(GS.over)showGameOver();
  }
  else if(data.type==='action'){
    // ★リアルタイムアクション反映 + ACK返送
    applyRemoteAction(data.action);render();updUI();
    if(data.seq!=null&&onlineConns[0]){try{onlineConns[0].conn.send({type:'ack',seq:data.seq,hash:hashGS(GS)});}catch(e){}}
  }
  else if(data.type==='cursor'){
    // ★他プレイヤーのカーソル位置を受信して画面追従
    if(typeof handleRemoteCursor==='function')handleRemoteCursor(data);
  }
  else if(data.type==='ack'){
    if(data.seq!=null&&pendingActions[data.seq])delete pendingActions[data.seq];
    // ハッシュ不一致時は state 要求
    if(data.hash!=null&&hashGS(GS)!==data.hash){
      console.warn('[v10] state hash mismatch, requesting full state');
      if(onlineConns[0])try{onlineConns[0].conn.send({type:'request_state'});}catch(e){}
    }
  }
  else if(data.type==='reject'){
    showMsg('⚠ アクション拒否: '+(data.reason||'unknown'),2200);
    if(data.reason==='version_mismatch'){closeOnlineRoom();showMsg('バージョン不一致のため接続を切断',3000);return;}
    // ★Bug#9: 拒否されたアクションを pendingActions から削除（再送ループの無駄を防ぐ）
    if(data.seq!=null&&pendingActions[data.seq])delete pendingActions[data.seq];
    // ★Bug#9: 自分のターン中の拒否ならフル状態同期を要求して isMyTurn を復旧
    if(GS&&GS.turn===myPeerIdx){
      isMyTurn=true;
      if(typeof updUI==='function')updUI();
      if(onlineConns[0])try{onlineConns[0].conn.send({type:'request_state'});}catch(e){}
    } else if(data.reason==='not_your_turn'){
      // ターンが既に進んでいる可能性 → state要求で確実に同期
      if(onlineConns[0])try{onlineConns[0].conn.send({type:'request_state'});}catch(e){}
    }
  }
  else if(data.type==='full'){document.getElementById('joinStatus').textContent='ルームが満員です';}
}
// リモートアクションを適用
function applyRemoteAction(action){
  if(!GS||!action)return;
  try{
    if(action.type==='move'){
      var u=GS.units.find(function(u){return u.id===action.uid;});
      if(u){doMove(GS,u.id,action.r,action.c);render();updUI();}
    }
    else if(action.type==='attack'){
      // v10.0+: 観戦モード — 人間 vs 人間 の戦闘は全員が観戦できる
      var atkU=GS.units.find(function(u){return u.id===action.atkId;});
      var defU=GS.units.find(function(u){return u.id===action.defId;});
      var iAmInv=atkU&&defU&&(atkU.owner===myPeerIdx||defU.owner===myPeerIdx);
      var humanInvolved=atkU&&defU&&(isHuman(atkU.owner)||isHuman(defU.owner));
      var res=calcAttack(GS,action.atkId,action.defId);
      // ★スペクテーター: 関与してなくても、人間が絡む戦闘なら見せる（dual ビュー時）
      // ★全表示モード(normal)なら CPU 同士でも観戦できる
      var showAll=(typeof battleSpeedMode!=='undefined'&&battleSpeedMode==='normal');
      var shouldShow=res&&(iAmInv||(humanInvolved&&battleViewMode!=='self'&&battleSpeedMode!=='skip')||showAll);
      if(shouldShow){showBattle(res,function(){render();updUI();if(GS.over)showGameOver();});}
      else{render();updUI();if(GS&&GS.over)showGameOver();}
    }
    else if(action.type==='ambush'){
      // ★Bug#1: 待ち伏せ先制攻撃 — 全員でcalcAttackを実行してRNG seedを同期
      if(typeof executeAmbush==='function'){executeAmbush(action.atkId, action.defId, null);}
    }
    else if(action.type==='field_magic'){if(typeof doFieldMagicAction==='function'){doFieldMagicAction(GS,action.uid,{spell:action.spell,dir:action.dir,targetId:action.targetId});}render();updUI();}
    else if(action.type==='pirate_steal'){if(typeof doPirateStealAction==='function'){doPirateStealAction(GS,action.uid,action.victimId);}render();updUI();}
    else if(action.type==='king_aoe'){if(typeof doKingAoEAction==='function'){doKingAoEAction(GS,action.uid);}render();updUI();}
    else if(action.type==='necro_summon'){if(typeof doNecroSummonAction==='function'){doNecroSummonAction(GS,action.uid);}render();updUI();}
    else if(action.type==='produce'){if(typeof doProd==='function'){doProd(GS,action.unitType,action.r,action.c);}render();updUI();}
    else if(action.type==='wait'){var u2=GS.units.find(function(u){return u.id===action.uid;});if(u2){u2.moved=true;u2.attacked=true;render();updUI();}}
    else if(action.type==='end_turn'){
      // ★FIX: action.owner と GS.turn が一致しない場合は既に turn 進行済み → 二重進行を防止
      var srcOwner=action.owner!=null?action.owner:GS.turn;
      if(GS.turn!==srcOwner){
        console.warn('[v10] end_turn dropped: turn mismatch (action.owner='+srcOwner+', GS.turn='+GS.turn+')');
        return;
      }
      GS.units.forEach(function(u){if(u.owner===srcOwner){u.moved=false;u.attacked=false;u.atkCount=0;u._hitIds=null;u.fmUsed=0;}});
      // ★Bug#11: ホスト/クライアント発のターンエンドで演出を揃える
      //   ホストは showTurnDelay 経由で advanceTurn → host 自身の humanEndTurn と同じカウントダウン
      if(isHost&&typeof showTurnDelay==='function'&&GS.players[srcOwner]){
        showTurnDelay(GS.players[srcOwner].name,function(){advanceTurn();});
      } else {
        advanceTurn();
      }
    }
    else if(action.type==='pause'){
      isPaused=!!action.paused;
      var btn=document.getElementById('pauseBtn'),ov=document.getElementById('pauseOv');
      if(btn){btn.textContent=isPaused?'▶':'⏸';btn.classList.toggle('paused',isPaused);}
      if(ov)ov.classList.toggle('show',isPaused);
    }
  }catch(e){
    console.warn('[v10] applyRemoteAction failed:',action,e);
    // ★Bug#10: 例外時のリカバリ — クライアントは state 要求、ホストは正本を全員に再送
    if(onlineMode){
      if(!isHost&&onlineConns[0]){
        try{onlineConns[0].conn.send({type:'request_state'});}catch(e2){}
      } else if(isHost){
        try{broadcastState();}catch(e3){}
      }
    }
  }
}
// アクションをブロードキャスト（リアルタイム配信） v10.0: ACK追跡付き
function broadcastAction(action){
  if(!onlineMode)return;
  if(!GS)return;
  // ★FIX(最終防衛): クライアント側は自分のターン中の自分のアクションのみ送信を許可。
  //   （ホストはCPU代理で他プレイヤーのアクションも broadcast するため除外）
  //   pause だけは例外（ターンに関係なくいつでも送信可）
  if(!isHost && action.type !== 'pause' && GS.turn !== myPeerIdx){
    console.warn('[online] client broadcast blocked: GS.turn='+GS.turn+' myPeerIdx='+myPeerIdx+' action='+action.type);
    return;
  }
  // ★Fix#1: 接続なしホストは送信先がないので早期 return（無駄な pendingActions を作らない）
  if(isHost&&onlineConns.length===0)return;
  if(!isHost&&!onlineConns[0])return;
  var seq=GS.actionSeq++;
  var msg={type:'action',action:action,seq:seq};
  // アクションログ（再接続時の差分送信用）
  if(GS.actionLog){GS.actionLog.push({seq:seq,action:action});if(GS.actionLog.length>100)GS.actionLog.shift();}
  // ★Bug#4: ホストは N人全員のACKを待つ。クライアントはホスト1人のACKでよい
  var pending=isHost?onlineConns.length:1;
  pendingActions[seq]={msg:msg,t:Date.now(),retries:0,pending:pending,acked:{}};
  if(isHost){onlineConns.forEach(function(c){try{c.conn.send(msg);}catch(e){}});}
  else if(onlineConns[0]){try{onlineConns[0].conn.send(msg);}catch(e){}}
}
// ターン終了時フル状態同期 v10.0: ハッシュ同梱
function broadcastState(){
  if(!onlineMode||!isHost)return;
  var gs=serGS(),h=hashGS(GS);
  onlineConns.forEach(function(c){try{c.conn.send({type:'state',gs:gs,hash:h});}catch(e){}});
}
function serGS(){return JSON.parse(JSON.stringify(GS));}
function desGS(d){return JSON.parse(JSON.stringify(d));}
function closeOnlineRoom(){
  // ★Bug#12: 通信切断時の状態整理（操作UIロック・CPU代行・タイマー停止）
  stopAckResendLoop();
  if(typeof stopHeartbeat==='function')stopHeartbeat();
  pendingActions={};
  // 切断前の自分の pid を保存（onlineMode=false にすると getMyPid が変わるため）
  var myPidBefore=(typeof myPeerIdx==='number')?myPeerIdx:0;
  if(myPeer)try{myPeer.destroy();}catch(e){}
  myPeer=null;onlineConns=[];onlineMode=false;isHost=false;
  // ゲーム中だった場合: 人間プレイヤーをCPU代行に切替（ローカル続行を可能に）
  if(GS&&!GS.over){
    var converted=0;
    GS.players.forEach(function(p,i){
      if(p.aiType==='human'&&i!==myPidBefore){
        p.aiType='cautious';p.disconnected=true;converted++;
      }
    });
    if(converted>0){
      addLog('📡 通信切断 - 残りプレイヤーはCPU代行で続行',{sys:true});
      // 自分のターンでなければ CPU実行を再開
      isMyTurn=isHuman(GS.turn);
      if(!isHuman(GS.turn)&&!isPaused){setTimeout(function(){runCPUTurn(GS.turn);},800);}
    }
    if(typeof updUI==='function')updUI();
    if(typeof render==='function')render();
    return; // ゲーム継続のためタイトルに戻さない
  }
  hideAllBoxes();
  document.getElementById('modeBox').style.display='flex';
}