<?php
// セッションCookie(=セッションID)の設定
// ここで決めたルールに沿って、ブラウザに Set-Cookie: sid=xxxx が送られる
session_name('sid');
session_set_cookie_params([
    'lifetime' => 3600,   // Cookieの有効期間（秒）。0なら「ブラウザを閉じるまで」
    'path'     => '/',    // Cookieを送るパスの範囲
    'secure'   => false,  // trueにするとHTTPS接続時のみCookieを送信する（本番は true にする）
    'httponly' => true,   // JavaScriptの document.cookie からセッションIDを読めなくする（XSS対策）
    'samesite' => 'Lax',  // 他サイトからのリクエストにCookieを付けない範囲を指定する（CSRF対策の補助）
]);
session_start();
