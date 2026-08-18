<?php
// テスト用ユーザ
require 'test_user.php';
if (!isset($user)) {
    http_response_code(500);
    echo json_encode(['error' => 'Test user not found']);
    exit;
}

// セッションCookie設定
require 'session_init.php';
require 'require_csrf.php';

// POST 以外は拒否
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

// CSRFチェック（ログイン前でも csrf.php で発行済みのトークンを使う）
require_csrf();

// 入力取得
$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$email = $input['email'] ?? '';
$password = $input['password'] ?? '';

if ($email === $user['email'] && password_verify($password, $user['hash_password'])) {
    // セッション固定化攻撃対策：ログイン成功のタイミングでセッションIDを発行し直す
    // （ログイン前のセッションIDが漏れていても、それを使って乗っ取れないようにする）
    session_regenerate_id(true);

    unset($user['hash_password']);
    $_SESSION['user'] = $user;

    // 認証成功時にCSRFトークンも再発行する（トークン固定化を防ぐ）
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

    // レスポンスに新しいトークンを含めて、JS側の変数を更新できるようにする
    echo json_encode([
        'ok' => true,
        'message' => 'logged in',
        'csrf_token' => $_SESSION['csrf_token'],
    ]);
} else {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials']);
}
