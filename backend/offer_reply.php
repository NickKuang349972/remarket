<?php
require __DIR__ . '/auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    respond('error', '只接受 POST 請求');
}

$offerId = $_POST['offer_id'] ?? '';
$action = $_POST['action'] ?? '';

if (!is_numeric($offerId)) {
    respond('error', '缺少出價編號');
}
if (!in_array($action, ['accept', 'reject'], true)) {
    respond('error', '無效的操作');
}

try {
    $pdo = db();
    $user = require_user($pdo);

    $stmt = $pdo->prepare(
        "SELECT o.id, o.conversation_id, o.product_id, o.buyer, o.amount, o.status, c.seller
         FROM offers o
         INNER JOIN conversations c ON c.id = o.conversation_id
         WHERE o.id = :id"
    );
    $stmt->execute([':id' => $offerId]);
    $offer = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$offer) {
        http_response_code(404);
        respond('error', '找不到這個出價');
    }
    if ($offer['seller'] === '' || $offer['seller'] !== $user['username']) {
        http_response_code(403);
        respond('error', '只有賣家可以回覆出價');
    }
    if ($offer['status'] !== 'pending') {
        respond('error', '這個出價已經被回覆過了');
    }

    $newStatus = $action === 'accept' ? 'accepted' : 'rejected';

    $pdo->beginTransaction();

    $update = $pdo->prepare("UPDATE offers SET status = :status WHERE id = :id");
    $update->execute([':status' => $newStatus, ':id' => $offerId]);

    if ($newStatus === 'accepted') {
        $autoReject = $pdo->prepare(
            "UPDATE offers
             SET status = 'rejected'
             WHERE conversation_id = :conversation_id AND id <> :id AND status = 'pending'"
        );
        $autoReject->execute([
            ':conversation_id' => $offer['conversation_id'],
            ':id'              => $offerId,
        ]);
    }

    $content = $newStatus === 'accepted'
        ? '賣家已同意 HK$ ' . (int) $offer['amount'] . ' 的出價，可以開始安排面交與付款。'
        : '賣家婉拒了 HK$ ' . (int) $offer['amount'] . ' 的出價，買家可以再提出新價格。';

    $msgStmt = $pdo->prepare(
        "INSERT INTO messages (conversation_id, product_id, sender, content)
         VALUES (:conversation_id, :product_id, :sender, :content)"
    );
    $msgStmt->execute([
        ':conversation_id' => $offer['conversation_id'],
        ':product_id'      => $offer['product_id'],
        ':sender'          => '系統',
        ':content'         => $content,
    ]);

    $pdo->commit();

    respond('success', $newStatus === 'accepted' ? '已同意出價' : '已拒絕出價', [
        'offer_status' => $newStatus,
    ]);

} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
