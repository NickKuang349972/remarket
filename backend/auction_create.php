<?php
// 建立拍賣（賣家只能為自己的商品開拍賣）
require __DIR__ . '/auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    respond('error', '只接受 POST 請求');
}

$productId = $_POST['product_id'] ?? '';
$startAt = trim($_POST['start_at'] ?? '');
$endAt = trim($_POST['end_at'] ?? '');
$startPrice = $_POST['start_price'] ?? '';
$minIncrement = $_POST['min_increment'] ?? 10;

if (!is_numeric($productId)) {
    respond('error', '缺少商品編號');
}
if (!is_numeric($startPrice) || $startPrice <= 0) {
    respond('error', '起標價必須大於 0');
}
if (!is_numeric($minIncrement) || $minIncrement < 1) {
    respond('error', '最低加價必須大於 0');
}

$start = strtotime($startAt);
$end = strtotime($endAt);

if ($start === false || $end === false) {
    respond('error', '時間格式不正確');
}
if ($end <= $start) {
    respond('error', '結束時間必須晚於開始時間');
}
if ($end <= time()) {
    respond('error', '結束時間必須是將來');
}

try {
    $pdo = db();
    $user = require_user($pdo);

    $check = $pdo->prepare("SELECT id, seller FROM products WHERE id = :id");
    $check->execute([':id' => $productId]);
    $product = $check->fetch(PDO::FETCH_ASSOC);

    if (!$product) {
        http_response_code(404);
        respond('error', '找不到這件商品');
    }

    if ($product['seller'] !== $user['username']) {
        http_response_code(403);
        respond('error', '只能為自己刊登的商品開拍賣');
    }

    // 同一件商品同時只能有一個未結束的拍賣
    $conflict = $pdo->prepare(
        "SELECT id FROM auctions WHERE product_id = :product_id AND end_at > NOW()"
    );
    $conflict->execute([':product_id' => $productId]);

    if ($conflict->fetch()) {
        respond('error', '這件商品已有進行中或未開始的拍賣');
    }

    $stmt = $pdo->prepare(
        "INSERT INTO auctions (product_id, seller, start_at, end_at, start_price, min_increment)
         VALUES (:product_id, :seller, :start_at, :end_at, :start_price, :min_increment)"
    );

    $stmt->execute([
        ':product_id'    => $productId,
        ':seller'        => $user['username'],
        ':start_at'      => date('Y-m-d H:i:s', $start),
        ':end_at'        => date('Y-m-d H:i:s', $end),
        ':start_price'   => (int) $startPrice,
        ':min_increment' => (int) $minIncrement,
    ]);

    respond('success', '拍賣已建立', ['id' => (int) $pdo->lastInsertId()]);

} catch (PDOException $e) {
    http_response_code(500);
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
