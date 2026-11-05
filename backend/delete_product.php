<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$host = 'localhost';
$dbname = 'carousell_db';
$username = 'root';
$password = '';

function respond($status, $message, $extra = []) {
    echo json_encode(array_merge(["status" => $status, "message" => $message], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    respond('error', '只接受 POST 請求');
}

$id = $_POST['id'] ?? '';

if (!is_numeric($id)) {
    respond('error', '缺少商品編號');
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $check = $pdo->prepare("SELECT id FROM products WHERE id = :id");
    $check->execute([':id' => $id]);
    if (!$check->fetch()) {
        http_response_code(404);
        respond('error', '找不到這件商品');
    }

    $imgStmt = $pdo->prepare("SELECT path FROM product_images WHERE product_id = :id");
    $imgStmt->execute([':id' => $id]);
    $images = $imgStmt->fetchAll(PDO::FETCH_COLUMN);

    $stmt = $pdo->prepare("DELETE FROM products WHERE id = :id");
    $stmt->execute([':id' => $id]);

    foreach ($images as $imgPath) {
        if (!empty($imgPath) && str_starts_with($imgPath, 'uploads/')) {
            $file = __DIR__ . '/' . $imgPath;
            if (is_file($file)) {
                unlink($file);
            }
        }
    }

    respond('success', '商品已刪除');

} catch (PDOException $e) {
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
