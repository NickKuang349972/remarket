<?php
require __DIR__ . '/auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    respond('error', '只接受 POST 請求');
}

$productId = $_POST['product_id'] ?? '';

if (!is_numeric($productId)) {
    respond('error', '缺少商品編號');
}

try {
    $pdo = db();
    $user = require_user($pdo);

    $stmt = $pdo->prepare("SELECT id, seller FROM products WHERE id = :id");
    $stmt->execute([':id' => $productId]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$product) {
        http_response_code(404);
        respond('error', '找不到這件商品');
    }

    if ($product['seller'] !== '' && $product['seller'] === $user['username']) {
        respond('error', '不能對自己的商品開啟對話');
    }

    $insert = $pdo->prepare(
        "INSERT INTO conversations (product_id, buyer, seller)
         VALUES (:product_id, :buyer, :seller)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), seller = VALUES(seller)"
    );
    $insert->execute([
        ':product_id' => $productId,
        ':buyer'      => $user['username'],
        ':seller'     => $product['seller'],
    ]);

    respond('success', 'OK', ['id' => (int) $pdo->lastInsertId()]);

} catch (PDOException $e) {
    http_response_code(500);
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
