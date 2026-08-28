# vtube_vanilla

React / Node.js / bundler を使わない vanilla JS 版の VRM 顔操作サンプルです。
ブラウザ標準の ES Modules と import map で、`vendor/` 配下のローカルライブラリを読み込みます。

## 機能

- MediaPipe FaceLandmarker WASM による Web カメラ顔検出
- VRM ファイルのローカル読み込み
- 頭部回転、瞬き、口開閉の VRM 反映
- 検出値の簡易デバッグ表示

## 配置

Apache または Nginx の公開ディレクトリに、以下をそのまま配置します。

```text
index.html
css/
js/
vendor/
```

カメラを使うため、localhost 以外で公開する場合は HTTPS が必要です。

## Apache

Apache では `.mjs` と `.wasm` の MIME type が正しく返るように設定してください。

```apache
AddType text/javascript .js .mjs
AddType application/wasm .wasm
AddType model/gltf-binary .glb .vrm
```

## Nginx

Nginx では `types` に `.mjs` と `.wasm` を追加してください。

```nginx
types {
    text/javascript js mjs;
    application/wasm wasm;
    model/gltf-binary glb vrm;
}
```

## ローカル確認

```bash
python3 -m http.server 5173
```

ブラウザで `http://localhost:5173/` を開き、VRM ファイルを選択してからカメラを開始します。
`file://` で直接開くのではなく HTTP サーバー経由で表示してください。

## アセット

`vendor/` には Three.js、three-vrm、MediaPipe Tasks Vision のブラウザ用 ESM と WASM を配置しています。
FaceLandmarker の `.task` モデルは Google Cloud Storage の公式公開モデル URL から取得します。

実行に必要な `vendor/` は以下です。

```text
vendor/
  three/
    build/
      three.module.js
      three.core.js
    examples/jsm/
      loaders/GLTFLoader.js
      utils/BufferGeometryUtils.js
  @pixiv/
    three-vrm/
      LICENSE
      lib/three-vrm.module.js
  @mediapipe/
    tasks-vision/
      vision_bundle.mjs
      wasm/
```

## JS 構成

```text
js/main.js           起動、イベント接続、Three.js シーン、描画ループ
js/face-tracking.js  MediaPipe 初期化、顔ランドマーク解析、平滑化
js/vrm.js            VRM 読み込み、顔寄せ、腕ポーズ、表情/首への反映
```

## 教材

初学者向けの教材は `docs/materials/` にあります。

```text
docs/materials/
  01_VRM顔トラッキング教材.md
```
