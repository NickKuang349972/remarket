<?php
require __DIR__ . '/auth_common.php';

header("Content-Type: text/event-stream; charset=utf-8");
header("Cache-Control: no-cache");
header("X-Accel-Buffering: no");

function sse_error(string $message, int $status = 200): void {
    http_response_code($status);
    echo "event: error\n";
    echo 'data: ' . json_encode(['message' => $message], JSON_UNESCAPED_UNICODE) . "\n\n";
    @ob_flush();
    @flush();
    exit;
}

$conversationId = $_GET['conversation_id'] ?? '';

if (!is_numeric($conversationId)) {
    sse_error('缺少對話編號');
}

try {
    $pdo = db();
} catch (PDOException $e) {
    sse_error('資料庫連線失敗');
}

$user = current_user($pdo);

if (!$user) {
    sse_error('請先登入', 401);
}

$conversation = find_conversation($pdo, $conversationId);

if (!$conversation) {
    sse_error('找不到這個對話', 404);
}

if ($conversation['buyer'] !== $user['username']
    && $conversation['seller'] !== $user['username']) {
    sse_error('沒有權限查看這個對話', 403);
}

$lastId = isset($_SERVER['HTTP_LAST_EVENT_ID']) ? (int) $_SERVER['HTTP_LAST_EVENT_ID'] : 0;

$messageStmt = $pdo->prepare(
    "SELECT id, sender, content, image, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
     FROM messages
     WHERE conversation_id = :conversation_id AND id > :last_id
     ORDER BY id ASC"
);

$offersStmt = $pdo->prepare(
    "SELECT id, buyer, amount, status, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
     FROM offers
     WHERE conversation_id = :conversation_id
     ORDER BY id ASC"
);

echo "retry: 3000\n\n";
@ob_flush();
@flush();

$startedAt = time();
$pollSeconds = 25;
$lastOffersJson = '';

while (time() - $startedAt < $pollSeconds) {
    $messageStmt->execute([':conversation_id' => $conversationId, ':last_id' => $lastId]);
    $rows = $messageStmt->fetchAll(PDO::FETCH_ASSOC);

    if ($rows) {
        foreach ($rows as $row) {
            $lastId = max($lastId, (int) $row['id']);

            echo "id: " . $row['id'] . "\n";
            echo "data: " . json_encode(['type' => 'message', 'message' => $row], JSON_UNESCAPED_UNICODE) . "\n\n";
        }

        @ob_flush();
        @flush();
    }

    $offersStmt->execute([':conversation_id' => $conversationId]);
    $offers = $offersStmt->fetchAll(PDO::FETCH_ASSOC);
    $offersJson = json_encode($offers, JSON_UNESCAPED_UNICODE);

    if ($offersJson !== $lastOffersJson) {
        $lastOffersJson = $offersJson;

        echo "data: " . json_encode(['type' => 'offers', 'offers' => $offers], JSON_UNESCAPED_UNICODE) . "\n\n";
        @ob_flush();
        @flush();
    }

    if (connection_aborted()) {
        break;
    }

    sleep(1);
}

echo ": bye\n\n";
@ob_flush();
@flush();
