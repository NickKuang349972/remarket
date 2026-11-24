<?php
date_default_timezone_set('Asia/Hong_Kong');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json; charset=UTF-8");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$DB_HOST = 'localhost';
$DB_NAME = 'carousell_db';
$DB_USER = 'root';
$DB_PASS = '';

function db(): PDO {
    global $DB_HOST, $DB_NAME, $DB_USER, $DB_PASS;

    $pdo = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("SET time_zone = '+08:00'");

    return $pdo;
}

function respond($status, $message, $extra = []) {
    echo json_encode(
        array_merge(["status" => $status, "message" => $message], $extra),
        JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}

function bearer_token(): string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if ($header === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? '';
    }

    if (preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
        return $matches[1];
    }

    $queryToken = $_GET['token'] ?? '';
    return is_string($queryToken) ? $queryToken : '';
}

function current_user(PDO $pdo): ?array {
    $token = bearer_token();

    if ($token === '') {
        return null;
    }

    $stmt = $pdo->prepare(
        "SELECT id, username, nickname FROM users
         WHERE token = :token AND token_expires > NOW()"
    );
    $stmt->execute([':token' => $token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    return $user ?: null;
}

function require_user(PDO $pdo): array {
    $user = current_user($pdo);

    if (!$user) {
        http_response_code(401);
        respond('error', '請先登入');
    }

    return $user;
}

function find_conversation(PDO $pdo, $conversationId): ?array {
    $stmt = $pdo->prepare(
        "SELECT c.id, c.product_id, c.buyer, c.seller,
                p.title, p.price, p.description, p.status, p.category, p.address,
                (SELECT pi.path FROM product_images pi
                  WHERE pi.product_id = p.id ORDER BY pi.id ASC LIMIT 1) AS image
         FROM conversations c
         INNER JOIN products p ON p.id = c.product_id
         WHERE c.id = :id"
    );
    $stmt->execute([':id' => $conversationId]);
    $conversation = $stmt->fetch(PDO::FETCH_ASSOC);

    return $conversation ?: null;
}

function require_conversation(PDO $pdo, $conversationId, array $user): array {
    if (!is_numeric($conversationId)) {
        respond('error', '缺少對話編號');
    }

    $conversation = find_conversation($pdo, $conversationId);

    if (!$conversation) {
        http_response_code(404);
        respond('error', '找不到這個對話');
    }

    if ($conversation['buyer'] !== $user['username']
        && $conversation['seller'] !== $user['username']) {
        http_response_code(403);
        respond('error', '沒有權限查看這個對話');
    }

    return $conversation;
}
