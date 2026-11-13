<?php
// 註冊新帳號
require __DIR__ . '/auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    respond('error', '只接受 POST 請求');
}

$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';

if (mb_strlen($username) < 2 || mb_strlen($username) > 20) {
    respond('error', '用戶名長度需為 2–20 個字');
}
if (mb_strlen($password) < 6) {
    respond('error', '密碼至少 6 個字');
}

try {
    $pdo = db();

    $check = $pdo->prepare("SELECT id FROM users WHERE username = :username");
    $check->execute([':username' => $username]);

    if ($check->fetch()) {
        respond('error', '這個用戶名已經有人用了');
    }

    $token = bin2hex(random_bytes(24));

    $stmt = $pdo->prepare(
        "INSERT INTO users (username, password_hash, token, token_expires)
         VALUES (:username, :password_hash, :token, DATE_ADD(NOW(), INTERVAL 7 DAY))"
    );

    $stmt->execute([
        ':username'      => $username,
        ':password_hash' => password_hash($password, PASSWORD_DEFAULT),
        ':token'         => $token,
    ]);

    respond('success', '註冊成功', [
        'token' => $token,
        'user'  => ['id' => (int) $pdo->lastInsertId(), 'username' => $username],
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
