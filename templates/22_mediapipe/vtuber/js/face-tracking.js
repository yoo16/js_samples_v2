import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const MEDIAPIPE_WASM_BASE = new URL('../../vendor/@mediapipe/tasks-vision/wasm', import.meta.url).toString();
const MEDIAPIPE_MODEL_ASSET = new URL(
  '../../vendor/@mediapipe/models/face_landmarker.task',
  import.meta.url,
).toString();

const LANDMARK_INDEX = {
  leftEyeOuter: 33,
  leftEyeInner: 133,
  rightEyeOuter: 263,
  rightEyeInner: 362,
  noseTip: 1,
  forehead: 10,
  chin: 152,
  leftCheek: 234,
  rightCheek: 454,
  upperLip: 13,
  lowerLip: 14,
  mouthLeftCorner: 61,
  mouthRightCorner: 291,
  leftEyeUpperPoints: [159, 158, 157],
  leftEyeLowerPoints: [145, 144, 153],
  rightEyeUpperPoints: [386, 385, 384],
  rightEyeLowerPoints: [374, 373, 380],
};

const LIMITS = {
  yaw: Math.PI / 5,
  pitch: Math.PI / 6,
  roll: Math.PI / 6,
};

export const DEFAULT_FRAME = {
  detected: false,
  head: { yaw: 0, pitch: 0, roll: 0 },
  eyes: { leftBlink: 0, rightBlink: 0 },
  mouth: { open: 0, aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 },
};

// 「あ・い・う・え・お」を口の「開き具合(openness)」と「すぼまり具合(roundness)」の
// 2軸平面上の代表点として定義し、実測値との近さで各母音の重みを出す。
// この平面上の位置は一般的な口形の目安であり、人やカメラ角度によって多少ずれる。
const VOWEL_SHAPES = {
  aa: { openness: 0.9, roundness: 0.4 }, // あ: 大きく開く、横幅は普通
  ih: { openness: 0.15, roundness: 0.05 }, // い: 狭く開く、横に引く
  ou: { openness: 0.2, roundness: 0.85 }, // う: 狭く開く、すぼめる
  ee: { openness: 0.4, roundness: 0.15 }, // え: 中程度に開く、横に引く
  oh: { openness: 0.55, roundness: 0.7 }, // お: 中〜大きく開く、すぼめる
};
// 値が小さいほど母音の境界がくっきり、大きいほどなだらかに混ざる。
const VOWEL_SOFTNESS = 0.35;

const SMOOTHING = {
  head: 0.22,
  blink: 0.42,
  mouth: 0.32,
};

// カメラやVRMの設置が正面から傾いている場合の手動補正。
// 「基準姿勢セット」が押されたタイミングの頭の向きを基準(0)として、以降はその差分を使う。
let headOffset = { yaw: 0, pitch: 0, roll: 0 };
let calibratingHead = false;

export function resetHeadCalibration() {
  calibratingHead = true;
}

export async function createFaceDetector() {
  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE);
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MEDIAPIPE_MODEL_ASSET,
    },
    numFaces: 1,
    runningMode: 'VIDEO',
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });
}

export async function startCameraStream(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user',
    },
    audio: false,
  });
  // TODO: video 要素にカメラの映像 stream を設定して再生: video.srcObject, video.play()

}

export function getSmoothedFaceFrame({ detector, video, now, currentFrame }) {
  if (!detector || !isVideoReady(video)) {
    return smoothFrame(currentFrame, DEFAULT_FRAME);
  }

  try {
    // TODO: 動画フレームから顔ランドマークを検出: detector.detectForVideo(): 引数: video, now
    const result = { faceLandmarks: [] };
    const landmarks = result.faceLandmarks[0];
    const nextFrame = landmarks ? analyzeLandmarks(landmarks) : DEFAULT_FRAME;
    return smoothFrame(currentFrame, nextFrame);
  } catch {
    return smoothFrame(currentFrame, DEFAULT_FRAME);
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
  return {
    detected: true,
    head: calculateHeadRotation(landmarks),
    eyes: {
      leftBlink: calculateEyeBlink(
        landmarks,
        LANDMARK_INDEX.leftEyeUpperPoints,
        LANDMARK_INDEX.leftEyeLowerPoints,
        LANDMARK_INDEX.leftEyeOuter,
        LANDMARK_INDEX.leftEyeInner,
      ),
      rightBlink: calculateEyeBlink(
        landmarks,
        LANDMARK_INDEX.rightEyeUpperPoints,
        LANDMARK_INDEX.rightEyeLowerPoints,
        LANDMARK_INDEX.rightEyeOuter,
        LANDMARK_INDEX.rightEyeInner,
      ),
    },
    mouth: calculateMouthShape(landmarks),
  };
}

function calculateHeadRotation(landmarks) {
  const leftEye = landmarks[LANDMARK_INDEX.leftEyeOuter];
  const rightEye = landmarks[LANDMARK_INDEX.rightEyeOuter];
  const noseTip = landmarks[LANDMARK_INDEX.noseTip];
  const forehead = landmarks[LANDMARK_INDEX.forehead];
  const chin = landmarks[LANDMARK_INDEX.chin];
  const leftCheek = landmarks[LANDMARK_INDEX.leftCheek];
  const rightCheek = landmarks[LANDMARK_INDEX.rightCheek];

  if (!leftEye || !rightEye || !noseTip || !forehead || !chin || !leftCheek || !rightCheek) {
    return DEFAULT_FRAME.head;
  }

  const eyesMidpointY = (leftEye.y + rightEye.y) / 2;
  const faceHeight = Math.abs(chin.y - forehead.y);
  const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
  const yawBase = (leftCheek.x + rightCheek.x) / 2;
  const yawScale = Math.max(faceWidth * 0.5, Number.EPSILON);
  const pitchScale = Math.max(faceHeight * 0.5, Number.EPSILON);

  const rawYaw = ((yawBase - noseTip.x) / yawScale) * LIMITS.yaw;
  const rawPitch = ((eyesMidpointY - noseTip.y) / pitchScale) * LIMITS.pitch;
  // TODO: 両目を結ぶ線の傾き（roll）を計算: Math.atan2(y の差, x の差)。右目 - 左目
  const rawRoll = 0;

  if (calibratingHead) {
    headOffset = { yaw: rawYaw, pitch: rawPitch, roll: rawRoll };
    calibratingHead = false;
  }

  return {
    yaw: clamp(rawYaw - headOffset.yaw, -LIMITS.yaw, LIMITS.yaw),
    pitch: clamp(rawPitch - headOffset.pitch, -LIMITS.pitch, LIMITS.pitch),
    roll: clamp(rawRoll - headOffset.roll, -LIMITS.roll, LIMITS.roll),
  };
}

function calculateEyeBlink(landmarks, upperIndices, lowerIndices, outerIndex, innerIndex) {
  const upper = averageLandmark(landmarks, upperIndices);
  const lower = averageLandmark(landmarks, lowerIndices);
  const outer = landmarks[outerIndex];
  const inner = landmarks[innerIndex];

  if (!upper || !lower || !outer || !inner) {
    return 0;
  }

  // TODO: 目の高さ（upper と lower の距離）を計算: distance2D()
  const eyeHeight = 0;
  // TODO: 目の幅（outer と inner の距離）を計算: distance2D()
  const eyeWidth = 0;
  if (eyeWidth <= 0) {
    return 0;
  }

  return clamp(1 - normalize(eyeHeight / eyeWidth, 0.16, 0.3), 0, 1);
}

function calculateMouthShape(landmarks) {
  const upperLip = landmarks[LANDMARK_INDEX.upperLip];
  const lowerLip = landmarks[LANDMARK_INDEX.lowerLip];
  const forehead = landmarks[LANDMARK_INDEX.forehead];
  const chin = landmarks[LANDMARK_INDEX.chin];
  const leftCheek = landmarks[LANDMARK_INDEX.leftCheek];
  const rightCheek = landmarks[LANDMARK_INDEX.rightCheek];
  const mouthLeft = landmarks[LANDMARK_INDEX.mouthLeftCorner];
  const mouthRight = landmarks[LANDMARK_INDEX.mouthRightCorner];

  if (
    !upperLip || !lowerLip || !forehead || !chin || !leftCheek || !rightCheek || !mouthLeft || !mouthRight
  ) {
    return DEFAULT_FRAME.mouth;
  }

  const faceSize = distance2D(forehead, chin);
  const faceWidth = distance2D(leftCheek, rightCheek);
  if (faceSize <= 0 || faceWidth <= 0) {
    return DEFAULT_FRAME.mouth;
  }

  // TODO: 口の開き具合: 上唇と下唇の距離 ÷ 顔の大きさ を normalize(値, 0.015, 0.12) で 0〜1 に変換
  const openness = 0;
  const widthRatio = distance2D(mouthLeft, mouthRight) / faceWidth;
  const roundness = 1 - normalize(widthRatio, 0.38, 0.62);

  return { open: openness, ...vowelWeights(openness, roundness) };
}

// openness/roundnessの実測点が、各母音の代表点にどれだけ近いかで配分比率を決め、
// その比率で「開き具合(openness)」を5母音に振り分ける。
// こうすることで、口の開き量そのもの(=元のAaだけだった時の反応の大きさ)は必ず維持しつつ、
// どの母音に近いかで配分先を変えられる。
function vowelWeights(openness, roundness) {
  const point = { openness, roundness };
  const scores = {
    aa: vowelScore(point, VOWEL_SHAPES.aa),
    ih: vowelScore(point, VOWEL_SHAPES.ih),
    ou: vowelScore(point, VOWEL_SHAPES.ou),
    ee: vowelScore(point, VOWEL_SHAPES.ee),
    oh: vowelScore(point, VOWEL_SHAPES.oh),
  };
  const total = scores.aa + scores.ih + scores.ou + scores.ee + scores.oh;

  return {
    aa: (scores.aa / total) * openness,
    ih: (scores.ih / total) * openness,
    ou: (scores.ou / total) * openness,
    ee: (scores.ee / total) * openness,
    oh: (scores.oh / total) * openness,
  };
}

function vowelScore(point, reference) {
  const d2 = (point.openness - reference.openness) ** 2 + (point.roundness - reference.roundness) ** 2;
  return 1 / (d2 + VOWEL_SOFTNESS);
}

function smoothFrame(current, next) {
  if (!next.detected) {
    return {
      detected: false,
      head: {
        yaw: lerp(current.head.yaw, 0, SMOOTHING.head),
        pitch: lerp(current.head.pitch, 0, SMOOTHING.head),
        roll: lerp(current.head.roll, 0, SMOOTHING.head),
      },
      eyes: {
        leftBlink: lerp(current.eyes.leftBlink, 0, SMOOTHING.blink),
        rightBlink: lerp(current.eyes.rightBlink, 0, SMOOTHING.blink),
      },
      mouth: lerpMouth(current.mouth, DEFAULT_FRAME.mouth, SMOOTHING.mouth),
    };
  }

  return {
    detected: true,
    head: {
      yaw: lerp(current.head.yaw, next.head.yaw, SMOOTHING.head),
      pitch: lerp(current.head.pitch, next.head.pitch, SMOOTHING.head),
      roll: lerp(current.head.roll, next.head.roll, SMOOTHING.head),
    },
    eyes: {
      leftBlink: clamp(lerp(current.eyes.leftBlink, next.eyes.leftBlink, SMOOTHING.blink), 0, 1),
      rightBlink: clamp(lerp(current.eyes.rightBlink, next.eyes.rightBlink, SMOOTHING.blink), 0, 1),
    },
    mouth: lerpMouth(current.mouth, next.mouth, SMOOTHING.mouth),
  };
}

function lerpMouth(current, next, amount) {
  return {
    open: clamp(lerp(current.open, next.open, amount), 0, 1),
    aa: clamp(lerp(current.aa, next.aa, amount), 0, 1),
    ih: clamp(lerp(current.ih, next.ih, amount), 0, 1),
    ou: clamp(lerp(current.ou, next.ou, amount), 0, 1),
    ee: clamp(lerp(current.ee, next.ee, amount), 0, 1),
    oh: clamp(lerp(current.oh, next.oh, amount), 0, 1),
  };
}

function averageLandmark(landmarks, indices) {
  const points = indices.map((index) => landmarks[index]).filter(Boolean);
  if (points.length === 0) {
    return null;
  }

  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    z: points.reduce((sum, point) => sum + point.z, 0) / points.length,
  };
}

function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalize(value, min, max) {
  if (max === min) {
    return 0;
  }
  return clamp((value - min) / (max - min), 0, 1);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// 線形補間: from から to へ amount（0〜1）の割合だけ近づけた値を返す
function lerp(from, to, amount) {
  // TODO: from + (to - from) * amount を返す（今は to をそのまま返すので動きがガタつく）
  return to;
}
