const ctx = document.getElementById('barChart').getContext('2d');

const label = "Votes";
const labels = ['Red', 'Blue', 'Yellow'];
const values = [12, 19, 3];
const colors = [
    'rgba(255, 99, 132, 0.6)',
    'rgba(54, 162, 235, 0.6)',
    'rgba(255, 206, 86, 0.6)'
];

let chart;

// 初期グラフの描画
function renderChart() {
    if (chart) {
        chart.destroy(); // 前のグラフを破棄
    }

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: values,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 1,
                fill: true,
            }]
        },
        options: {
            plugins: {
                legend: {
                    display: false
                }
            },
            scales:{
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// 最初は bar で描画
renderChart('bar');