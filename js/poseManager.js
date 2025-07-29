import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

let detector = null; //movenet 모델 인스턴스 
let video = null;
let prevNoseRatio = 0.5;
let prevPaddleAngle = 0;


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

        // 보간 처리: 이전 값과 새 값을 부드럽게 섞음
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
  await tf.setBackend('webgl'); // GPU 사용

  video = document.createElement('video');
  video.setAttribute('autoplay', '');
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.width = 640;
  video.height = 480;

  // 1. 카메라 연결
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 },
    audio: false
  });
  video.srcObject = stream;
  await video.play();

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
