import {
  AmbientLight,
  Clock,
  Color,
  DirectionalLight,
  Group,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import {
  DEFAULT_FRAME,
  createFaceDetector,
  getSmoothedFaceFrame,
  resetHeadCalibration,
  startCameraStream,
} from './face-tracking.js';
import {
  applyTrackingToVRM,
  disposeObject,
  loadVRM,
  prepareVRMForFaceStage,
  resetVRMPose,
} from './vrm.js';
// 肩・ひじをPoseで動かす追加機能（別ファイル）。不要なら以下のimportと
// 関連する呼び出し箇所を削除すれば、元の顔トラッキングのみの状態に戻る。
import {
  DEFAULT_ARM_FRAME,
  createPoseDetector,
  getSmoothedArmFrame,
  resetTwistCalibration,
} from './pose-tracking.js';
import { applyArmTrackingToVRM } from './vrm-arm-pose.js';

const elements = {
  canvas: document.querySelector('#avatar-canvas'),
  video: document.querySelector('#camera-video'),
  vrmFile: document.querySelector('#vrm-file'),
  startCamera: document.querySelector('#start-camera'),
  resetPose: document.querySelector('#reset-pose'),
  calibratePose: document.querySelector('#calibrate-pose'),
  detectorStatus: document.querySelector('#detector-status'),
  cameraStatus: document.querySelector('#camera-status'),
  faceStatus: document.querySelector('#face-status'),
  yawValue: document.querySelector('#yaw-value'),
  pitchValue: document.querySelector('#pitch-value'),
  rollValue: document.querySelector('#roll-value'),
  blinkValue: document.querySelector('#blink-value'),
  mouthValue: document.querySelector('#mouth-value'),
  armToggle: document.querySelector('#arm-tracking-toggle'),
  armStatus: document.querySelector('#arm-status'),
  shoulderValue: document.querySelector('#shoulder-value'),
  twistValue: document.querySelector('#twist-value'),
};

const state = {
  detector: null,
  poseDetector: null,
  currentVrm: null,
  frame: structuredClone(DEFAULT_FRAME),
  armFrame: structuredClone(DEFAULT_ARM_FRAME),
  armTrackingEnabled: false,
  lastDebugUpdate: 0,
};

const sceneState = createScene(elements.canvas);
const clock = new Clock();

boot();

async function boot() {
  resizeRenderer();
  window.addEventListener('resize', resizeRenderer);
  elements.startCamera.addEventListener('click', startCamera);
  elements.vrmFile.addEventListener('change', handleVrmFile);
  elements.resetPose.addEventListener('click', resetPose);
  elements.calibratePose?.addEventListener('click', calibratePose);
  elements.armToggle?.addEventListener('change', handleArmToggle);

  requestAnimationFrame(renderLoop);
  await initializeFaceDetector();
}

async function handleArmToggle(event) {
  state.armTrackingEnabled = event.target.checked;

  if (state.armTrackingEnabled && !state.poseDetector) {
    try {
      setText(elements.armStatus, 'loading');
      state.poseDetector = await createPoseDetector();
      setText(elements.armStatus, 'ready');
    } catch (error) {
      setText(elements.armStatus, `error: ${toMessage(error)}`);
      state.armTrackingEnabled = false;
      elements.armToggle.checked = false;
    }
  }

  if (state.armTrackingEnabled) {
    // 正面を向いた状態をオンにするタイミングを基準として、捻りをキャリブレーションする。
    resetTwistCalibration();
  } else {
    state.armFrame = structuredClone(DEFAULT_ARM_FRAME);
    setText(elements.armStatus, 'off');
  }
}

async function initializeFaceDetector() {
  try {
    setText(elements.detectorStatus, 'loading');
    // TODO: 顔ランドマーク推定器を初期化(非同期): createFaceDetector()
    state.detector = null;
    setText(elements.detectorStatus, 'ready');
  } catch (error) {
    setText(elements.detectorStatus, `error: ${toMessage(error)}`);
  }
}

async function startCamera() {
  try {
    setText(elements.cameraStatus, 'requesting');
    // TODO: Webカメラを開始(非同期): startCameraStream(): 引数: elements.video

    setText(elements.cameraStatus, 'running');
  } catch (error) {
    setText(elements.cameraStatus, `error: ${toMessage(error)}`);
  }
}

async function handleVrmFile(event) {
  const [file] = event.target.files ?? [];
  if (!file) {
    return;
  }

  try {
    const vrm = await loadVRM(file);
    if (state.currentVrm) {
      sceneState.root.remove(state.currentVrm.scene);
      disposeObject(state.currentVrm.scene);
    }

    prepareVRMForFaceStage(vrm);
    // TODO: VRM のシーンを 3D 空間に追加: sceneState.root.add(vrm.scene)

    state.currentVrm = vrm;
  } catch (error) {
    alert(`VRMを読み込めませんでした: ${toMessage(error)}`);
  }
}

function renderLoop(now) {
  requestAnimationFrame(renderLoop);

  // TODO: 顔の向き・まばたき・口の形を推定して state.frame に保存
  // state.frame = getSmoothedFaceFrame({
  //   detector: state.detector,
  //   video: elements.video,
  //   now,
  //   currentFrame: state.frame,
  // });

  if (state.armTrackingEnabled) {
    state.armFrame = getSmoothedArmFrame({
      detector: state.poseDetector,
      video: elements.video,
      now,
      currentFrame: state.armFrame,
    });
  }

  if (state.currentVrm) {
    // TODO: 推定結果を VRM に反映: applyTrackingToVRM(): 引数: state.currentVrm, state.frame

    if (state.armTrackingEnabled) {
      applyArmTrackingToVRM(state.currentVrm, state.armFrame);
    }
    state.currentVrm.update(clock.getDelta());
  }

  updateDebugPanel(now);
  sceneState.renderer.render(sceneState.scene, sceneState.camera);
}

function resetPose() {
  state.frame = structuredClone(DEFAULT_FRAME);
  state.armFrame = structuredClone(DEFAULT_ARM_FRAME);
  if (state.armTrackingEnabled) {
    resetTwistCalibration();
  }
  if (!state.currentVrm) {
    return;
  }

  resetVRMPose(state.currentVrm);
  applyTrackingToVRM(state.currentVrm, DEFAULT_FRAME);
}

// カメラやVRMの設置が正面から傾いている場合の手動補正。
// 押した瞬間の頭・捻りの向きを基準(0)として記録し直す。
function calibratePose() {
  resetHeadCalibration();
  if (state.armTrackingEnabled) {
    resetTwistCalibration();
  }
}

function createScene(canvas) {
  const scene = new Scene();
  scene.background = new Color('#181818');

  const camera = new PerspectiveCamera(24, 1, 0.1, 100);
  camera.position.set(0, 0.35, 2.05);
  camera.lookAt(0, 0.35, 0);

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const root = new Group();
  scene.add(root);

  const ambient = new AmbientLight('#ffffff', 1.7);
  scene.add(ambient);

  const keyLight = new DirectionalLight('#ffffff', 2.2);
  keyLight.position.set(1.5, 2.5, 2.2);
  scene.add(keyLight);

  const fillLight = new DirectionalLight('#f4d4b8', 0.8);
  fillLight.position.set(-1.5, 1.2, 1.5);
  scene.add(fillLight);

  return { scene, camera, renderer, root };
}

function resizeRenderer() {
  const width = elements.canvas.clientWidth;
  const height = elements.canvas.clientHeight;
  sceneState.camera.aspect = width / height;
  sceneState.camera.updateProjectionMatrix();
  sceneState.renderer.setSize(width, height, false);
}

function updateDebugPanel(now) {
  if (now - state.lastDebugUpdate < 100) {
    return;
  }
  state.lastDebugUpdate = now;

  setText(elements.faceStatus, state.frame.detected ? 'detected' : 'not detected');
  setText(elements.yawValue, state.frame.head.yaw.toFixed(2));
  setText(elements.pitchValue, state.frame.head.pitch.toFixed(2));
  setText(elements.rollValue, state.frame.head.roll.toFixed(2));
  setText(elements.blinkValue, `${state.frame.eyes.leftBlink.toFixed(2)} / ${state.frame.eyes.rightBlink.toFixed(2)}`);
  setText(
    elements.mouthValue,
    `a${state.frame.mouth.aa.toFixed(2)} i${state.frame.mouth.ih.toFixed(2)} u${state.frame.mouth.ou.toFixed(2)} e${state.frame.mouth.ee.toFixed(2)} o${state.frame.mouth.oh.toFixed(2)}`,
  );

  if (elements.shoulderValue) {
    setText(
      elements.shoulderValue,
      `${state.armFrame.left.shoulderDeg.toFixed(0)}° / ${state.armFrame.right.shoulderDeg.toFixed(0)}°`,
    );
  }

  if (elements.twistValue) {
    setText(elements.twistValue, `${((state.armFrame.twistRad * 180) / Math.PI).toFixed(0)}°`);
  }
}

function setText(element, text) {
  element.textContent = text;
}

function toMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
