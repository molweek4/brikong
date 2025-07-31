import { Ball } from './ball.js';
import { Block } from './block.js';
import { getEmoji, updateItemEffect, updateItems } from './item.js';
import { Paddle } from './paddle.js';

import { initHandDetector, initPoseManager } from './poseManager.js';
import { getInitialBlocks, initSocket, joinRoom, onBlockAdd, onBlockUpdate, onScoreUpdate, sendBallPosition, sendBlockDestroyed, sendItemCollected, sendPaddlePosition, sendPaddleUpdate } from './socket.js';

// 전역 변수
let paddle;
let ball;
let blocks = [];
let items = [];
let activeItem = null;
let itemTimerRef = { value: 0 };
let score = 0;
let gameOver = false;
let gameState = "start"; // "start", "waiting", "color_select", "playing", "gameover"
let myImg;
let blockImg1, blockImg2, blockImg3, logoImg; // 체력별 블록 이미지
let lightFont;
let boldFont;
let SansFontBold;
let SansFontMedium;
let SansFontLight;

// 사운드 관련 변수 추가
let hitSound;
let paddleSound;
let itemSound;
let backgroundMusic;
let clickSound;

// 사운드 재생 함수 추가
function playHitSound() {
  try {
    if (hitSound && typeof hitSound.play === 'function') {
      hitSound.play();
    }
  } catch (error) {
    console.error('Error playing hit sound:', error);
  }
}

function playPaddleSound() {
  try {
    if (paddleSound && typeof paddleSound.play === 'function') {
      paddleSound.play();
    }
  } catch (error) {
    console.error('Error playing paddle sound:', error);
  }
}

// 전역으로 노출
window.playPaddleSound = playPaddleSound;

function playItemSound() {
  try {
    if (itemSound && typeof itemSound.play === 'function') {
      itemSound.play();
    }
  } catch (error) {
    console.error('Error playing item sound:', error);
  }
}

function playBackgroundMusic() {
  try {
    if (backgroundMusic && typeof backgroundMusic.play === 'function') {
      backgroundMusic.setVolume(0.3); // 볼륨 조절 (0.0 ~ 1.0)
      backgroundMusic.loop(); // 반복 재생
    }
  } catch (error) {
    console.error('Error playing background music:', error);
  }
}

function stopBackgroundMusic() {
  try {
    if (backgroundMusic && typeof backgroundMusic.stop === 'function') {
      backgroundMusic.stop();
    }
  } catch (error) {
    console.error('Error stopping background music:', error);
  }
}

function playClickSound() {
  try {
    if (clickSound && typeof clickSound.play === 'function') {
      clickSound.play();
    }
  } catch (error) {
    console.error('Error playing click sound:', error);
  }
}

// 전역으로 노출
window.playClickSound = playClickSound;

// 아이템 획득 알림 표시 함수
function showItemNotification(itemType) {
  itemNotification = itemType;
  itemNotificationTimer = 120; // 2초간 표시 (60fps 기준)
}

let myScore = 0;
let opponentScore = 0;

// 아이템 획득 알림 관련 변수
let itemNotification = null;
let itemNotificationTimer = 0;

let lastBlockAddTime = 0;
let blockAddInterval = 8000; // 8초

let myBall;

let itemImages = {}; // 아이템 이미지 저장용
// 버튼
const restartBtn = document.getElementById('restartBtn');
const startBtn = document.getElementById('startBtn');

let playerCount = 1; // 대기방 인원 표시용

export function getPlayerCount() {
  return playerCount;
}

window.isPlayerDead = false;


onScoreUpdate((scores) => {
  const myIndex = window.myPlayerIndex || 0; // 서버가 index 제공해야 함
  myScore = scores[myIndex];
  opponentScore = scores[1 - myIndex];
});

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
  // 서버에서 받은 블록 정보 사용
  if (window.sharedBlocks) {
    blocks = window.sharedBlocks.map(b => new Block(b.x, b.y, b.hp));
  } else {
    // 기존 방식 (단일 플레이어용)
    const raw = getInitialBlocks();
    blocks = raw.map(b => new Block(b.x, b.y, b.hp));
  }
}


function triggerUltimateSkill() {
  console.log("🚀 궁극기 발동!");
  // 여기에 게임 속 로직 추가 (예: 블록 파괴, 점수 증가 등)

  let maxY = Math.max(...blocks.map(b => b.y));

  // 2. 해당 줄에 있는 블록들 필터링
  const bottomBlocks = blocks.filter(b => b.y === maxY);

   // 3. 각 블록의 hp 값을 점수로 추가
  bottomBlocks.forEach(block => {
    score += block.hp;  // 블록당 점수 = 체력값
  });

  // 4. 블록 제거
  blocks = blocks.filter(b => Math.abs(b.y - maxY) >= 1);

  // 5. 서버에 제거된 블록들 전송 (멀티플레이 반영)
  bottomBlocks.forEach(block => {
            sendBlockDestroyed(block.x, block.y, activeItem);
  });
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
  paddle = new Paddle(window.myPaddleColor || "red");
  //ball = new Ball();
  initBlocks();
  items = [];
  activeItem = null;
  gameOver = false;
  gameState = "playing";
  myBall = new Ball(window.myPaddleColor || "white");
}

window.initGame = initGame;

function positionStartButton() {
  const canvas = document.querySelector('#canvas-container canvas');
  const btn = document.getElementById('startBtn');
  if (!canvas || !btn) return;
  const rect = canvas.getBoundingClientRect();
  // 안내문 아래에 버튼 위치 (안내문 y좌표: rect.top + rect.height/2 + 40)
  btn.style.left = `${rect.left + rect.width / 2}px`;
  btn.style.top = `${rect.top + rect.height / 2 + 90}px`; // 60px 아래 (간격 조절 가능)
  btn.style.transform = 'translate(-50%, 0)';
  btn.style.display = 'block';
}

function positionRestartButton() {
  const canvas = document.querySelector('#canvas-container canvas');
  const btn = document.getElementById('restartBtn');
  if (!canvas || !btn) return;
  const rect = canvas.getBoundingClientRect();
  btn.style.left = `${rect.left + rect.width / 2}px`;
  btn.style.top = `${rect.top + rect.height / 2 + 140}px`;
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
  blockImg1 = loadImage('../assets/images/blue.png'); // hp=1
  blockImg2 = loadImage('../assets/images/green.png'); // hp=2
  blockImg3 = loadImage('../assets/images/red.png'); // hp=3
  
  logoImg = loadImage('../assets/logo.png');
  boldFont = loadFont('../assets/bold.ttf'); 
  lightFont = loadFont('../assets/light.ttf'); 
  SansFontBold = loadFont('../assets/GmarketSansTTFBold.ttf'); 
  SansFontLight = loadFont('../assets/GmarketSansTTFLight.ttf');
  SansFontMedium = loadFont('../assets/GmarketSansTTFMedium.ttf');

  // 사운드 로드
  hitSound = loadSound('../assets/sounds/hit.wav');
  paddleSound = loadSound('../assets/sounds/paddle.wav');
  itemSound = loadSound('../assets/sounds/item.wav');
  backgroundMusic = loadSound('../assets/sounds/background.wav');
  clickSound = loadSound('../assets/sounds/click.wav');

  // 아이템 이미지 로드
  itemImages.fire = loadImage('../assets/images/fire.gif');
  itemImages.slow = loadImage('../assets/images/slow.gif');
  //itemImages.double = loadImage('../assets/images/double.gif');
  itemImages.penalty = loadImage('../assets/images/change.gif');
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

  // 배경음악 시작
  playBackgroundMusic();

  initSocket();

  initPoseManager((poseInfo) => {
    //console.log("Pose detected", poseInfo);
    if (poseInfo.paddleAngle < -90 || poseInfo.paddleAngle > 90) return;
    if(!window.isPlayerDead){
      if (!paddle) {
        paddle = new Paddle(); // Paddle이 없으면 즉시 생성
      }
      paddle.applyPoseControl(poseInfo);

      sendPaddleUpdate(paddle.x, paddle.angle);
    }
  }).then(() => { 
    return initHandDetector(triggerUltimateSkill);
  })


  if (restartBtn) {
    restartBtn.onclick = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "player_leave" }));
    }
    location.reload(); // 나만 새로고침
  };
  }

  if (startBtn) {
    startBtn.onclick = () => {
      playClickSound(); // 클릭 사운드 재생
      startBtn.style.display = 'none';
      gameState = "waiting";
      loop();
      // 시작 버튼을 누를 때만 방에 입장
      joinRoom();
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
  background('#FCEDD5');
  console.log("draw 함수 실행, gameState:", window.gameState);
  if (gameState === "start" && logoImg) {
    /*fill(255);
    textSize(48);
    textAlign(CENTER, CENTER);
    text("Brikong", width / 2, height / 2 - 40);
    textSize(24);
    text("시작 버튼을 누르세요", width / 2, height / 2 + 20);*/
    const scaleFactor = 0.5; // 캔버스 폭의 50% 크기
    const logoWidth = width * scaleFactor;
    const aspectRatio = logoImg.height / logoImg.width;
    const logoHeight = logoWidth * aspectRatio;

    push(); 
    imageMode(CENTER);
    image(logoImg, width / 2, height / 2 - 30 , logoWidth, logoHeight);
    pop();  

    positionStartButton(); // draw에서 위치 조정
    return;
  }


  if (window.gameState === "waiting") {
    // 대기방 화면 그리기
    background(0, 0, 0, 150);
    fill(255);

    textAlign(CENTER, CENTER);
    textSize(28);
    text("상대 기다리는 중", width/2, height/2);
    textSize(20);
    console.log("window.playerCount", window.playerCount);
    text(`${window.playerCount || 1}/2 명 입장`, width/2, height/2 + 40);
    noLoop(); // 대기 중에는 게임 루프 멈춤
  }

  if (window.gameState === "color_select") {
    // 색상 선택 화면에서는 배경만 그리기 (텍스트 없음)
    //background(0, 0, 0, 180);
    fill('#573016');
    textAlign(CENTER, TOP);
    textSize(32);
    textFont(SansFontMedium);
    text("색상을 선택해주세요", width/2, 60);
    console.log("gameState", "color_select");
    // 색상 선택 UI는 HTML에서 처리됨
    noLoop();
  }

  if (window.gameState === "playing") {
    textFont("sans-serif"); 
    if (startBtn) startBtn.style.display = 'none';
    if (restartBtn) restartBtn.style.display = 'none';
    if (myImg) {
      image(myImg, 0, 0, width, height); // 캔버스 전체에 꽉차게
    } else {
      background(0); // 이미지 없을 때 기본 배경
    }
    // 공 업데이트 및 바닥에 닿았는지 검사
    if (myBall.update(false, paddle)) {
      /*gameState = "gameover";
      noLoop();
      if (restartBtn) restartBtn.style.display = 'block';*/

      window.isPlayerDead = true; 
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "player_dead" }));
      }
    }

    


    // 충돌 검사 및 블록/아이템 처리
    const hitIdx = myBall.checkCollision(blocks, activeItem);
    if (hitIdx !== -1) {
      // 충돌 사운드 재생
      playHitSound();
      /*blocks[hitIdx].hp--;
      if (blocks[hitIdx].hp <= 0) {
        // 아이템 생성 확률 (40%)
        if (Math.random() < 0.4) {
          const type = ["fire", "slow", "double", "penalty"][Math.floor(Math.random() * 4)];
          items.push(new Item(
            blocks[hitIdx].x + blocks[hitIdx].w/2,
            blocks[hitIdx].y + blocks[hitIdx].h/2,
            type
          ));
        }*/
        // 서버에 블록 파괴 알림
        sendBlockDestroyed(blocks[hitIdx].x, blocks[hitIdx].y, activeItem);
        
        //blocks.splice(hitIdx, 1);
        //score++; // 블록 제거 시 점수 증가
      
    }

    // 아이템 표시 및 획득 처리 (서버에서 받은 아이템 사용)
    if (window.sharedItems) {
      // 서버 아이템을 Item 객체로 변환
      const serverItems = window.sharedItems.map(itemData => {
        return {
          x: itemData.x,
          y: itemData.y,
          type: itemData.type,
          size: itemData.size,
          display: function() {
            try {
              if (itemImages && itemImages[this.type] && itemImages[this.type].width > 0) {
                push();
                tint(255, map(sin(millis() * 0.005), -1, 1, 100, 255)); // 깜빡임 효과
                image(itemImages[this.type], this.x - this.size/2, this.y - this.size/2, this.size, this.size);
                pop();
              } else {
                fill(255);
                textAlign(CENTER, CENTER);
                text(getEmoji(this.type), this.x, this.y);
              }
            } catch (e) {
              // 이미지 로드 실패 시 이모지 사용
              fill(255);
              textAlign(CENTER, CENTER);
              text(getEmoji(this.type), this.x, this.y);
            }
          }
        };
      });
      
      // 아이템 충돌 검사 및 획득
      for (let i = serverItems.length - 1; i >= 0; i--) {
        const item = serverItems[i];
        if (myBall.x > item.x - item.size/2 && myBall.x < item.x + item.size/2 &&
            myBall.y > item.y - item.size/2 && myBall.y < item.y + item.size/2) {
          
          // 아이템 획득 사운드 재생
          playItemSound();
          
          
          // 아이템 획득 서버에 전송
          sendItemCollected(item.x, item.y, item.type);
          
          // 기존 아이템 효과 해제
          if (activeItem) {
            console.log("기존 아이템 효과 해제:", activeItem);
            if (activeItem === "slow") {
              myBall.dx /= 0.5;
              myBall.dy /= 0.5;
            } else if (activeItem === "penalty") {
              paddle.w /= 0.5;
            } else if (activeItem === "double") {
              console.log("double 아이템 효과 해제");
            } else if (activeItem === "fire") {
              console.log("fire 아이템 효과 해제");
            }
          }
          
          // 새 아이템 효과 적용
          activeItem = item.type;
          console.log("새 아이템 효과 적용:", item.type);
          
          // 아이템 효과 직접 적용
          if (item.type === "slow") {
            myBall.dx *= 0.5;
            myBall.dy *= 0.5;
          } else if (item.type === "penalty") {
            paddle.w *= 0.5;
          } else if (item.type === "double") {
            // double 아이템은 점수 계산에서만 적용 (서버에서 처리)
            console.log("double 아이템 효과 적용 - 점수 2배");
          } else if (item.type === "fire") {
            // fire 아이템은 공이 블록을 통과하도록 적용 (ball.js에서 처리)
            console.log("fire 아이템 효과 적용 - 공이 블록 통과");
          }
          
          // 타이머 설정
          itemTimerRef.value = millis(); // 아이템 획득 시점 기록
          clearTimeout(itemTimerRef.current);
          itemTimerRef.current = setTimeout(() => {
            // 아이템 효과 해제
            if (activeItem === "slow") {
              myBall.dx /= 0.5;
              myBall.dy /= 0.5;
            } else if (activeItem === "penalty") {
              paddle.w /= 0.5;
            } else if (activeItem === "double") {
              console.log("double 아이템 효과 해제");
            } else if (activeItem === "fire") {
              console.log("fire 아이템 효과 해제");
            }
            activeItem = null;
            console.log("아이템 효과 종료:", item.type);
          }, 10000);
        }
      }
      
      // 아이템 표시
      serverItems.forEach(item => item.display());
    } else {
      // 기존 방식 (단일 플레이어용)
      updateItems(myBall, paddle, items, activeItem, (type) => { activeItem = type; }, itemTimerRef);
    }

    // 화면 요소 그리기
    myBall.display();
    paddle.display();

    // 상대방 패들 표시
    if (window.opponentPaddle) {
      push();
      translate(opponentPaddle.x, paddle.y);
      rotate(radians(opponentPaddle.angle));
      fill(window.opponentPaddle.color); // 상대방이 선택한 색상
  
      rectMode(CENTER);
      rect(0, 0, paddle.w, paddle.h);
      pop();
    }

    // 상대방 공 표시
    if (window.opponentBall) {
      push();
      fill(window.opponentBall.color); // 상대방이 선택한 색상
      ellipse(window.opponentBall.x, window.opponentBall.y, 20, 20);
      pop();
    }

    // 위치 정보 서버로 전송
    if (frameCount % 2 === 0) {
      sendBallPosition(myBall.x, myBall.y);
      sendPaddlePosition(paddle.x, paddle.angle);
    }

    /*const opp = getOpponentPose();
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
    }*/

    /*const oppBall = getOpponentBallPos();
    fill(255, 100, 255); // 분홍색 공
    ellipse(oppBall.x, oppBall.y, 20, 20);*/

    for (let block of blocks) block.display(blockImg1, blockImg2, blockImg3);

    /*if (millis() - lastBlockAddTime > blockAddInterval) {
      moveBlocksDown();
      addBlockRow();
      lastBlockAddTime = millis();
    }*/



    if (window.isPlayerDead) {
      push();
      noStroke();
      fill(0, 180); // (검정, 알파=180) → 더 진하게 어두워짐
      rect(0, 0, width, height);

      push();
      pop();
      fill(255, 50, 50);
      textSize(48);
      textAlign(CENTER, CENTER);
      text("🔥GAME OVER🔥", width / 2, height / 2);
    }

    // w() 내에서 score 표시
    fill(255);
    textSize(20);
    textAlign(LEFT, TOP);
    text(`내 점수: ${myScore}`, 10, 10);
    textAlign(RIGHT, TOP);
    text(`상대 점수: ${opponentScore}`, width-10, 10);

    // item 이름 표시
    if (activeItem) {
      // 아이템 효과 표시 (화면 위쪽 중앙)
      push();
      
      // 흰 배경 추가
      fill(255, 255, 255, 230);
      stroke(200, 200, 200);
      strokeWeight(1);
      rectMode(CENTER);
      rect(width/2, 50, 200, 80, 10);
      
      // 아이템 아이콘과 텍스트 (가운데 정렬)
      textSize(14);
      textAlign(CENTER, CENTER);
      fill(50, 50, 50); // 텍스트 색상을 어둡게
      text(getEmoji(activeItem), width/2, 40);
      
      // 남은 시간 표시
      const elapsedTime = millis() - itemTimerRef.value;
      const remainingTime = Math.max(0, 10 - Math.floor(elapsedTime / 1000));
      console.log("아이템 타이머:", { itemTimerRef: itemTimerRef.value, millis: millis(), elapsedTime, remainingTime });
      
      if (remainingTime > 0) {
        textSize(14);
        fill(0, 0, 0);
        text(`${remainingTime}초 남음`, width/2, 60);
      } else {
        textSize(14);
        fill(0, 0, 0);
        text(`효과 해제`, width/2, 60);
      }
      pop();
    }

    // 아이템 획득 알림 표시 (상단 작게)
    if (itemNotification && itemNotificationTimer > 0) {
      push();
      // 알림 박스 (상단 중앙)
      fill(255, 255, 255, 230);
      stroke(255, 215, 0);
      strokeWeight(2);
      rectMode(CENTER);
      rect(width/2, 50, 200, 60, 10);
      
      // 아이템 아이콘
      textSize(30);
      textAlign(CENTER, CENTER);
      text(getEmoji(itemNotification), width/2 - 40, 50);
      
      // 아이템 이름
      textSize(16);
      textFont(SansFontMedium);
      fill(50, 50, 50);
      text(`아이템 획득!`, width/2 + 20, 50);
      
      // 타이머 감소
      itemNotificationTimer--;
      if (itemNotificationTimer <= 0) {
        itemNotification = null;
      }
      pop();
    }

    checkBlockGameOver();
  }

  /*if (gameState === "gameover") {
    textFont("sans-serif"); 
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
  }*/


  if (window.gameState === "final_result") {
     background(30, 30, 30, 240);

    // 승리 여부에 따른 스타일
    let displayText;
    if (window.finalResultText === "승리!") displayText = "WIN!";
    else if (window.finalResultText === "패배...") displayText = "LOSE...";
    else displayText = "무승부";

    const isWin = displayText === "WIN!";
    const resultIcon = isWin ? "🏆" : (displayText === "LOSE..." ? "☠️" : "🤝");

    /*textFont(SansFontBold);  

    // 상단 타이틀
    fill(isWin ? 'gold' : (displayText === "LOSE..." ? 'red' : 'white'));
    textSize(44);
    textAlign(CENTER, CENTER);
    text(`${resultIcon} ${displayText} ${resultIcon}`, width / 2, height / 2 - 120);*/

    const loseColor = '#9e072dff';

    textFont(SansFontBold);  
    fill(isWin ? 'gold' : (displayText === "LOSE..." ? loseColor: 'white'));
    textSize(50);
    textAlign(CENTER, CENTER);
    text(displayText, width / 2, height / 2 - 140);

    // 🎨 이모지 (커스텀 폰트 적용 안함 → 시스템 폰트 사용)
    textFont('sans-serif'); 
    textSize(50);
    text(resultIcon, width / 2 - textWidth(displayText) / 2 - 55, height / 2 - 140);
    text(resultIcon, width / 2 + textWidth(displayText) / 2 + 55, height / 2 - 140);


    // 점수 패널 (박스)
    const panelWidth = 400;
    const panelHeight = 180;
    fill(50, 50, 50, 220);
    stroke(200);
    strokeWeight(3);
    rectMode(CENTER);
    rect(width / 2, height / 2 + 10, panelWidth, panelHeight, 20);

      textFont(SansFontMedium);
    // 내 점수
    fill('white');
    noStroke();
    textSize(28);
    textAlign(LEFT, CENTER);
    text("내 점수:", width / 2 - 150, height / 2 - 30);
    textAlign(RIGHT, CENTER);
    text(window.finalScores[window.myPlayerIndex], width / 2 + 150, height / 2 - 30);

    // 상대 점수
    textAlign(LEFT, CENTER);
    text("상대 점수:", width / 2 - 150, height / 2 + 35);
    textAlign(RIGHT, CENTER);
    text(window.finalScores[1 - window.myPlayerIndex], width / 2 + 150, height / 2 + 35);

    // 리플레이 버튼 안내
    if (restartBtn) {
    restartBtn.style.display = 'block';
    positionRestartButton();
  }

  if (window.opponentLeft) {
    fill(255); 
    textSize(14);
    textAlign(CENTER, TOP);
    text("상대방이 방을 나갔습니다", width / 2, height / 2 + 140);
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
      /*gameState = "gameover";
      if (restartBtn) restartBtn.style.display = 'block';
      noLoop();
      break;*/

      window.isPlayerDead = true;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "player_dead" }));
      }
      break;
    }
  }
}}