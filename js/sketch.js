let paddle;
let ball;

window.onload = function() {
  const restartBtn = document.getElementById('restartBtn');
  restartBtn.onclick = function() {
    location.reload(); // 페이지 전체 새로고침!
  };
};

function setup() {
  createCanvas(640, 480);
  paddle = new Paddle();
  ball = new Ball();
  initBlocks();
}

function draw() {
  background(0);

  if (!gameOver) {
    ball.update();
    ball.checkCollision();
    updateItemEffect();
  }

  ball.display();
  paddle.update();
  paddle.display();

  // 블록 & 아이템
  for (let block of blocks) block.display();
  for (let item of items) item.display();

  // 점수 표시 등 UI

  // 🟥 게임 오버 메시지 표시
  if (gameOver) {
    fill(255, 0, 0);
    textSize(48);
    textAlign(CENTER, CENTER);
    text("GAME OVER", width / 2, height / 2);

    noLoop();
    document.getElementById('restartBtn').style.display = 'block';
  }
}

