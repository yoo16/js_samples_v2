<?php
// 状態を変更するリクエスト（POSTなど）だけが呼ぶ共通のCSRFチェック
// GETのようにデータを変更しないリクエストは検証不要（require_csrf() を呼ばない）
function require_csrf(): void
{
    $client_token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';

    if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $client_token)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid CSRF token']);
        exit;
    }
}
