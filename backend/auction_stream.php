<?php
/**
 * 拍賣出價 SSE 串流：有人出價就即時推送。
 * 與 chat_stream.php 同一套做法：連 25 秒後結束，瀏覽器自動重連，
 * 重連時帶 Last-Event-ID 續傳。
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: text/event-stream; charset=utf-8");
header("Cache-Control: no-cache");
header("X-Accel-Buffering: no");

$host = 'localhost';
$dbname = 'carousell_db';
$username = 'root';
$password = '';

$auctionId = $_GET['auction_id'] ?? '';

if (!is_numeric($auctionId)) {
    echo "event: error\n";
    echo "data: {\"message\":\"缺少拍賣編號\"}\n\n";
    exit;
}

$lastId = isset($_SERVER['HTTP_LAST_EVENT_ID']) ? (int) $_SERVER['HTTP_LAST_EVENT_ID'] : 0;

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("SET time_zone = '+08:00'");
} catch (PDOException $e) {
    echo "event: error\n";
    echo 'data: ' . json_encode(['message' => '資料庫連線失敗'], JSON_UNESCAPED_UNICODE) . "\n\n";
    exit;
}

$stmt = $pdo->prepare(
    "SELECT id, bidder, amount, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
     FROM bids WHERE auction_id = :auction_id AND id > :last_id ORDER BY id ASC"
);

echo "retry: 3000\n\n";
@ob_flush();
@flush();

$startedAt = time();

while (time() - $startedAt < 25) {
    $stmt->execute([':auction_id' => $auctionId, ':last_id' => $lastId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as $row) {
        $lastId = max($lastId, (int) $row['id']);

        echo "id: " . $row['id'] . "\n";
        echo "data: " . json_encode($row, JSON_UNESCAPED_UNICODE) . "\n\n";
    }

    if ($rows) {
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
