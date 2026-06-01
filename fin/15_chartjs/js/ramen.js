const messageContainer = document.getElementById('message');
const totalContainer = document.getElementById('total-container');
const barCtx = document.getElementById('barChart').getContext('2d');
const stackedCtx = document.getElementById('stackedChart').getContext('2d');
const badge = [
    'bg-yellow-400 text-white',
    'bg-slate-400 text-white',
    'bg-amber-600 text-white',
];

// データの読み込み
async function loadRamenData() {
    messageContainer.innerHTML = '';
    // API URL
    const uri = 'api/ramen.json';
    // データの取得
    const response = await fetch(uri);
    // レスポンスの確認
    if (!response.ok) {
        messageContainer.innerHTML = 'データの取得に失敗しました';
        return null;
    }
    // JSONデータのパース
    const data = await response.json();
    return data;
}

// 総合ランキングの表示
function renderTotal(labels, groups) {
    // ラーメンごとの総票数を計算してリスト化
    const totalList = getTotalData(labels, groups);
    // 票数の多い順にソート
    totalList.sort((a, b) => b.total - a.total);

    // 最大値を取得（1位の票数）
    const maxTotal = totalList[0].total;

    // ランキングのHTMLを生成して表示
    totalContainer.innerHTML = totalList.map((item, i) => {
        const pct = Math.round((item.total / maxTotal) * 100);
        const badgeCls = badge[i] ?? 'bg-slate-100 text-slate-500';
        return `<div class="flex items-center gap-4 py-3.5 border-b border-slate-100 last:border-0">
                    <span class="w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${badgeCls}">${i + 1}</span>
                    <span class="w-12 text-sm font-bold text-slate-700 shrink-0">${item.label}</span>
                    <div class="flex-1 bg-slate-100 rounded-full h-2">
                        <div class="bg-slate-700 h-2 rounded-full" style="width:${pct}%"></div>
                    </div>
                    <span class="w-16 text-right text-sm font-bold text-slate-700 tabular-nums shrink-0">${item.total}<span class="text-xs font-normal text-slate-400 ml-0.5">票</span></span>
                </div>`
    }).join('');
}

// バーチャートと積み上げ横棒グラフの生成
function createBarChart(labels, groups, colors) {
    // ラーメン1種類 = 1データセット（グループごとに色分けして表示）
    const datasets = groups.map((group, index) => ({
        label: group.name,
        data: group.data,
        backgroundColor: colors[index % colors.length],
        borderRadius: 4,
        borderSkipped: false,
    }));

    // チャート作成
    new Chart(barCtx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top', labels: { font: { size: 12 }, padding: 16 } },
                tooltip: { padding: 10 },
            },
            scales: {
                x: { grid: { display: false } },
                y: { ticks: { stepSize: 5 }, grid: { color: 'rgba(0,0,0,0.05)' } },
            },
        },
    });
}

// 総合分布の表示
function createProportionChart(labels, groups, colors) {
    const values = getTotalValues(labels, groups);
    const total = values.reduce((s, v) => s + v, 0);
    const pcts = values.map(v => parseFloat(((v / total) * 100).toFixed(1)));

    // ラーメン1種類 = 1データセット（1本のスタック棒に積み上げる）
    const datasets = labels.map((label, i) => ({
        label,
        data: [pcts[i]],
        backgroundColor: colors[i],
        borderColor: '#fff',
        borderWidth: 2,
    }));

    // チャート作成
    new Chart(stackedCtx, {
        type: 'bar',
        data: { labels: [''], datasets },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 12 }, padding: 16, boxWidth: 14 },
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `  ${ctx.dataset.label}  ${ctx.parsed.x}%`,
                    },
                },
            },
            scales: {
                x: { stacked: true, display: false, max: 100 },
                y: { stacked: true, display: false },
            },
        },
        plugins: [{
            id: 'segmentLabels',
            afterDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((ds, i) => {
                    const meta = chart.getDatasetMeta(i);
                    if (meta.hidden) return;
                    const bar = meta.data[0];
                    const pct = ds.data[0];
                    if (pct < 10) return;
                    const cx = (bar.x + bar.base) / 2;
                    ctx.save();
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${pct}%`, cx, bar.y);
                    ctx.restore();
                });
            },
        }],
    });
}

// データの集計
function getTotalData(labels, groups) {
    return labels.map((label, i) => ({
        label,
        total: groups.reduce((sum, group) => sum + (group.data[i] || 0), 0),
    }));
}

// 総合分布の割合データ
function getTotalValues(labels, groups) {
    return getTotalData(labels, groups).map(item => item.total);
}

// 初期化
async function init() {
    // データの読み込み
    const { labels, colors, groups } = await loadRamenData();
    // 総合ランキングの表示
    renderTotal(labels, groups);
    // チャートの生成
    createBarChart(labels, groups, colors);
    createProportionChart(labels, groups, colors);
}

// ページ読み込み時に初期化関数を呼び出す
init();
