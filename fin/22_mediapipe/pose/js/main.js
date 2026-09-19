import { createPoseLandmarker, estimatePose, computeJointAngles, POSE_CONNECTIONS } from './pose-landmarker.js';
import { REFERENCE_POSES, createCustomPose } from './reference-poses.js';
import { comparePose } from './pose-compare.js';

// DOM
const videoEl = document.getElementById('video');
const canvasEl = document.getElementById('canvas');
const ctx = canvasEl.getContext('2d');
const poseSelectEl = document.getElementById('pose-select');
const captureBtnEl = document.getElementById('capture-btn');
const poseNameEl = document.getElementById('pose-name');
const poseDescriptionEl = document.getElementById('pose-description');
const liveDotEl = document.getElementById('live-dot');
const liveLabelEl = document.getElementById('live-label');
const scoreOverallEl = document.getElementById('score-overall');
const jointDetailsEl = document.getElementById('joint-details');

const REQUEST_WIDTH = 640;
const REQUEST_HEIGHT = 480;

const LEVEL_COLOR = { good: '#22c55e', warn: '#f59e0b', bad: '#ef4444' };

// 状態
let landmarker;
let poses = [...REFERENCE_POSES];
let currentPoseIndex = 0;
let lastAngles = null;

function populatePoseSelect() {
    poseSelectEl.replaceChildren();
    poses.forEach((pose, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = pose.name;
        poseSelectEl.appendChild(option);
    });
    poseSelectEl.value = String(currentPoseIndex);
    poseNameEl.textContent = poses[currentPoseIndex].name;
    poseDescriptionEl.textContent = poses[currentPoseIndex].description;
}

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

function drawSkeleton(keypoints, overallScore) {
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    if (!keypoints) return;

    const srcWidth = videoEl.videoWidth || REQUEST_WIDTH;
    const srcHeight = videoEl.videoHeight || REQUEST_HEIGHT;
    const scaleX = canvasEl.width / srcWidth;
    const scaleY = canvasEl.height / srcHeight;
    const pts = keypoints.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY }));

    const color = overallScore >= 80 ? LEVEL_COLOR.good : overallScore >= 50 ? LEVEL_COLOR.warn : LEVEL_COLOR.bad;

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    POSE_CONNECTIONS.forEach(([a, b]) => {
        ctx.moveTo(pts[a].x, pts[a].y);
        ctx.lineTo(pts[b].x, pts[b].y);
    });
    ctx.stroke();

    pts.forEach((p, index) => {
        if (index > 22) return; // 手足の先や顔まわりは点を省略
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.stroke();
    });
}

function renderJointDetails(result) {
    jointDetailsEl.replaceChildren();

    for (const [key, joint] of Object.entries(result.joints)) {
        const level = joint.level;
        const badgeClass = {
            good: 'bg-emerald-500 text-white',
            warn: 'bg-amber-400 text-white',
            bad: 'bg-rose-500 text-white',
        }[level];

        const card = document.createElement('div');
        card.className = 'rounded-2xl bg-white/70 p-3 shadow-sm ring-1 ring-slate-900/5 backdrop-blur';
        card.innerHTML = `
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-slate-700">${joint.label}</span>
              <span class="rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}">${Math.round(joint.score)}点</span>
            </div>
            <p class="mt-1 text-xs text-slate-400 font-mono">今: ${joint.current.toFixed(0)}° / お手本: ${joint.target.toFixed(0)}°</p>
        `;
        jointDetailsEl.appendChild(card);
    }
}

function updateStatus(detected) {
    liveDotEl.className = `h-2 w-2 rounded-full ${detected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`;
    liveLabelEl.textContent = detected ? '姿勢を検出中' : '全身を映してください';
}

function render() {
    const results = estimatePose(landmarker, videoEl, performance.now());
    const person = results[0];

    if (person) {
        lastAngles = computeJointAngles(person.keypoints);
        const comparison = comparePose(lastAngles, poses[currentPoseIndex]);
        drawSkeleton(person.keypoints, comparison.overall);
        renderJointDetails(comparison);
        scoreOverallEl.textContent = String(comparison.overall);
        updateStatus(true);
    } else {
        lastAngles = null;
        drawSkeleton(null, 0);
        updateStatus(false);
    }

    requestAnimationFrame(render);
}

function app() {
    populatePoseSelect();

    poseSelectEl.addEventListener('change', () => {
        currentPoseIndex = Number(poseSelectEl.value);
        poseNameEl.textContent = poses[currentPoseIndex].name;
        poseDescriptionEl.textContent = poses[currentPoseIndex].description;
    });

    captureBtnEl.addEventListener('click', () => {
        if (!lastAngles) return;
        const custom = createCustomPose(lastAngles);
        const existingIndex = poses.findIndex((pose) => pose.id === 'custom');
        if (existingIndex >= 0) {
            poses[existingIndex] = custom;
        } else {
            poses.push(custom);
        }
        currentPoseIndex = poses.findIndex((pose) => pose.id === 'custom');
        populatePoseSelect();
    });

    (async () => {
        landmarker = await createPoseLandmarker(1);
        await setupCamera();
        render();
    })();
}

app();
