export class Block {
  constructor(x, y, hp = 1) {
    this.x = x;
    this.y = y;
    this.w = 60;
    this.h = 20;
    this.hp = hp;
  }

  hit() {
    this.hp--;
    return this.hp <= 0;
  }

  display(blockImg1, blockImg2, blockImg3) {
    // 체력에 따라 이미지 선택
    let img;
    if (this.hp === 3) img = blockImg3;
    else if (this.hp === 2) img = blockImg2;
    else img = blockImg1;

    if (img) {
      // 이미지로 블록 그리기
      image(img, this.x, this.y, this.w, this.h);
    } else {
      // 이미지가 없을 때 기본 색상 사각형
      if (this.hp === 3) fill(180, 0, 0);         // 빨강
      else if (this.hp === 2) fill(255, 120, 0);  // 주황
      else fill(255, 200, 0);                     // 노랑
      rect(this.x, this.y, this.w, this.h, 8);
    }

    // 체력 수치 텍스트
    fill(0);
    textSize(12);
    textAlign(CENTER, CENTER);
    text(this.hp, this.x + this.w / 2, this.y + this.h / 2 + 2);

    // 👀 눈 이모지 추가 (블럭 위에 표시)
    textSize(16);
    text("👀", this.x + this.w / 2, this.y + this.h / 2 - 10);
  }
}
