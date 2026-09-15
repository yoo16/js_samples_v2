## HandLandmarkerとは

`HandLandmarker` は、`MediaPipe Tasks Vision` が提供する機能のひとつで、`Web` カメラの映像から手の関節位置（ランドマーク）を推定します。`face` フォルダの `FaceLandmarker` と同じ仕組みで、対象が顔から手に変わったものです。

```javascript
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
```

### HandLandmarkerの役割

`HandLandmarker` は、手ごとに `21` 個の関節点の座標と、左手・右手の判定を返します。関節点の並び方を使うと、指が伸びているか曲がっているかも判定できます。

| 項目 | 内容 |
| ---- | ---- |
| HandLandmarker | 手の関節点を検出する機能 |
| ランドマーク | 各指の関節と手首に対応する座標点 |
| 21点 | 手1つあたりに検出される関節点の数 |
| handedness | 左手か右手かの判定結果 |
| 用途 | ジェスチャー認識、指のカウント、AR操作など |

> このフォルダには、検出した手の骨格と関節番号、立てている指を可視化する `index.html` が入っています。

### ファイル構成

```txt
finger/
  index.html   ... 骨格・関節番号・指の状態を表示する画面
  js/
    hand-landmarker.js ... HandLandmarkerの生成と検出処理
    main.js             ... index.htmlの画面制御
```

## HandLandmarkerを準備する

`HandLandmarker` の生成も、`FaceLandmarker` と同じく `FilesetResolver` で `Wasm` を読み込んでから行います。

```javascript
export async function createHandLandmarker(numHands = 2) {
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
    return HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_ASSET_PATH },
        numHands,
        runningMode: 'VIDEO',
    });
}
```

### モデルとWasmの読み込み

`face` フォルダと同じく、`HandLandmarker` も `Wasm`（`WebAssembly`）と学習済みモデルの `.task` ファイルを使います。どちらも `vendor` フォルダに同梱しており、インターネット接続がなくても動作します。

| 設定 | 内容 |
| ---- | ---- |
| FilesetResolver | Wasm本体の場所を指定する |
| modelAssetPath | 学習済みモデルファイルの場所を指定する |
| numHands | 同時に検出する手の最大数を指定する |
| runningMode | 静止画か動画かを指定する |

> `numFaces` の代わりに `numHands` を指定することで、検出する手の数を調整できます。

### なぜWasmを使うのか

手ごとに21個の関節点をカメラ映像から毎フレーム推定する処理も、顔の検出と同じく計算量が多くなります。`MediaPipe` は、この重い計算部分を `C++` で実装し、`Wasm` にコンパイルしてブラウザで動かしています。

| 項目 | 内容 |
| ---- | ---- |
| Wasm | ブラウザ上でネイティブに近い速度で実行できる形式 |
| コンパイル元 | C++などで書かれた処理をブラウザ向けに変換したもの |
| メリット | JavaScriptより高速に計算を実行できる |
| 用途 | 画像解析や機械学習の推論など、計算量の多い処理 |

> `Wasm` は `JavaScript` を置き換えるものではありません。重い計算だけを `Wasm` が担当し、画面の更新やボタン操作などは、これまで通り `JavaScript` が担当します。

### 動画フレームから手のランドマークを推定する

`estimateHands()` は、`video` 要素の現在のフレームを `HandLandmarker` に渡し、手ごとの座標と左右判定をまとめて返します。

```javascript
export function estimateHands(landmarker, video, timestampMs) {
    const result = landmarker.detectForVideo(video, ts);
    return (result.landmarks ?? []).map((landmarks, i) => {
        const category = result.handednesses?.[i]?.[0];
        return {
            keypoints: landmarks.map((p) => ({
                x: p.x * width,
                y: p.y * height,
                z: p.z * width,
            })),
            handedness: category?.categoryName ?? 'Unknown',
            score: category?.score ?? 0,
        };
    });
}
```

| 項目 | 内容 |
| ---- | ---- |
| keypoints | 21点の座標をピクセル単位に変換したもの |
| handedness | Left・Right・Unknownのいずれか |
| score | 左右判定の信頼度 |

> `FaceLandmarker` と同様に、`detectForVideo()` には単調に増加するタイムスタンプが必要です。

## 手の関節構造

`21` 個の関節点には、手首を `0` として、各指の付け根から指先まで決まった番号がついています。`hand-landmarker.js` では、番号の並びと、骨格の線をつなぐための接続情報をまとめています。

<img src="/storage/teaching_material/finger-flow.svg" class="" width="800">

### ランドマーク名の一覧

```javascript
export const HAND_LANDMARK_NAMES = [
    'WRIST',
    'THUMB_CMC', 'THUMB_MCP', 'THUMB_IP', 'THUMB_TIP',
    'INDEX_MCP', 'INDEX_PIP', 'INDEX_DIP', 'INDEX_TIP',
    /* ... */
];
```

| 番号 | 部位 |
| ---- | ---- |
| 0 | 手首 |
| 1〜4 | 親指（付け根から指先） |
| 5〜8 | 人差し指 |
| 9〜12 | 中指 |
| 13〜16 | 薬指 |
| 17〜20 | 小指 |

### 骨格の接続情報

`HAND_CONNECTIONS` は、どの番号とどの番号を線でつなぐと手の骨格になるかを表した一覧です。

```javascript
export const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],            // 親指
    [0, 5], [5, 6], [6, 7], [7, 8],            // 人差し指
    [0, 17],                                   // 手のひら
];
```

> 各配列は `[始点の番号, 終点の番号]` の組です。`canvas` に描画するときは、この組の分だけ線を引きます。

## index.htmlで手を可視化する

`index.html` は、検出した手の骨格・関節番号・立てている指を、カメラ映像の上に表示する画面です。

### 骨格と関節を描画する

`drawHands()` では、`HAND_CONNECTIONS` を使って骨格の線を描き、そのあとで各関節を円として描画しています。

```javascript
function drawHands(hands) {
    hands.forEach((hand, handIndex) => {
        const pts = hand.keypoints.map(toCanvas);

        if (showSkeleton) {
            HAND_CONNECTIONS.forEach(([a, b]) => {
                ctx.moveTo(pts[a].x, pts[a].y);
                ctx.lineTo(pts[b].x, pts[b].y);
            });
            ctx.stroke();
        }

        pts.forEach((p, index) => {
            ctx.arc(p.x, p.y, index === 0 ? 6 : 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    });
}
```

| 処理 | 内容 |
| ---- | ---- |
| toCanvas | 動画サイズとcanvasサイズの比率を反映した座標に変換 |
| HAND_CONNECTIONS | 骨格の線をつなぐ番号の組 |
| index === 0 | 手首だけ少し大きい円で描画 |

> 手が2つ検出された場合は、`HAND_COLORS` の配列から色を切り替えて、左右を見分けやすくしています。

## 指が伸びているかを判定する

このサンプルでは、複雑な角度計算をせず、関節点どうしの距離を比較するだけで指の伸展を判定しています。

```javascript
export function detectExtendedFingers(keypoints) {
    const wrist = keypoints[0];
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const state = {};
    for (const [key, f] of Object.entries(FINGERS)) {
        state[key] = dist(keypoints[f.tip], wrist) > dist(keypoints[f.pip], wrist);
    }
    return state;
}
```

### 判定の考え方

| 順番 | 処理 |
| ---- | ---- |
| 1 | 指先（TIP）と手首の距離を計算 |
| 2 | 第二関節（PIP）と手首の距離を計算 |
| 3 | 指先の方が手首から遠ければ「伸びている」と判定 |

```javascript
state[key] = dist(keypoints[f.tip], wrist) > dist(keypoints[f.pip], wrist);
```

> 指を曲げると、指先が手のひらに近づき、手首からの距離が短くなります。この性質を利用した簡易的な判定方法です。厳密な角度計算より軽量に処理できます。

### 指ごとの関節番号

```javascript
export const FINGERS = {
    thumb: { name: '親指', mcp: 2, pip: 3, tip: 4 },
    index: { name: '人差し指', mcp: 5, pip: 6, tip: 8 },
    middle: { name: '中指', mcp: 9, pip: 10, tip: 12 },
    ring: { name: '薬指', mcp: 13, pip: 14, tip: 16 },
    pinky: { name: '小指', mcp: 17, pip: 18, tip: 20 },
};
```

| キー | MCP（付け根） | PIP（第二関節） | TIP（指先） |
| ---- | ---- | ---- | ---- |
| thumb | 2 | 3 | 4 |
| index | 5 | 6 | 8 |
| middle | 9 | 10 | 12 |
| ring | 13 | 14 | 16 |
| pinky | 17 | 18 | 20 |

> 親指だけ関節の数が少ないため、他の指と番号の間隔が異なります。

## 手ごとの詳細表示

画面右側には、検出した手ごとにカードを生成し、左右の判定と指の状態を表示しています。

```javascript
function renderHandDetails(hands) {
    hands.forEach((hand, handIndex) => {
        const fingers = detectExtendedFingers(hand.keypoints);
        const upCount = Object.values(fingers).filter(Boolean).length;
        // カードを生成して chips を追加
    });
}
```

| 表示項目 | 内容 |
| ---- | ---- |
| 左手・右手 | handednessをもとにした日本語ラベル |
| 信頼度 | 左右判定のスコアをパーセントで表示 |
| 指のチップ | 指ごとに伸びているかを色分け表示 |
| 立てている指 | 伸びていると判定された指の数 |

## 動作確認

`Web` カメラを使うため、ローカルサーバー経由で開きます。カメラの利用許可が表示されたら許可を選びます。

手をカメラに映し、骨格表示・番号表示のチェックボックスを切り替えて、関節の位置や番号が正しく表示されるか確認します。指を1本ずつ立てて、右側の「立てている指」の表示が変化するかも確認します。

## まとめ

| 項目 | 内容 |
| ---- | ---- |
| HandLandmarker | 手から21個のランドマークを検出する機能 |
| detectForVideo | 動画フレームからランドマークを推定するメソッド |
| handedness | 左手か右手かを表す判定結果 |
| HAND_CONNECTIONS | 骨格の線をつなぐための番号の組 |
| detectExtendedFingers | 関節間の距離から指の伸展を判定する処理 |
| FINGERS | 指ごとのMCP・PIP・TIP番号の対応表 |
