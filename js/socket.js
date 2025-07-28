let socket = null;
let playerId = null;
let opponentPose = { x: 320, angle: 0 }; // 초기값: 화면 중앙
let opponentBallPos = {x:0, y:0};
let initialBlocks = [];
let onBlockUpdateCallback = null;
let onBlockAddCallback = null;

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


export function onBlockUpdate(callback) {
  onBlockUpdateCallback = callback;
}

export function onBlockAdd(callback) {
  onBlockAddCallback = callback;
}

export function initSocket() {
  socket = new WebSocket("ws://localhost:8080");

  socket.onopen = () => {
    console.log("✅ WebSocket 연결됨");
  };

  socket.onmessage = (e) => {
    const msg = JSON.parse(e.data);

    if (msg.type === "assign_id") {
      playerId = msg.playerId;
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

export function sendBlockUpdate(blocks) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "blocks_update",
      blocks: blocks.map(b => ({x: b.x, y: b.y, hp: b.hp}))
    }));
  }
}