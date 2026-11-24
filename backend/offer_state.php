<?php
require __DIR__ . '/auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    respond('error', '只接受 GET 請求');
}

$productId = $_GET['product_id'] ?? '';

if (!is_numeric($productId)) {
    respond('error', '缺少商品編號');
}

try {
    $pdo = db();
    $user = require_user($pdo);

    $stmt = $pdo->prepare(
        "SELECT o.status, o.amount,
                DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
         FROM offers o
         INNER JOIN conversations c ON c.id = o.conversation_id
         WHERE c.product_id = :product_id AND c.buyer = :buyer
         ORDER BY (o.status = 'accepted') DESC, o.id DESC
         LIMIT 1"
    );
    $stmt->execute([
        ':product_id' => $productId,
        ':buyer'      => $user['username'],
    ]);
    $offer = $stmt->fetch(PDO::FETCH_ASSOC);

    respond('success', 'OK', ['data' => $offer ?: null]);

} catch (PDOException $e) {
    http_response_code(500);
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
