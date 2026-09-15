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
  startCameraStream,
} from './face-tracking.js';
import {
  applyTrackingToVRM,
  disposeObject,
  loadVRM,
  prepareVRMForFaceStage,
  resetVRMPose,
} from './vrm.js';

const elements = {
  canvas: document.querySelector('#avatar-canvas'),
  video: document.querySelector('#camera-video'),
  vrmFile: document.querySelector('#vrm-file'),
  startCamera: document.querySelector('#start-camera'),
  resetPose: document.querySelector('#reset-pose'),
  detectorStatus: document.querySelector('#detector-status'),
  cameraStatus: document.querySelector('#camera-status'),
  faceStatus: document.querySelector('#face-status'),
  yawValue: document.querySelector('#yaw-value'),
  pitchValue: document.querySelector('#pitch-value'),
  rollValue: document.querySelector('#roll-value'),
  blinkValue: document.querySelector('#blink-value'),
  mouthValue: document.querySelector('#mouth-value'),
};

const state = {
  detector: null,
  currentVrm: null,
  frame: structuredClone(DEFAULT_FRAME),
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

  requestAnimationFrame(renderLoop);
  await initializeFaceDetector();
}

async function initializeFaceDetector() {
  try {
    setText(elements.detectorStatus, 'loading');
    state.detector = await createFaceDetector();
    setText(elements.detectorStatus, 'ready');
  } catch (error) {
    setText(elements.detectorStatus, `error: ${toMessage(error)}`);
  }
}

async function startCamera() {
  try {
    setText(elements.cameraStatus, 'requesting');
    await startCameraStream(elements.video);
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
    sceneState.root.add(vrm.scene);
    state.currentVrm = vrm;
  } catch (error) {
    alert(`VRMを読み込めませんでした: ${toMessage(error)}`);
  }
}

function renderLoop(now) {
  requestAnimationFrame(renderLoop);

  state.frame = getSmoothedFaceFrame({
    detector: state.detector,
    video: elements.video,
    now,
    currentFrame: state.frame,
  });

  if (state.currentVrm) {
    applyTrackingToVRM(state.currentVrm, state.frame);
    state.currentVrm.update(clock.getDelta());
  }

  updateDebugPanel(now);
  sceneState.renderer.render(sceneState.scene, sceneState.camera);
}

function resetPose() {
  state.frame = structuredClone(DEFAULT_FRAME);
  if (!state.currentVrm) {
    return;
  }

  resetVRMPose(state.currentVrm);
  applyTrackingToVRM(state.currentVrm, DEFAULT_FRAME);
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
  setText(elements.mouthValue, state.frame.mouth.open.toFixed(2));
}

function setText(element, text) {
  element.textContent = text;
}

function toMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
