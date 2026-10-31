<?php
// 刪除商品 API：接受 multipart/form-data（id）
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

    $check = $pdo->prepare("SELECT id, image FROM products WHERE id = :id");
    $check->execute([':id' => $id]);
    $existing = $check->fetch(PDO::FETCH_ASSOC);

    if (!$existing) {
        http_response_code(404);
        respond('error', '找不到這件商品');
    }

    $stmt = $pdo->prepare("DELETE FROM products WHERE id = :id");
    $stmt->execute([':id' => $id]);

    // 同時刪掉上傳的相片檔（只刪 uploads 內的檔案）
    if (!empty($existing['image']) && str_starts_with($existing['image'], 'uploads/')) {
        $file = __DIR__ . '/' . $existing['image'];
        if (is_file($file)) {
            unlink($file);
        }
    }

    respond('success', '商品已刪除');

} catch (PDOException $e) {
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
