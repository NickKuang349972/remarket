<?php
// 共用：資料庫連線、JSON 回應、token 驗證
// 統一時區為香港，否則 PHP 的 date() 與 MySQL 的 NOW()（+08:00）會相差 8 小時
date_default_timezone_set('Asia/Hong_Kong');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json; charset=UTF-8");

// 瀏覽器帶 Authorization header 時會先送 OPTIONS 預檢，這裡直接放行
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
    echo json_encode(array_merge(["status" => $status, "message" => $message], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

/** 從 Authorization: Bearer xxx 取得 token */
function bearer_token(): string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if ($header === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? '';
    }

    if (preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
        return $matches[1];
    }

    return '';
}

/** 用 token 找回目前使用者；找不到就回 null */
function current_user(PDO $pdo): ?array {
    $token = bearer_token();

    if ($token === '') {
        return null;
    }

    $stmt = $pdo->prepare(
        "SELECT id, username FROM users
         WHERE token = :token AND token_expires > NOW()"
    );
    $stmt->execute([':token' => $token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    return $user ?: null;
}

/** 要求必須登入，否則回 401 */
function require_user(PDO $pdo): array {
    $user = current_user($pdo);

    if (!$user) {
        http_response_code(401);
        respond('error', '請先登入');
    }

    return $user;
}
