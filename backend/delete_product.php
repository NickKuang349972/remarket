<?php
// 刪除商品（必須登入，且只能刪自己刊登的商品）
require __DIR__ . '/auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    respond('error', '只接受 POST 請求');
}

$id = $_POST['id'] ?? '';

if (!is_numeric($id)) {
    respond('error', '缺少商品編號');
}

try {
    $pdo = db();
    $user = require_user($pdo);

    $check = $pdo->prepare("SELECT id, seller FROM products WHERE id = :id");
    $check->execute([':id' => $id]);
    $existing = $check->fetch(PDO::FETCH_ASSOC);

    if (!$existing) {
        http_response_code(404);
        respond('error', '找不到這件商品');
    }

    if ($existing['seller'] !== '' && $existing['seller'] !== $user['username']) {
        http_response_code(403);
        respond('error', '只能刪除自己刊登的商品');
    }

    $imgStmt = $pdo->prepare("SELECT path FROM product_images WHERE product_id = :id");
    $imgStmt->execute([':id' => $id]);
    $images = $imgStmt->fetchAll(PDO::FETCH_COLUMN);

    $stmt = $pdo->prepare("DELETE FROM products WHERE id = :id");
    $stmt->execute([':id' => $id]);

    foreach ($images as $imgPath) {
        if (!empty($imgPath) && str_starts_with($imgPath, 'uploads/')) {
            $file = __DIR__ . '/' . $imgPath;
            if (is_file($file)) {
                unlink($file);
            }
        }
    }

    respond('success', '商品已刪除');

} catch (PDOException $e) {
    http_response_code(500);
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
