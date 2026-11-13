<?php
/**
 * 回傳「我」的所有對話（每件商品的最後一則訊息）。
 * 「我」= 商品的賣家，或曾在該商品留言的人。
 * 由 token 判定身份，前端不用自己傳商品清單。
 */
require __DIR__ . '/auth_common.php';

try {
    $pdo = db();
    $user = require_user($pdo);

    $sql = "SELECT m.product_id, m.id, m.sender, m.content,
                   DATE_FORMAT(m.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
                   p.title, p.price, p.seller,
                   (SELECT pi.path FROM product_images pi
                     WHERE pi.product_id = p.id ORDER BY pi.id ASC LIMIT 1) AS image
            FROM messages m
            INNER JOIN products p ON p.id = m.product_id
            INNER JOIN (
                SELECT product_id, MAX(id) AS max_id
                FROM messages
                GROUP BY product_id
            ) latest ON latest.product_id = m.product_id AND latest.max_id = m.id
            WHERE m.product_id IN (
                SELECT id FROM products WHERE seller = :me_seller
                UNION
                SELECT DISTINCT product_id FROM messages WHERE sender = :me_sender
            )
            ORDER BY m.id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':me_seller' => $user['username'],
        ':me_sender' => $user['username'],
    ]);

    respond('success', 'OK', ['data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);

} catch (PDOException $e) {
    http_response_code(500);
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
