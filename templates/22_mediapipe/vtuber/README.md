## アプリ概要

`FaceLandmarker`（顔）と `PoseLandmarker`（体）でカメラ映像から検出した動きを、`three-vrm` を使って `VRM` アバターに反映するアプリです。`face` フォルダで作った「顔の向き・まばたき・口の開き」の数値を、画像へのスタンプ合成ではなく、3Dキャラクターのボーンと表情に適用する点が違いです。

| 項目 | 内容 |
| ---- | ---- |
| VRM | 3Dアバター（人型モデル）の共通フォーマット |
| three-vrm | three.jsでVRMモデルを読み込み・操作するためのライブラリ |
| FaceLandmarker | 顔の向き・まばたき・口の開きを検出する（`face`フォルダと同じ機能） |
| PoseLandmarker | 肩や上半身の動きを検出する（`pose`フォルダと同じ機能、任意機能として使用） |

> `FaceLandmarker` や `PoseLandmarker` そのものの基本（`Wasm`・`.task`ファイルの役割など）は `finger` フォルダの `README.md` で説明しています。まだ読んでいない場合は先にそちらを確認してください。

## VRMとは

`VRM` は、人型の3Dモデルをアプリやサービスをまたいで扱えるようにした、オープンなファイルフォーマットです。

<img src="/storage/teaching_material/vrm_model.png" class="" width="500">

`glTF` という3Dモデルの標準形式をベースに、人型ボーンの構成や表情（ブレンドシェイプ）の名前などを共通のルールとして決めているため、`VRM` に対応したアプリであれば、どのモデルでも同じコードでボーンや表情を扱えます。

| 項目 | 内容 |
| ---- | ---- |
| VRM | 人型3Dモデルの共通フォーマット（拡張子 `.vrm`） |
| ベース形式 | glTF（3Dモデルの標準フォーマット） |
| 標準化されている情報 | 人型ボーンの構成、表情（まばたき・口の形など）の名前、揺れもの（髪・スカートなど）の設定 |
| メリット | モデルを差し替えても、ボーン名や表情名を指定するコードは変更しなくてよい |

> このサンプルで `head.rotation` や `VRMExpressionPresetName.Blink` のように、モデルの中身を意識せずボーンや表情を指定できているのは、`VRM` がこれらの名前を規格として統一しているためです。

### VRMモデルを作る

`VRM` モデルは、主に次のような方法で用意できます。

| 方法 | 内容 |
| ---- | ---- |
| VRoid Studio | イラストのように顔・髪型・服装のパーツを選んでキャラクターを作成できる無料の3Dキャラクター制作ソフト。作成したモデルはそのまま`.vrm`として書き出せる |
| 既存の3Dモデルを変換 | Blenderなどの3DCGソフトで作った人型モデルに、ボーンや表情を`VRM`の規格に合わせて設定し、書き出しプラグインで`.vrm`に変換する |
| 配布・購入済みのモデルを使う | 既に`.vrm`形式で配布・販売されているモデルをそのまま利用する |

<img src="/storage/teaching_material/vroid_studio_site.png" class="" width="">

> `VRoid Studio` はプログラミングの知識がなくてもキャラクターを作れるため、初めて `VRM` モデルを用意する場合に扱いやすい方法です。

### VRMモデルを入手する

自分で作らなくても、配布サービスから `VRM` モデルをダウンロードして試すことができます。

| 入手元 | 内容 |
| ---- | ---- |
| VRoid Hub | VRoid Studioで作られたモデルを公開・ダウンロードできる配布プラットフォーム |
| pixiv / BOOTH | クリエイターが制作した`VRM`モデルを無料・有料で配布しているケースがある |
| サンプルモデル | `three-vrm`など各ライブラリが動作確認用に配布しているサンプルモデル |

> モデルによって利用条件（商用利用の可否、改変の可否など）が異なります。ダウンロードしたモデルを使うときは、配布元が示すライセンスを必ず確認してください。無料でも「個人利用のみ」「クレジット表記が必要」といった条件がついている場合があります。

### ファイル構成

```txt
vtuber/
  index.html            ... カメラ映像・VRM表示・操作パネルを表示する画面
  js/
    main.js               ... 全体の初期化と描画ループ、index.htmlの画面制御
    vrm.js                 ... VRMモデルの読み込みと、検出結果をボーン・表情へ反映する処理
    face-tracking.js       ... FaceLandmarkerの生成と、頭の向き・まばたき・口の開きの計算
    pose-tracking.js       ... （任意機能）PoseLandmarkerの生成と、肩の角度・上半身の捻りの計算
    vrm-arm-pose.js         ... （任意機能）pose-tracking.jsの結果をVRMの腕・胸ボーンへ反映する処理

vendor/                   ... face・finger・pose・vtuberが共有するライブラリ置き場
  @mediapipe/
    models/                 ... 学習済みモデル本体（.task）
    tasks-vision/           ... MediaPipe Tasks VisionのJS本体とWasm
  three/                    ... three.js本体
  @pixiv/
    three-vrm/               ... VRMモデルを扱うライブラリ
  tailwindcss/              ... レイアウト用のTailwind CSS（standaloneビルド）
```

> `pose-tracking.js` と `vrm-arm-pose.js` は、肩・上半身の捻りをPoseで動かす追加機能です。この2ファイルを削除し `main.js`・`index.html` の該当箇所を戻すだけで、顔トラッキングのみの構成に戻せます。
>
> レイアウトは `face`・`finger`・`pose` と同じく `vendor/tailwindcss/tailwindcss.js` を読み込み、`index.html` 内でTailwindのユーティリティクラスを直接指定しています。専用のCSSファイルは使用していません。

## VRMモデルを読み込む

### importmapでライブラリを読み込む

`three.js` 本体と `three-vrm`、`MediaPipe Tasks Vision` は、いずれも `vendor/` フォルダに同梱したものを `importmap` で読み込みます。CDNを使わないため、インターネット接続がなくても動作します。

```html
<script type="importmap">
  {
    "imports": {
      "three": "../vendor/three/build/three.module.js",
      "three/": "../vendor/three/",
      "three/examples/jsm/loaders/GLTFLoader.js": "../vendor/three/examples/jsm/loaders/GLTFLoader.js",
      "@pixiv/three-vrm": "../vendor/@pixiv/three-vrm/lib/three-vrm.module.js",
      "@mediapipe/tasks-vision": "../vendor/@mediapipe/tasks-vision/vision_bundle.mjs"
    }
  }
</script>
```

| 項目 | 内容 |
| ---- | ---- |
| importmap | `import`文で書いたモジュール名を、実際のファイルパスに対応づける仕組み |
| GLTFLoader | VRMのベースになっている`glTF`形式のファイルを読み込むローダー |
| three-vrm | GLTFLoaderにVRM対応を追加するライブラリ |

### VRMファイルを読み込む

`VRM` ファイル（`.vrm`）は `glTF` 形式をベースにしています。`GLTFLoader` に `VRMLoaderPlugin` を登録することで、読み込んだ結果からVRM専用の情報（ボーン構成や表情など）を取り出せるようになります。

```javascript
export async function loadVRM(file) {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const objectUrl = URL.createObjectURL(file);

    const gltf = await loader.loadAsync(objectUrl);
    const vrm = gltf.userData.vrm;
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    return vrm;
}
```

| 処理 | 内容 |
| ---- | ---- |
| URL.createObjectURL(file) | `<input type="file">`で選んだファイルを、ローダーが読み込めるURLに変換する |
| loader.register() | GLTFLoaderにVRM対応のプラグインを追加する |
| gltf.userData.vrm | 読み込んだVRMの情報（ボーン・表情・シーンなど）が入ったオブジェクト |
| VRMUtils.removeUnnecessaryVertices | 表示に不要な頂点データを削除し、軽量化する |

> `index.html` の `<input id="vrm-file" type="file">` で任意の `.vrm` ファイルを選ぶと、`handleVrmFile()` がこの `loadVRM()` を呼び出してアバターを差し替えます。

### 表示位置とサイズを合わせる

VRMモデルは、制作時のスケールや原点の位置がモデルごとに異なります。`prepareVRMForFaceStage()` では、モデルの向きを揃え、大きさと位置をカメラの構図に合わせています。

```javascript
function fitVRMFaceToStage(vrm) {
    const bounds = new Box3().setFromObject(scene);
    const size = bounds.getSize(new Vector3());

    const targetHeight = 3.0;
    const scale = targetHeight / size.y;
    scene.scale.setScalar(scale);

    const focus = getVRMFaceFocus(vrm);
    const target = new Vector3(0, 0.35, 0);
    scene.position.add(target.sub(focus));
}
```

| 処理 | 内容 |
| ---- | ---- |
| Box3().setFromObject() | モデル全体を囲む直方体（バウンディングボックス）を求める |
| bounds.getSize() | バウンディングボックスの縦・横・奥行きのサイズを取得する |
| scene.scale.setScalar(scale) | 身長が一定の高さになるよう、モデル全体を拡大・縮小する |
| getVRMFaceFocus(vrm) | 頭のボーン位置を取得し、顔がカメラの中心に来るよう位置を調整する |

> `VRMUtils.rotateVRM0()` は、VRM 0.x 系のモデルに多い「正面がマイナスZ軸を向いている」向きを、three.js標準の向きに揃えるための処理です。

## 顔の動きをVRMに反映する

### FaceLandmarkerで頭の向きを計算する

`face-tracking.js` の `createFaceDetector()` は `face` フォルダと同じ仕組みで `FaceLandmarker` を生成します。違うのは検出結果の使い方で、ここでは座標そのものではなく、頭の回転角（yaw・pitch・roll）とまばたき・口の開き具合という「数値」に変換します。

```javascript
function calculateHeadRotation(landmarks) {
    const leftEye = landmarks[LANDMARK_INDEX.leftEyeOuter];
    const rightEye = landmarks[LANDMARK_INDEX.rightEyeOuter];
    const noseTip = landmarks[LANDMARK_INDEX.noseTip];

    return {
        yaw: clamp(((yawBase - noseTip.x) / yawScale) * LIMITS.yaw, -LIMITS.yaw, LIMITS.yaw),
        pitch: clamp(((eyesMidpointY - noseTip.y) / pitchScale) * LIMITS.pitch, -LIMITS.pitch, LIMITS.pitch),
        roll: clamp(Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x), -LIMITS.roll, LIMITS.roll),
    };
}
```

| 角度 | 求め方 | 意味 |
| ---- | ---- | ---- |
| yaw（左右の首振り） | 頬の中心と鼻先のx座標のずれ | 顔が左右どちらを向いているか |
| pitch（上下のうなずき） | 両目の中心と鼻先のy座標のずれ | 顔が上下どちらを向いているか |
| roll（首かしげ） | 左右の目を結んだ線の傾き（`atan2`） | 顔が左右にどれだけ傾いているか |

> `LIMITS` で角度の最大値を制限しているのは、鼻や目の検出が一瞬ぶれたときに、アバターの首が不自然に大きく動いてしまうのを防ぐためです。

### まばたきと口の開きを計算する

まばたきは「目の縦幅÷横幅」の比率が、口の開きは「唇の上下間隔÷顔の縦幅」の比率が、それぞれの開閉具合に対応します。距離をそのまま使わず比率にすることで、顔がカメラに近づいたり遠ざかったりしても数値がぶれにくくなります。

```javascript
function calculateEyeBlink(landmarks, upperIndices, lowerIndices, outerIndex, innerIndex) {
    const eyeHeight = distance2D(upper, lower);
    const eyeWidth = distance2D(outer, inner);
    return clamp(1 - normalize(eyeHeight / eyeWidth, 0.16, 0.3), 0, 1);
}
```

| 関数 | 内容 |
| ---- | ---- |
| distance2D | 2点間の距離を求める |
| normalize(value, min, max) | 値をmin〜maxの範囲から0〜1の範囲に変換する |
| calculateEyeBlink | 目の縦横比が閉じるほど1に近づく値を返す |
| calculateMouthOpen | 唇の間隔が広いほど1に近づく値を返す |

### 値をなめらかに変化させる

検出結果は毎フレーム細かくぶれるため、そのままVRMに適用すると表情が小刻みに震えて見えます。`smoothFrame()` では、前フレームの値と新しい値を一定の割合で混ぜ合わせる「線形補間（lerp）」で、動きをなめらかにしています。

```javascript
const SMOOTHING = { head: 0.22, blink: 0.42, mouth: 0.32 };

function lerp(from, to, amount) {
    return from + (to - from) * amount;
}
```

| 引数 | 内容 |
| ---- | ---- |
| from | 現在表示している値 |
| to | 今フレームで検出した新しい値 |
| amount | 新しい値にどれだけ近づけるか（0に近いほどゆっくり、1に近いほど即座に反映） |

> 顔が検出できなかったフレームでは、目標値を`DEFAULT_FRAME`（正面向き・まばたきなし）として`lerp`することで、表情が急に固まらず自然に正面へ戻ります。

### VRMのボーンと表情に反映する

`vrm.js` の `applyTrackingToVRM()` が、計算した数値を実際にVRMへ適用する処理です。頭の回転は `humanoid` のボーンに、まばたきと口の開きは表情（`expressionManager`）に反映します。

```javascript
export function applyTrackingToVRM(vrm, frame) {
    const head = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
    head.rotation.set(frame.head.pitch, frame.head.yaw, -frame.head.roll, 'XYZ');

    setExpression(vrm, VRMExpressionPresetName.Blink, Math.max(frame.eyes.leftBlink, frame.eyes.rightBlink));
    setExpression(vrm, VRMExpressionPresetName.Aa, frame.mouth.open);
}
```

| 項目 | 内容 |
| ---- | ---- |
| vrm.humanoid | VRMの人型ボーン構成を扱うオブジェクト |
| getNormalizedBoneNode(VRMHumanBoneName.Head) | 「頭」ボーンを、モデルごとの姿勢差を正規化した状態で取得する |
| vrm.expressionManager | まばたきや口の形など、表情のブレンドシェイプを扱うオブジェクト |
| VRMExpressionPresetName.Blink / Aa | VRM規格で決まっている、まばたき・「あ」の口形の名前 |

首（`Neck`）にも同じ回転を少し弱めた割合（`0.35`倍など）で適用しているのは、頭だけでなく首も一緒に動くことで、動きに自然な厚みを出すためです。

## 描画ループとUI

`main.js` の `renderLoop()` は、`requestAnimationFrame` で毎フレーム呼ばれ、検出・反映・描画を一続きの処理としてまとめています。

```javascript
function renderLoop(now) {
    requestAnimationFrame(renderLoop);

    state.frame = getSmoothedFaceFrame({ detector: state.detector, video: elements.video, now, currentFrame: state.frame });

    if (state.currentVrm) {
        applyTrackingToVRM(state.currentVrm, state.frame);
        state.currentVrm.update(clock.getDelta());
    }

    sceneState.renderer.render(sceneState.scene, sceneState.camera);
}
```

```text
カメラ映像
    ↓
FaceLandmarkerで顔を検出
    ↓
頭の向き・まばたき・口の開きを計算
    ↓
lerpでなめらかに変化させる
    ↓
VRMのボーン・表情に反映
    ↓
vrm.update() でモデルを更新
    ↓
three.jsでcanvasに描画
```

| 処理 | 内容 |
| ---- | ---- |
| vrm.update(clock.getDelta()) | 前回の描画からの経過時間をもとに、VRM内部のアニメーション（バネ物理など）を進める |
| renderer.render() | シーンをカメラの視点でcanvasに描画する |
| resetPose() | 頭・首の回転と腕の姿勢を初期状態に戻す |

## （応用）Poseで肩・上半身の捻りを動かす

`「肩・上半身の捻りをPoseで動かす」` のチェックボックスをオンにすると、`PoseLandmarker` を追加で起動し、肩の上げ下げと上半身の捻りをVRMに反映します。顔だけでなく体の動きも加わることで、より自然な印象になります。

### 肩の角度を計算する

肩の角度は、`pose` フォルダと同じ「3点から角度を求める」方法（`腰・肩・ひじ`）で計算します。腕を体の横に下ろすと約20°、水平に上げると約90°、真上に上げると約180°になります。

```javascript
function analyzeLandmarks(landmarks) {
    return {
        detected: true,
        left: { shoulderDeg: angleAt(leftHip, leftShoulder, leftElbow) },
        right: { shoulderDeg: angleAt(rightHip, rightShoulder, rightElbow) },
        twistRad: calculateTwist(leftShoulder, rightShoulder),
    };
}
```

### 上半身の捻りをキャリブレーションする

体の捻りは、左肩と右肩を結んだ線の向き（x座標とz座標）から推定します。ただし単眼カメラのz座標は絶対値としての精度が高くないため、絶対角度ではなく「トラッキングを始めた瞬間の向き」からの相対角度として扱います。

```javascript
function calculateTwist(leftShoulder, rightShoulder) {
    const rawAngle = Math.atan2(leftShoulder.z - rightShoulder.z, leftShoulder.x - rightShoulder.x);

    if (twistRestAngle === null) {
        twistRestAngle = rawAngle;
        return 0;
    }
    return normalizeAngle(rawAngle - twistRestAngle);
}
```

| 項目 | 内容 |
| ---- | ---- |
| twistRestAngle | トラッキング開始時（チェックボックスをオンにした瞬間）の肩の向き |
| calculateTwist | 現在の向きと基準の向きとの差分を捻り角度とする |
| resetTwistCalibration() | 基準の向きをリセットし、次に検出できたフレームを新しい基準にする |

> チェックボックスをオンにするたびに `resetTwistCalibration()` が呼ばれます。カメラに対して体が正面を向いた状態でオンにすると、捻りが正しく検出されます。

### VRMの腕・胸ボーンに反映する

`vrm-arm-pose.js` の `applyArmTrackingToVRM()` が、計算した肩の角度と捻り角度をVRMの `UpperArm`（上腕）と `Chest`（胸）ボーンに反映します。

```javascript
function setUpperArm(vrm, boneName, shoulderDeg, sign) {
    const node = vrm.humanoid?.getNormalizedBoneNode(boneName);
    const z = sign * (REST_SHOULDER_DEG - shoulderDeg) * DEG2RAD;
    node.rotation.set(0, 0, z, 'XYZ');
}

function setTwist(vrm, twistRad) {
    const chest = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Chest);
    const clamped = Math.max(-TWIST_MAX_RAD, Math.min(TWIST_MAX_RAD, twistRad));
    chest.rotation.set(0, SIGN.twist * clamped, 0, 'XYZ');
}
```

| 項目 | 内容 |
| ---- | ---- |
| REST_SHOULDER_DEG | 基準とする角度（T-poseに相当する90°） |
| TWIST_MAX_RAD | 捻りの最大角度（約34°）。単眼カメラの精度を考慮して控えめに制限 |
| LeftUpperArm / RightUpperArm | 左右の上腕ボーン |
| Chest | 胸（上半身）のボーン |

> ひじ（`LowerArm`）は反映の対象外にしています。ひじを曲げると手のひらの向きが不自然になり、手首側の補正も別途必要になるためです。

## 動作確認

`Web` カメラを使うため、ローカルサーバー経由で開きます。カメラの利用許可が表示されたら許可を選びます。

1. 「VRMモデル」から `.vrm` ファイルを選択し、アバターが表示されることを確認します。
2. 「カメラ開始」ボタンを押し、顔を動かして頭の向き・まばたき・口の開きにアバターが追従するか確認します。
3. 「姿勢リセット」ボタンで、頭・首・腕が初期姿勢に戻るか確認します。
4. 「肩・上半身の捻りをPoseで動かす」をオンにし、肩を上げ下げしたり体を左右にひねったりして、腕と胸がPoseの検出結果に追従するか確認します。

## まとめ

| 項目 | 内容 |
| ---- | ---- |
| VRM / three-vrm | 3Dアバターのフォーマットと、three.jsで扱うためのライブラリ |
| VRMLoaderPlugin | GLTFLoaderにVRM対応を追加するプラグイン |
| humanoid.getNormalizedBoneNode | VRMの人型ボーンを、姿勢差を正規化した状態で取得するメソッド |
| expressionManager | まばたきや口の形などの表情を扱うオブジェクト |
| lerp | 検出値の細かいブレを抑え、動きをなめらかにする線形補間 |
| PoseLandmarker（応用） | 肩の角度・上半身の捻りを検出し、腕と胸のボーンに反映する追加機能 |
