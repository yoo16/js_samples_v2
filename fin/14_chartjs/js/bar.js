const ctx    = document.getElementById('barChart').getContext('2d');
// X軸のラベル
const labels = ['Red', 'Blue', 'Yellow'];
// Y軸の値
const values = [12, 19, 3];
// グラフの色
const colors = [
    'rgba(239, 68,  68,  0.85)',
    'rgba(59,  130, 246, 0.85)',
    'rgba(234, 179, 8,   0.85)',
];

function renderStats() {
    const total    = values.reduce((s, v) => s + v, 0);
    const maxIdx   = values.indexOf(Math.max(...values));
    const minIdx   = values.indexOf(Math.min(...values));

    document.getElementById('stat-total').textContent     = total;
    document.getElementById('stat-top-label').textContent = labels[maxIdx];
    document.getElementById('stat-top-value').textContent = `${values[maxIdx]} 票`;
    document.getElementById('stat-low-label').textContent = labels[minIdx];
    document.getElementById('stat-low-value').textContent = `${values[minIdx]} 票`;

    const total2 = total || 1;
    document.getElementById('breakdown').innerHTML = labels.map((label, i) => {
        const pct = Math.round((values[i] / total2) * 100);
        return `
        <div class="flex items-center gap-4 px-5 py-3.5 last:rounded-b-xl first:rounded-t-xl">
            <span class="w-3 h-3 rounded-full shrink-0" style="background:${colors[i]}"></span>
            <span class="w-16 text-sm font-semibold text-slate-700 shrink-0">${label}</span>
            <div class="flex-1 bg-slate-100 rounded-full h-2">
                <div class="h-2 rounded-full" style="width:${pct}%;background:${colors[i]}"></div>
            </div>
            <span class="w-16 text-right text-sm font-bold text-slate-700 tabular-nums shrink-0">${values[i]}<span class="text-xs font-normal text-slate-400 ml-0.5">票</span></span>
        </div>`;
    }).join('');
}

new Chart(ctx, {
    type: 'bar',
    data: {
        labels,
        datasets: [{
            label: 'Votes',
            data: values,
            backgroundColor: colors,
            borderRadius: 8,
            borderSkipped: false,
        }],
    },
    options: {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                padding: 10,
                callbacks: { label: (ctx) => `  ${ctx.parsed.y} 票` },
            },
        },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 13, weight: 'bold' } } },
            y: { beginAtZero: true, ticks: { stepSize: 5 }, grid: { color: 'rgba(0,0,0,0.05)' } },
        },
    },
});

renderStats();
