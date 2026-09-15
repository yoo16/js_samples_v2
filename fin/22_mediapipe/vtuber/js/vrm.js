import { Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  VRMExpressionPresetName,
  VRMHumanBoneName,
  VRMLoaderPlugin,
  VRMUtils,
} from '@pixiv/three-vrm';

const NATURAL_ARM_POSE = [
  { bone: VRMHumanBoneName.LeftUpperArm, rotation: { x: 0, y: 0, z: 1.05 } },
  { bone: VRMHumanBoneName.LeftLowerArm, rotation: { x: 0, y: 0.08, z: 0.22 } },
  { bone: VRMHumanBoneName.LeftHand, rotation: { x: 0, y: 0, z: 0.08 } },
  { bone: VRMHumanBoneName.RightUpperArm, rotation: { x: 0, y: 0, z: -1.05 } },
  { bone: VRMHumanBoneName.RightLowerArm, rotation: { x: 0, y: -0.08, z: -0.22 } },
  { bone: VRMHumanBoneName.RightHand, rotation: { x: 0, y: 0, z: -0.08 } },
];

export async function loadVRM(file) {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const objectUrl = URL.createObjectURL(file);

  try {
    const gltf = await loader.loadAsync(objectUrl);
    const vrm = gltf.userData.vrm;
    if (!vrm) {
      throw new Error('VRMデータが見つかりません。');
    }
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    return vrm;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function prepareVRMForFaceStage(vrm) {
  VRMUtils.rotateVRM0(vrm);
  applyNaturalArmPose(vrm);
  fitVRMFaceToStage(vrm);
}

export function applyTrackingToVRM(vrm, frame) {
  if (!frame.detected) {
    setExpression(vrm, VRMExpressionPresetName.Blink, 0);
    setExpression(vrm, VRMExpressionPresetName.BlinkLeft, 0);
    setExpression(vrm, VRMExpressionPresetName.BlinkRight, 0);
    setExpression(vrm, VRMExpressionPresetName.Aa, 0);
    return;
  }

  const head = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
  const neck = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Neck);

  if (head) {
    head.rotation.set(frame.head.pitch, frame.head.yaw, -frame.head.roll, 'XYZ');
  }

  if (neck) {
    neck.rotation.set(frame.head.pitch * 0.35, frame.head.yaw * 0.35, -frame.head.roll * 0.2, 'XYZ');
  }

  setExpression(vrm, VRMExpressionPresetName.Blink, Math.max(frame.eyes.leftBlink, frame.eyes.rightBlink));
  setExpression(vrm, VRMExpressionPresetName.BlinkLeft, frame.eyes.leftBlink);
  setExpression(vrm, VRMExpressionPresetName.BlinkRight, frame.eyes.rightBlink);
  setExpression(vrm, VRMExpressionPresetName.Aa, frame.mouth.open);
}

export function resetVRMPose(vrm) {
  const head = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
  const neck = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Neck);
  head?.rotation.set(0, 0, 0);
  neck?.rotation.set(0, 0, 0);
  applyNaturalArmPose(vrm);
}

export function disposeObject(root) {
  root.traverse((object) => {
    object.geometry?.dispose?.();

    if (Array.isArray(object.material)) {
      object.material.forEach((material) => material.dispose?.());
      return;
    }

    object.material?.dispose?.();
  });
}

function fitVRMFaceToStage(vrm) {
  const scene = vrm.scene;
  scene.rotation.y = Math.PI;
  scene.position.set(0, 0, 0);
  scene.scale.setScalar(1);
  scene.updateMatrixWorld(true);

  const bounds = new Box3().setFromObject(scene);
  const size = bounds.getSize(new Vector3());

  if (size.y <= 0) {
    scene.position.set(0, 0, 0);
    return;
  }

  const targetHeight = 3.0;
  const scale = targetHeight / size.y;
  scene.scale.setScalar(scale);
  scene.updateMatrixWorld(true);

  const focus = getVRMFaceFocus(vrm);
  const target = new Vector3(0, 0.35, 0);
  scene.position.add(target.sub(focus));
  scene.updateMatrixWorld(true);
}

function getVRMFaceFocus(vrm) {
  const head = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
  if (head) {
    return head.getWorldPosition(new Vector3());
  }

  const bounds = new Box3().setFromObject(vrm.scene);
  const size = bounds.getSize(new Vector3());
  return new Vector3(
    (bounds.min.x + bounds.max.x) / 2,
    bounds.min.y + size.y * 0.82,
    (bounds.min.z + bounds.max.z) / 2,
  );
}

function applyNaturalArmPose(vrm) {
  NATURAL_ARM_POSE.forEach(({ bone, rotation }) => {
    const node = vrm.humanoid.getNormalizedBoneNode(bone);
    node?.rotation.set(rotation.x, rotation.y, rotation.z, 'XYZ');
  });
  vrm.scene.updateMatrixWorld(true);
}

function setExpression(vrm, presetName, value) {
  vrm.expressionManager?.setValue(presetName, value);
}
