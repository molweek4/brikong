export class Block {
  constructor(x, y, hp = 1) {
    this.x = x;
    this.y = y;
    this.w = 60;
    this.h = 20;
    this.hp = hp; // 체력
  }

  hit() {
    this.hp--;
    return this.hp <= 0;
  }

  display() {
    // 체력에 따라 색상 조정
    if (this.hp === 3) fill(180, 0, 0);         // 빨강
    else if (this.hp === 2) fill(255, 120, 0);  // 주황
    else fill(255, 200, 0);                     // 노랑

    rect(this.x, this.y, this.w, this.h, 4);

    // 체력 수치 텍스트 표시 (선택)
    fill(0);
    textSize(12);
    textAlign(CENTER, CENTER);
    text(this.hp, this.x + this.w / 2, this.y + this.h / 2);
  }
}
