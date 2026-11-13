<?php
// 取得目前登入者（前端重新載入時用來還原登入狀態）
require __DIR__ . '/auth_common.php';

try {
    $pdo = db();
    $user = current_user($pdo);

    if (!$user) {
        http_response_code(401);
        respond('error', '未登入');
    }

    respond('success', '已登入', ['user' => $user]);

} catch (PDOException $e) {
    http_response_code(500);
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
