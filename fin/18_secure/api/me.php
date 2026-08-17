<?php
require 'session_init.php';

header('Content-Type: application/json; charset=utf-8');

// 認証チェック（サーバー側は sid Cookie に紐づくセッションだけを見て判断する）
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// GETは状態を変更しない安全なリクエストなので require_csrf() は不要
// （CSRF対策はPOST/PUT/DELETEなど、状態を変更するリクエストにだけ必要）
echo json_encode([
    'user' => $_SESSION['user'],
]);
