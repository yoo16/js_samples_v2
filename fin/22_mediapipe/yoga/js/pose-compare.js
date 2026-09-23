import { JOINT_LABELS } from './pose-landmarker.js';

/**
 * 1つの関節角度の一致度を判定
 * @param {number} current 現在の角度
 * @param {number} target お手本の角度
 * @param {number} tolerance 許容差（度）
 * @returns {{diff:number, score:number, level:'good'|'warn'|'bad'}}
 */
function scoreJoint(current, target, tolerance) {
    // 関節角度の差分を計算
    const diff = Math.abs(current - target);
    const score = Math.max(0, 100 - (diff / tolerance) * 50);
    const level = diff <= tolerance ? 'good' : diff <= tolerance * 2 ? 'warn' : 'bad';
    return { diff, score, level };
}

/**
 * 現在の関節角度をお手本ポーズと比較する
 * @param {Record<string, number>} currentAngles computeJointAngles() の結果
 * @param {{angles: Record<string, number>, tolerance: Record<string, number>}} pose お手本ポーズ
 * @returns {{overall:number, joints: Record<string, {label:string, current:number, target:number, diff:number, score:number, level:string}>}}
 */
export function comparePose(currentAngles, pose) {
    const joints = {};
    let total = 0;
    let count = 0;

    for (const joint of Object.keys(pose.angles)) {
        const target = pose.angles[joint];
        const tolerance = pose.tolerance[joint];
        const current = currentAngles[joint] ?? 0;
        const { diff, score, level } = scoreJoint(current, target, tolerance);
        joints[joint] = { label: JOINT_LABELS[joint] ?? joint, current, target, diff, score, level };
        total += score;
        count += 1;
    }

    return { overall: count > 0 ? Math.round(total / count) : 0, joints };
}
