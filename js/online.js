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
function startAckResendLoop(){
  if(ackResendTimer)return;
  ackResendTimer=setInterval(function(){
    var now=Date.now();
    Object.keys(pendingActions).forEach(function(seq){
      var p=pendingActions[seq];if(!p)return;
      if(now-p.t>5000){
        // 5秒未ACK: 再送
        if(isHost){onlineConns.forEach(function(c){try{c.conn.send(p.msg);}catch(e){}});}
        else if(onlineConns[0]){try{onlineConns[0].conn.send(p.msg);}catch(e){}}
        p.t=now;p.retries=(p.retries||0)+1;
        if(p.retries>=3){delete pendingActions[seq];}
      }
    });
  },2000);
}
function stopAckResendLoop(){if(ackResendTimer){clearInterval(ackResendTimer);ackResendTimer=null;}}
// v10.0: 状態ハッシュ（軽量チェックサム）
function hashGS(gs){
  if(!gs)return 0;
  var s=gs.turn+'|'+gs.round+'|'+(gs.rngSeed|0)+'|'+gs.units.map(function(u){
    return u.id+':'+u.hp+':'+u.row+','+u.col+':'+(u.level||1);
  }).join(',');
  var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;
  return h;
}

function createOnlineRoom(){
  if(typeof Peer==='undefined'){alert('PeerJSが読み込めません');return;}
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
    conn.on('close',function(){onlineConns=onlineConns.filter(function(c){return c.conn!==conn;});updateHostList();});
    updateHostList();
  });
}
function updateHostList(){
  var html='<div style="color:var(--gold);margin-bottom:4px">参加者:</div><div>👤 あなた (P1・ホスト)</div>';
  onlineConns.forEach(function(c){html+='<div>👤 P'+(c.seat+1)+'</div>';});
  for(var i=onlineConns.length+1;i<hostNp;i++)html+='<div style="color:var(--dim)">🤖 CPU（空き待ち）</div>';
  document.getElementById('hostPlayerList').innerHTML=html;
}
function setHostPC(btn,n){hostNp=n;document.querySelectorAll('#hostBox .pcb').forEach(function(b){b.classList.toggle('sel',b===btn);});updateHostList();}
function startOnlineGame(){
  var settings=[{name:'あなた(P1)',type:'human'}];
  onlineConns.forEach(function(c,i){settings.push({name:'P'+(i+2),type:'human'});});
  var aiTypes=['aggressive','cautious','genius'];
  while(settings.length<hostNp)settings.push({name:PCOLS[settings.length].name+'CPU',type:aiTypes[Math.floor(Math.random()*aiTypes.length)]});
  GS=newGS(hostNp,settings);useWeather=true;useEvent=true;
  var gs=serGS();
  // v10.0: rngSeed と version を含めて全クライアントへ配布
  onlineConns.forEach(function(c,i){c.conn.send({type:'start',gs:gs,seat:i+1,np:hostNp,settings:settings,serverVersion:KOK_VERSION});});
  hideAllBoxes();startGame();startAckResendLoop();
}
function showJoinRoom(){hideAllBoxes();document.getElementById('joinBox').style.display='flex';document.getElementById('joinCodeInp').value='';document.getElementById('joinStatus').textContent='';}
function joinOnlineRoom(){
  var code=document.getElementById('joinCodeInp').value.trim();
  if(code.length!==3){document.getElementById('joinStatus').textContent='3桁のコードを入力';return;}
  if(typeof Peer==='undefined'){document.getElementById('joinStatus').textContent='PeerJSが利用不可';return;}
  document.getElementById('joinStatus').textContent='接続中...';
  try{myPeer=new Peer();}catch(e){document.getElementById('joinStatus').textContent='エラー: '+e.message;return;}
  myPeer.on('open',function(){
    var conn=myPeer.connect('kok9v'+code,{reliable:true,serialization:'json'});
    onlineConns=[{conn:conn,seat:0}];
    conn.on('open',function(){document.getElementById('joinStatus').textContent='接続完了！ホスト待機中...';conn.send({type:'join'});});
    conn.on('data',function(data){handleClientMsg(data);});
    conn.on('error',function(e){document.getElementById('joinStatus').textContent='接続失敗: '+e;});
    myPeer.on('error',function(e){document.getElementById('joinStatus').textContent='エラー: '+e.message;});
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
  if(!GS&&data.type!=='join')return;
  // v10.0: ACKは即時処理（ゲーム未開始でも来る可能性は低いがガード）
  if(data.type==='ack'){if(data.seq!=null&&pendingActions[data.seq])delete pendingActions[data.seq];return;}
  if(data.type==='version_check'){
    if(data.version!==KOK_VERSION){conn.send({type:'reject',reason:'version_mismatch',version:KOK_VERSION});}
    else conn.send({type:'version_ok'});
    return;
  }
  if(data.type==='request_state'){
    conn.send({type:'state',gs:serGS(),hash:hashGS(GS)});
    return;
  }
  if(data.type==='action'){
    if(!GS)return;
    var act=data.action;
    // v10.0: ターンロック（end_turn と pause 以外は本人ターン中のみ受理）
    if(act.type!=='end_turn'&&act.type!=='pause'&&GS.turn!==seat){
      conn.send({type:'reject',seq:data.seq,reason:'not_your_turn'});
      conn.send({type:'state',gs:serGS(),hash:hashGS(GS)});
      return;
    }
    applyRemoteAction(act);
    // ACK返送 + 同アクションを他クライアントへ転送
    conn.send({type:'ack',seq:data.seq,hash:hashGS(GS)});
    onlineConns.forEach(function(c){if(c.conn!==conn){try{c.conn.send({type:'action',action:act,seq:GS.actionSeq++});}catch(e){}}});
    if(act.type==='end_turn')broadcastState();
  }
}
// ★リアルタイム: クライアントがホストから受信
function handleClientMsg(data){
  if(data.type==='assign'){
    myPeerIdx=data.seat;document.getElementById('joinStatus').textContent='P'+(myPeerIdx+1)+'として参加！ゲーム開始待ち...';
    // v10.0: バージョンチェック
    if(onlineConns[0])try{onlineConns[0].conn.send({type:'version_check',version:KOK_VERSION});}catch(e){}
  }
  else if(data.type==='version_ok'){/* OK */}
  else if(data.type==='start'){
    GS=desGS(data.gs);myPeerIdx=data.seat;useWeather=true;useEvent=true;
    if(typeof data.serverVersion==='string'&&data.serverVersion!==KOK_VERSION){
      showMsg('⚠ バージョン不一致 (host:'+data.serverVersion+' / you:'+KOK_VERSION+')',3500);
    }
    hideAllBoxes();startGame();isMyTurn=(GS.turn===myPeerIdx);
    startAckResendLoop();
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
    if(data.reason==='version_mismatch'){closeOnlineRoom();showMsg('バージョン不一致のため接続を切断',3000);}
  }
  else if(data.type==='full'){document.getElementById('joinStatus').textContent='ルームが満員です';}
}
// リモートアクションを適用
function applyRemoteAction(action){
  if(!GS||!action)return;
  try{
    if(action.type==='move'){var u=GS.units.find(function(u){return u.id===action.uid;});if(u)doMove(GS,u.id,action.r,action.c);}
    else if(action.type==='attack'){
      // v10.0: クライアントでも戦闘画面を再生（自分が関与する場合）
      var atkU=GS.units.find(function(u){return u.id===action.atkId;});
      var defU=GS.units.find(function(u){return u.id===action.defId;});
      var iAmInvolved=atkU&&defU&&(atkU.owner===myPeerIdx||defU.owner===myPeerIdx);
      var res=calcAttack(GS,action.atkId,action.defId);
      if(res&&iAmInvolved&&!isHost){showBattle(res,function(){render();updUI();if(GS.over)showGameOver();});}
    }
    else if(action.type==='field_magic'){doFieldMagicAction(GS,action.uid);}
    else if(action.type==='king_aoe'){doKingAoEAction(GS,action.uid);}
    else if(action.type==='necro_summon'){doNecroSummonAction(GS,action.uid);}
    else if(action.type==='produce'){doProd(GS,action.unitType,action.r,action.c);}
    else if(action.type==='wait'){var u2=GS.units.find(function(u){return u.id===action.uid;});if(u2){u2.moved=true;u2.attacked=true;}}
    else if(action.type==='end_turn'){GS.units.forEach(function(u){if(u.owner===GS.turn){u.moved=false;u.attacked=false;}});advanceTurn();}
    else if(action.type==='pause'){isPaused=!!action.paused;var btn=document.getElementById('pauseBtn'),ov=document.getElementById('pauseOv');if(btn){btn.textContent=isPaused?'▶':'⏸';btn.classList.toggle('paused',isPaused);}if(ov)ov.classList.toggle('show',isPaused);}
  }catch(e){console.warn('[v10] applyRemoteAction failed:',action,e);if(onlineMode&&!isHost&&onlineConns[0]){try{onlineConns[0].conn.send({type:'request_state'});}catch(e2){}}}
}
// アクションをブロードキャスト（リアルタイム配信） v10.0: ACK追跡付き
function broadcastAction(action){
  if(!onlineMode)return;
  if(!GS)return;
  var seq=GS.actionSeq++;
  var msg={type:'action',action:action,seq:seq};
  // アクションログ（再接続時の差分送信用）
  if(GS.actionLog){GS.actionLog.push({seq:seq,action:action});if(GS.actionLog.length>100)GS.actionLog.shift();}
  pendingActions[seq]={msg:msg,t:Date.now(),retries:0};
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
function closeOnlineRoom(){stopAckResendLoop();pendingActions={};if(myPeer)try{myPeer.destroy();}catch(e){}myPeer=null;onlineConns=[];onlineMode=false;hideAllBoxes();document.getElementById('modeBox').style.display='flex';}