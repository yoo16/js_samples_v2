const messageContainer = document.getElementById('message-container');
const salesContainer = document.getElementById('sales-chart');
const softwaresContainer = document.getElementById('softwares-chart');

// グローバル変数で管理
let salesChart;
let softwaresChart;

// 初期データ
let salesData = {
    labels: [],
    datasets: [{
        label: '',
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1
    }]
};

let softwaresData = {
    labels: [],
    datasets: [{
        label: '',
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1
    }]
};

// 初期オプション
let salesOptions = {
    scales: {
        y: {
            beginAtZero: true
        }
    }
};

let softwaresOptions = {
    scales: {
        y: {
            beginAtZero: true
        }
    }
};


// 売上のチャートを生成する関数
function createSalesChart(type, data, options) {
    const ctx = salesContainer.getContext('2d');
    salesChart = new Chart(ctx, {
        type: type,
        data: data,
        options: options
    });
}

// ソフトウェアのチャートを生成する関数
function createSoftwaresChart(type, data, options) {
    const ctx = softwaresContainer.getContext('2d');
    softwaresChart = new Chart(ctx, {
        type: type,
        data: data,
        options: options
    });
}

// 売上データを取得する関数
async function loadSalesData() {
    const uri = 'api/sales.json';
    const response = await fetch(uri);
    return await response.json();
}

// ソフトウェアデータを取得する関数
async function loadSoftwaresData() {
    const uri = 'api/softwares.json';
    const response = await fetch(uri);
    return await response.json();
}

// 売上チャートを更新
function updateSalesChart(type, data, options) {
    if (salesChart) salesChart.destroy();
    createSalesChart(type, data, options);
}

// ソフトウェアチャートを更新
function updateSoftwaresChart(type, data, options) {
    // 既存のチャートが存在する場合は破棄
    if (softwaresChart) softwaresChart.destroy();
    // 新しいチャートを作成
    createSoftwaresChart(type, softwaresData, softwaresOptions);
}

// ドーナツグラフを描画する関数（ソフトウェアチャート用）
function doughnutChart() {
    // 既存のチャートが存在する場合は破棄
    if (softwaresChart) softwaresChart.destroy();
    // 新しいチャートを作成
    createSoftwaresChart('doughnut', softwaresData, softwaresOptions);
}

// イベントリスナーの設定
document.getElementById('sales-bar-btn').addEventListener('click', () => {
    updateSalesChart('bar', salesData, salesOptions);
});

document.getElementById('sales-line-btn').addEventListener('click', () => {
    updateSalesChart('line', salesData, salesOptions);
});

document.getElementById('softwares-pie-btn').addEventListener('click', () => {
    updateSoftwaresChart('pie', softwaresData, softwaresOptions);
});

document.getElementById('softwares-doughnut-btn').addEventListener('click', () => {
    updateSoftwaresChart('doughnut', softwaresData, softwaresOptions);
});


// グラフの初期化関数
(async function initChart() {
    // 売上データを取得
    salesData = await loadSalesData();
    // 売上データ取得後にグラフを描画
    updateSalesChart('bar', salesData, salesOptions);

    // ソフトウェアデータ取得
    softwaresData = await loadSoftwaresData();
    // ソフトウェアデータ取得後にグラフを描画
    createSoftwaresChart('pie', softwaresData, softwaresOptions);
})();