// お手本ポーズの定義。
export const REFERENCE_POSES = [
    {
        id: 'mountain',
        name: '山のポーズ',
        description: '気をつけの姿勢でまっすぐ立つ。腕は体の横に自然に下ろす。',
        angles: { elbow: 170, shoulder: 20, hip: 175, knee: 175 },
        tolerance: { elbow: 20, shoulder: 20, hip: 15, knee: 15 },
    },
    {
        id: 't-pose',
        name: 'Tポーズ',
        description: '両腕を肩の高さでまっすぐ横に伸ばす。',
        angles: { elbow: 175, shoulder: 90, hip: 175, knee: 175 },
        tolerance: { elbow: 20, shoulder: 20, hip: 15, knee: 15 },
    },
    {
        id: 'banzai',
        name: 'バンザイ',
        description: '両腕をまっすぐ頭の上に伸ばす。',
        angles: { elbow: 175, shoulder: 170, hip: 175, knee: 175 },
        tolerance: { elbow: 20, shoulder: 25, hip: 15, knee: 15 },
    },
    {
        id: 'forward-fold',
        name: '前屈のポーズ',
        description: 'ひざを軽く伸ばしたまま、股関節から上体を前に倒す。',
        angles: { elbow: 150, shoulder: 90, hip: 90, knee: 165 },
        tolerance: { elbow: 30, shoulder: 30, hip: 25, knee: 20 },
    },
    {
        id: 'chair',
        name: '椅子のポーズ',
        description: 'ひざを曲げて腰を落とし、両腕は頭の上に伸ばす。',
        angles: { elbow: 170, shoulder: 170, hip: 140, knee: 110 },
        tolerance: { elbow: 25, shoulder: 25, hip: 20, knee: 20 },
    },
];

/**
 * 現在の関節角度を「自分のお手本」として保存用の形式に変換する
 * @param {Record<string, number>} angles
 * @returns {{id:string,name:string,description:string,angles:Record<string,number>,tolerance:Record<string,number>}}
 */
export function createCustomPose(angles) {
    return {
        id: 'custom',
        name: '自分のお手本',
        description: '今の姿勢を保存したオリジナルのお手本。',
        angles: { ...angles },
        tolerance: { elbow: 15, shoulder: 15, hip: 15, knee: 15 },
    };
}
