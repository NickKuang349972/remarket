<?php
// 登入
require __DIR__ . '/auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    respond('error', '只接受 POST 請求');
}

$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';

if ($username === '' || $password === '') {
    respond('error', '請輸入用戶名和密碼');
}

try {
    $pdo = db();

    $stmt = $pdo->prepare("SELECT id, username, password_hash FROM users WHERE username = :username");
    $stmt->execute([':username' => $username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        respond('error', '用戶名或密碼不正確');
    }

    // 每次登入換一個新 token
    $token = bin2hex(random_bytes(24));

    $update = $pdo->prepare(
        "UPDATE users SET token = :token, token_expires = DATE_ADD(NOW(), INTERVAL 7 DAY) WHERE id = :id"
    );
    $update->execute([':token' => $token, ':id' => $user['id']]);

    respond('success', '登入成功', [
        'token' => $token,
        'user'  => ['id' => (int) $user['id'], 'username' => $user['username']],
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
