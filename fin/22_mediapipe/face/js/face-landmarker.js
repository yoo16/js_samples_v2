import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// vendor/ 内の wasm を利用（CDN 不要）
const WASM_BASE = new URL('../../vendor/@mediapipe/tasks-vision/wasm', import.meta.url).toString();
// モデル本体（.task）も vendor/ に同梱（オフライン動作）
const MODEL_ASSET_PATH = new URL(
    '../../vendor/@mediapipe/models/face_landmarker.task',
    import.meta.url,
).toString();

/**
 * FaceLandmarker を生成する
 * @returns {Promise<FaceLandmarker>}
 */
export async function createFaceLandmarker() {
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
    return FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_ASSET_PATH },
        numFaces: 1,
        runningMode: 'VIDEO',
    });
}

/**
 * 動画フレームから顔ランドマークを推定する。
 * 旧 @tensorflow-models/face-landmarks-detection と同じく
 * ピクセル座標の keypoints を持つ faces 配列を返す。
 * @param {FaceLandmarker} landmarker
 * @param {HTMLVideoElement} video
 * @param {number} timestampMs performance.now() など単調増加する値
 * @returns {{keypoints: {x:number, y:number, z:number}[]}[]}
 */
let lastTimestamp = 0;

export function estimateFaces(landmarker, video, timestampMs) {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return [];

    // detectForVideo は単調増加するタイムスタンプを要求する
    const ts = timestampMs > lastTimestamp ? timestampMs : lastTimestamp + 1;
    lastTimestamp = ts;
    const result = landmarker.detectForVideo(video, ts);
    return (result.faceLandmarks ?? []).map((landmarks) => ({
        keypoints: landmarks.map((point) => ({
            x: point.x * width,
            y: point.y * height,
            // 正規化 z を旧 API のピクセル相当スケールへ変換
            z: point.z * width,
        })),
    }));
}
