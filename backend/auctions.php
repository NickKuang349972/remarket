<?php
// 拍賣列表（公開）
require __DIR__ . '/auth_common.php';

try {
    $pdo = db();

    $sql = "SELECT a.id, a.product_id, a.seller,
                   DATE_FORMAT(a.start_at, '%Y-%m-%dT%H:%i:%s') AS start_at,
                   DATE_FORMAT(a.end_at, '%Y-%m-%dT%H:%i:%s') AS end_at,
                   a.start_price, a.min_increment,
                   p.title, p.price,
                   (SELECT pi.path FROM product_images pi
                     WHERE pi.product_id = p.id ORDER BY pi.id ASC LIMIT 1) AS image,
                   (SELECT MAX(b.amount) FROM bids b WHERE b.auction_id = a.id) AS current_bid,
                   (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count,
                   (SELECT b.bidder FROM bids b WHERE b.auction_id = a.id
                     ORDER BY b.amount DESC, b.id DESC LIMIT 1) AS leader,
                   CASE
                     WHEN NOW() < a.start_at THEN 'scheduled'
                     WHEN NOW() >= a.end_at THEN 'ended'
                     ELSE 'live'
                   END AS state
            FROM auctions a
            INNER JOIN products p ON p.id = a.product_id
            ORDER BY
              CASE
                WHEN NOW() BETWEEN a.start_at AND a.end_at THEN 0
                WHEN NOW() < a.start_at THEN 1
                ELSE 2
              END,
              a.start_at ASC";

    $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

    respond('success', 'OK', ['data' => $rows]);

} catch (PDOException $e) {
    http_response_code(500);
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
