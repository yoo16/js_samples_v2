// pose-tracking.js の肩の角度・上半身の捻りを VRM のボーン回転に変換する。
// vrm.js は変更せず、このファイルを削除するだけで機能を無効化できるようにしている。
//
// ひじ（LowerArm）は、曲げると手のひらの向きが不自然になったため対象外にしている。
// ひじを動かすには、手首のロール（前腕のひねり）も別途補正する必要がある。
import { VRMHumanBoneName } from '@pixiv/three-vrm';

const DEG2RAD = Math.PI / 180;

// pose-tracking.js の shoulderDeg は、腕を体の横に下ろした状態で約20°、
// 水平に上げた状態で約90°、真上に上げた状態で約180°になるように設計している。
const REST_SHOULDER_DEG = 90; // T-pose（腕を水平に伸ばした状態）を基準角度とする

// 単眼カメラのzの精度は高くないため、捻りは軽めの範囲に制限する。
const TWIST_MAX_RAD = 0.6; // 約34°

// 実際のVRMモデルで動きが変な方向になる場合は、まずこの符号を反転して試してください。
const SIGN = {
  shoulder: { left: 1, right: -1 },
  twist: 1,
};

export function applyArmTrackingToVRM(vrm, frame) {
  if (!frame.detected) {
    return;
  }

  setUpperArm(vrm, VRMHumanBoneName.LeftUpperArm, frame.left.shoulderDeg, SIGN.shoulder.left);
  setUpperArm(vrm, VRMHumanBoneName.RightUpperArm, frame.right.shoulderDeg, SIGN.shoulder.right);
  setTwist(vrm, frame.twistRad);
}

function setUpperArm(vrm, boneName, shoulderDeg, sign) {
  const node = vrm.humanoid?.getNormalizedBoneNode(boneName);
  if (!node) return;

  const z = sign * (REST_SHOULDER_DEG - shoulderDeg) * DEG2RAD;
  node.rotation.set(0, 0, z, 'XYZ');
}

function setTwist(vrm, twistRad) {
  const chest = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Chest)
    ?? vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Spine);
  if (!chest) return;

  const clamped = Math.max(-TWIST_MAX_RAD, Math.min(TWIST_MAX_RAD, twistRad));
  chest.rotation.set(0, SIGN.twist * clamped, 0, 'XYZ');
}
