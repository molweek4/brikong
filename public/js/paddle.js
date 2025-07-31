export class Paddle {
  constructor(color = "red") {
    this.x = width / 2;
    this.y = height - 80; // 더 위로 이동 (60 → 80)
    this.w = 100;
    this.h = 15;
    this.angle = 0;
    this.color = color;
  }

  display() {
    push(); //회전 전 상태 저장
    translate(this.x, this.y);
    rotate(radians(this.angle));
    fill(this.color);
    rectMode(CENTER);
    rect(0, 0, this.w, this.h);
    pop();
  }

  /*update(activeItem) {
    // 키보드로 테스트 (←/→)
    if (keyIsDown(LEFT_ARROW)) this.move(-2, activeItem);
    if (keyIsDown(RIGHT_ARROW)) this.move(2, activeItem);
  }

  move(dir, activeItem) {
    let speed = 7;
    if (activeItem === "penalty") dir *= -1;
    this.x += dir * speed;
    this.x = constrain(this.x, this.w / 2, width - this.w / 2);
  }*/

  applyPoseControl(poseInfo){
    const minX = this.w / 2;
    const maxX = width - this.w/2;


    let centerRatio = 0.5;
    let amplify = 2; // 1.0이면 그대로, 1.5면 더 민감하게

    let offset = (poseInfo.noseRatio - centerRatio) * amplify;
    offset = Math.max(-0.5, Math.min(0.5, offset)); // 안정성

    let amplifiedRatio = centerRatio + offset;
    this.x = minX + amplifiedRatio * (maxX - minX);
    //this.x = minX + poseInfo.noseRatio * (maxX - minX);

    this.angle = lerp(this.angle, poseInfo.paddleAngle, 0.2);
  }
}
