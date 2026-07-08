# Audio Player

`audio_player` は、HTML の `<audio>` と JavaScript で作る簡単な音楽プレイヤーです。

## 主な機能

- MP3 ファイルの再生、一時停止、前後トラック移動
- 再生位置の表示とシーク
- 音量と再生速度の変更
- シャッフル、リピート再生
- MP3 の埋め込みカバー画像の表示
- 実際の音声スペクトラムを使ったビジュアライザー

## ファイル構成

- `index.html`: 画面レイアウト、操作ボタン、`<audio>` 要素
- `js/app.js`: プレイヤー操作、状態管理、音声解析、カバー画像取得
- `audio/*.mp3`: 再生対象の音源ファイル

## 音声再生

`audio.src` に選択中の MP3 を設定し、`audio.play()` と `audio.pause()` で再生状態を切り替えます。

再生時間は `timeupdate` イベントで更新し、シークバーの値から `audio.currentTime` を変更します。

## ビジュアライザー

Web Audio API の `AudioContext` と `AnalyserNode` を使っています。

`createMediaElementSource(audio)` で `<audio>` の音を解析対象にし、`getByteFrequencyData()` で周波数ごとの強さを取得します。

取得した周波数データをバーの数に分割し、平均値をバーの高さに変換して表示します。ランダムな動きではなく、実際に再生中の音に反応します。

## カバー画像

MP3 の ID3 タグから `APIC` フレームを読み取り、埋め込み画像を `Blob URL` に変換して表示します。

カバー画像がない場合や読み込みに失敗した場合は、音符アイコンを表示します。

## 実行方法

MP3 のカバー取得では `fetch()` を使うため、HTML を直接開くよりローカルサーバー経由で確認します。

```bash
php -S 127.0.0.1:8014 -t fin/14_media_2/audio_player
```

ブラウザで `http://127.0.0.1:8014/` を開きます。
