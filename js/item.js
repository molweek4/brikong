const ITEM_TYPES = ["fire", "slow", "double", "penalty"];
let items = [];
let activeItem = null;
let itemTimer = 0;

export class Item {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.size = 24;
    this.blinkPhase = random(0, TWO_PI);
  }

  display() {
    let alpha = map(sin(this.blinkPhase + millis() * 0.005), -1, 1, 100, 255);
    fill(255, alpha);
    textAlign(CENTER, CENTER);
    textSize(this.size);
    text(this.getEmoji(), this.x, this.y);
  }

  getEmoji() {
    switch (this.type) {
      case "fire": return "🔥";
      case "slow": return "⏱️";
      case "double": return "🧱";
      case "penalty": return "🚫";
      default: return "?";
    }
  }

  isCaught(ball) {
    return dist(this.x, this.y, ball.x, ball.y) < (this.size + ball.r) / 2;
  }
}

export function activateItem(type) {
  if (activeItem) return;
  activeItem = type;
  itemTimer = millis();

  if (type === "slow") {
    ball.dx *= 0.5;
    ball.dy *= 0.5;
  } else if (type === "penalty") {
    paddle.w *= 0.5;
  }

  console.log("아이템 발동:", type);
}

export function updateItemEffect() {
  if (activeItem && millis() - itemTimer > 10000) {
    if (activeItem === "slow") {
      ball.dx *= 2;
      ball.dy *= 2;
    } else if (activeItem === "penalty") {
      paddle.w *= 2;
    }

    activeItem = null;
  }
}

export function updateItems(ball) {
  for (let i = items.length - 1; i >= 0; i--) {
    let it = items[i];
    it.display();

    if (it.isCaught(ball)) {
      if (!activeItem) {
        activateItem(it.type);
        items.splice(i, 1);
      }
    }
  }

  updateItemEffect();
}
