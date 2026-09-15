import { createFaceLandmarker, estimateFaces } from './face-landmarker.js';
import { landmarkParts } from './face-data.js';

// 部位キー -> 日本語ラベル
const PART_LABELS = {
    nose: '鼻',
    upperLip: '上唇',
    lowerLip: '下唇',
    outerMouth: '口（外周）',
    innerMouth: '口（内周）',
    rightEye: '右目',
    leftEye: '左目',
    eyeContour: '両目の輪郭',
    rightOutline: '輪郭（右）',
    leftOutline: '輪郭（左）',
    faceOutline: '顔の輪郭',
};

// DOM
const videoEl = document.getElementById('video');
const canvasEl = document.getElementById('canvas');
const ctx = canvasEl.getContext('2d');
const partButtonsEl = document.getElementById('part-buttons');
const indexListEl = document.getElementById('index-list');
const indexTitleEl = document.getElementById('index-title');
const toggleIndexEl = document.getElementById('toggle-index');
const liveDotEl = document.getElementById('live-dot');
const liveLabelEl = document.getElementById('live-label');
const statFaceEl = document.getElementById('stat-face');
const statTotalEl = document.getElementById('stat-total');
const statCountEl = document.getElementById('stat-count');
const statFpsEl = document.getElementById('stat-fps');

// カメラ要求解像度
const REQUEST_WIDTH = 640;
const REQUEST_HEIGHT = 480;

// 状態
let detector;
let selectedPart = 'nose';
let showIndices = false;
let highlightIndex = null;
let fps = 0;
let lastTime = performance.now();

// 部位ごとの重複を除いた番号リスト
function uniqueIndices(part) {
    return [...new Set(landmarkParts[part])].sort((a, b) => a - b);
}

/* ---------- UI 構築 ---------- */

function buildPartButtons() {
    Object.keys(landmarkParts).forEach((key) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.part = key;
        btn.textContent = PART_LABELS[key] ?? key;
        btn.className = baseChipClass(false);
        btn.addEventListener('click', () => selectPart(key));
        partButtonsEl.appendChild(btn);
    });
}

function baseChipClass(active) {
    return [
        'rounded-full px-3 py-1 text-sm font-medium transition',
        active
            ? 'bg-indigo-600 text-white shadow'
            : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50',
    ].join(' ');
}

function selectPart(key) {
    selectedPart = key;
    highlightIndex = null;
    [...partButtonsEl.children].forEach((btn) => {
        btn.className = baseChipClass(btn.dataset.part === key);
    });
    buildIndexList();
    indexTitleEl.textContent = `ランドマーク番号 — ${PART_LABELS[key] ?? key}`;
}

function buildIndexList() {
    indexListEl.replaceChildren();
    uniqueIndices(selectedPart).forEach((index) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.dataset.index = String(index);
        chip.textContent = index;
        chip.className = indexChipClass(false);
        chip.addEventListener('click', () => {
            highlightIndex = highlightIndex === index ? null : index;
            refreshIndexChips();
        });
        indexListEl.appendChild(chip);
    });
}

function indexChipClass(active) {
    return [
        'rounded-md px-1.5 py-0.5 font-mono text-xs transition',
        active
            ? 'bg-rose-500 text-white'
            : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
    ].join(' ');
}

function refreshIndexChips() {
    [...indexListEl.children].forEach((chip) => {
        const isActive = Number(chip.dataset.index) === highlightIndex;
        chip.className = indexChipClass(isActive);
    });
}

/* ---------- 検出 & 描画 ---------- */

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            width: { ideal: REQUEST_WIDTH },
            height: { ideal: REQUEST_HEIGHT },
            aspectRatio: { ideal: REQUEST_WIDTH / REQUEST_HEIGHT },
            facingMode: 'user',
        },
        audio: false,
    });
    videoEl.srcObject = stream;
    await videoEl.play();
}

function drawResults(faces) {
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    const face = faces[0];
    if (!face) return;

    const srcWidth = videoEl.videoWidth || REQUEST_WIDTH;
    const srcHeight = videoEl.videoHeight || REQUEST_HEIGHT;
    const scaleX = canvasEl.width / srcWidth;
    const scaleY = canvasEl.height / srcHeight;
    const indices = uniqueIndices(selectedPart);

    ctx.font = '11px monospace';
    ctx.textBaseline = 'middle';

    indices.forEach((index) => {
        const point = face.keypoints[index];
        if (!point) return;
        const x = point.x * scaleX;
        const y = point.y * scaleY;
        const isHi = index === highlightIndex;

        ctx.beginPath();
        ctx.arc(x, y, isHi ? 6 : 2.5, 0, 2 * Math.PI);
        ctx.fillStyle = isHi ? '#22d3ee' : '#f43f5e';
        ctx.fill();

        if (isHi) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#0e7490';
            ctx.stroke();
        }

        if (showIndices || isHi) {
            const label = String(index);
            ctx.fillStyle = 'rgba(15,23,42,0.75)';
            const w = ctx.measureText(label).width + 6;
            ctx.fillRect(x + 6, y - 8, w, 16);
            ctx.fillStyle = '#fff';
            ctx.fillText(label, x + 9, y);
        }
    });
}

function updateStatus(faces) {
    const face = faces[0];
    const detected = Boolean(face);

    statFaceEl.textContent = detected ? '検出中' : '未検出';
    statFaceEl.className = `font-semibold ${detected ? 'text-emerald-600' : 'text-slate-400'}`;
    liveDotEl.className = `h-2 w-2 rounded-full ${detected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`;
    liveLabelEl.textContent = detected ? '検出中' : '顔を探しています';

    statTotalEl.textContent = face ? face.keypoints.length : 0;
    statCountEl.textContent = detected ? uniqueIndices(selectedPart).length : 0;
    statFpsEl.textContent = `${fps} fps`;
}

function tickFps() {
    const now = performance.now();
    const delta = now - lastTime;
    lastTime = now;
    if (delta > 0) {
        fps = Math.round(fps * 0.8 + (1000 / delta) * 0.2);
    }
}

function render() {
    tickFps();
    const faces = estimateFaces(detector, videoEl, performance.now());
    drawResults(faces);
    updateStatus(faces);
    requestAnimationFrame(render);
}

/* ---------- 起動 ---------- */

async function app() {
    buildPartButtons();
    selectPart(selectedPart);
    toggleIndexEl.addEventListener('change', () => {
        showIndices = toggleIndexEl.checked;
    });

    detector = await createFaceLandmarker();
    await setupCamera();
    render();
}

app();
