// CDN 방식으로 TensorFlow 사용
let detector = null; //movenet 모델 인스턴스 
let video = null;
let prevNoseRatio = 0.5;
let prevPaddleAngle = 0;

let handDetector = null;
let lastHandCheck = 0;
const HAND_INTERVAL = 200; // 0.2초마다 체크


function interpretPose(keypoints){
    const result = {
        noseRatio: 0.5,
        paddleAngle: 0
    };

    // 좌우 위치
    const nose = keypoints.find(k => k.name === "nose");

    /*if (nose && nose.score > 0.4) {
        // 코의 x 위치를 캔버스 너비 640 기준으로 정규화 (0~1)
        const normalized = Math.min(Math.max(nose.x / 640, 0), 1);
        result.noseRatio = 1 - normalized;
        prevNoseRatio = result.noseRatio;
    }*/

    
    if (nose && nose.score > 0.4) {
        const normalized = Math.min(Math.max(nose.x / 640, 0), 1);
        const rawNoseRatio = 1 - normalized;

        //  보간 처리: 이전 값과 새 값을 부드럽게 섞음
        const smoothed = prevNoseRatio * (1 - 0.2) + rawNoseRatio * 0.2;
        result.noseRatio = smoothed;
        prevNoseRatio = smoothed;
    } else {
        // 추적 실패 시 이전 값 유지
        result.noseRatio = prevNoseRatio;
    }

    const leftEye = keypoints.find(k => k.name === "left_eye");
    const rightEye = keypoints.find(k => k.name === "right_eye");

    if (leftEye && rightEye && leftEye.score > 0.4 && rightEye.score > 0.4) {
        const dx = leftEye.x - rightEye.x;
        const dy = leftEye.y - rightEye.y;

        const angleRad = Math.atan2(dy, dx);
        const angleDeg = angleRad * (180 / Math.PI);

        result.paddleAngle = constrain(-angleDeg, -30, 30);
        prevPaddleAngle = result.paddleAngle;
    } else {
        result.paddleAngle = prevPaddleAngle;
    }

    return result;
}

export async function initPoseManager(onPoseUpdate) {
  await tf.setBackend('webgl');
  console.log("Loading pose...");
  
  if (!video) {
    video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.width = 640;
    video.height = 480;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480},
      audio: false
    });
    video.srcObject = stream;
    await video.play();
  }

  // 2. MoveNet 모델 로딩
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
    }
  );

  // 3. 실시간 포즈 추적
  detectLoop(onPoseUpdate);
}


export async function initHandDetector(onUltimate) {
  if (!video) {
    throw new Error("PoseManager must be initialized first");
  }
  console.log("Loading Handpose...");
  handDetector = await handpose.load();
  console.log("Handpose model loaded successfully!");

  detectHandLoop(onUltimate);
}

function isVGesture(predictions){
  if(predictions.length === 0)return false;

  const landmarks = predictions[0].landmarks;

  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  const indexMiddleDist = Math.hypot(
    indexTip[0] - middleTip[0],
    indexTip[1] - middleTip[1]
  )

  return indexMiddleDist > 50 &&
         ringTip[1] > indexTip[1] &&
         pinkyTip[1] > middleTip[1];
}

async function detectLoop(onPoseUpdate) {
  async function frame() {
    const poses = await detector.estimatePoses(video);

    if (poses.length > 0) {
      const keypoints = poses[0].keypoints;
      
      // 이후 inputBridge로 전달할 정보
      if (onPoseUpdate) {
        const interpreted = interpretPose(keypoints);
        onPoseUpdate(interpreted);
      }
    }

    requestAnimationFrame(frame);
  }

  frame();
}

async function detectHandLoop(onUltimate) {
  async function frame(timestamp) {
    if (timestamp - lastHandCheck > HAND_INTERVAL) {
      const predictions = await handDetector.estimateHands(video);
      if (isVGesture(predictions) && onUltimate) {
        onUltimate();
      }
      lastHandCheck = timestamp;
    }
    requestAnimationFrame(frame);
  }
  frame();
}