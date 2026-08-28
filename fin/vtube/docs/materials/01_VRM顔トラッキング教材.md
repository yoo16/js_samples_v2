## この教材で学ぶこと

この教材では、`Vanilla JavaScript` で作られた `VTuber` 顔トラッキングアプリを題材にして、使われている技術とコードの基本を学びます。

| 項目 | 内容 |
| ---- | ---- |
| ESModule | JavaScript のファイル分割と読み込みの仕組み |
| import map | ライブラリ名と実際のファイル位置を結びつける設定 |
| MediaPipe | カメラ映像から顔の特徴点を検出する仕組み |
| VRM | 3Dアバターを扱うためのファイル形式 |
| Three.js | ブラウザで 3D を描画するためのライブラリ |

## このアプリの全体像

このアプリは、`Web` カメラで顔の向きを読み取り、その結果を `VRM` アバターの首や表情に反映するアプリです。

### 何をしているアプリか

処理の大きな流れは次のとおりです。

| 手順 | 内容 |
| ---- | ---- |
| 1 | `index.html` で画面と読み込み設定を用意 |
| 2 | `main.js` で画面初期化とイベント登録を実行 |
| 3 | `face-tracking.js` でカメラ映像から顔情報を取得 |
| 4 | `vrm.js` で `VRM` モデルを読み込み、姿勢を整える |
| 5 | 毎フレームごとに顔情報を `VRM` に反映 |

### ファイル構成

```txt
index.html
css/
  styles.css
js/
  main.js
  face-tracking.js
  vrm.js
vendor/
  three/
  @mediapipe/
  @pixiv/
```

`js/main.js` が全体の司令塔で、`js/face-tracking.js` が顔認識、`js/vrm.js` がアバター操作を担当しています。

## ESModuleとは

`ESModule` は、`JavaScript` のコードをファイルごとに分けて、必要な機能を読み込める仕組みです。

### なぜ使うのか

1つの長いファイルにすべてを書くと、どこに何があるのか分かりにくくなります。`ESModule` を使うと、役割ごとにファイルを分けられます。

| 分け方 | 内容 |
| ---- | ---- |
| main.js | アプリ起動と画面制御 |
| face-tracking.js | 顔検出と数値化 |
| vrm.js | VRM 読み込みとアバター反映 |

### import と export

`ESModule` では、他のファイルで使いたい機能を `export` し、使う側で `import` します。

```js
import {
  createFaceDetector,
  getSmoothedFaceFrame,
  startCameraStream,
} from './face-tracking.js';
```

このコードは、`face-tracking.js` で公開された関数を `main.js` に読み込んでいます。

### type="module"

このアプリでは、`index.html` で `main.js` をモジュールとして読み込んでいます。

```html
<script type="module" src="js/main.js"></script>
```

`type="module"` を付けることで、その `JavaScript` ファイルの中で `import` と `export` が使えるようになります。

## import mapとは

`import map` は、ライブラリ名と実際のファイル位置を対応づける仕組みです。

### このアプリでの役割

通常、`import 'three'` のような書き方は、そのままではブラウザがどのファイルを読むべきか分かりません。そこで `import map` を使って、`three` がどのファイルなのかを事前に教えます。

```html
<script type="importmap">
  {
    "imports": {
      "three": "./vendor/three/build/three.module.js",
      "@pixiv/three-vrm": "./vendor/@pixiv/three-vrm/lib/three-vrm.module.js",
      "@mediapipe/tasks-vision": "./vendor/@mediapipe/tasks-vision/vision_bundle.mjs"
    }
  }
</script>
```

これによって、`JavaScript` 側では長いファイルパスを書かずにライブラリ名だけで読み込めます。

## MediaPipeとは

`MediaPipe` は、画像や動画から人の顔・手・体などを認識するためのライブラリ群です。このアプリでは、その中の `Face Landmarker` を使っています。

### Face Landmarkerの役割

`Face Landmarker` は、顔の輪郭や目、口、鼻などの位置を細かい点として返します。この点を `landmark` と呼びます。

| 取得する情報 | このアプリでの使い道 |
| ---- | ---- |
| 目の位置 | まばたきの判定 |
| 鼻や頬の位置 | 顔の左右向きの判定 |
| 額とあごの位置 | 顔の上下向きの判定 |
| 唇の位置 | 口の開き具合の判定 |

### このアプリでの使い方

`face-tracking.js` では、`FaceLandmarker` を作って動画フレームごとに検出しています。

```js
const result = detector.detectForVideo(video, now);
const landmarks = result.faceLandmarks[0];
```

ここで `video` はカメラ映像、`landmarks` は顔の特徴点です。

> `MediaPipe` 自体が顔の向きを直接返しているのではなく、特徴点の位置からアプリ側で向きや表情を計算しています。

## VRMとは

`VRM` は、人型の 3D アバターを扱いやすくするためのファイル形式です。`glTF` をもとにしながら、表情や骨情報などが追加されています。

### VRMで扱えるもの

| 項目 | 内容 |
| ---- | ---- |
| Humanoid | 頭や腕などの骨情報 |
| Expression | まばたきや口の形などの表情情報 |
| Scene | 3Dモデル全体 |

### このアプリで使っている機能

このアプリでは、主に次の2つを使っています。

| 機能 | 内容 |
| ---- | ---- |
| 頭や首の回転 | 顔の向きに合わせてアバターを動かす処理 |
| 表情変更 | まばたきと口の開閉を反映する処理 |

## Three.jsとは

`Three.js` は、ブラウザで 3D 表示を行うための `JavaScript` ライブラリです。

### このアプリで使う主な要素

| 要素 | 内容 |
| ---- | ---- |
| Scene | 3D空間全体 |
| Camera | どこから 3D空間を見るか |
| Renderer | 3D空間を `canvas` に描画する仕組み |
| Light | モデルを見やすく照らす光 |

`main.js` では、これらを組み合わせて `VRM` アバターを表示しています。

## 画面と起動処理の読み方

この章では、`index.html` と `main.js` を中心に、アプリがどのように起動して動き始めるのかを見ていきます。

## index.htmlの役割

`index.html` は、画面に必要な部品を置き、どの `JavaScript` を読み込むかを決めるファイルです。

### 画面の主な部品

| 要素 | 内容 |
| ---- | ---- |
| canvas | 3Dアバターの表示領域 |
| video | カメラ映像の保持 |
| input type="file" | VRM ファイルの選択 |
| button | カメラ開始と姿勢リセット |
| output | 顔の向きや表情値の表示 |

### 画面の中心部分

```html
<section class="stage">
  <canvas id="avatar-canvas" aria-label="VRM avatar preview"></canvas>
  <video id="camera-video" playsinline muted></video>
</section>
```

`canvas` は `Three.js` が描画する場所です。`video` はカメラ映像を表示・保持するために使います。

## main.jsの役割

`main.js` は、アプリ全体の流れを制御するファイルです。イベント登録、初期化、描画ループの開始を担当します。

### importしているもの

```js
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
```

この読み込みによって、`main.js` は顔追跡と `VRM` 制御の機能を利用できます。

### elementsの考え方

```js
const elements = {
  canvas: document.querySelector('#avatar-canvas'),
  video: document.querySelector('#camera-video'),
  vrmFile: document.querySelector('#vrm-file'),
  startCamera: document.querySelector('#start-camera'),
};
```

`document.querySelector()` は、`HTML` の部品を取得するための基本的な関数です。よく使う要素を最初にまとめておくと、後から何度も探し直さずに済みます。

### stateの考え方

```js
const state = {
  detector: null,
  currentVrm: null,
  frame: structuredClone(DEFAULT_FRAME),
  lastDebugUpdate: 0,
};
```

`state` は、アプリの現在の状態をまとめたオブジェクトです。

| プロパティ | 内容 |
| ---- | ---- |
| detector | 顔検出器 |
| currentVrm | 現在表示している VRM モデル |
| frame | 今の顔情報 |
| lastDebugUpdate | デバッグ表示を更新した時刻 |

## 起動時の流れ

アプリは、ファイルが読み込まれた直後に `boot()` を実行します。

```js
const sceneState = createScene(elements.canvas);
const clock = new Clock();

boot();
```

### bootがしていること

```js
async function boot() {
  resizeRenderer();
  window.addEventListener('resize', resizeRenderer);
  elements.startCamera.addEventListener('click', startCamera);
  elements.vrmFile.addEventListener('change', handleVrmFile);
  elements.resetPose.addEventListener('click', resetPose);

  requestAnimationFrame(renderLoop);
  await initializeFaceDetector();
}
```

ここでは、主に次の処理を行っています。

| 処理 | 内容 |
| ---- | ---- |
| 画面サイズ調整 | `canvas` の大きさを合わせる処理 |
| イベント登録 | ボタンクリックやファイル選択の反応を設定 |
| 描画ループ開始 | 毎フレームの処理を始める設定 |
| 顔検出器初期化 | `MediaPipe` の準備 |

## イベント処理の基本

### カメラ開始ボタン

```js
elements.startCamera.addEventListener('click', startCamera);
```

このコードは、ボタンがクリックされたら `startCamera()` を実行する、という意味です。

### VRMファイル選択

```js
elements.vrmFile.addEventListener('change', handleVrmFile);
```

`change` は、ファイル選択の内容が変わったときに発生するイベントです。

## Three.jsの初期化

`createScene()` は、3D表示の土台を作る関数です。

```js
function createScene(canvas) {
  const scene = new Scene();
  const camera = new PerspectiveCamera(24, 1, 0.1, 100);
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });

  const root = new Group();
  scene.add(root);

  const ambient = new AmbientLight('#ffffff', 1.7);
  scene.add(ambient);
}
```

### ここで作っているもの

| 変数 | 内容 |
| ---- | ---- |
| scene | 3D空間全体 |
| camera | 見る位置と角度 |
| renderer | `canvas` への描画担当 |
| root | VRM をまとめて置く入れ物 |
| light | モデルを照らす光 |

## 描画ループとは

ブラウザでアニメーションを動かすときは、1回描画して終わりではなく、繰り返し処理を続けます。このアプリでは `renderLoop()` がその役割です。

```js
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
```

### renderLoopの流れ

| 順番 | 内容 |
| ---- | ---- |
| 1 | 次のフレームでも自分を呼び出す |
| 2 | 顔情報を取得して `state.frame` を更新 |
| 3 | `VRM` があれば姿勢と表情を反映 |
| 4 | 画面右側の数値表示を更新 |
| 5 | 3D画面を再描画 |

> `requestAnimationFrame()` は、画面の更新タイミングに合わせて処理してくれるため、アニメーション処理でよく使われます。

## エラー表示の基本

このアプリでは、初期化やカメラ起動で失敗したとき、状態表示の文字列を更新しています。

```js
try {
  setText(elements.cameraStatus, 'requesting');
  await startCameraStream(elements.video);
  setText(elements.cameraStatus, 'running');
} catch (error) {
  setText(elements.cameraStatus, `error: ${toMessage(error)}`);
}
```

`try` は成功するかもしれない処理を実行する部分で、`catch` は失敗したときの処理です。

## 顔検出とVRM制御の読み方

この章では、`face-tracking.js` と `vrm.js` を見ながら、顔の情報がどのように数値になり、どのように `VRM` に反映されるのかを学びます。

## face-tracking.jsの役割

`face-tracking.js` は、カメラ映像をもとに顔の向き、まばたき、口の開き具合を計算するファイルです。

### DEFAULT_FRAMEとは

```js
export const DEFAULT_FRAME = {
  detected: false,
  head: { yaw: 0, pitch: 0, roll: 0 },
  eyes: { leftBlink: 0, rightBlink: 0 },
  mouth: { open: 0 },
};
```

これは、顔が見つからないときの基本値です。

| 項目 | 内容 |
| ---- | ---- |
| detected | 顔が見つかったかどうか |
| yaw | 左右の向き |
| pitch | 上下の向き |
| roll | 首の傾き |
| leftBlink / rightBlink | まばたき量 |
| mouth.open | 口の開き量 |

## Face Landmarkerの初期化

顔検出器は `createFaceDetector()` で作られます。

```js
export async function createFaceDetector() {
  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE);
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MEDIAPIPE_MODEL_ASSET,
    },
    numFaces: 1,
    runningMode: 'VIDEO',
  });
}
```

### 設定の意味

| 設定 | 内容 |
| ---- | ---- |
| FilesetResolver | `WASM` ファイルの読み込み準備 |
| modelAssetPath | 学習済みモデルの場所 |
| numFaces | 検出する顔の数 |
| runningMode | 動画向けの検出モード |

`WASM` は `WebAssembly` の略で、ブラウザで高速に動くプログラム形式です。`MediaPipe` は重い処理を `WASM` で実行しています。

## カメラ映像の取得

```js
export async function startCameraStream(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user',
    },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
}
```

`navigator.mediaDevices.getUserMedia()` は、ブラウザでカメラやマイクの使用許可を求める基本的な `Web API` です。

> この処理は `localhost` または `HTTPS` で動かす必要があります。

## 顔情報を毎フレーム更新する処理

`main.js` から呼ばれる中心関数が `getSmoothedFaceFrame()` です。

```js
export function getSmoothedFaceFrame({ detector, video, now, currentFrame }) {
  if (!detector || !isVideoReady(video)) {
    return smoothFrame(currentFrame, DEFAULT_FRAME);
  }

  try {
    const result = detector.detectForVideo(video, now);
    const landmarks = result.faceLandmarks[0];
    const nextFrame = landmarks ? analyzeLandmarks(landmarks) : DEFAULT_FRAME;
    return smoothFrame(currentFrame, nextFrame);
  } catch {
    return smoothFrame(currentFrame, DEFAULT_FRAME);
  }
}
```

### この関数がしていること

| 順番 | 内容 |
| ---- | ---- |
| 1 | 検出器と動画の準備ができているか確認 |
| 2 | `MediaPipe` で特徴点を取得 |
| 3 | 特徴点から顔の向きと表情を計算 |
| 4 | 前の値と少し混ぜて滑らかにする |

## 顔の向きをどう計算しているか

顔の向きは、目・鼻・頬・額・あごの位置関係から求めています。

```js
return {
  yaw: clamp(((yawBase - noseTip.x) / yawScale) * LIMITS.yaw, -LIMITS.yaw, LIMITS.yaw),
  pitch: clamp(((eyesMidpointY - noseTip.y) / pitchScale) * LIMITS.pitch, -LIMITS.pitch, LIMITS.pitch),
  roll: clamp(Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x), -LIMITS.roll, LIMITS.roll),
};
```

### それぞれの意味

| 項目 | 内容 |
| ---- | ---- |
| yaw | 鼻が顔の中心からどちらに寄っているか |
| pitch | 鼻が目と比べて上下どちらにあるか |
| roll | 左右の目の傾き |

厳密な 3D 姿勢推定ではありませんが、初学者向けの構成として分かりやすく、軽量に動かせる方法です。

## まばたきと口の開きの計算

### まばたき

目の上下の距離と、目尻から目頭までの横幅を比べています。

```js
const eyeHeight = distance2D(upper, lower);
const eyeWidth = distance2D(outer, inner);
return clamp(1 - normalize(eyeHeight / eyeWidth, 0.16, 0.3), 0, 1);
```

目が閉じると上下の距離が小さくなるため、まばたき量が大きくなります。

### 口の開き

```js
return normalize(distance2D(upperLip, lowerLip) / faceSize, 0.015, 0.12);
```

唇の上下の距離を顔サイズで割ることで、顔の大きさが違っても使いやすい値にしています。

## smoothFrameの考え方

顔検出の値は毎フレーム少しずつ揺れます。そのまま `VRM` に反映すると、アバターが細かく震えて見えることがあります。そこで `smoothFrame()` で補間しています。

```js
yaw: lerp(current.head.yaw, next.head.yaw, SMOOTHING.head)
```

`lerp` は「今の値」と「次の値」の間を少しだけ進める計算です。

| 利点 | 内容 |
| ---- | ---- |
| 揺れの軽減 | 急な数値変化を和らげる効果 |
| 見た目の自然さ | アバターの動きが滑らかになる効果 |

## vrm.jsの役割

`vrm.js` は、`VRM` ファイルの読み込みと、顔情報の反映を担当するファイルです。

## VRMファイルの読み込み

```js
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
    return vrm;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
```

### ここで大事な点

| 項目 | 内容 |
| ---- | ---- |
| GLTFLoader | 3Dモデル読み込み担当 |
| VRMLoaderPlugin | VRM 拡張情報の解析担当 |
| object URL | ローカルファイルを一時的に読み込むための URL |
| revokeObjectURL | 読み込み後の後片付け |

## モデルの位置と姿勢を整える

`prepareVRMForFaceStage()` は、読み込んだ `VRM` を見やすい位置に調整します。

```js
export function prepareVRMForFaceStage(vrm) {
  VRMUtils.rotateVRM0(vrm);
  applyNaturalArmPose(vrm);
  fitVRMFaceToStage(vrm);
}
```

### していること

| 処理 | 内容 |
| ---- | ---- |
| rotateVRM0 | モデルの向きを整える処理 |
| applyNaturalArmPose | 腕を自然な角度に設定 |
| fitVRMFaceToStage | 顔が中央に来るように位置と拡大率を調整 |

## 顔情報をVRMに反映する

`applyTrackingToVRM()` は、顔検出の結果を実際のアバターの骨と表情に反映する関数です。

```js
if (head) {
  head.rotation.set(frame.head.pitch, frame.head.yaw, -frame.head.roll, 'XYZ');
}

if (neck) {
  neck.rotation.set(frame.head.pitch * 0.35, frame.head.yaw * 0.35, -frame.head.roll * 0.2, 'XYZ');
}
```

頭は大きく、首は少しだけ追従させることで、見た目を自然にしています。

### 表情反映

```js
setExpression(vrm, VRMExpressionPresetName.BlinkLeft, frame.eyes.leftBlink);
setExpression(vrm, VRMExpressionPresetName.BlinkRight, frame.eyes.rightBlink);
setExpression(vrm, VRMExpressionPresetName.Aa, frame.mouth.open);
```

| 表情名 | 内容 |
| ---- | ---- |
| BlinkLeft | 左目のまばたき |
| BlinkRight | 右目のまばたき |
| Aa | 口の開き |

## リセットと後片付け

`resetVRMPose()` は頭と首の回転を戻し、腕の姿勢も初期状態に近い形へ戻します。`disposeObject()` は不要になったモデルの `geometry` や `material` を破棄して、メモリ使用量が増えすぎないようにしています。

## まとめ

| 項目 | 内容 |
| ---- | ---- |
| ESModule | JavaScript を役割ごとに分割して読み込む仕組み |
| import map | ライブラリ名と実ファイルを対応づける設定 |
| MediaPipe | カメラ映像から顔の特徴点を検出する技術 |
| VRM | 人型 3Dアバターを扱うための形式 |
| Three.js | ブラウザで 3D描画を行うためのライブラリ |
| boot | 起動時の初期化処理 |
| renderLoop | 毎フレーム実行される中心処理 |
| getSmoothedFaceFrame | 顔検出から平滑化までをまとめた処理 |
| applyTrackingToVRM | 顔情報を骨と表情に反映する処理 |
