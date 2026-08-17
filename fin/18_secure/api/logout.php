<?php
// セッションCookie設定
require 'session_init.php';
require 'require_csrf.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

// ログアウトも状態を変更する操作なのでCSRFチェックが必要
require_csrf();

// セッション変数を空に
$_SESSION = [];

// セッションCookieの削除（有効期限を過去に設定）
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(), // name
        '',             // value
        time() - 42000, // expire
        $params['path'],     // path
        $params['domain'],   // domain
        $params['secure'],   // secure
        $params['httponly']  // httponly
    );
}

// セッション自体も破棄する
session_destroy();

// レスポンス返却
echo json_encode([
    'ok' => true,
    'message' => 'Logged out successfully'
]);
