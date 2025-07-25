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

// 시작/재시작 버튼
const restartBtn = document.getElementById('restartBtn');

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
  score = 0;
}

window.setup = function() {
  createCanvas(640, 480);
  initGame();
  if (restartBtn) {
    restartBtn.style.display = 'none';
    restartBtn.onclick = () => location.reload();
  }
};

window.draw = function() {
  background(0);

  if (!gameOver) {
    // ball.update가 true를 반환하면 gameOver로 처리
    if (ball.update(gameOver, paddle)) {
      gameOver = true;
    }
    ball.checkCollision(blocks, activeItem);
    updateItemEffect();
  }

  ball.display();
  paddle.update(activeItem);
  paddle.display();

  for (let block of blocks) block.display();
  for (let item of items) item.display();

  // 점수 표시 등 UI

  if (gameOver) {
    fill(255, 0, 0);
    textSize(48);
    textAlign(CENTER, CENTER);
    text('GAME OVER', width / 2, height / 2);
    noLoop();
    if (restartBtn) restartBtn.style.display = 'block';
  }
};
