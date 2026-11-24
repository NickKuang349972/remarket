<?php
require __DIR__ . '/auth_common.php';

try {
    $pdo = db();
    $user = require_user($pdo);

    $sql = "SELECT c.id AS conversation_id, c.product_id, c.buyer, c.seller,
                   CASE WHEN c.buyer = :me_counterpart
                        THEN c.seller ELSE c.buyer END AS counterpart,
                   p.title, p.price,
                   (SELECT pi.path FROM product_images pi
                     WHERE pi.product_id = p.id ORDER BY pi.id ASC LIMIT 1) AS image,
                   m.id AS last_message_id, m.sender, m.content,
                   DATE_FORMAT(m.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
            FROM conversations c
            INNER JOIN products p ON p.id = c.product_id
            LEFT JOIN (
                SELECT conversation_id, MAX(id) AS max_id
                FROM messages
                GROUP BY conversation_id
            ) latest ON latest.conversation_id = c.id
            LEFT JOIN messages m ON m.id = latest.max_id
            WHERE c.buyer = :me_buyer OR c.seller = :me_seller
            ORDER BY COALESCE(m.id, 0) DESC, c.id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':me_counterpart' => $user['username'],
        ':me_buyer'       => $user['username'],
        ':me_seller'      => $user['username'],
    ]);

    respond('success', 'OK', ['data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);

} catch (PDOException $e) {
    http_response_code(500);
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
