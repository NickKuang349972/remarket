<?php
require __DIR__ . '/auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    respond('error', '只接受 POST 請求');
}

$conversationId = $_POST['conversation_id'] ?? '';
$amount = $_POST['amount'] ?? '';

if (!is_numeric($conversationId)) {
    respond('error', '缺少對話編號');
}
if (!is_numeric($amount) || (int) $amount <= 0) {
    respond('error', '請輸入有效的出價金額');
}

try {
    $pdo = db();
    $user = require_user($pdo);
    $conversation = require_conversation($pdo, $conversationId, $user);

    if ($conversation['buyer'] !== $user['username']) {
        http_response_code(403);
        respond('error', '只有買家可以提出議價');
    }
    if (($conversation['status'] ?? '') === 'sold') {
        respond('error', '這件商品已經售出');
    }

    // 同一買家同時只能有一個「待回覆」或「已同意」的出價
    $pdo->beginTransaction();

    $lock = $pdo->prepare("SELECT id FROM conversations WHERE id = :id FOR UPDATE");
    $lock->execute([':id' => $conversationId]);

    $existingStmt = $pdo->prepare(
        "SELECT status
         FROM offers
         WHERE conversation_id = :conversation_id AND status IN ('pending', 'accepted')
         ORDER BY id DESC
         LIMIT 1"
    );
    $existingStmt->execute([':conversation_id' => $conversationId]);
    $existing = $existingStmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        $pdo->rollBack();

        if ($existing['status'] === 'accepted') {
            respond('error', '賣家已同意你的出價，不能再出價');
        }

        respond('error', '你已有一個待回覆的出價，請等待賣家回覆');
    }

    $insert = $pdo->prepare(
        "INSERT INTO offers (conversation_id, product_id, buyer, amount)
         VALUES (:conversation_id, :product_id, :buyer, :amount)"
    );
    $insert->execute([
        ':conversation_id' => $conversationId,
        ':product_id'      => $conversation['product_id'],
        ':buyer'           => $user['username'],
        ':amount'          => (int) $amount,
    ]);

    $pdo->commit();

    respond('success', '出價已送出', ['id' => (int) $pdo->lastInsertId()]);

} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
