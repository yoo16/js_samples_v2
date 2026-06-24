const ctx = document.getElementById('lineChart').getContext('2d');
const labels = [4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11, 12];
const data   = [2, 3, 5, 7, 8, 9, 8, 6, 5];

function renderStats() {
    const maxScore  = Math.max(...data);
    const maxIdx    = data.indexOf(maxScore);
    const minScore  = Math.min(...data);
    const minIdx    = data.indexOf(minScore);
    const bestSleep = labels[maxIdx];

    document.getElementById('stat-best-sleep').textContent = bestSleep;
    document.getElementById('stat-max-score').textContent  = maxScore;
    document.getElementById('stat-count').textContent      = data.length;
    document.getElementById('insight-text').textContent    =
        `最も生産性が高いのは睡眠時間 ${bestSleep} 時間（スコア ${maxScore}/10）です。`
        + ` 一方、${labels[minIdx]} 時間では最低スコア ${minScore} となり、`
        + `短すぎても長すぎても生産性は低下する傾向が見られます。`;
}

new Chart(ctx, {
    type: 'line',
    data: {
        labels,
        datasets: [{
            label: '1週間のデータ',
            data,
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2.5,
            pointBackgroundColor: 'rgba(59, 130, 246, 1)',
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.4,
            fill: true,
        }],
    },
    options: {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                padding: 10,
                callbacks: {
                    label: (ctx) => `  睡眠 ${ctx.label}h  →  生産性 ${ctx.raw} / 10`,
                },
            },
        },
        scales: {
            x: {
                title: { display: true, text: '睡眠時間（時間）', font: { size: 12 }, color: '#94a3b8' },
                grid: { display: false },
                ticks: { font: { size: 12 } },
            },
            y: {
                title: { display: true, text: '生産性スコア', font: { size: 12 }, color: '#94a3b8' },
                min: 0,
                max: 10,
                ticks: { stepSize: 2 },
                grid: { color: 'rgba(0,0,0,0.05)' },
            },
        },
    },
});

renderStats();
