## PoseLandmarkerとは

`PoseLandmarker` は、`MediaPipe Tasks Vision` が提供する機能のひとつで、`Web` カメラの映像から全身の姿勢（ランドマーク）を推定します。`finger` フォルダの `HandLandmarker` や `face` フォルダの `FaceLandmarker` と同じ仕組みで、対象が手や顔から全身に変わったものです。

```javascript
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
```

### PoseLandmarkerの役割

`PoseLandmarker` は、体全体の `33` 個のランドマーク（肩・ひじ・手首・腰・ひざ・足首など）の座標を返します。関節どうしの角度を計算すると、腕が伸びているか、体が傾いているかなど、姿勢の形を数値で表せます。

| 項目 | 内容 |
| ---- | ---- |
| PoseLandmarker | 全身の関節点を検出する機能 |
| ランドマーク | 肩・ひじ・腰・ひざなど、体の主要な部位に対応する座標点 |
| 33点 | 1人あたりに検出されるランドマークの数 |
| 用途 | 姿勢推定、フィットネスアプリ、モーションキャプチャなど |

> このフォルダには、お手本ポーズと今の姿勢を関節の角度で比較し、一致度をスコア表示する `index.html` が入っています。ヨガやストレッチで、正しい姿勢を保てているかをセルフチェックする用途を想定しています。

### ファイル構成

```txt
pose/
  index.html   ... お手本選択・カメラ映像・一致度スコアを表示する画面
  js/
    pose-landmarker.js  ... PoseLandmarkerの生成と検出処理、角度計算
    reference-poses.js  ... お手本ポーズ（山のポーズ、Tポーズなど）の定義
    pose-compare.js      ... 今の姿勢とお手本を比較してスコア化する処理
    main.js              ... index.htmlの画面制御
```

## PoseLandmarkerを準備する

`PoseLandmarker` の生成も、`HandLandmarker` と同じく `FilesetResolver` で `Wasm` を読み込んでから行います。

```javascript
export async function createPoseLandmarker(numPoses = 1) {
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
    return PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_ASSET_PATH },
        numPoses,
        runningMode: 'VIDEO',
    });
}
```

### モデルとWasmの読み込み

`finger`・`face` フォルダと同じく、`PoseLandmarker` も `Wasm`（`WebAssembly`）と学習済みモデルの `.task` ファイルを使います。どちらも `vendor` フォルダに同梱しており、インターネット接続がなくても動作します。

| 設定 | 内容 |
| ---- | ---- |
| FilesetResolver | Wasm本体の場所を指定する |
| modelAssetPath | 学習済みモデルファイルの場所を指定する |
| numPoses | 同時に検出する人数を指定する |
| runningMode | 静止画か動画かを指定する |

> `numHands` の代わりに `numPoses` を指定することで、検出する人数を調整できます。このサンプルでは1人分だけを扱います。

## 体の関節構造

`33` 個のランドマークには、鼻を `0` として、目・耳・肩・ひじ・手首・腰・ひざ・足首まで決まった番号がついています。`pose-landmarker.js` では、番号の並びと、骨格の線をつなぐための接続情報をまとめています。

<img src="/storage/teaching_material/pose-flow.svg" class="" width="800">

### ランドマーク名の一覧（抜粋）

```javascript
export const POSE_LANDMARK_NAMES = [
    'NOSE',
    /* 目・耳・口まわり(1〜10) */
    'LEFT_SHOULDER', 'RIGHT_SHOULDER',
    'LEFT_ELBOW', 'RIGHT_ELBOW',
    'LEFT_WRIST', 'RIGHT_WRIST',
    /* ... */
    'LEFT_HIP', 'RIGHT_HIP',
    'LEFT_KNEE', 'RIGHT_KNEE',
    'LEFT_ANKLE', 'RIGHT_ANKLE',
];
```

| 番号 | 部位 |
| ---- | ---- |
| 0〜10 | 顔まわり（鼻・目・耳・口） |
| 11・12 | 左右の肩 |
| 13・14 | 左右のひじ |
| 15・16 | 左右の手首 |
| 23・24 | 左右の腰 |
| 25・26 | 左右のひざ |
| 27・28 | 左右の足首 |

### 骨格の接続情報

`POSE_CONNECTIONS` は、どの番号とどの番号を線でつなぐと体の骨格になるかを表した一覧です。顔まわりは省略し、胴体と四肢だけを描画しています。

```javascript
export const POSE_CONNECTIONS = [
    [11, 12],                       // 肩ライン
    [11, 13], [13, 15],             // 左腕
    [11, 23], [12, 24], [23, 24],   // 胴体
    [23, 25], [25, 27],             // 左脚
];
```

> 各配列は `[始点の番号, 終点の番号]` の組です。`canvas` に描画するときは、この組の分だけ線を引きます。

## 関節の角度からポーズの形を数値化する

姿勢を比較するときに座標をそのまま比べると、体の位置やカメラからの距離が変わるだけで数値がずれてしまいます。そこで、3点から求まる「角度」を使うことで、位置やカメラとの距離に左右されにくい比較ができます。

```javascript
function angleAt(a, b, c) {
    const v1 = { x: a.x - b.x, y: a.y - b.y };
    const v2 = { x: c.x - b.x, y: c.y - b.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
    const cos = Math.min(1, Math.max(-1, dot / mag));
    return (Math.acos(cos) * 180) / Math.PI;
}
```

`angleAt(a, b, c)` は、頂点 `b` を中心に `a` と `c` への方向がなす角度を度数で返します。例えば、ひじの角度なら「肩・ひじ・手首」の3点を渡すと、腕が伸びているほど `180` 度に近づき、曲げるほど小さくなります。

### 比較に使う4つの関節角度

`computeJointAngles()` では、左右の平均を取って4種類の角度にまとめています。

| キー | 表示名 | 3点（頂点は中央） | 意味 |
| ---- | ---- | ---- | ---- |
| elbow | ひじの伸び | 肩・ひじ・手首 | 腕を伸ばしているか |
| shoulder | 腕の角度 | 腰・肩・ひじ | 腕が体からどれだけ開いているか |
| hip | 体幹の傾き | 肩・腰・ひざ | 上体が前後に倒れているか |
| knee | ひざの伸び | 腰・ひざ・足首 | 脚を伸ばしているか、曲げているか |

```javascript
export function computeJointAngles(keypoints) {
    const angles = {};
    for (const [joint, sides] of Object.entries(JOINT_TRIADS)) {
        const left = angleAt(keypoints[sides.left[0]], keypoints[sides.left[1]], keypoints[sides.left[2]]);
        const right = angleAt(keypoints[sides.right[0]], keypoints[sides.right[1]], keypoints[sides.right[2]]);
        angles[joint] = (left + right) / 2;
    }
    return angles;
}
```

> 左右を平均しているのは、カメラに対して体が少し斜めになっても、左右どちらかの数値だけに引っ張られないようにするためです。

## お手本ポーズを定義する

`reference-poses.js` には、山のポーズ・Tポーズ・バンザイ・前屈のポーズ・椅子のポーズという5つのお手本を、4つの関節角度の目標値として定義しています。

```javascript
export const REFERENCE_POSES = [
    {
        id: 'mountain',
        name: '山のポーズ',
        description: '気をつけの姿勢でまっすぐ立つ。腕は体の横に自然に下ろす。',
        angles: { elbow: 170, shoulder: 20, hip: 175, knee: 175 },
        tolerance: { elbow: 20, shoulder: 20, hip: 15, knee: 15 },
    },
    /* ... */
];
```

| 項目 | 内容 |
| ---- | ---- |
| angles | 各関節の目標角度（度） |
| tolerance | 目標からどれだけずれてもよいかの許容範囲（度） |

> 腕を体の横に下ろすと肩の角度は小さく（0度に近く）、真上に伸ばすと大きく（180度に近く）なります。この性質を利用して、目標角度は実際にポーズを取ったときの体の形から逆算しています。

### 自分のお手本を保存する

`index.html` の「今の姿勢をお手本に保存」ボタンを押すと、そのときの関節角度を `createCustomPose()` でお手本として保存できます。用意されたポーズだけでなく、自分の理想の姿勢や、お手本の写真を見ながら再現した姿勢をターゲットにして練習できます。

```javascript
export function createCustomPose(angles) {
    return {
        id: 'custom',
        name: '自分のお手本',
        angles: { ...angles },
        tolerance: { elbow: 15, shoulder: 15, hip: 15, knee: 15 },
    };
}
```

## 今の姿勢とお手本を比較する

`pose-compare.js` の `comparePose()` は、関節ごとに現在の角度とお手本の角度の差を調べ、点数と3段階の判定（good・warn・bad）を返します。

```javascript
function scoreJoint(current, target, tolerance) {
    const diff = Math.abs(current - target);
    const score = Math.max(0, 100 - (diff / tolerance) * 50);
    const level = diff <= tolerance ? 'good' : diff <= tolerance * 2 ? 'warn' : 'bad';
    return { diff, score, level };
}
```

| 条件 | 判定 | 意味 |
| ---- | ---- | ---- |
| 差が許容範囲以内 | good | お手本とほぼ一致 |
| 差が許容範囲の2倍以内 | warn | 少しずれている |
| それ以上 | bad | 大きくずれている |

全体のスコアは、4つの関節の点数の平均値として `index.html` の中央に大きく表示します。

## index.htmlで姿勢を可視化する

`index.html` は、カメラ映像に骨格を重ねて表示し、右側に関節ごとの一致度をカード形式で表示する画面です。

### スコアに応じて骨格の色を変える

`drawSkeleton()` では、全体スコアに応じて骨格線の色を緑・黄・赤に切り替え、一目でお手本にどれだけ近いかが分かるようにしています。

```javascript
const color = overallScore >= 80 ? LEVEL_COLOR.good : overallScore >= 50 ? LEVEL_COLOR.warn : LEVEL_COLOR.bad;

ctx.strokeStyle = color;
POSE_CONNECTIONS.forEach(([a, b]) => {
    ctx.moveTo(pts[a].x, pts[a].y);
    ctx.lineTo(pts[b].x, pts[b].y);
});
ctx.stroke();
```

| スコア | 色 | 意味 |
| ---- | ---- | ---- |
| 80点以上 | 緑 | お手本にとても近い |
| 50〜79点 | 黄 | もう少し |
| 49点以下 | 赤 | お手本と大きく異なる |

> 全身が画面に映っていないと関節角度が正しく計算できません。カメラから十分離れて、頭から足先まで映る位置で試してください。
