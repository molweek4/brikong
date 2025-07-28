export class Paddle {
  constructor() {
    this.x = width / 2;
    this.y = height - 40;
    this.w = 100;
    this.h = 15;
    this.animationFrame = 0;
    this.frameCount = 0;
  }

  display(characterImg) {
    if (characterImg) {
      // GIF 애니메이션은 자동으로 재생됨
      imageMode(CENTER);
      image(characterImg, this.x, this.y, 60, 60);
      
      // 패들을 캐릭터 중앙보다 조금 위에 그리기
      fill(255);
      rectMode(CENTER);
      rect(this.x, this.y - 20, this.w, this.h);
    } else {
      // 기본 패들 (이미지가 없을 때)
      fill(255);
      rectMode(CENTER);
      rect(this.x, this.y, this.w, this.h);
    }
  }

  update(activeItem) {
    if (keyIsDown(LEFT_ARROW)) this.move(-1.5, activeItem);
    if (keyIsDown(RIGHT_ARROW)) this.move(1.5, activeItem);
  }

  move(dir, activeItem) {
    let speed = 7;
    if (activeItem === "penalty") dir *= -1;
    this.x += dir * speed;
    this.x = constrain(this.x, this.w / 2, width - this.w / 2);
  }

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
