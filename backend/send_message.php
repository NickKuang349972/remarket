<?php
// 傳送聊天訊息（可附一張圖片；必須登入，發送者由 token 判定）
require __DIR__ . '/auth_common.php';

$uploadDir = __DIR__ . '/uploads';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    respond('error', '只接受 POST 請求');
}

$productId = $_POST['product_id'] ?? '';
$content = trim($_POST['content'] ?? '');

if (!is_numeric($productId)) {
    respond('error', '缺少商品編號');
}
if ($content === '' && empty($_FILES['image']['name'])) {
    respond('error', '訊息不能為空');
}
if (mb_strlen($content) > 500) {
    respond('error', '訊息不能超過 500 字');
}

try {
    $pdo = db();
    $user = require_user($pdo);

    $check = $pdo->prepare("SELECT id FROM products WHERE id = :id");
    $check->execute([':id' => $productId]);

    if (!$check->fetch()) {
        http_response_code(404);
        respond('error', '找不到這件商品');
    }

    $imagePath = '';

    if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
        if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            respond('error', '圖片上傳失敗');
        }
        if ($_FILES['image']['size'] > 5 * 1024 * 1024) {
            respond('error', '圖片不能超過 5MB');
        }

        $allowed = [
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
            'image/gif'  => 'gif',
        ];
        $mime = mime_content_type($_FILES['image']['tmp_name']);

        if (!isset($allowed[$mime])) {
            respond('error', '只支援 JPG / PNG / WEBP / GIF 格式');
        }

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0775, true);
        }

        $filename = bin2hex(random_bytes(8)) . '.' . $allowed[$mime];

        if (!move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . '/' . $filename)) {
            respond('error', '無法儲存圖片');
        }

        $imagePath = 'uploads/' . $filename;
    }

    $stmt = $pdo->prepare(
        "INSERT INTO messages (product_id, sender, content, image)
         VALUES (:product_id, :sender, :content, :image)"
    );
    $stmt->execute([
        ':product_id' => $productId,
        ':sender'     => $user['username'],
        ':content'    => $content,
        ':image'      => $imagePath,
    ]);

    respond('success', '已送出', ['id' => (int) $pdo->lastInsertId(), 'image' => $imagePath]);

} catch (PDOException $e) {
    http_response_code(500);
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
