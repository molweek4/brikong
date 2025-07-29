import { Ball } from './ball.js';
import { Block } from './block.js';
import { Item, updateItemEffect, updateItems } from './item.js';
import { Paddle } from './paddle.js';
import { initPoseManager } from './poseManager.js';
import { initSocket,sendReady, getPlayerId, getOpponentPose, getOpponentBallPos, getInitialBlocks, onBlockUpdate, onBlockAdd, sendPaddleUpdate, sendBallPosition } from './socket.js';


// 전역 변수
let paddle;
let ball;
let blocks = [];
let items = [];
let activeItem = null;
let itemTimerRef = { value: 0 };
let score = 0;
let gameOver = false;
let gameState = "start"; // "start", "playing", "gameover"
let myImg;

let lastBlockAddTime = 0;
let blockAddInterval = 8000; // 8초

let myBall;

// 버튼
const restartBtn = document.getElementById('restartBtn');
const startBtn = document.getElementById('startBtn');

// 블록 초기화
/*function initBlocks() {
  blocks = [];
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
      blocks.push(new Block(70 * c + 35, 40 * r + 40, hp));
    }
  }
}*/

function initBlocks(){
  const raw = getInitialBlocks();
  blocks = raw.map( b => new Block(b.x, b.y, b.hp));
}


onBlockUpdate((serverBlocks) => {
  blocks = serverBlocks.map(b => new Block(b.x, b.y, b.hp));
});

onBlockAdd((newRow) => {
  // 기존 블록들을 아래로 이동
  for (let b of blocks) {
    b.y += 40;
  }

  // 새 줄 추가
  for (let b of newRow) {
    blocks.push(new Block(b.x, b.y, b.hp));
  }
});

// 게임 전체 초기화
function initGame() {
  paddle = new Paddle();
  //ball = new Ball();
  initBlocks();
  items = [];
  activeItem = null;
  gameOver = false;
  gameState = "playing";
  myBall = new Ball();
}

function positionStartButton() {
  const canvas = document.querySelector('#canvas-container canvas');
  const btn = document.getElementById('startBtn');
  if (!canvas || !btn) return;
  const rect = canvas.getBoundingClientRect();
  // 안내문 아래에 버튼 위치 (안내문 y좌표: rect.top + rect.height/2 + 40)
  btn.style.left = `${rect.left + rect.width / 2}px`;
  btn.style.top = `${rect.top + rect.height / 2 + 60}px`; // 60px 아래 (간격 조절 가능)
  btn.style.transform = 'translate(-50%, 0)';
  btn.style.display = 'block';
}

function positionRestartButton() {
  const canvas = document.querySelector('#canvas-container canvas');
  const btn = document.getElementById('restartBtn');
  if (!canvas || !btn) return;
  const rect = canvas.getBoundingClientRect();
  btn.style.left = `${rect.left + rect.width / 2}px`;
  btn.style.top = `${rect.top + rect.height / 2 + 60}px`;
  btn.style.transform = 'translate(-50%, 0)';
  //btn.style.display = 'block';
}

window.addEventListener('resize', positionStartButton);
window.addEventListener('resize', positionRestartButton);
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(positionStartButton, 100);
  setTimeout(positionRestartButton, 100);
});
setTimeout(positionStartButton, 500);
setTimeout(positionRestartButton, 500);

window.preload = function() {
  myImg = loadImage('../assets/images/img.png'); // 경로는 index.html 기준
  // 예: 'assets/myimage.png' 또는 '../assets/myimage.png'
};

window.startGameFromServer = function () {
  initGame();
  loop(); // draw 루프 시작
};

// p5.js 필수 함수: setup
window.setup = function () {
  const canvas = createCanvas(640, 480);
  canvas.parent('canvas-container');
  noLoop(); // 시작 전에 멈춤

  initSocket();

  initPoseManager((poseInfo) => {
    //console.log("Pose detected", poseInfo);
    if (poseInfo.paddleAngle < -90 || poseInfo.paddleAngle > 90) return;


    if (!paddle) {
      paddle = new Paddle(); // Paddle이 없으면 즉시 생성
    }
    paddle.applyPoseControl(poseInfo);

    sendPaddleUpdate(paddle.x, paddle.angle);
  })
  

  if (restartBtn) {
    restartBtn.onclick = () => {
      restartBtn.style.display = 'none';
      sendReady();  // 새 준비 신호 전송
    }
  }

  if (startBtn) {
    startBtn.onclick = () => {
      startBtn.style.display = 'none';
      sendReady(); // 준비 신호 보내기
    };
  }
};

// Ball의 checkCollision은 충돌한 블록 인덱스만 반환
Ball.prototype.checkCollision = function(blocks, activeItem) {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (
      this.x > b.x &&
      this.x < b.x + b.w &&
      this.y + this.r > b.y &&
      this.y - this.r < b.y + b.h
    ) {
      if (!b.hitRecently) {
        if (activeItem !== "fire") {
          this.dy *= -1;
        }
        b.hitRecently = true;
        setTimeout(() => b.hitRecently = false, 100);
        return i; // 충돌한 블록 인덱스 반환
      }
    }
  }
  return -1;
};

// p5.js 필수 함수: draw
window.draw = function () {
  background(0);
  console.log("draw", gameState);
  if (gameState === "start") {
    fill(255);
    textSize(48);
    textAlign(CENTER, CENTER);
    text("Brikong", width / 2, height / 2 - 40);
    textSize(24);
    text("시작 버튼을 누르세요", width / 2, height / 2 + 20);
    positionStartButton(); // draw에서 위치 조정
    return;
  }

  if (gameState === "playing") {
    if (startBtn) startBtn.style.display = 'none';
    if (restartBtn) restartBtn.style.display = 'none';
    if (myImg) {
      image(myImg, 0, 0, width, height); // 캔버스 전체에 꽉차게
    } else {
      background(0); // 이미지 없을 때 기본 배경
    }
    // 공 업데이트 및 바닥에 닿았는지 검사
    if (myBall.update(false, paddle)) {
      gameState = "gameover";
      noLoop();
      if (restartBtn) restartBtn.style.display = 'block';
    }

    // 충돌 검사 및 블록/아이템 처리
    const hitIdx = myBall.checkCollision(blocks, activeItem);
    if (hitIdx !== -1) {
      blocks[hitIdx].hp--;
      if (blocks[hitIdx].hp <= 0) {
        // 아이템 생성 확률 (40%)
        if (Math.random() < 0.4) {
          const type = ["fire", "slow", "double", "penalty"][Math.floor(Math.random() * 4)];
          items.push(new Item(
            blocks[hitIdx].x + blocks[hitIdx].w/2,
            blocks[hitIdx].y + blocks[hitIdx].h/2,
            type
          ));
        }
        blocks.splice(hitIdx, 1);
        score++; // 블록 제거 시 점수 증가
      }
    }

    // 아이템 표시 및 획득 처리
    updateItems(myBall, paddle, items, activeItem, (type) => { activeItem = type; }, itemTimerRef);
    updateItemEffect(activeItem, itemTimerRef.value, myBall, paddle, (type) => { activeItem = type; });

    // 화면 요소 그리기
    myBall.display();
    //paddle.update(activeItem);
    paddle.display();

    if (frameCount % 2 === 0) {
      sendBallPosition(myBall.x, myBall.y);
    }

    const opp = getOpponentPose();
    const myId = getPlayerId();

    if (opp && myId) {
      // 상대방 Paddle만 렌더링
      push();
      translate(opp.x, paddle.y);
      rotate(radians(opp.angle));
      fill(255, 100, 100);
      rectMode(CENTER);
      rect(0, 0, paddle.w, paddle.h);
      pop();
    }

    const oppBall = getOpponentBallPos();
    fill(255, 100, 255); // 분홍색 공
    ellipse(oppBall.x, oppBall.y, 20, 20);

    for (let block of blocks) block.display();

    /*if (millis() - lastBlockAddTime > blockAddInterval) {
      moveBlocksDown();
      addBlockRow();
      lastBlockAddTime = millis();
    }*/

    // draw() 내에서 score 표시
    fill(255);
    textSize(20);
    textAlign(LEFT, TOP);
    text(`점수: ${score}`, 10, 10);

    // item 이름 표시
    if (activeItem) {
      textSize(16);
      text(`아이템: ${activeItem}`, 10, 35);
    }

    checkBlockGameOver();
  }

  if (gameState === "gameover") {
    positionRestartButton();
    rectMode(CORNER);
    fill(0, 0, 0, 200); // 또는 fill(0); for 완전 불투명
    noStroke();
    rect(0, 0, width, height);

    // 텍스트
    fill(255, 50, 50);
    textSize(48);
    textAlign(CENTER, CENTER);
    text("💀 GAME OVER 💀", width / 2, height / 2 - 40);

    fill(255);
    textSize(24);
    text("재시작 버튼을 눌러주세요", width / 2, height / 2 + 20);

    if (restartBtn) restartBtn.style.display = 'block';
  }

};

function addBlockRow() {
  const cols = 8;
  const colIndices = Array.from({length: cols}, (_, i) => i);

  // 한 줄에 생성할 블록 개수 (예: 3~6개)
  const blockCount = Math.floor(Math.random() * 3) + 1; // 3~6개
  // 랜덤한 column 선택
  const chosenCols = colIndices.sort(() => Math.random() - 0.5).slice(0, blockCount);

  for (let c of chosenCols) {
    let hp = Math.floor(Math.random() * 3) + 1;
    blocks.push(new Block(70 * c + 35, 40, hp)); // y=40이 맨 위
  }
}

function moveBlocksDown() {
  for (let b of blocks) {
    b.y += 40; // 한 줄(40px) 아래로
  }
}

function checkBlockGameOver() {
  for (let b of blocks) {
    if (b.y + b.h >= paddle.y - paddle.h / 2) {
      gameState = "gameover";
      if (restartBtn) restartBtn.style.display = 'block';
      noLoop();
      break;
    }
  }
}
