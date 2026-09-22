// 肩と上半身の捻りを Pose で動かす追加機能。
// face-tracking.js とは独立したファイルにしているので、
// 不要になれば pose-tracking.js / vrm-arm-pose.js を削除し、
// main.js / index.html の該当箇所を戻すだけで元の顔トラッキングのみの状態に戻せる。
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const MEDIAPIPE_WASM_BASE = new URL('../../vendor/@mediapipe/tasks-vision/wasm', import.meta.url).toString();
const MEDIAPIPE_MODEL_ASSET = new URL(
  '../../vendor/@mediapipe/models/pose_landmarker.task',
  import.meta.url,
).toString();

// BlazePose（MediaPipe Pose）のランドマーク番号
const LANDMARK_INDEX = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftHip: 23,
  rightHip: 24,
};

export const DEFAULT_ARM_FRAME = {
  detected: false,
  left: { shoulderDeg: 0 },
  right: { shoulderDeg: 0 },
  twistRad: 0,
};

const SMOOTHING = {
  shoulder: 0.12,
  twist: 0.08,
};

// 捻りは絶対値ではなく「トラッキング開始時の向き」からの相対角度で扱う。
// z の基準値は人やカメラの位置によって変わるため、キャリブレーションが必要。
let twistRestAngle = null;

export function resetTwistCalibration() {
  twistRestAngle = null;
}

export async function createPoseDetector() {
  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE);
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MEDIAPIPE_MODEL_ASSET },
    numPoses: 1,
    runningMode: 'VIDEO',
  });
}

export function getSmoothedArmFrame({ detector, video, now, currentFrame }) {
  if (!detector || !isVideoReady(video)) {
    return smoothFrame(currentFrame, DEFAULT_ARM_FRAME);
  }

  try {
    const result = detector.detectForVideo(video, now);
    const landmarks = result.landmarks?.[0];
    const nextFrame = landmarks ? analyzeLandmarks(landmarks) : DEFAULT_ARM_FRAME;
    return smoothFrame(currentFrame, nextFrame);
  } catch {
    return smoothFrame(currentFrame, DEFAULT_ARM_FRAME);
  }
}

function isVideoReady(video) {
  return (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0 &&
    !video.paused &&
    !video.ended
  );
}

function analyzeLandmarks(landmarks) {
  const leftShoulder = landmarks[LANDMARK_INDEX.leftShoulder];
  const rightShoulder = landmarks[LANDMARK_INDEX.rightShoulder];
  const leftElbow = landmarks[LANDMARK_INDEX.leftElbow];
  const rightElbow = landmarks[LANDMARK_INDEX.rightElbow];
  const leftHip = landmarks[LANDMARK_INDEX.leftHip];
  const rightHip = landmarks[LANDMARK_INDEX.rightHip];

  if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || !leftHip || !rightHip) {
    return DEFAULT_ARM_FRAME;
  }

  return {
    detected: true,
    left: {
      // 肩(頂点)から見た「腰方向」と「ひじ方向」のなす角。
      // 腕を体の横に下ろすと小さく、水平に上げると90°付近、真上に上げると180°に近づく。
      shoulderDeg: angleAt(leftHip, leftShoulder, leftElbow),
    },
    right: {
      shoulderDeg: angleAt(rightHip, rightShoulder, rightElbow),
    },
    twistRad: calculateTwist(leftShoulder, rightShoulder),
  };
}

// 左肩→右肩の向きを「画面のx」と「奥行きのz」の平面で見て、
// カメラの正面から見た肩ラインの回転（=体の捻り）を推定する。
// 単眼カメラのzは精度が高くないため、大まかな捻り検出として扱う。
function calculateTwist(leftShoulder, rightShoulder) {
  const dx = leftShoulder.x - rightShoulder.x;
  const dz = leftShoulder.z - rightShoulder.z;
  const rawAngle = Math.atan2(dz, dx);

  if (twistRestAngle === null) {
    twistRestAngle = rawAngle;
    return 0;
  }

  return normalizeAngle(rawAngle - twistRestAngle);
}

function normalizeAngle(angle) {
  let a = angle % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

function angleAt(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (mag === 0) return 0;
  const cos = Math.min(1, Math.max(-1, dot / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

function smoothFrame(current, next) {
  if (!next.detected) {
    return {
      detected: false,
      left: { shoulderDeg: lerp(current.left.shoulderDeg, 0, SMOOTHING.shoulder) },
      right: { shoulderDeg: lerp(current.right.shoulderDeg, 0, SMOOTHING.shoulder) },
      twistRad: lerp(current.twistRad, 0, SMOOTHING.twist),
    };
  }

  return {
    detected: true,
    left: { shoulderDeg: lerp(current.left.shoulderDeg, next.left.shoulderDeg, SMOOTHING.shoulder) },
    right: { shoulderDeg: lerp(current.right.shoulderDeg, next.right.shoulderDeg, SMOOTHING.shoulder) },
    twistRad: lerp(current.twistRad, next.twistRad, SMOOTHING.twist),
  };
}

function lerp(from, to, amount) {
  return from + (to - from) * amount;
}
