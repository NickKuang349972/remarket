<?php
// 單一拍賣詳情：場次資料 + 出價紀錄 + 房間訊息
require __DIR__ . '/auth_common.php';

$id = $_GET['id'] ?? '';

if (!is_numeric($id)) {
    respond('error', '缺少拍賣編號');
}

try {
    $pdo = db();

    $stmt = $pdo->prepare(
        "SELECT a.id, a.product_id, a.seller,
                DATE_FORMAT(a.start_at, '%Y-%m-%dT%H:%i:%s') AS start_at,
                DATE_FORMAT(a.end_at, '%Y-%m-%dT%H:%i:%s') AS end_at,
                a.start_price, a.min_increment,
                p.title, p.description, p.price, p.address, p.category,
                (SELECT pi.path FROM product_images pi
                  WHERE pi.product_id = p.id ORDER BY pi.id ASC LIMIT 1) AS image,
                (SELECT MAX(b.amount) FROM bids b WHERE b.auction_id = a.id) AS current_bid,
                (SELECT b.bidder FROM bids b WHERE b.auction_id = a.id
                  ORDER BY b.amount DESC, b.id DESC LIMIT 1) AS leader,
                CASE
                  WHEN NOW() < a.start_at THEN 'scheduled'
                  WHEN NOW() >= a.end_at THEN 'ended'
                  ELSE 'live'
                END AS state
         FROM auctions a
         INNER JOIN products p ON p.id = a.product_id
         WHERE a.id = :id"
    );
    $stmt->execute([':id' => $id]);
    $auction = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$auction) {
        http_response_code(404);
        respond('error', '找不到這個拍賣');
    }

    $bidStmt = $pdo->prepare(
        "SELECT id, bidder, amount, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
         FROM bids WHERE auction_id = :id ORDER BY id ASC LIMIT 200"
    );
    $bidStmt->execute([':id' => $id]);

    $msgStmt = $pdo->prepare(
        "SELECT id, author, content, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
         FROM auction_messages WHERE auction_id = :id ORDER BY id ASC LIMIT 200"
    );
    $msgStmt->execute([':id' => $id]);

    respond('success', 'OK', [
        'data'     => $auction,
        'bids'     => $bidStmt->fetchAll(PDO::FETCH_ASSOC),
        'messages' => $msgStmt->fetchAll(PDO::FETCH_ASSOC),
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
