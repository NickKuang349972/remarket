<?php
// 出價
require __DIR__ . '/auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    respond('error', '只接受 POST 請求');
}

$auctionId = $_POST['auction_id'] ?? '';
$amount = $_POST['amount'] ?? '';

if (!is_numeric($auctionId)) {
    respond('error', '缺少拍賣編號');
}
if (!is_numeric($amount) || $amount <= 0) {
    respond('error', '請輸入有效的出價');
}

try {
    $pdo = db();
    $user = require_user($pdo);

    $pdo->beginTransaction();

    // 鎖住這一場拍賣，避免兩個人同時出價造成重複（race condition）
    $stmt = $pdo->prepare(
        "SELECT id, seller, start_at, end_at, start_price, min_increment
         FROM auctions WHERE id = :id FOR UPDATE"
    );
    $stmt->execute([':id' => $auctionId]);
    $auction = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$auction) {
        $pdo->rollBack();
        http_response_code(404);
        respond('error', '找不到這個拍賣');
    }

    if ($user['username'] === $auction['seller']) {
        $pdo->rollBack();
        respond('error', '不能對自己的商品出價');
    }

    $now = time();
    $start = strtotime($auction['start_at']);
    $end = strtotime($auction['end_at']);

    if ($now < $start) {
        $pdo->rollBack();
        respond('error', '拍賣尚未開始');
    }
    if ($now >= $end) {
        $pdo->rollBack();
        respond('error', '拍賣已經結束');
    }

    $maxStmt = $pdo->prepare("SELECT MAX(amount) FROM bids WHERE auction_id = :id");
    $maxStmt->execute([':id' => $auctionId]);
    $current = (int) $maxStmt->fetchColumn();

    $minimum = $current > 0
        ? $current + (int) $auction['min_increment']
        : (int) $auction['start_price'];

    if ((int) $amount < $minimum) {
        $pdo->rollBack();
        respond('error', '出價至少需要 HK$ ' . number_format($minimum));
    }

    $insert = $pdo->prepare(
        "INSERT INTO bids (auction_id, bidder, amount) VALUES (:auction_id, :bidder, :amount)"
    );
    $insert->execute([
        ':auction_id' => $auctionId,
        ':bidder'     => $user['username'],
        ':amount'     => (int) $amount,
    ]);

    $newBidId = (int) $pdo->lastInsertId();

    $pdo->commit();

    respond('success', '出價成功', [
        'id'     => $newBidId,
        'amount' => (int) $amount,
        'bidder' => $user['username'],
    ]);

} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
