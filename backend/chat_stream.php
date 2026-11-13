<?php
/**
 * SSE（Server-Sent Events）聊天串流
 *
 * 瀏覽器用 EventSource 連上這個檔案，之後只要有新訊息就會即時推送。
 * 連線維持 25 秒後主動結束，瀏覽器會自動重連；
 * 重連時瀏覽器會帶 Last-Event-ID，所以不會漏訊息也不會重複。
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: text/event-stream; charset=utf-8");
header("Cache-Control: no-cache");
header("X-Accel-Buffering: no");

$host = 'localhost';
$dbname = 'carousell_db';
$username = 'root';
$password = '';

$productId = $_GET['product_id'] ?? '';

if (!is_numeric($productId)) {
    echo "event: error\n";
    echo "data: {\"message\":\"缺少商品編號\"}\n\n";
    exit;
}

// 瀏覽器重連時會帶上這個 header
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
    "SELECT id, sender, content, image, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
     FROM messages
     WHERE product_id = :product_id AND id > :last_id
     ORDER BY id ASC"
);

// 告訴瀏覽器斷線後 3 秒重連
echo "retry: 3000\n\n";
@ob_flush();
@flush();

$startedAt = time();
$pollSeconds = 25;

while (time() - $startedAt < $pollSeconds) {
    $stmt->execute([':product_id' => $productId, ':last_id' => $lastId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($rows) {
        foreach ($rows as $row) {
            $lastId = max($lastId, (int) $row['id']);

            echo "id: " . $row['id'] . "\n";
            echo "data: " . json_encode($row, JSON_UNESCAPED_UNICODE) . "\n\n";
        }

        @ob_flush();
        @flush();
    }

    if (connection_aborted()) {
        break;
    }

    sleep(1);
}

// 正常結束（瀏覽器會自動重連）
echo ": bye\n\n";
@ob_flush();
@flush();
