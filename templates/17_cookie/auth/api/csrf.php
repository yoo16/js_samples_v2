<?php
require 'session_init.php';
// ヘッダー設定：JSON形式で返却することを明示
header('Content-Type: application/json; charset=utf-8');

// まだトークンが無ければ生成
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// JSONで返す
echo json_encode([
    'csrf_token' => $_SESSION['csrf_token']
]);