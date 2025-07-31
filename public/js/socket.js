let socket = null;
let playerId = null;
let opponentPose = { x: 320, angle: 0 }; // 초기값: 화면 중앙
let opponentBallPos = {x:0, y:0};
let initialBlocks = [];
let onBlockUpdateCallback = null;
let onBlockAddCallback = null;
let playerCount = 1; // 대기방 인원 표시용
let onScoreUpdateCallback = null;

export function getSocket() {
  return socket;
}

//상대방 패들 위치 
export function getOpponentPose() {
  return opponentPose;
}

export function updateOpponentBall(x,y) {
  opponentBallPos.x = x;
  opponentBallPos.y = y;
}


export function getOpponentBallPos() {
  return opponentBallPos;
}

export function getPlayerId() {
  return playerId;
}

export function getInitialBlocks() {
    return initialBlocks;
}

export function getPlayerCount() {
  return playerCount;
}


export function onBlockUpdate(callback) {
  onBlockUpdateCallback = callback;
}

export function onBlockAdd(callback) {
  onBlockAddCallback = callback;
}
export function onScoreUpdate(callback) {
  onScoreUpdateCallback = callback;
}


export function initSocket() {
  socket = new WebSocket("ws://localhost:3000");
  window.socket = socket; // 전역으로 설정

  socket.onopen = () => {
    console.log(" WebSocket 연결됨");
    // 플레이어 ID 생성 및 저장
    window.myPlayerId = Math.random().toString(36).substr(2, 9);
    // 여기서 바로 joinRoom을 보내지 않음
  };

  socket.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    //console.log("서버로부터 메시지 수신:", msg);
    //console.log("msg.type:", msg.type);
    //console.log("msg.playerCount:", msg.playerCount);
    //console.log("전체 msg 객체:", JSON.stringify(msg, null, 2));


    if (msg.type === "assign_id") {
      playerId = msg.playerId;
    }

    if (msg.type === "opponent_left") {
       console.log("상대방 나감 이벤트 수신");
      window.opponentLeft = true;
    }

    if (msg.type === "assign_index") {
      window.myPlayerIndex = msg.index;
    }

    if (msg.type === "opponent_paddle" && msg.playerId !== playerId) {
      opponentPose.x = msg.x;
      opponentPose.angle = msg.angle;
    }

    if (msg.type === "ball_position") {
      updateOpponentBall(msg.data.x, msg.data.y);
    }

    if (msg.type === "init_blocks") {
      initialBlocks = msg.blocks;

      // blocks 초기화 이후 initGame 호출
     if (typeof window.initGame === 'function') {
        window.initGame();
        loop();
     }
    }

    if (msg.type === "blocks_update" && onBlockUpdateCallback) {
        onBlockUpdateCallback(msg.blocks);
    }

    if (msg.type === "block_add" && onBlockAddCallback) {
        onBlockAddCallback(msg.newRow);
    }

    if (msg.type === "waiting") {
      window.gameState = "waiting";
      window.playerCount = msg.playerCount;
      console.log("server 대기방 인원 수:", msg.playerCount);
      window.noLoop && window.noLoop();
      
      // 2명이 입장하면 색상 선택 화면으로 넘어가기
      if (msg.playerCount === 2) {
        console.log("=== 2명 입장 감지! 색상 선택 화면으로 전환 시작 ===");
        window.gameState = "color_select";
        console.log("window.gameState 변경됨:", window.gameState);
        document.getElementById('color-select').style.display = 'block';
        console.log("색상 선택 UI 표시됨");
        // 색상 선택 화면에서도 게임 루프 실행 (텍스트 표시를 위해)
        window.loop && window.loop();
        console.log("loop() 호출됨");
      }
    }

    if (msg.type === "color_update") {
      console.log("색상 업데이트:", msg);
      // 상대방 색상 업데이트
      if (msg.myColor && window.updateOpponentSelection) {
        window.updateOpponentSelection(msg.myColor);
      }
    }
    
    if (msg.type === "enable_start_button") {
      console.log("시작 버튼 활성화:", msg);
      // 모든 플레이어에게 시작 버튼 표시
      if (window.showStartButton) {
        window.showStartButton();
      }
    }
    
    if (msg.type === "startGame") {
      window.gameState = "playing";
      document.getElementById('color-select').style.display = 'none';
      
      // 블록 정보 저장
      if (msg.blocks) {
        window.sharedBlocks = msg.blocks;
      }
      
      // 플레이어 색상 정보 저장
      if (msg.playerColors) {
        window.playerColors = msg.playerColors;
      }
      
      if (typeof window.initGame === 'function') {
        window.initGame();
        window.loop && window.loop();
      }
    }
    
    if (msg.type === "game_over_result") {
      const [score1, score2] = msg.scores;
      let resultText = "무승부!";
      if (msg.winner === window.myPlayerIndex) {
        resultText = "승리!";
      } else if (msg.winner !== -1) {
        resultText = "패배...";
      }

      gameState = "final_result";
      window.finalScores = msg.scores;
      window.finalResultText = resultText;
    }

    // 상대방 패들 위치 수신
    if (msg.type === "opponent_paddle") {
      window.opponentPaddle = {
        ...msg.data,
        color: msg.color
      };
    }
    
    if (msg.type === "score_update") {
      if (onScoreUpdateCallback) {
        onScoreUpdateCallback(msg.scores);
      }
    }

    // 상대방 공 위치 수신
    if (msg.type === "opponent_ball") {
      window.opponentBall = {
        ...msg.data,
        color: msg.color
      };
    }
    
    // 아이템 생성 수신
    if (msg.type === "item_created") {
      if (!window.sharedItems) window.sharedItems = [];
      window.sharedItems.push(msg.item);
    }
    
    // 아이템 획득 수신
    if (msg.type === "item_collected") {
      if (window.sharedItems) {
        window.sharedItems = window.sharedItems.filter(item => 
          !(item.x === msg.item.x && item.y === msg.item.y && item.type === msg.item.type)
        );
      }
      
      // 자신이 획득한 아이템인지 확인
      if (msg.collectedBy === window.myPlayerId) {
        window.myCollectedItem = msg.item;
      }
    }
  };
}

export function sendPaddleUpdate(x, angle) {
  if (socket && playerId) {
    socket.send(JSON.stringify({
      type: "paddle_update",
      playerId,
      x,
      angle
    }));
  }
}

export function sendBallPosition(x, y) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "ball_position",
      data: {x, y}
    }));
  }
}

export function sendPaddlePosition(x, angle) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "paddle_position",
      data: {x, angle}
    }));
  }
}

export function sendBlockDestroyed(x, y) {
   console.log("블록 파괴 전송 시도:", x, y);  // ✅ 추가
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "block_destroyed",
      data: {x, y}
    }));
    console.log("블록 파괴 서버로 전송 완료");  // ✅ 추가
  }
}

export function sendItemCollected(x, y, type) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "item_collected",
      data: {x, y, type}
    }));
  }
}

export function sendBlockUpdate(blocks) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "blocks_update",
      blocks: blocks.map(b => ({x: b.x, y: b.y, hp: b.hp}))
    }));
  }
}

// 시작 버튼 클릭 시 호출할 함수 추가
export function joinRoom() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "joinRoom" }));
  }
}