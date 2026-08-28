import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const MEDIAPIPE_WASM_BASE = new URL('../vendor/@mediapipe/tasks-vision/wasm', import.meta.url).toString();
const MEDIAPIPE_MODEL_ASSET =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

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
  mouth: { open: 0 },
};

const SMOOTHING = {
  head: 0.22,
  blink: 0.42,
  mouth: 0.32,
};

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
  video.srcObject = stream;
  await video.play();
}

export function getSmoothedFaceFrame({ detector, video, now, currentFrame }) {
  if (!detector || !isVideoReady(video)) {
    return smoothFrame(currentFrame, DEFAULT_FRAME);
  }

  try {
    const result = detector.detectForVideo(video, now);
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
    mouth: {
      open: calculateMouthOpen(landmarks),
    },
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

  return {
    yaw: clamp(((yawBase - noseTip.x) / yawScale) * LIMITS.yaw, -LIMITS.yaw, LIMITS.yaw),
    pitch: clamp(((eyesMidpointY - noseTip.y) / pitchScale) * LIMITS.pitch, -LIMITS.pitch, LIMITS.pitch),
    roll: clamp(Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x), -LIMITS.roll, LIMITS.roll),
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

  const eyeHeight = distance2D(upper, lower);
  const eyeWidth = distance2D(outer, inner);
  if (eyeWidth <= 0) {
    return 0;
  }

  return clamp(1 - normalize(eyeHeight / eyeWidth, 0.16, 0.3), 0, 1);
}

function calculateMouthOpen(landmarks) {
  const upperLip = landmarks[LANDMARK_INDEX.upperLip];
  const lowerLip = landmarks[LANDMARK_INDEX.lowerLip];
  const forehead = landmarks[LANDMARK_INDEX.forehead];
  const chin = landmarks[LANDMARK_INDEX.chin];

  if (!upperLip || !lowerLip || !forehead || !chin) {
    return 0;
  }

  const faceSize = distance2D(forehead, chin);
  if (faceSize <= 0) {
    return 0;
  }

  return normalize(distance2D(upperLip, lowerLip) / faceSize, 0.015, 0.12);
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
      mouth: {
        open: lerp(current.mouth.open, 0, SMOOTHING.mouth),
      },
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
    mouth: {
      open: clamp(lerp(current.mouth.open, next.mouth.open, SMOOTHING.mouth), 0, 1),
    },
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

function lerp(from, to, amount) {
  return from + (to - from) * amount;
}
