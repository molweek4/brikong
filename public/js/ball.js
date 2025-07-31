export class Ball {
  constructor(color = "white") {
    this.color = color;
    this.reset();
  }

  reset() {
    this.x = width / 2;
    this.y = height / 2;
    this.r = 10;
    this.dx = 2.5; // 속도 감소
    this.dy = -2.5; // 속도 감소
  }

  update(isGameOver, paddle) {
    if (isGameOver) return false;

    this.x += this.dx;
    this.y += this.dy;

    // 벽 반사
    if (this.x < this.r || this.x > width - this.r) this.dx *= -1;
    if (this.y < this.r) this.dy *= -1;

    // 바닥 → 게임 오버 처리
    if (this.y - this.r > height) {

      return true; // 바닥에 닿았음을 알림
    }

    // 패들 충돌
    /*if (
      this.y + this.r > paddle.y - paddle.h / 2 &&
      this.x > paddle.x - paddle.w / 2 &&
      this.x < paddle.x + paddle.w / 2
    ) {
      this.dy *= -1;
    }*/

    //패들 충돌
    if (
      this.y + this.r > paddle.y - paddle.h / 2 &&
      this.x > paddle.x - paddle.w / 2 &&
      this.x < paddle.x + paddle.w / 2 &&
      this.dy > 0 // 아래쪽으로 떨어질 때만
    ) {
      // 패들 충돌 사운드 재생
      if (window.playPaddleSound) {
        window.playPaddleSound();
      }
      
      // 패들의 회전 각도 (단위: 도 → 라디안)
      const angleRad = radians(paddle.angle);

      // 기존 속도를 회전된 좌표계로 변환
      const speed = Math.sqrt(this.dx ** 2 + this.dy ** 2);

      // 새로운 반사 방향 계산
      const newDx = speed * Math.sin(angleRad);
      const newDy = -Math.abs(speed * Math.cos(angleRad)); // 위로 튕겨야 하므로 -

      this.dx = newDx;
      this.dy = newDy;

      this.y = paddle.y - paddle.h / 2 - this.r;
    }
    return false;
  }


  display() {
    fill(this.color);
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
          sendBlockDestroyed(b.x, b.y);
        }
        if (activeItem !== "fire") break;
      }
    }
  }
}

}

