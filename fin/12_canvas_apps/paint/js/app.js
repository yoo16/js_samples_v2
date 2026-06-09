// DOM 要素
const colorPicker = document.getElementById('colorPicker');
const lineWidthRange = document.getElementById('lineWidth');
const eraserButton = document.getElementById('eraserButton');
const lineWidthValue = document.getElementById('lineWidthValue');
const resetButton = document.getElementById('resetButton');
const downloadButton = document.getElementById('downloadButton');
const colorValue = document.getElementById('colorValue');

// canvas 要素と描画コンテキストの取得
const canvas = document.getElementById('drawCanvas');
// 2Dコンテキスト作成
const ctx = canvas.getContext('2d');

// 描画状態を管理する変数
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// 現在の描画設定（初期値）
let currentColor = colorPicker.value;
let currentLineWidth = Number(lineWidthRange.value);
let isEraser = false;

function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
}

function drawPaperBackground() {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(14, 165, 233, 0.08)';
    ctx.lineWidth = 1;

    for (let x = 40; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 40; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    ctx.restore();
}

function updateEraserButton() {
    eraserButton.textContent = isEraser ? '消しゴム ON' : '消しゴム OFF';
    eraserButton.classList.toggle('bg-sky-500', isEraser);
    eraserButton.classList.toggle('text-white', isEraser);
    eraserButton.classList.toggle('border-sky-500', isEraser);
    eraserButton.classList.toggle('bg-white', !isEraser);
    eraserButton.classList.toggle('text-slate-700', !isEraser);
}

/**
 * 描画を開始する
 * @param {number} x - 描画の開始 x 座標
 * @param {number} y - 描画の開始 y 座標
 */
function startDrawing(x, y) {
    isDrawing = true;
    [lastX, lastY] = [x, y];
}

/**
 * 描画を続ける
 * @param {number} x - 描画の継続 x 座標
 * @param {number} y - 描画の継続 y 座標
 */
function draw(x, y) {
    if (!isDrawing) return;

    // 消しゴムモードの場合、合成方法を destination-out に設定
    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';

    // 丸みをつける
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // 線の色
    ctx.strokeStyle = isEraser ? '#ffffff' : currentColor;
    // 線の太さ
    ctx.lineWidth = currentLineWidth;

    // 前回の位置から現在の位置まで線を描画
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    [lastX, lastY] = [x, y];
}

/**
 * 描画終了
 * 描画フラグを false に設定し、描画動作を停止する。
 */
function endDrawing() {
    ctx.globalCompositeOperation = 'source-over';
    isDrawing = false;
}

// イベント
// マウスダウン
canvas.addEventListener('mousedown', (e) => {
    const point = getCanvasPoint(e);
    startDrawing(point.x, point.y);
});

// タッチ開始
canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const point = getCanvasPoint(touch);
    startDrawing(point.x, point.y);
    e.preventDefault();
});

// マウス移動
canvas.addEventListener('mousemove', (e) => {
    const point = getCanvasPoint(e);
    draw(point.x, point.y);
});

// タッチ移動
canvas.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    const point = getCanvasPoint(touch);
    draw(point.x, point.y);
    e.preventDefault();
});

// マウスアップ
canvas.addEventListener('mouseup', endDrawing);
// マウスアウト
canvas.addEventListener('mouseout', endDrawing);

// タッチ終了
canvas.addEventListener('touchend', endDrawing);
canvas.addEventListener('touchcancel', endDrawing);

// コントロール変更時のイベントリスナー
colorPicker.addEventListener('change', (e) => {
    currentColor = e.target.value;
    colorValue.textContent = currentColor;
    if (isEraser) {
        isEraser = false;
        updateEraserButton();
    }
});

// 太さ入力
lineWidthRange.addEventListener('input', (e) => {
    currentLineWidth = Number(e.target.value);
    lineWidthValue.textContent = currentLineWidth;
});

// リセットボタンクリック
resetButton.addEventListener('click', () => {
    drawPaperBackground();
});

// ダウンロードボタンクリック
downloadButton.addEventListener('click', () => {
    // Canvas の内容を PNG のデータURL に変換
    const dataURL = canvas.toDataURL('image/png');

    // 一時的なリンク（aタグ）を生成してクリックし、ダウンロードを実行
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'canvas.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

// 消しゴムボタン
eraserButton.addEventListener('click', () => {
    isEraser = !isEraser;
    updateEraserButton();
});

// 初回設定
lineWidthValue.textContent = currentLineWidth;
colorValue.textContent = currentColor;
updateEraserButton();
drawPaperBackground();
