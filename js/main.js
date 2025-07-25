import { Paddle } from './paddle.js';
import { Ball } from './ball.js';
import { Block } from './block.js';
import { Item, updateItems, activateItem, updateItemEffect } from './item.js';

// 전역 상태 변수
let paddle;
let ball;
let blocks = [];
let items = [];
let activeItem = null;
let score = 0;
let gameOver = false;
let gameState = "start"; // "start", "playing", "gameover"

// 시작/재시작 버튼
const restartBtn = document.getElementById('restartBtn');
const startBtn = document.getElementById('startBtn');

function initBlocks() {
  blocks = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 8; c++) {
      let hp = Math.floor(Math.random() * 3) + 1; // 1~3
      blocks.push(new Block(70 * c + 35, 40 * r + 40, hp));
    }
  }
}

function initGame() {
  paddle = new Paddle();
  ball = new Ball();
  initBlocks();
  items = [];
  activeItem = null;
  gameOver = false;
  gameState = "playing"; // 게임 시작 시 상태 변경
}

window.setup = function() {
  createCanvas(640, 480);
  noLoop(); // 처음엔 draw 멈춤(시작화면)
  initGame();
  if (restartBtn) {
    restartBtn.style.display = 'none';
    restartBtn.onclick = () => location.reload();
  }
  if (startBtn) {
    startBtn.onclick = () => {
      console.log("시작 버튼 클릭됨");
      startBtn.style.display = 'none';
      gameState = "playing";
      initGame();
      loop();
    };
  }
};

window.draw = function() {
  background(0);
  console.log(gameState);

  if (gameState === "start") {
    // 시작 화면
    fill(255);
    textSize(48);
    textAlign(CENTER, CENTER);
    text("벽돌깨기", width / 2, height / 2 - 40);
    textSize(24);
    text("시작 버튼을 누르세요", width / 2, height / 2 + 20);
    noLoop(); // 여기서만 noLoop()
    return;
  }

  if (gameState === "playing") {
    if (ball.update(false, paddle)) {
      gameState = "gameover";
      noLoop();
      if (restartBtn) restartBtn.style.display = 'block';
    }
    ball.checkCollision(blocks, activeItem);
    updateItemEffect();

    ball.display();
    paddle.update(activeItem);
    paddle.display();
    for (let block of blocks) block.display();
    for (let item of items) item.display();
    // 점수 등 UI
  }

  if (gameState === "gameover") {
    background(0, 0, 0, 200); // 반투명 오버레이
    fill(255, 0, 0);
    textSize(48);
    textAlign(CENTER, CENTER);
    text('GAME OVER', width / 2, height / 2 - 30);
    textSize(24);
    fill(255);
    text('재시작 버튼을 누르세요', width / 2, height / 2 + 30);
    noLoop(); // 게임 오버일 때만 noLoop()
    if (restartBtn) restartBtn.style.display = 'block';
  }
};
