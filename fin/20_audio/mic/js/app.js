const micToggleBtn = document.getElementById('mic-toggle');
const consoleEl = document.getElementById('console');
const statusDot = document.getElementById('status-dot');
const progressBar = document.getElementById('input-level');
const levelFill = document.getElementById('level-fill');
const levelLabel = document.getElementById('level-label');
const peakLabel = document.getElementById('peak-label');
const levelBars = document.getElementById('level-bars');

const firstMessage = 'Please speak into the microphone.';
// 周波数バーの数
const barCount = 24;
// 周波数バーの配列
const meterBars = [];

// AudioMeter 用の変数
let isMuted = false;
let audioContext;
let analyser;
let microphoneStream;
let animationId;
let smoothedLevel = 0;
let peakLevel = 0;

for (let i = 0; i < barCount; i += 1) {
    const bar = document.createElement('span');
    bar.className = 'block h-3 rounded-full bg-slate-700 transition-all duration-75';
    levelBars.appendChild(bar);
    meterBars.push(bar);
}

/**
 * コンソール要素にメッセージを表示する
 * @param {string} message 表示するメッセージ
 */
function displayConsole(message) {
    consoleEl.textContent = message;
}

function setStatus(state) {
    statusDot.classList.remove('bg-slate-500', 'bg-cyan-300', 'bg-rose-400', 'shadow-cyan-300/40', 'shadow-rose-400/40');

    if (state === 'active') {
        statusDot.classList.add('bg-cyan-300', 'shadow-cyan-300/40');
        return;
    }

    if (state === 'error') {
        statusDot.classList.add('bg-rose-400', 'shadow-rose-400/40');
        return;
    }

    statusDot.classList.add('bg-slate-500');
}

function setMutedState(nextMuted) {
    isMuted = nextMuted;

    microphoneStream?.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
    });

    // マイク ON/OFF ボタンの表示を更新
    micToggleBtn.textContent = isMuted ? 'Mic Mute' : 'Mic On';
    micToggleBtn.classList.toggle('bg-cyan-300', !isMuted);
    micToggleBtn.classList.toggle('text-slate-950', !isMuted);
    micToggleBtn.classList.toggle('shadow-cyan-500/25', !isMuted);
    micToggleBtn.classList.toggle('bg-white/10', isMuted);
    micToggleBtn.classList.toggle('text-slate-200', isMuted);
    micToggleBtn.classList.toggle('shadow-black/20', isMuted);
    setStatus(isMuted ? 'muted' : 'active');
    displayConsole(isMuted ? 'Mic muted' : firstMessage);

    if (isMuted) {
        // ミュート時はレベルをリセット
        renderLevel(0);
    } else {
        // ミュート解除時はレベルの更新を再開
        updateInputLevel();
    }
}

/**
 * マイク入力レベルを表示するために Web Audio API を利用
 */
async function initAudioMeter() {
    try {
        // メディアストリーム取得
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // オーディオコンテキストの作成
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // MediaStream からオーディオソースノードを生成
        const source = audioContext.createMediaStreamSource(stream);
        // AnalyserNode を作成して FFT サイズを設定
        analyser = audioContext.createAnalyser();
        // FFT サイズを 1024 に設定（2 の累乗である必要がある）
        analyser.fftSize = 1024;
        // スムージング係数を設定（0.0 から 1.0 の範囲で、値が大きいほど平滑化される）
        analyser.smoothingTimeConstant = 0.78;
        // オーディオソースを AnalyserNode に接続
        source.connect(analyser);
        // ストリームオブジェクトを保持
        microphoneStream = stream;

        // 音声入力レベルのアップデート処理を開始
        setMutedState(false);
    } catch (error) {
        console.error('Error accessing microphone for input level:', error);
        setStatus('error');
        displayConsole('Microphone access was blocked.');
    }
}

function renderLevel(level) {
    // オーディオレベルを 0-100 の範囲に丸める
    const roundedLevel = Math.round(level);
    // progress 要素の値を更新
    progressBar.value = roundedLevel;
    // オーディオレベルの表示を更新
    levelFill.style.width = `${roundedLevel}%`;
    // ラベルの表示を更新
    levelLabel.textContent = `${roundedLevel}%`;

    // ピークレベル
    peakLevel = Math.max(level, peakLevel * 0.985);
    // ピークレベルの表示を更新
    peakLabel.textContent = `Peak ${Math.round(peakLevel)}%`;

    // オーディオメーターのバーを更新
    meterBars.forEach((bar, index) => {
        // バーのしきい値を計算（0-100 のスケール）
        const threshold = ((index + 1) / meterBars.length) * 100;
        // バーがアクティブかどうかを判定
        const isActive = threshold <= level;
        // バーの高さを計算（
        const height = isActive ? 28 + (index / meterBars.length) * 104 : 12;
        // バーがホット状態かどうかを判定（上位 22% のバーをホットとする）
        const isHot = index > meterBars.length * 0.78;

        // バーのスタイルを更新
        bar.style.height = `${height}px`;
        bar.classList.toggle('bg-cyan-300');
        bar.classList.toggle('bg-fuchsia-300', isActive && isHot);
        bar.classList.toggle('bg-slate-700', !isActive);
        bar.classList.toggle('shadow-lg', isActive);
        bar.classList.toggle('shadow-cyan-500/30', isActive && !isHot);
        bar.classList.toggle('shadow-fuchsia-500/30', isActive && isHot);
    });
}

/**
 * 入力レベルを測定し progress 要素を更新する
 */
function updateInputLevel() {
    if (!analyser || isMuted) {
        animationId = null;
        return;
    }

    // 解析の周波数ビン（データポイント）から配列(Uint8Array)を作成
    const dataArray = new Uint8Array(analyser.fftSize);
    // analyser から時間領域データを取得
    analyser.getByteTimeDomainData(dataArray);

    let sumSquares = 0;
    // データ配列の各サンプルを正規化して RMS 値を計算
    for (let i = 0; i < dataArray.length; i += 1) {
        const normalized = (dataArray[i] / 128) - 1;
        sumSquares += normalized * normalized;
    }
    // RMS値
    const rms = Math.sqrt(sumSquares / dataArray.length);
    // rms を 0-100 のスケールに変換（調整が必要な場合は multiplier を変更）
    const level = Math.min(100, rms * 260);
    // スムージングを適用してレベルを更新
    smoothedLevel = smoothedLevel * 0.72 + level * 0.28;
    // オーディオレベルを表示
    renderLevel(smoothedLevel);
    // アニメーション
    animationId = requestAnimationFrame(updateInputLevel);
}

/**
 * ミュートボタンのトグル処理
 */
micToggleBtn.addEventListener('click', () => {
    // マイクストリームが存在しない場合は初期化
    if (!microphoneStream) {
        initAudioMeter();
        return;
    }

    // AudioContext がサスペンド状態の場合は再開
    if (audioContext?.state === 'suspended') {
        audioContext.resume();
    }

    // アニメーションフレームのキャンセル
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    // ミュート状態を切り替え
    setMutedState(!isMuted);
});

/**
 * 初期化
 * @returns {Promise<void>}
 */
async function app() {
    displayConsole('Loading...');
    setStatus('muted');
    renderLevel(0);
    // オーディオメーター
    initAudioMeter();
}

// メインアプリ実行
app();
