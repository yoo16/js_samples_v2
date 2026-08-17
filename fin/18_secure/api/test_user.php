<?php
// テスト用ユーザ（ハードコード）
// パスワードは平文で保存せず、password_hash() でハッシュ化したものだけを保持する
$user = [
    'email' => 'test@test.com',
    'name'  => 'Test User',
    'hash_password' => password_hash('secret123', PASSWORD_DEFAULT),
];
