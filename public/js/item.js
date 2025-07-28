const ITEM_TYPES = ["fire", "slow", "double", "penalty"];
let activeItem = null;
let itemTimer = 0;

// 아이템 타입별 이모지 반환 함수
export function getEmoji(type) {
  switch (type) {
    case "fire": return "🔥";
    case "slow": return "⏱️";
    case "double": return "🧱";
    case "penalty": return "🚫";
    default: return "?";
  }
}

export class Item {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.size = 40; // 아이템 크기 증가
    this.blinkPhase = random(0, TWO_PI);
  }

  display(itemImages) {
    if (itemImages && itemImages[this.type]) {
      // GIF 이미지가 있으면 사용
      image(itemImages[this.type], this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    } else {
      // 이모지 사용
      let alpha = map(sin(this.blinkPhase + millis() * 0.005), -1, 1, 100, 255);
      fill(255, alpha);
      textAlign(CENTER, CENTER);
      textSize(this.size);
      text(getEmoji(this.type), this.x, this.y);
    }
  }

  isCaught(ball) {
    return dist(this.x, this.y, ball.x, ball.y) < (this.size + ball.r) / 2;
  }
}

// 아이템 효과 적용 및 해제
export function updateItemEffect(activeItem, itemTimer, ball, paddle, setActiveItem) {
  if (activeItem && millis() - itemTimer > 10000) {
    if (activeItem === "slow") {
      ball.dx *= 2;
      ball.dy *= 2;
    } else if (activeItem === "penalty") {
      paddle.w *= 2;
    }
    setActiveItem(null);
  }
}

// 아이템 획득 및 표시
export function updateItems(ball, paddle, items, activeItem, setActiveItem, itemTimerRef, itemImages) {
  for (let i = items.length - 1; i >= 0; i--) {
    let it = items[i];
    it.display(itemImages);
    if (it.isCaught(ball)) {
      // 기존 효과 해제
      if (activeItem) {
        if (activeItem === "slow") {
          ball.dx *= 2;
          ball.dy *= 2;
        } else if (activeItem === "penalty") {
          paddle.w *= 2;
        }
      }
      // 새 효과 적용
      if (it.type === "slow") {
        ball.dx *= 0.5;
        ball.dy *= 0.5;
      } else if (it.type === "penalty") {
        paddle.w *= 0.5;
      }
      setActiveItem(it.type);
      itemTimerRef.value = millis();
      items.splice(i, 1);
    }
  }
}
