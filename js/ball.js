export class Ball {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = width / 2;
    this.y = height / 2;
    this.r = 10;
    this.dx = 4;
    this.dy = -4;
  }

  update(isGameOver, paddle) {
    if (isGameOver) return false;

    this.x += this.dx;
    this.y += this.dy;

    // 벽 반사
    if (this.x < this.r || this.x > width - this.r) this.dx *= -1;
    if (this.y < this.r) this.dy *= -1;

    // 바닥 → 게임 오버 처리
    if (this.y > height) {
      return true; // 바닥에 닿았음을 알림
    }

    // 패들 충돌
    if (
      this.y + this.r > paddle.y - paddle.h / 2 &&
      this.x > paddle.x - paddle.w / 2 &&
      this.x < paddle.x + paddle.w / 2
    ) {
      this.dy *= -1;
    }
    return false;
  }


  display() {
    fill(255);
    ellipse(this.x, this.y, this.r * 2);
  }

  checkCollision(blocks, activeItem) {
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
          this.dy *= -1;  // ← 여기 수정!
        }

        b.hp--;
        b.hitRecently = true;
        setTimeout(() => b.hitRecently = false, 100);

        if (b.hp <= 0) {
          blocks.splice(i, 1);
        }

        if (activeItem !== "fire") break;
      }
    }
  }
}

}

