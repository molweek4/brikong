
function initBlocks() {
  blocks = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 8; c++) {
      let hp = floor(random(1, 4)); // 강화 블록용
      blocks.push(new Block(70 * c + 35, 40 * r + 40, hp));
    }
  }
}

function displayBlocks() {
  for (let b of blocks) {
    b.display();
  }
}
