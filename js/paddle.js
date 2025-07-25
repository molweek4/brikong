export class Paddle {
  constructor() {
    this.x = width / 2;
    this.y = height - 40;
    this.w = 100;
    this.h = 15;
  }

  display() {
    fill(255);
    rectMode(CENTER);
    rect(this.x, this.y, this.w, this.h);
  }

  update(activeItem) {
    // 키보드로 테스트 (←/→)
    if (keyIsDown(LEFT_ARROW)) this.move(-1);
    if (keyIsDown(RIGHT_ARROW)) this.move(1);
  }

  move(dir, activeItem) {
    let speed = 7;
    if (activeItem === "penalty") dir *= -1;
    this.x += dir * speed;
    this.x = constrain(this.x, this.w / 2, width - this.w / 2);
  }
}
