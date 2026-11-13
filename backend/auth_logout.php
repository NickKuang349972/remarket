<?php
// 登出：把 token 清掉
require __DIR__ . '/auth_common.php';

try {
    $pdo = db();
    $token = bearer_token();

    if ($token !== '') {
        $stmt = $pdo->prepare("UPDATE users SET token = NULL, token_expires = NULL WHERE token = :token");
        $stmt->execute([':token' => $token]);
    }

    respond('success', '已登出');

} catch (PDOException $e) {
    http_response_code(500);
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
