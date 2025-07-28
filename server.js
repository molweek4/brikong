// 간단한 멀티플레이 대기방 서버 예시 (Node.js + Express + Socket.IO)
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

// 색상 상태 관리
const COLORS = ["red", "yellow", "green", "blue", "purple"];
const rooms = {}; // { roomId: { players: [ws, ...], colors: {}, usedColors: [], items: [] } }
let roomCounter = 1;

// 블록 생성 함수
function generateBlocks() {
  const blocks = [];
  const rows = 4;
  const cols = 8;
  const colIndices = Array.from({length: cols}, (_, i) => i);

  for (let r = 0; r < rows; r++) {
    // 한 줄에 생성할 블록 개수 (예: 3~6개)
    const blockCount = Math.floor(Math.random() * 4) + 2; // 3~6개
    // 랜덤한 column 선택
    const chosenCols = colIndices.sort(() => Math.random() - 0.5).slice(0, blockCount);

    for (let c of chosenCols) {
      let hp = Math.floor(Math.random() * 3) + 1;
      blocks.push({
        x: 70 * c + 35,
        y: 40 * r + 40,
        w: 60,
        h: 30,
        hp: hp
      });
    }
  }
  return blocks;
}

// 아이템 생성 함수
function createItem(x, y) {
  const itemTypes = ['fire', 'slow', 'double', 'penalty'];
  const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
  
  return {
    x: x,
    y: y,
    type: randomType,
    size: 40
  };
}


wss.on('connection', (ws) => {
  // WebSocket 객체에 고유 ID 부여
  ws.id = Math.random().toString(36).substr(2, 9);
  let joinedRoom = null;

  ws.on('message', (message) => {
    let msg;
    try {
      msg = JSON.parse(message);
    } catch (e) {
      return;
    }
    if (msg.type === 'joinRoom') {
      // 빈 방 찾기 또는 새 방 생성
      let roomId = null;
      for (const [id, room] of Object.entries(rooms)) {
        if (room.players.length < 2) {
          roomId = id;
          break;
        }
      }
        if (!roomId) {
          roomId = `room${roomCounter++}`;
          rooms[roomId] = { players: [], colors: {}, usedColors: [], items: [] };
        }
        
        // 기존 방에 items 배열이 없으면 초기화
        if (!rooms[roomId].items) {
          rooms[roomId].items = [];
        }
        
        rooms[roomId].players.push(ws);
        joinedRoom = roomId;

        // 대기 인원 수 알림
        const playerCount = rooms[roomId].players.length;
        console.log(`방 ${roomId}에 ${playerCount}명 입장, waiting 메시지 전송`);
        rooms[roomId].players.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'waiting', playerCount: playerCount }));
          }
        });

      // 2명 입장해도 바로 startGame을 보내지 않음
    }
    
    // 색상 선택 처리
    if (msg.type === "select_color") {
      const room = rooms[joinedRoom];
      if (room.usedColors.includes(msg.color)) {
        ws.send(JSON.stringify({ type: "color_denied", color: msg.color }));
      } else {
        room.colors[ws.id] = msg.color;
        room.usedColors.push(msg.color);
        console.log(`플레이어가 ${msg.color} 색상을 선택했습니다. 방: ${joinedRoom}`);
        console.log(`현재 room.colors:`, room.colors);
        console.log(`Object.keys(room.colors).length:`, Object.keys(room.colors).length);
        
        // 색상 상태 전송 - 자신을 제외하고 다른 플레이어들에게만 전송
        room.players.forEach(client => {
          if (client !== ws) { // 자신을 제외
            client.send(JSON.stringify({
              type: "color_update",
              usedColors: room.usedColors,
              myColor: room.colors[ws.id] // 선택한 플레이어의 색상
            }));
          }
        });
        
        // 2명 모두 색상을 골랐으면 모든 플레이어에게 시작 버튼 활성화
        console.log(`조건 확인: Object.keys(room.colors).length === 2:`, Object.keys(room.colors).length === 2);
        if (Object.keys(room.colors).length === 2) {
          console.log(`모든 플레이어가 색상을 선택했습니다. 방: ${joinedRoom}`);
          room.players.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ 
                type: "enable_start_button",
                usedColors: room.usedColors
              }));
            }
          });
        } else {
          console.log(`아직 모든 플레이어가 색상을 선택하지 않았습니다. 현재: ${Object.keys(room.colors).length}/2`);
        }
      }
    }
    
    // 게임 시작 준비 완료 처리
    if (msg.type === "ready_to_start") {
      const room = rooms[joinedRoom];
      if (room && room.players.length === 2 && Object.keys(room.colors).length === 2) {
        console.log(`게임 시작! 방: ${joinedRoom}`);
        
        // 블록 위치 정보 생성 (서버에서 동일한 블록 배치 생성)
        const blocks = generateBlocks();
        
        room.players.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ 
              type: "startGame",
              blocks: blocks,
              playerColors: room.colors
            }));
          }
        });
      }
    }
    
    // 패들 위치 전송
    if (msg.type === "paddle_position") {
      const room = rooms[joinedRoom];
      if (room) {
        room.players.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: "opponent_paddle",
              data: msg.data,
              color: room.colors[ws.id] // 선택한 색상 정보 추가
            }));
          }
        });
      }
    }
    
    // 공 위치 전송
    if (msg.type === "ball_position") {
      const room = rooms[joinedRoom];
      if (room) {
        room.players.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: "opponent_ball",
              data: msg.data,
              color: room.colors[ws.id] // 선택한 색상 정보 추가
            }));
          }
        });
      }
    }
    
    // 블록 파괴 및 아이템 생성
    if (msg.type === "block_destroyed") {
      const room = rooms[joinedRoom];
      if (room) {
        // 아이템 생성 (30% 확률)
        if (Math.random() < 0.3) {
          const newItem = createItem(msg.data.x, msg.data.y);
          room.items.push(newItem);
          
          // 모든 클라이언트에게 아이템 생성 알림
          room.players.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: "item_created",
                item: newItem
              }));
            }
          });
        }
      }
    }
    
    // 아이템 획득
    if (msg.type === "item_collected") {
      const room = rooms[joinedRoom];
      if (room) {
        // 아이템 제거
        room.items = room.items.filter(item => 
          !(item.x === msg.data.x && item.y === msg.data.y && item.type === msg.data.type)
        );
        
        // 모든 클라이언트에게 아이템 제거 알림
        room.players.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: "item_collected",
              item: msg.data
            }));
          }
        });
      }
    }
  });

  ws.on('close', () => {
    if (joinedRoom && rooms[joinedRoom]) {
      rooms[joinedRoom].players = rooms[joinedRoom].players.filter(client => client !== ws);
      // 방이 비면 삭제
      if (rooms[joinedRoom].players.length === 0) {
        delete rooms[joinedRoom];
      } else {
        // 남은 사람에게 대기 인원 수 알림
        const playerCount = rooms[joinedRoom].players.length;
        rooms[joinedRoom].players.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'waiting', playerCount }));
          }
        });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
