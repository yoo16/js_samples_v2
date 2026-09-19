import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// vendor/ 内の wasm を利用（CDN 不要）
const WASM_BASE = new URL('../../vendor/@mediapipe/tasks-vision/wasm', import.meta.url).toString();
// モデル本体（.task）も vendor/ に同梱（オフライン動作）
const MODEL_ASSET_PATH = new URL(
    '../../vendor/@mediapipe/models/pose_landmarker.task',
    import.meta.url,
).toString();

/**
 * PoseLandmarker を生成する
 * @param {number} numPoses 検出する人数
 * @returns {Promise<PoseLandmarker>}
 */
export async function createPoseLandmarker(numPoses = 1) {
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
    return PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_ASSET_PATH },
        numPoses,
        runningMode: 'VIDEO',
    });
}

let lastTimestamp = 0;

/**
 * 動画フレームから姿勢のランドマークを推定する。
 * 33点をピクセル座標へ変換して返す。
 * @param {PoseLandmarker} landmarker
 * @param {HTMLVideoElement} video
 * @param {number} timestampMs 単調増加する値（performance.now() など）
 * @returns {{keypoints: {x:number,y:number,z:number,visibility:number}[], score: number}[]}
 */
export function estimatePose(landmarker, video, timestampMs) {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return [];

    // detectForVideo は単調増加するタイムスタンプを要求する
    const ts = timestampMs > lastTimestamp ? timestampMs : lastTimestamp + 1;
    lastTimestamp = ts;

    const result = landmarker.detectForVideo(video, ts);
    return (result.landmarks ?? []).map((landmarks) => ({
        keypoints: landmarks.map((p) => ({
            x: p.x * width,
            y: p.y * height,
            z: p.z * width,
            visibility: p.visibility ?? 1,
        })),
        score: landmarks.reduce((sum, p) => sum + (p.visibility ?? 1), 0) / landmarks.length,
    }));
}

// MediaPipe Pose の 33 ランドマーク名（BlazePose トポロジー）
export const POSE_LANDMARK_NAMES = [
    'NOSE',
    'LEFT_EYE_INNER', 'LEFT_EYE', 'LEFT_EYE_OUTER',
    'RIGHT_EYE_INNER', 'RIGHT_EYE', 'RIGHT_EYE_OUTER',
    'LEFT_EAR', 'RIGHT_EAR',
    'MOUTH_LEFT', 'MOUTH_RIGHT',
    'LEFT_SHOULDER', 'RIGHT_SHOULDER',
    'LEFT_ELBOW', 'RIGHT_ELBOW',
    'LEFT_WRIST', 'RIGHT_WRIST',
    'LEFT_PINKY', 'RIGHT_PINKY',
    'LEFT_INDEX', 'RIGHT_INDEX',
    'LEFT_THUMB', 'RIGHT_THUMB',
    'LEFT_HIP', 'RIGHT_HIP',
    'LEFT_KNEE', 'RIGHT_KNEE',
    'LEFT_ANKLE', 'RIGHT_ANKLE',
    'LEFT_HEEL', 'RIGHT_HEEL',
    'LEFT_FOOT_INDEX', 'RIGHT_FOOT_INDEX',
];

// 骨格の接続（描画用・顔まわりは省略し胴体と四肢のみ）
export const POSE_CONNECTIONS = [
    [11, 12],                       // 肩ライン
    [11, 13], [13, 15],             // 左腕
    [12, 14], [14, 16],             // 右腕
    [15, 17], [15, 19], [17, 19],   // 左手
    [16, 18], [16, 20], [18, 20],   // 右手
    [11, 23], [12, 24], [23, 24],   // 胴体
    [23, 25], [25, 27],             // 左脚
    [24, 26], [26, 28],             // 右脚
    [27, 29], [27, 31], [29, 31],   // 左足
    [28, 30], [28, 32], [30, 32],   // 右足
];

/**
 * 3点 a-b-c から頂点 b の角度（度）を求める
 * @param {{x:number,y:number}} a
 * @param {{x:number,y:number}} b 角度の頂点
 * @param {{x:number,y:number}} c
 * @returns {number} 0〜180度
 */
function angleAt(a, b, c) {
    const v1 = { x: a.x - b.x, y: a.y - b.y };
    const v2 = { x: c.x - b.x, y: c.y - b.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
    if (mag === 0) return 0;
    const cos = Math.min(1, Math.max(-1, dot / mag));
    return (Math.acos(cos) * 180) / Math.PI;
}

// 比較に使う関節角度の定義（左右それぞれ [隣接点, 頂点, 隣接点]）
const JOINT_TRIADS = {
    elbow: { left: [11, 13, 15], right: [12, 14, 16] },     // 肩-ひじ-手首
    shoulder: { left: [23, 11, 13], right: [24, 12, 14] },  // 腰-肩-ひじ
    hip: { left: [11, 23, 25], right: [12, 24, 26] },       // 肩-腰-ひざ
    knee: { left: [23, 25, 27], right: [24, 26, 28] },      // 腰-ひざ-足首
};

export const JOINT_LABELS = {
    elbow: 'ひじの伸び',
    shoulder: '腕の角度',
    hip: '体幹の傾き',
    knee: 'ひざの伸び',
};

/**
 * 姿勢のキーポイントから関節角度（左右平均）を算出する
 * @param {{x:number,y:number}[]} keypoints ピクセル座標の33点
 * @returns {Record<'elbow'|'shoulder'|'hip'|'knee', number>}
 */
export function computeJointAngles(keypoints) {
    const angles = {};
    for (const [joint, sides] of Object.entries(JOINT_TRIADS)) {
        const left = angleAt(keypoints[sides.left[0]], keypoints[sides.left[1]], keypoints[sides.left[2]]);
        const right = angleAt(keypoints[sides.right[0]], keypoints[sides.right[1]], keypoints[sides.right[2]]);
        angles[joint] = (left + right) / 2;
    }
    return angles;
}
