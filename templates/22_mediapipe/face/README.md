## FaceLandmarkerとは

`FaceLandmarker` は、`MediaPipe Tasks Vision` が提供する機能のひとつで、顔の映像から `478` 個の特徴点（ランドマーク）の座標を推定します。目、鼻、口、輪郭など、顔のパーツごとの位置が数値としてわかります。`finger` フォルダの `HandLandmarker` と同じ仕組みで、対象が手から顔に変わったものです。

<img src="/storage/teaching_material/google_facedetection.png" class="" width="500">

| 項目 | 内容 |
| ---- | ---- |
| FaceLandmarker | 顔の特徴点を検出する機能 |
| ランドマーク | 顔の各パーツに対応する座標点 |
| 478点 | 検出される特徴点の総数 |
| 用途 | 表情認識、AR加工、顔の向き推定など |

```javascript
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
```

> `MediaPipe Tasks Vision` の基本や `Wasm`・`.task` ファイルの役割については、`finger` フォルダの `README.md` で説明しています。まだ読んでいない場合は先にそちらを確認してください。

## FaceLandmarkerを準備
### ファイル構成

```txt
face/
  recognition.html   ... ランドマーク番号を確認する画面
  decoration.html    ... 顔にスタンプを合成する画面
  images/             ... スタンプ用の画像
  js/
    face-landmarker.js ... FaceLandmarkerの生成と検出処理
    face-data.js        ... 部位ごとのランドマーク番号一覧
    recognition.js       ... recognition.htmlの画面制御
    decoration.js        ... decoration.htmlの画面制御

vendor/                  ... face・finger・pose・vtuberが共有するライブラリ置き場
  @mediapipe/
    models/               ... 学習済みモデル本体（.task）
    tasks-vision/         ... MediaPipe Tasks VisionのJS本体とWasm
```

### vendorとモデル・Wasmの読み込み

`FaceLandmarker` は、`vendor/` フォルダに同梱した `Wasm` 本体と `.task` モデルファイルを読み込んで検出器を作成します。CDNを使わずローカルのファイルだけで動くので、インターネット接続がなくても動作します。

```javascript
// vendor/ 内の wasm を利用（CDN 不要）
const WASM_BASE = new URL('../../vendor/@mediapipe/tasks-vision/wasm', import.meta.url).toString();
// モデル本体（.task）も vendor/ に同梱（オフライン動作）
const MODEL_ASSET_PATH = new URL(
    '../../vendor/@mediapipe/models/face_landmarker.task',
    import.meta.url,
).toString();
```

| 項目 | 内容 |
| ---- | ---- |
| vendor/ | ライブラリや学習済みモデルをあらかじめダウンロードして置いてあるフォルダ |
| new URL(パス, import.meta.url) | 今のJSファイルの場所を基準に、vendor内のファイルの絶対URLを組み立てる |

### モデルを読み込み
`FaceLandmarker` を使うには、まずモデルを読み込んで検出器を作成する必要があります。この処理は `face-landmarker.js` にまとめられています。

```javascript
export async function createFaceLandmarker() {
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
    return FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_ASSET_PATH },
        numFaces: 1,
        runningMode: 'VIDEO',
    });
}
```

| 項目 | 内容 |
| ---- | ---- |
| FilesetResolver.forVisionTasks(WASM_BASE) | vendor内のWasm本体を読み込む |
| modelAssetPath | どの.taskファイル（学習済みモデル）を使うかを指定する |
| numFaces | 同時に検出する顔の最大数を指定する |
| runningMode | 静止画（IMAGE）か動画（VIDEO）かを指定する |


### 動画フレームからランドマークを推定する

`estimateFaces()` は、`video` 要素の現在のフレームを `FaceLandmarker` に渡し、検出結果を扱いやすい形に変換する関数です。

```javascript
export function estimateFaces(landmarker, video, timestampMs) {
    const result = landmarker.detectForVideo(video, ts);
    return (result.faceLandmarks ?? []).map((landmarks) => ({
        keypoints: landmarks.map((point) => ({
            x: point.x * width,
            y: point.y * height,
            z: point.z * width,
        })),
    }));
}
```

`detectForVideo()` が返す座標は `0` から `1` の範囲に正規化されています。そのままでは画面上の位置として使えないため、`video` の幅と高さを掛けてピクセル座標に変換しています。

| 変換前 | 変換後 |
| ---- | ---- |
| 0から1の正規化座標 | ピクセル単位の座標 |
| x, y, z の3つの値 | 画面上のx, y座標と奥行きz |


## 部位ごとのランドマーク番号

`478` 個のランドマークには、それぞれ決まった番号がついています。`face-data.js` では、鼻や目、口など、部位ごとによく使われる番号をまとめています。

<img src="/storage/teaching_material/google_facedetection.png" class="" width="500">

```javascript
export const landmarkParts = {
    nose: [4, 197, 195, 5, 1, 4, 19, 94, 2, 168, /* ... */],
    rightEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, /* ... */],
    faceOutline: [234, 93, 132, 58, /* ... */],
};
```

### 部位一覧

| キー | 部位 |
| ---- | ---- |
| nose | 鼻 |
| upperLip | 上唇 |
| lowerLip | 下唇 |
| outerMouth | 口（外周） |
| innerMouth | 口（内周） |
| rightEye | 右目 |
| leftEye | 左目 |
| eyeContour | 両目の輪郭 |
| faceOutline | 顔の輪郭 |

> 番号そのものは `MediaPipe Face Mesh` の仕様で決められています。

## フェースランドマークアプリ

`recognition.html` は、選択した部位のランドマークを、番号つきでカメラ映像の上に表示する画面です。

<img src="/storage/teaching_material/recognition-flow.svg" class="" width="800">

### 部位ボタンを作る

部位ボタンは、`landmarkParts` のキーを元に、`JavaScript` で動的に生成しています。

```javascript
function buildPartButtons() {
    Object.keys(landmarkParts).forEach((key) => {
        const btn = document.createElement('button');
        btn.dataset.part = key;
        btn.textContent = PART_LABELS[key] ?? key;
        btn.addEventListener('click', () => selectPart(key));
        partButtonsEl.appendChild(btn);
    });
}
```

`PART_LABELS` は、`nose` や `rightEye` といった英語のキーを、日本語のラベルに変換するための対応表です。

### ランドマークを描画する

`drawResults()` では、選択中の部位に含まれる番号だけを取り出し、`canvas` 上に点として描画しています。

```javascript
indices.forEach((index) => {
    const point = face.keypoints[index];
    const x = point.x * scaleX;
    const y = point.y * scaleY;

    ctx.beginPath();
    ctx.arc(x, y, isHi ? 6 : 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = isHi ? '#22d3ee' : '#f43f5e';
    ctx.fill();
});
```

| 処理 | 内容 |
| ---- | ---- |
| scaleX, scaleY | 動画サイズとcanvasサイズの比率を計算 |
| face.keypoints[index] | 番号に対応する座標を取得 |
| ctx.arc | 円を描画してランドマークを表す |
| isHi | 選択中の番号かどうかで色や大きさを変える |

> 番号一覧からクリックすると、その点だけ色を変えて強調表示します。特定のランドマークがどこに対応するかを確認するのに役立ちます。

### 検出ステータスの表示

画面右側には、検出の状態や処理速度を表示しています。`requestAnimationFrame()` で繰り返し実行する `render()` の中で、毎フレーム更新しています。

```javascript
function render() {
    tickFps();
    const faces = estimateFaces(detector, videoEl, performance.now());
    drawResults(faces);
    updateStatus(faces);
    requestAnimationFrame(render);
}
```

| 表示項目 | 内容 |
| ---- | ---- |
| 顔の検出 | 顔が検出されているかどうか |
| 総ランドマーク数 | 検出された特徴点の総数（478） |
| 表示中の点数 | 選択中の部位に含まれる番号の数 |
| 処理速度 | 1秒あたりの描画回数（fps） |


## クォータニオン

`クォータニオン（Quaternion）` は、3D空間で物体の回転を表すための仕組みです。

通常、物体の回転は、X軸・Y軸・Z軸の3つの角度で表現できます。しかし、3つの軸を順番に回転させる方法では、回転の順序によって結果が変わったり、特定の角度で回転の自由度が失われる「ジンバルロック」という問題が発生したりします。

<img src="/storage/teaching_material/quaternion.png" class="" width="">

`クォータニオン` は、4つの数値（x, y, z, w）を使って回転を表し、これらの問題を回避しやすくします。

| 項目 | 内容 |
| ---- | ---- |
| Quaternion | 3D空間の回転を表す仕組み |
| x, y, z, w | 回転を表現する4つの数値 |
| Euler角 | X軸・Y軸・Z軸の3つの角度で回転を表現する方法 |
| ジンバルロック | 特定の角度で回転の自由度が失われる現象 |
| 用途 | 3Dモデルの回転、ゲーム、AR、ロボットなど |

### THREE.Quaternion
`Three.js` にはクォータニオン機能が搭載されています。

```javascript
const quaternion = new THREE.Quaternion();

quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    faceNormalVector
);

mesh.quaternion.copy(quaternion);
```

| 処理 | 内容 |
| ---- | ---- |
| new THREE.Quaternion() | 回転を表すオブジェクトを作成する |
| new THREE.Vector3(0, 0, 1) | 回転前の基準となるZ軸方向 |
| faceNormalVector | ランドマークから計算した顔の向き |
| setFromUnitVectors() | 基準方向から顔の向きへ回転するクォータニオンを求める |
| mesh.quaternion.copy() | 計算した回転をスタンプに適用する |

### 例
例えば、顔が右を向いた場合、`faceNormalVector` の方向も変化します。

`setFromUnitVectors()` は、基準となるZ軸方向から新しい顔の向きまでの回転を計算します。その結果を `mesh.quaternion` に設定することで、スタンプも顔の動きに合わせて回転します。

**処理の流れ**

```text
顔のランドマークを取得
        ↓
顔の向き（法線ベクトル）を計算
        ↓
基準方向（0, 0, 1）と比較
        ↓
クォータニオンで回転を計算
        ↓
mesh.quaternion に適用
        ↓
スタンプが顔の向きに合わせて回転
```

> `クォータニオン` の4つの数値を自分で計算する必要はありません。`three.js` の `setFromUnitVectors()` を使えば、2つの方向ベクトルから回転を求められます。ただし、2つの方向だけでは顔を左右に傾ける回転（ロール）までは一意に決まりません。今回の方法は、主に顔の法線方向にスタンプを向けるための簡易的な処理です。

## 顔スタンプ合成

`FaceLandmarker` の検出結果を使って、鼻の位置にスタンプ画像を合成するサンプルです。

<img src="/storage/teaching_material/js_mediapipe_face.png" class="" width="600">


画面の描画には `three.js` を使い、スタンプを平面（`Plane`）として顔の位置や向きに合わせて動かしています。

<img src="/storage/teaching_material/decoration-flow.svg" class="" width="800">


### three.jsで表示する準備

`Web Audio API` の `AudioContext` と同じように、`three.js` にも処理全体を管理する仕組みがあります。`シーン`、`カメラ`、`レンダラー` の3つを組み合わせて画面を作ります。

```javascript
renderer = new THREE.WebGLRenderer({ canvas: canvasEl, alpha: true });
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(fov, videoWidth / videoHeight, 1, 1000);
```

| 要素 | 役割 |
| ---- | ---- |
| WebGLRenderer | canvasに描画するための出力先 |
| Scene | オブジェクトを配置する空間 |
| PerspectiveCamera | 奥行きのある視点を作るカメラ |

### スタンプを平面として作る

スタンプ画像は、`PlaneGeometry` という平らな板に貼りつけて表示します。

```javascript
function createDecoPlane() {
    const geometry = new THREE.PlaneGeometry(ratio, 1);
    const texture = loader.load(`images/${currentFaceImage}.png`);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });

    mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(settings.scale, settings.scale, 0);
    scene.add(mesh);
}
```

| 処理 | 内容 |
| ---- | ---- |
| PlaneGeometry | 板状の形を作る |
| TextureLoader | 画像を読み込んでテクスチャにする |
| MeshBasicMaterial | 画像を貼りつける材質を作る |
| Mesh | 形と材質を組み合わせたオブジェクト |

> `transparent: true` を指定しているため、スタンプ画像の背景を透明にできます。

### 顔の位置にスタンプを合わせる

`updatemesh()` では、検出したランドマークの座標を使って、スタンプの位置を鼻の付近に合わせています。

```javascript
function updatemesh() {
    const quaternion = calculateNormalVector();
    mesh.quaternion.copy(quaternion);

    const landmark = fixLandmarkValue(results[0].keypoints);
    const position = landmark[settings.point];
    const faceCenter = new THREE.Vector3(
        position.x + positionX + settings.dx,
        position.y + positionY + settings.dy,
        position.z - zOffset,
    );
    mesh.position.copy(faceCenter);
}
```

| 処理 | 内容 |
| ---- | ---- |
| calculateNormalVector | 顔の向きを計算する |
| mesh.quaternion | スタンプの回転を顔の向きに合わせる |
| fixLandmarkValue | 座標をthree.js用の形式に変換する |
| mesh.position | スタンプの位置を顔の座標に合わせる |

### 顔の向きに合わせて回転させる

顔が傾いても不自然にならないように、鼻の周辺の3点から顔の向き（法線ベクトル）を計算し、スタンプの回転に反映しています。

```javascript
function calculateNormalVector() {
    const noseTip = landmark[1];
    const leftNose = landmark[279];
    const rightNose = landmark[49];

    const midpoint = {
        x: (leftNose.x + rightNose.x) / 2,
        y: (leftNose.y + rightNose.y) / 2,
        z: (leftNose.z + rightNose.z) / 2,
    };

    faceNormalVector = new THREE.Vector3(noseTip.x, noseTip.y, noseTip.z)
        .sub(new THREE.Vector3(midpoint.x, midpoint.y, midpoint.z))
        .normalize();

    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), faceNormalVector);
    return quaternion;
}
```

> 鼻の先端と、鼻の左右2点の中点を結んだ向きを、顔がカメラに正対しているときの向き（Z軸）と比較し、その差分を回転として求めています。

### 座標をthree.js用に変換する

`FaceLandmarker` の座標は、画面の左上を原点とする画像の座標系です。`three.js` では中心を原点とする座標系を使うため、`fixLandmarkValue()` で変換しています。

```javascript
function fixLandmarkValue(data) {
    return data.map((el) => ({
        x: el.x - videoEl.videoWidth / 2,
        y: -el.y + videoEl.videoHeight / 2,
        z: ((el.z / 100) * -1 + 1) * depthStrength,
    }));
}
```

| 変換 | 内容 |
| ---- | ---- |
| x座標 | 画面中央を原点にする |
| y座標 | 上下を反転し、画面中央を原点にする |
| z座標 | 奥行きの向きと強さを調整する |

### スタンプの切り替えと位置調整

画面下部のボタンから、スタンプ画像の切り替えと、上下左右への位置調整ができます。

```javascript
button.addEventListener('click', () => {
    positionX = 0;
    positionY = 0;
    currentFaceImage = name;
    updateFace();
});
```

| ボタン | 動作 |
| ---- | ---- |
| スタンプ切替ボタン | currentFaceImageを変更してスタンプを作り直す |
| 位置調整ボタン | positionX、positionYを5pxずつ増減する |

## 動作確認

`Web` カメラを使うため、ローカルサーバー経由で開きます。マイクと同じく、カメラの利用許可が表示されたら許可を選びます。

`recognition.html` では部位ボタンを押して、選んだパーツのランドマークが正しく表示されるか確認します。`decoration.html` ではスタンプ切替ボタンと位置調整ボタンを操作し、顔の動きにスタンプが追従するか確認します。

## まとめ

| 項目 | 内容 |
| ---- | ---- |
| FaceLandmarker | 顔から478個のランドマークを検出する機能 |
| detectForVideo | 動画フレームからランドマークを推定するメソッド |
| ランドマーク番号 | 顔の各パーツに対応する固定の番号 |
| three.js | 検出結果を使って3D的な表現を行うライブラリ |
| PlaneGeometry | スタンプ画像を貼りつける平面を作る形状 |
| クォータニオン | 顔の向きに合わせてオブジェクトを回転させる仕組み |
