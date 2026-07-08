# カフェ注文アプリ（ESModule練習用サンプル）

`Vanilla JavaScript` の `ESModule` を学ぶためのサンプルアプリです。

## ファイル構成

```txt
cafe-order/
  index.html   ... 画面とTailwindCSS・main.jsの読み込み
  js/
    main.js    ... イベント登録と全体制御
    menu.js    ... 商品データ（名前付きexport）
    cart.js    ... 注文の計算処理（名前付きexport）
    ui.js      ... テンプレートリテラルによる描画（デフォルトexport）
```

## 動かし方

ESModule は `file://` では動作しません。ローカルサーバー経由で開いてください。

### VS Code の Live Server を使う場合

1. VS Code でこのフォルダを開く
2. `index.html` を右クリック → 「Open with Live Server」

### Python を使う場合

```bash
cd cafe-order
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開きます。

## 注意点

- インターネット接続が必要です（TailwindCSS を CDN から読み込むため）
- `import './cart'` のような拡張子省略はできません（`.js` まで書く）
