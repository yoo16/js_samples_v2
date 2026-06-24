let salesChart;
let softwaresChart;
let salesData     = {};
let softwaresData = {};

const salesOptions = {
    responsive: true,
    plugins: {
        legend: { display: false },
        tooltip: {
            padding: 10,
            callbacks: { label: (ctx) => `  ${ctx.parsed.y} 百万円` },
        },
    },
    scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 } } },
    },
};

const softwaresOptions = {
    responsive: true,
    plugins: {
        legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 16, boxWidth: 14 } },
        tooltip: { padding: 10 },
    },
};

// ─── ボタンのアクティブ状態を切り替え ───
function setActive(activeBtn, ...rest) {
    rest.forEach(btn => {
        btn.classList.remove('bg-white', 'shadow-sm', 'text-slate-700');
        btn.classList.add('text-slate-400');
    });
    activeBtn.classList.add('bg-white', 'shadow-sm', 'text-slate-700');
    activeBtn.classList.remove('text-slate-400');
}

// ─── 売上チャート生成 ───
function createSalesChart(type) {
    if (salesChart) salesChart.destroy();
    const ctx = document.getElementById('sales-chart').getContext('2d');
    const ds  = salesData.datasets[0];

    ds.backgroundColor = type === 'bar'
        ? 'rgba(59, 130, 246, 0.7)'
        : 'rgba(59, 130, 246, 0.1)';
    ds.borderColor  = 'rgba(59, 130, 246, 1)';
    ds.borderWidth  = type === 'bar' ? 0 : 2.5;
    ds.borderRadius = type === 'bar' ? 6 : 0;
    ds.borderSkipped = false;
    ds.tension      = 0.4;
    ds.fill         = type === 'line';
    ds.pointRadius  = type === 'line' ? 4 : 0;

    salesChart = new Chart(ctx, { type, data: salesData, options: salesOptions });
}

// ─── ソフトウェアチャート生成 ───
function createSoftwaresChart(type) {
    if (softwaresChart) softwaresChart.destroy();
    const ctx = document.getElementById('softwares-chart').getContext('2d');
    softwaresChart = new Chart(ctx, { type, data: softwaresData, options: softwaresOptions });
}

// ─── 統計レンダリング ───
function renderStats(data) {
    const values = data.datasets[0].data;
    const labels = data.labels;
    const total  = values.reduce((s, v) => s + v, 0).toFixed(1);
    const maxIdx = values.indexOf(Math.max(...values));
    const minIdx = values.indexOf(Math.min(...values));

    document.getElementById('stat-total').textContent       = total;
    document.getElementById('stat-best-month').textContent  = labels[maxIdx];
    document.getElementById('stat-best-val').textContent    = `${values[maxIdx]} 百万円`;
    document.getElementById('stat-worst-month').textContent = labels[minIdx];
    document.getElementById('stat-worst-val').textContent   = `${values[minIdx]} 百万円`;
}

// ─── イベントリスナー ───
const salesBarBtn  = document.getElementById('sales-bar-btn');
const salesLineBtn = document.getElementById('sales-line-btn');
const pieBtn       = document.getElementById('softwares-pie-btn');
const doughnutBtn  = document.getElementById('softwares-doughnut-btn');

salesBarBtn.addEventListener('click', () => {
    createSalesChart('bar');
    setActive(salesBarBtn, salesLineBtn);
});
salesLineBtn.addEventListener('click', () => {
    createSalesChart('line');
    setActive(salesLineBtn, salesBarBtn);
});
pieBtn.addEventListener('click', () => {
    createSoftwaresChart('pie');
    setActive(pieBtn, doughnutBtn);
});
doughnutBtn.addEventListener('click', () => {
    createSoftwaresChart('doughnut');
    setActive(doughnutBtn, pieBtn);
});

// ─── 初期化 ───
(async function init() {
    try {
        [salesData, softwaresData] = await Promise.all([
            fetch('api/sales.json').then(r => r.json()),
            fetch('api/softwares.json').then(r => r.json()),
        ]);
    } catch {
        document.getElementById('message-container').textContent = 'データの取得に失敗しました';
        return;
    }
    renderStats(salesData);
    createSalesChart('bar');
    createSoftwaresChart('pie');
})();
