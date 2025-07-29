// server.js - 통합된 WebSocket + 대기방 + 게임 서버
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

const COLORS = ["red", "yellow", "green", "blue", "purple"];
const rooms = {}; // { roomId: { players: [], colors: {}, usedColors: [], blocks: [], items: [] } }
let roomCounter = 1;

function generateBlocks() {
  const blocks = [];
  const rows = 4;
  const cols = 8;
  const colIndices = Array.from({ length: cols }, (_, i) => i);
  for (let r = 0; r < rows; r++) {
    const blockCount = Math.floor(Math.random() * 4) + 2;
    const chosenCols = colIndices.sort(() => Math.random() - 0.5).slice(0, blockCount);
    for (let c of chosenCols) {
      let hp = Math.floor(Math.random() * 3) + 1;
      blocks.push({ x: 70 * c + 35, y: 40 * r + 40, w: 60, h: 30, hp });
    }
  }
  return blocks;
}

function addBlockRow() {
  const cols = 8;
  const colIndices = Array.from({ length: cols }, (_, i) => i);
  const blockCount = Math.floor(Math.random() * 3) + 1;
  const chosenCols = colIndices.sort(() => Math.random() - 0.5).slice(0, blockCount);
  const newRow = [];
  for (let c of chosenCols) {
    let hp = Math.floor(Math.random() * 3) + 1;
    newRow.push({ x: 70 * c + 35, y: 40, w: 60, h: 30, hp });
  }
  return newRow;
}

function createItem(x, y) {
  const itemTypes = ['fire', 'slow', 'double', 'penalty'];
  const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
  return { x, y, type: randomType, size: 40 };
}

wss.on('connection', (ws) => {
  ws.id = Math.random().toString(36).substr(2, 9);
  let joinedRoom = null;

  ws.on('message', (message) => {
    let msg;
    try { msg = JSON.parse(message); } catch (e) { return; }

    if (msg.type === 'joinRoom') {
      let roomId = Object.keys(rooms).find(id => rooms[id].players.length < 2);
      if (!roomId) {
        roomId = `room${roomCounter++}`;
        rooms[roomId] = { players: [], colors: {}, usedColors: [], blocks: [], items: [] };
      }
      rooms[roomId].players.push(ws);
      joinedRoom = roomId;

      const playerCount = rooms[roomId].players.length;
      rooms[roomId].players.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'waiting', playerCount }));
        }
      });
    }

    if (msg.type === 'select_color') {
      const room = rooms[joinedRoom];
      if (room.usedColors.includes(msg.color)) {
        ws.send(JSON.stringify({ type: 'color_denied', color: msg.color }));
      } else {
        room.colors[ws.id] = msg.color;
        room.usedColors.push(msg.color);
        room.players.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'color_update',
              usedColors: room.usedColors,
              myColor: msg.color
            }));
          }
        });
        if (Object.keys(room.colors).length === 2) {
          room.blocks = generateBlocks();
          room.players.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'enable_start_button', usedColors: room.usedColors }));
            }
          });
        }
      }
    }

    if (msg.type === 'ready_to_start') {
      const room = rooms[joinedRoom];
      if (room && room.players.length === 2 && Object.keys(room.colors).length === 2) {
        room.players.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'startGame',
              blocks: room.blocks,
              playerColors: room.colors
            }));
          }
        });
      }
    }

    if (msg.type === 'paddle_position' || msg.type === 'ball_position') {
      const room = rooms[joinedRoom];
      if (room) {
        const targetType = msg.type === 'paddle_position' ? 'opponent_paddle' : 'opponent_ball';
        room.players.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: targetType, data: msg.data, color: room.colors[ws.id] }));
          }
        });
      }
    }

    if (msg.type === 'block_destroyed') {
      const room = rooms[joinedRoom];
      if (room && Math.random() < 0.3) {
        const newItem = createItem(msg.data.x, msg.data.y);
        room.items.push(newItem);
        room.players.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'item_created', item: newItem }));
          }
        });
      }
    }

    if (msg.type === 'item_collected') {
      const room = rooms[joinedRoom];
      if (room) {
        room.items = room.items.filter(item =>
          !(item.x === msg.data.x && item.y === msg.data.y && item.type === msg.data.type)
        );
        room.players.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ 
              type: 'item_collected', 
              item: msg.data,
              collectedBy: ws.id // 아이템을 획득한 플레이어 ID
            }));
          }
        });
      }
    }
  });

  ws.on('close', () => {
    if (joinedRoom && rooms[joinedRoom]) {
      rooms[joinedRoom].players = rooms[joinedRoom].players.filter(c => c !== ws);
      if (rooms[joinedRoom].players.length === 0) {
        delete rooms[joinedRoom];
      } else {
        const count = rooms[joinedRoom].players.length;
        rooms[joinedRoom].players.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'waiting', playerCount: count }));
          }
        });
      }
    }
  });
});

// 주기적으로 블록 줄 추가
setInterval(() => {
  for (const roomId in rooms) {
    const room = rooms[roomId];
    if (room.players.length === 2 && room.blocks.length > 0) {
      const newRow = addBlockRow();
      room.blocks.forEach(b => b.y += 40);
      room.blocks.push(...newRow);
      room.players.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'block_add', newRow }));
        }
      });
    }
  }
}, 8000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
