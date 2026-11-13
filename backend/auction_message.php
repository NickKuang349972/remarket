<?php
// 拍賣房間訊息（賣家宣傳、買家提問）
require __DIR__ . '/auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    respond('error', '只接受 POST 請求');
}

$auctionId = $_POST['auction_id'] ?? '';
$content = trim($_POST['content'] ?? '');

if (!is_numeric($auctionId)) {
    respond('error', '缺少拍賣編號');
}
if ($content === '') {
    respond('error', '訊息不能為空');
}
if (mb_strlen($content) > 200) {
    respond('error', '訊息不能超過 200 字');
}

try {
    $pdo = db();
    $user = require_user($pdo);

    $check = $pdo->prepare("SELECT id FROM auctions WHERE id = :id");
    $check->execute([':id' => $auctionId]);

    if (!$check->fetch()) {
        http_response_code(404);
        respond('error', '找不到這個拍賣');
    }

    $stmt = $pdo->prepare(
        "INSERT INTO auction_messages (auction_id, author, content) VALUES (:auction_id, :author, :content)"
    );
    $stmt->execute([
        ':auction_id' => $auctionId,
        ':author'     => $user['username'],
        ':content'    => $content,
    ]);

    respond('success', '已送出', ['id' => (int) $pdo->lastInsertId()]);

} catch (PDOException $e) {
    http_response_code(500);
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
