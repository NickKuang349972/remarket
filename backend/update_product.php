<?php
// 更新商品 API：接受 multipart/form-data（可選擇換一張相片）
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$host = 'localhost';
$dbname = 'carousell_db';
$username = 'root';
$password = '';

$uploadDir = __DIR__ . '/uploads';

function respond($status, $message, $extra = []) {
    echo json_encode(array_merge(["status" => $status, "message" => $message], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    respond('error', '只接受 POST 請求');
}

$id = $_POST['id'] ?? '';
$title = trim($_POST['title'] ?? '');
$price = $_POST['price'] ?? '';
$description = trim($_POST['description'] ?? '');
$category = trim($_POST['category'] ?? '其他');
$address = trim($_POST['address'] ?? '');
$lat = $_POST['lat'] ?? '';
$lng = $_POST['lng'] ?? '';

if (!is_numeric($id)) {
    respond('error', '缺少商品編號');
}
if ($title === '') {
    respond('error', '商品標題不能為空');
}
if (!is_numeric($price) || $price < 0) {
    respond('error', '價格必須是有效的數字');
}
if (!is_numeric($lat) || !is_numeric($lng)) {
    respond('error', '缺少有效的座標');
}

$newImagePath = null;

if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
    if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        respond('error', '相片上傳失敗');
    }
    if ($_FILES['image']['size'] > 5 * 1024 * 1024) {
        respond('error', '相片不能超過 5MB');
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
        respond('error', '無法儲存相片');
    }

    $newImagePath = 'uploads/' . $filename;
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

    $sql = "UPDATE products
            SET title = :title, price = :price, description = :description,
                category = :category, address = :address, lat = :lat, lng = :lng";
    $params = [
        ':title'       => $title,
        ':price'       => (int) $price,
        ':description' => $description,
        ':category'    => $category,
        ':address'     => $address,
        ':lat'         => $lat,
        ':lng'         => $lng,
        ':id'          => $id,
    ];

    if ($newImagePath !== null) {
        $sql .= ", image = :image";
        $params[':image'] = $newImagePath;
    }

    $sql .= " WHERE id = :id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    // 換了新相片就把舊檔案刪掉（只刪 uploads 內的檔案）
    if ($newImagePath !== null && !empty($existing['image']) && str_starts_with($existing['image'], 'uploads/')) {
        $oldFile = __DIR__ . '/' . $existing['image'];
        if (is_file($oldFile)) {
            unlink($oldFile);
        }
    }

    respond('success', '商品已更新');

} catch (PDOException $e) {
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
