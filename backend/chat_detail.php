<?php
require __DIR__ . '/auth_common.php';

$conversationId = $_GET['id'] ?? '';

try {
    $pdo = db();
    $user = require_user($pdo);
    $conversation = require_conversation($pdo, $conversationId, $user);

    $me = $user['username'];
    $conversation['id'] = (int) $conversation['id'];
    $conversation['product_id'] = (int) $conversation['product_id'];
    $conversation['price'] = (int) $conversation['price'];
    $conversation['counterpart'] = $me === $conversation['buyer']
        ? $conversation['seller']
        : $conversation['buyer'];

    $messageStmt = $pdo->prepare(
        "SELECT id, sender, content, image,
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
         FROM (
             SELECT id, sender, content, image, created_at
             FROM messages
             WHERE conversation_id = :conversation_id
             ORDER BY id DESC
             LIMIT 200
         ) recent
         ORDER BY id ASC"
    );
    $messageStmt->execute([':conversation_id' => $conversationId]);

    $offerStmt = $pdo->prepare(
        "SELECT id, buyer, amount, status,
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
         FROM offers
         WHERE conversation_id = :conversation_id
         ORDER BY id ASC"
    );
    $offerStmt->execute([':conversation_id' => $conversationId]);

    respond('success', 'OK', [
        'data'     => $conversation,
        'messages' => $messageStmt->fetchAll(PDO::FETCH_ASSOC),
        'offers'   => $offerStmt->fetchAll(PDO::FETCH_ASSOC),
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
